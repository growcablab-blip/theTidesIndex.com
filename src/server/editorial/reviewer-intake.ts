import { z } from 'zod';

/**
 * What is asked of a reviewer before their review is recorded, and nothing more.
 *
 * This is a **model and a validator, not a record**. No reviewer exists; none is
 * created here. Its job is to make the intake checkable before a row is written,
 * so that the first real reviewer record is right on the first attempt rather
 * than corrected afterwards — a credential edited after an approval is a
 * credential chosen to fit the outcome.
 *
 * ## Why this list and no longer a one
 *
 * Every field here is something a *reader* needs in order to weigh a published
 * approval: who reviewed it, on what standing, and whether they were asked about
 * conflicts. A reviewer's address, phone number, date of birth, registration
 * number, CV or publication list would tell a reader nothing further and would
 * make this index the custodian of personal data it has no use for. So they are
 * not collected. The contact address is the single exception, and it is
 * operational: there has to be a way to send the packet and ask the follow-up
 * question.
 *
 * ## Why a disclosure is not a disqualification
 *
 * `conflictsDisclosed` has three states and the third is the point.
 *
 *   - `false` — asked, and the reviewer states no relevant conflict.
 *   - `true` — asked, and something was disclosed.
 *   - `null` — nobody asked.
 *
 * A disclosed conflict does not bar anyone. An analytical chemist who consults
 * for a contract laboratory is likely to be *better* at reading a certificate,
 * not worse, and excluding them would narrow the reviewer pool to people with no
 * commercial exposure to the subject — which in this field is close to people
 * with no experience of it. The disclosure is published alongside the approval
 * so a reader can weigh it. What is not acceptable is an approval by somebody
 * nobody asked, and that is what the third state exists to make visible.
 *
 * The database enforces the two rules that follow: a declared conflict must be
 * explained (`profiles_disclosure_is_explained`) and any answer must be dated
 * (`profiles_disclosure_is_dated`). This schema refuses the same shapes earlier,
 * with a sentence instead of a constraint name.
 */

const REVIEW_ROLES = [
  'scientific_reviewer',
  'clinical_reviewer',
  'compliance_reviewer',
] as const;

/** Trimmed, and empty means absent rather than empty. */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value.length === 0 ? null : value))
    .nullable()
    .default(null);

export const reviewerIntakeSchema = z
  .object({
    /** As it should appear beside a published approval. */
    fullName: z.string().trim().min(2).max(120),

    /**
     * What they are, not where they work. "Analytical chemist", "Pharmacist",
     * "Pharmaceutical QA scientist".
     */
    professionalRole: z.string().trim().min(2).max(120),

    /**
     * The domain this reviewer's approval carries weight in.
     *
     * Recorded because it bounds the review rather than advertising the
     * reviewer: somebody whose domain is chromatography has said nothing about
     * microbiology by approving a purity packet, and a reader should be able to
     * see that.
     */
    reviewDomain: z.string().trim().min(2).max(160),

    organisation: optionalText(160),

    /** One or two lines. Not a CV, and never a list of publications. */
    credentialSummary: optionalText(400),

    /** Operational only: how the packet is sent and the follow-up asked. */
    contactEmail: z.string().trim().toLowerCase().email().max(254),

    role: z.enum(REVIEW_ROLES).default('scientific_reviewer'),

    /** False is an answer. Null is the absence of one. */
    conflictsDisclosed: z.boolean().nullable(),
    disclosureNotes: optionalText(2000),
    /** ISO date. Required whenever the question was answered either way. */
    disclosedAt: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use an ISO date, YYYY-MM-DD.')
      .nullable()
      .default(null),

    isActive: z.boolean().default(true),
  })
  .superRefine((value, ctx) => {
    if (value.conflictsDisclosed === true && value.disclosureNotes === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['disclosureNotes'],
        message:
          'A declared conflict has to say what it is. A reader cannot weigh "a conflict exists".',
      });
    }
    if (value.conflictsDisclosed !== null && value.disclosedAt === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['disclosedAt'],
        message:
          'An answer about conflicts needs the date it was given. Circumstances change, and an undated disclosure cannot be read against a review date.',
      });
    }
    if (value.conflictsDisclosed === null && value.disclosedAt !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['conflictsDisclosed'],
        message:
          'A date was given but no answer. Null means nobody asked, which cannot have happened on a particular day.',
      });
    }
  });

