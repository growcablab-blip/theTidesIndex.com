import Link from 'next/link';
import type { PeptidePage } from '@/server/public/queries';
import type { PublicClaim } from '@/server/public/shapes';
import {
  countEvidenceRecords,
  EVIDENCE_RECORD_DEFINITION,
  formatEvidenceRecordCount,
  laneOfClaim,
  type EvidenceLane,
} from '@/domain/evidence/evidence-counts';
import { EvidenceClassTag } from './primitives';

/**
 * The first screen of a compound record, and two views built from its claims.
 *
 * A compound page is long because provenance is long. The reader's first
 * question is almost never "show me the literature" — it is "has this been
 * studied in people, and what don't we know?". So the opening answers that in a
 * few seconds: the brief, and the shape of the evidence drawn as three lanes.
 *
 * Everything here is arranged from the record's own claims and gaps. Nothing is
 * scored, nothing is summarised beyond counting, and no drawing depicts a
 * mechanism — mechanism is shown as the attributed statements sources make.
 *
 * The lanes count evidence records — distinct sources — not statements. The
 * unit is defined once, in `@/domain/evidence/evidence-counts`, and printed
 * books count through the same module.
 */

/** The same classification the evidence section uses, so the two never disagree. */
export function laneOf(claim: PublicClaim): EvidenceLane | null {
  return laneOfClaim(claim);
}

const LANES: readonly {
  lane: EvidenceLane;
  simpleLabel: string;
  label: string;
  mark: string;
  tint: string;
}[] = [
  {
    lane: 'human',
    simpleLabel: 'Studied in people',
    label: 'Human evidence',
    mark: 'h-3 w-3 rounded-full bg-[var(--color-evidence-human)]',
    tint: 'bg-[var(--color-evidence-human-bg)]',
  },
  {
    lane: 'preclinical',
    simpleLabel: 'Studied in animals or cells',
    label: 'Preclinical evidence',
    mark: 'h-3 w-3 rounded-[2px] bg-[var(--color-evidence-preclinical)]',
    tint: 'bg-[var(--color-evidence-preclinical-bg)]',
  },
  {
    lane: 'reference',
    simpleLabel: 'Described in practice or reference works',
    label: 'Reference and practice',
    mark: 'h-2.5 w-2.5 rotate-45 bg-[var(--color-evidence-reference)]',
    tint: 'bg-[var(--color-evidence-reference-bg)]',
  },
];

const MAX_MARKS = 24;

function firstParagraph(text: string | null): string | null {
  if (text === null) return null;
  const para = text.split(/\n\s*\n/)[0]?.replace(/\*\*/g, '').trim();
  return para === undefined || para.length === 0 ? null : para;
}

/**
 * Everything after the first paragraph, for the section that follows the brief.
 * In simple mode the brief *is* the first paragraph, so the section carries on
 * from it rather than repeating it.
 */
export function restAfterFirstParagraph(text: string | null): string | null {
  if (text === null) return null;
  const rest = text.split(/\n\s*\n/).slice(1).join('\n\n').trim();
  return rest.length === 0 ? null : rest;
}

/**
 * The brief. Simple summaries open with a short plain paragraph, used whole.
 * Practitioner summaries are often one long paragraph, so the brief is its
 * first two sentences and the full summary follows in the section below.
 */