export type ReviewerIntake = z.infer<typeof reviewerIntakeSchema>;

/**
 * The questions, in the order they are asked, for any surface that renders them.
 *
 * Kept as data so that the printed form in the review bundle, an eventual admin
 * screen and this validator cannot drift into asking different things.
 */
export interface IntakeQuestion {
  readonly field: keyof ReviewerIntake;
  readonly label: string;
  readonly required: boolean;
  readonly help: string;
}

export const INTAKE_QUESTIONS: readonly IntakeQuestion[] = [
  {
    field: 'fullName',
    label: 'Full name',
    required: true,
    help: 'As it should appear beside a published approval.',
  },
  {
    field: 'professionalRole',
    label: 'Professional role',
    required: true,
    help: 'What you are, not where you work — e.g. analytical chemist, pharmacist.',
  },
  {
    field: 'reviewDomain',
    label: 'Relevant expertise',
    required: true,
    help: 'The area your review carries weight in. It bounds the review rather than advertising you.',
  },
  {
    field: 'organisation',
    label: 'Organisation',
    required: false,
    help: 'Only if you wish to give one.',
  },
  {
    field: 'credentialSummary',
    label: 'Credential summary',
    required: false,
    help: 'One or two lines. Not a CV.',
  },
  {
    field: 'contactEmail',
    label: 'Contact email',
    required: true,
    help: 'Used to send packets and ask follow-up questions. Never published.',
  },
  {
    field: 'conflictsDisclosed',
    label: 'Conflicts of interest',
    required: true,
    help: 'Either “no relevant conflict” or a disclosure. A disclosure does not disqualify you; it is recorded alongside your review.',
  },
];

export interface IntakeResult {
  readonly ok: boolean;
  readonly intake: ReviewerIntake | null;
  /** Field-addressed, so a form can show each message where it belongs. */
  readonly problems: readonly { readonly field: string; readonly message: string }[];
}

/**
 * Checks an intake. Writes nothing.
 *
 * Deliberately returns rather than throws: an intake is a conversation with a
 * person, and the useful output is every problem at once rather than the first.
 */
export function checkReviewerIntake(input: unknown): IntakeResult {
  const parsed = reviewerIntakeSchema.safeParse(input);
  if (parsed.success) {
    return { ok: true, intake: parsed.data, problems: [] };
  }
  return {
    ok: false,
    intake: null,
    problems: parsed.error.issues.map((issue) => ({
      field: issue.path.join('.') || '(form)',
      message: issue.message,
    })),
  };
}

/**
 * The `profiles` columns a checked intake becomes.
 *
 * Separated from the insert on purpose. Producing the row is safe and testable;
 * writing it is an act that needs a real reviewer, owner authorisation and a
 * `user_id` from Supabase Auth, none of which exist yet. Nothing in this module
 * touches the database.
 */
export function intakeToProfileColumns(intake: ReviewerIntake): Record<string, unknown> {
  return {
    display_name: intake.fullName,
    email: intake.contactEmail,
    role: intake.role,
    is_active: intake.isActive,
    professional_role: intake.professionalRole,
    review_domain: intake.reviewDomain,
    organisation: intake.organisation,
    credential_summary: intake.credentialSummary,
    conflicts_disclosed: intake.conflictsDisclosed,
    disclosure_notes: intake.disclosureNotes,
    disclosed_at: intake.disclosedAt,
    // Never set from an intake. A demonstration record is created by the
    // demonstration fixture and by nothing else.
    is_demonstration: false,
  };
}