function briefOf(
  text: string | null,
  simple: boolean,
): { lead: string; truncated: boolean; remainder: string | null } | null {
  const para = firstParagraph(text);
  if (para === null) return null;
  const whole = { lead: para, truncated: false, remainder: null };
  if (simple) return whole;
  // A sentence ends at a stop followed by space and a capital or bracket, so
  // decimals ("5.8 days") and sequence notation never split a sentence.
  const ends = [...para.matchAll(/[.!?](?=\s+[A-Z(“"'])/g)].map((m) => m.index + 1);
  const cut = ends[1];
  if (cut === undefined) return whole;
  const rest = para.slice(cut).trim();
  if (rest.length === 0) return whole;
  return { lead: para.slice(0, cut).trim(), truncated: true, remainder: rest };
}

/**
 * What the overview section shows beneath the opening, so nothing is read twice:
 * it carries on from wherever the brief stopped — mid-paragraph when the brief
 * was cut to two sentences, otherwise at the next paragraph.
 */
export function summaryAfterBrief(text: string | null, simple: boolean): string | null {
  const brief = briefOf(text, simple);
  const later = restAfterFirstParagraph(text);
  if (brief?.truncated !== true) return later;
  const parts = [brief.remainder, later].filter((p): p is string => p !== null);
  return parts.length === 0 ? null : parts.join('\n\n');
}

export function RecordOpening({ peptide, simple }: { peptide: PeptidePage; simple: boolean }) {
  const brief = briefOf(simple ? peptide.simpleSummary : peptide.practitionerSummary, simple);
  const counts = countEvidenceRecords(peptide.claims);
  const openQuestions = peptide.gaps.filter(
    (g) => g.resolutionState === 'open' || g.resolutionState === 'partially_resolved',
  ).length;

  const steps = simple
    ? [
        ['#overview', 'What is it?'],
        ['#evidence', 'What has been studied?'],
        ['#research-questions', 'What nobody has shown yet'],
        ['#ask', 'What to ask a clinician'],
      ]
    : [
        ['#overview', 'What it is'],
        ['#evidence', 'What is known'],
        ['#research-questions', 'What is not known'],
        ['#protocols', 'What sources report'],
      ];

  return (
    <section aria-labelledby="record-opening-heading" className="mb-12">
      <h2 id="record-opening-heading" className="sr-only">
        In brief
      </h2>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:gap-12">
        <div>
          <p className="meta-label text-tide-teal">In brief</p>
          {brief === null ? (
            <p className="mt-2 text-slate italic">
              A summary has not been written and reviewed for this reading depth yet.
            </p>
          ) : (
            <>
              <p
                className={`depth-body mt-2 font-serif leading-relaxed text-ink ${simple ? 'text-xl' : 'text-lg'}`}
              >
                {brief.lead}
              </p>
              {brief.truncated ? (
                <a href="#overview" className="mt-2 inline-block text-sm text-deep-tide hover:underline">
                  The summary continues below
                </a>
              ) : null}
            </>
          )}

          <nav aria-label="Read as far as you need" className="no-print mt-6">
            <p className="meta-label">Read as far as you need</p>
            <ol className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm">
              {steps.map(([href, label], i) => (
                <li key={href}>
                  <a href={href} className="inline-flex items-baseline gap-1.5 text-deep-tide hover:underline">
                    <span className="tabular text-2xs text-slate">{i + 1}</span>
                    {label}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </div>

        <div className="rounded-xl border border-rule bg-mist px-5 py-5">
          <p className="meta-label">{simple ? 'Where the evidence comes from' : 'The shape of the evidence'}</p>
          <ul className="mt-3 space-y-2.5">
            {LANES.map((l) => {
              const n = counts[l.lane];
              return (
                <li key={l.lane} className={`rounded-lg px-3.5 py-2.5 ${l.tint}`}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm font-medium text-ink">{simple ? l.simpleLabel : l.label}</span>
                    <span className="tabular text-xs text-ink-soft">
                      {n === 0 ? 'none recorded' : formatEvidenceRecordCount(l.lane, n)}
                    </span>
                  </div>
                  <div className="mt-2 flex min-h-3 flex-wrap items-center gap-1.5" aria-hidden="true">
                    {Array.from({ length: Math.min(n, MAX_MARKS) }, (_, i) => (
                      <span key={i} className={`inline-block ${l.mark}`} />
                    ))}
                    {n > MAX_MARKS ? <span className="text-2xs text-slate">+{n - MAX_MARKS}</span> : null}
                    {n === 0 ? (
                      <span className="inline-block h-3 w-16 rounded-full border border-dashed border-slate/50" />
                    ) : null}
                  </div>
                </li>
              );
            })}
            <li className="rounded-lg border border-dashed border-[var(--color-caution-rule)] bg-warm-white px-3.5 py-2.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-medium text-ink">
                  {simple ? 'Not shown by anyone yet' : 'Recorded as not established'}
                </span>
                <a href="#research-questions" className="tabular text-xs text-[var(--color-caution)] hover:underline">
                  {openQuestions} {openQuestions === 1 ? 'open question' : 'open questions'}
                </a>
              </div>
            </li>
          </ul>
          <p className="mt-3 text-xs leading-relaxed text-slate">
            {simple ? EVIDENCE_RECORD_DEFINITION.simpleShort : EVIDENCE_RECORD_DEFINITION.short}{' '}
            <a href="#evidence" className="text-deep-tide hover:underline">
              {simple ? 'How they are counted' : 'Definition'}
            </a>
          </p>
          {counts.human === 0 ? (
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">
              {simple
                ? 'No study in people is recorded here. What is known comes from animals, cells or practice — which cannot show what happens in people.'
                : 'No human evidence record is held here. The preclinical and practice sources below do not establish effects in people.'}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function ClaimLine({ claim, simple }: { claim: PublicClaim; simple: boolean }) {
  const lane = laneOf(claim);
  return (
    <li className="flex gap-3 border-t border-rule-soft py-3 first:border-t-0 first:pt-0">
      <div className="min-w-0 flex-1">
        <p className="depth-body leading-relaxed text-ink">
          {simple ? (claim.plainLanguageText ?? claim.claimText) : claim.claimText}
        </p>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate">
          {lane === null ? null : (
            <EvidenceClassTag evidenceClass={lane === 'reference' ? 'reference_opinion' : lane} />
          )}
          <Link href={`#claim-${claim.claimKey}`} className="text-deep-tide hover:underline">
            See the evidence behind it
          </Link>
        </p>
      </div>
    </li>
  );
}

/**
 * Mechanism, as sources state it.
 *
 * Deliberately not a drawing. A pathway diagram for a compound would assert a
 * mechanism more confidently than any of its sources do, so the statements are
 * listed with the class of evidence behind each — which for most compounds here
 * shows at once that the mechanism is a laboratory finding.
 */
export function MechanismAsReported({ claims, simple }: { claims: readonly PublicClaim[]; simple: boolean }) {
  const mechanism = claims.filter((c) => (c.claimCategory ?? '').startsWith('mechanism'));
  if (mechanism.length === 0) return null;
  const preclinical = mechanism.filter((c) => laneOf(c) === 'preclinical').length;
  return (
    <div>
      <p className="depth-body max-w-[64ch] text-ink-soft">
        {simple
          ? `How sources describe it working. ${preclinical === mechanism.length ? 'All of it' : `${String(preclinical)} of ${String(mechanism.length)} statements`} comes from animal or laboratory work, which shows what can happen in a laboratory, not what happens in a person.`
          : `${String(preclinical)} of ${String(mechanism.length)} mechanism statements rest on preclinical evidence. Listed as sources state them; this index draws no pathway.`}
      </p>
      <ul className="mt-5">
        {mechanism.map((claim) => (
          <ClaimLine key={claim.id} claim={claim} simple={simple} />
        ))}
      </ul>
      <p className="mt-4 text-sm text-slate">
        For how signalling works in general — not specific to this compound —{' '}
        <Link href="/learn/peptide-signalling" className="text-deep-tide underline decoration-tide-teal/40 underline-offset-2">
          see the Learn topic
        </Link>
        .
      </p>
    </div>
  );
}

/**
 * Safety, gathered from the record.
 *
 * The statements about safety are already on the page, spread across evidence
 * classes; the unknowns are already recorded as gaps. This brings them together,
 * links each back to its evidence, and says plainly that an absence of reported
 * harm is not evidence of safety.
 */
export function SafetyContext({ peptide, simple }: { peptide: PeptidePage; simple: boolean }) {
  const safety = peptide.claims.filter((c) => (c.claimCategory ?? '').startsWith('safety'));
  const unknown = peptide.gaps.filter((g) => g.gapType === 'safety_not_established');
  return (
    <div className="space-y-6">
      {safety.length === 0 ? (
        <p className="depth-body max-w-[64ch] rounded-lg border border-dashed border-rule bg-mist px-4 py-3 text-ink-soft">
          No statement about safety has been extracted for this compound. That is a statement about this
          record, and it is not evidence that the compound is safe.
        </p>
      ) : (
        <ul>
          {safety.map((claim) => (
            <ClaimLine key={claim.id} claim={claim} simple={simple} />
          ))}
        </ul>
      )}
      {unknown.length > 0 ? (
        <div className="rounded-xl border border-[var(--color-caution-rule)] bg-[var(--color-caution-bg)] px-5 py-4">
          <p className="meta-label text-[var(--color-caution)]">
            {simple ? 'Not known about safety' : 'Safety not established'}
          </p>
          <ul className="mt-2 space-y-2">
            {unknown.map((gap) => (
              <li key={gap.id} className="depth-body leading-relaxed text-ink">
                {gap.statement}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <p className="max-w-[64ch] text-sm text-slate">
        No reported harm is not the same as shown to be safe. What trials of limited size and length
        cannot rule out is recorded with each statement.
      </p>
    </div>
  );
}
