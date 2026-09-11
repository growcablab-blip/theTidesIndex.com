import Link from 'next/link';
import type { CertificateTestReading } from '@/server/public/certificate';

/**
 * Page sections specific to the certificate guide.
 *
 * Kept beside the route rather than in the shared component directory: each is
 * about this page's argument rather than about certificates in general, and
 * promoting them would invite reuse where the wording would no longer be true.
 */

/**
 * The document taxonomy, as something a reader can locate their own document in.
 *
 * The scope warning is the point. Q7 §11.4 states what an API or intermediate
 * certificate should contain, and that is the only document family in this table
 * for which this index holds any content requirement at all. Presenting it
 * without that boundary would turn a guideline for pharmaceutical manufacturers
 * into a rule for everyone.
 */
const DOCUMENT_TYPES: readonly {
  key: string;
  name: string;
  issuedBy: string;
  answers: string;
  requirementsHeld: string | null;
}[] = [
  {
    key: 'manufacturer_coa',
    name: 'Manufacturer certificate of analysis',
    issuedBy: 'The manufacturer’s quality unit',
    answers: 'What the manufacturer released this batch against.',
    requirementsHeld:
      'ICH Q7 §11.4 — for active pharmaceutical ingredients and intermediates only',
  },
  {
    key: 'third_party_test_report',
    name: 'Third-party analytical test report',
    issuedBy: 'A laboratory, on a sample submitted to it',
    answers: 'What a laboratory found in the sample it received.',
    requirementsHeld: null,
  },
  {
    key: 'finished_product_release',
    name: 'Finished-product release document',
    issuedBy: 'Whoever released the finished product',
    answers: 'What the finished product was released against.',
    requirementsHeld: null,
  },
  {
    key: 'supplier_repacker_certificate',
    name: 'Distributor or repacker certificate',
    issuedBy: 'A party between the manufacturer and the buyer',
    answers: 'What the reseller states, and what it points back to.',
    requirementsHeld:
      'ICH Q7 §11.4 and §17 — for active pharmaceutical ingredients and intermediates only',
  },
  {
    key: 'other_unknown',
    name: 'Unknown or other',
    issuedBy: 'Not established from the document',
    answers: 'Nothing can be assumed until the document is read.',
    requirementsHeld: null,
  },
];

export function DocumentTypes({ current }: { current: string | null }) {
  return (
    <div className="space-y-3">
      <ul className="grid gap-3 lg:grid-cols-2">
        {DOCUMENT_TYPES.map((type) => {
          const isCurrent = type.key === current;
          return (
            <li
              key={type.key}
              className={`rounded-md border px-4 py-3.5 ${
                isCurrent ? 'border-tide-teal border-l-[3px] bg-warm-white' : 'border-rule bg-warm-white'
              }`}
            >
              <p className="font-medium text-ink">
                {type.name}
                {isCurrent ? (
                  <span className="ml-2 text-xs tracking-wide text-deep-tide uppercase">
                    the specimen below
                  </span>
                ) : null}
              </p>
              <p className="mt-1 text-sm text-slate">Issued by: {type.issuedBy}</p>
              <p className="mt-1 text-sm text-ink-soft">{type.answers}</p>
              <p className="mt-2 text-xs text-slate">
                {type.requirementsHeld === null ? (
                  <span className="italic">
                    This index holds no source stating what this kind of document should contain.
                  </span>
                ) : (
                  <>
                    Content expectations held: <strong>{type.requirementsHeld}</strong>
                  </>
                )}
              </p>
            </li>
          );
        })}
      </ul>
      <p className="max-w-[68ch] text-sm text-slate">
        A document being called a certificate of analysis does not make it any particular one of
        these. Where this index states what a certificate should contain, the document family that
        requirement governs is stated with it — and it is never all of them.
      </p>
    </div>
  );
}

/**
 * The specimen's results, each leading to the topic that explains what that kind
 * of result addresses.
 *
 * Three states are kept visibly apart on every row: what the document reports,
 * what kind of question that addresses, and whether anyone has checked it. The
 * third is false everywhere and says so.
 */
export function CertificateTestList({
  tests,
  simple,
}: {
  tests: readonly CertificateTestReading[];
  simple: boolean;
}) {
  return (
    <ul className="space-y-4">
      {tests.map((test) => (
        <li key={test.id} className="rounded-md border border-rule bg-warm-white px-5 py-4">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <p className="font-medium text-ink">{test.testName}</p>
            {test.qualityTopicSlug === null ? null : test.qualityTopicIsPublished ? (
              <Link
                href={`/quality/${test.qualityTopicSlug}`}
                className="text-sm text-deep-tide underline decoration-rule underline-offset-2 hover:decoration-tide-teal"
              >
                What this addresses: {test.qualityTopicName}
              </Link>
            ) : (
              <span className="text-sm text-slate">
                {test.qualityTopicName}
                <span className="ml-2 text-xs tracking-wide uppercase">
                  reference page in preparation
                </span>
              </span>
            )}
          </div>

          <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            <Reported label="The document reports">
              {test.resultNumeric !== null
                ? `${test.resultNumeric}${test.resultUnit === null ? '' : ` ${test.resultUnit}`}`
                : (test.resultText ?? null)}
            </Reported>
            <Reported label="Acceptance criterion stated">{test.specificationText}</Reported>
            {simple ? null : <Reported label="Method">{test.analyticalMethod}</Reported>}
            {simple ? null : <Reported label="Method reference">{test.methodReference}</Reported>}
            {simple ? null : <Reported label="Test date">{test.testDate}</Reported>}
            <div>
              <dt className="text-xs tracking-wide text-slate uppercase">Checked by this index</dt>
              <dd className="mt-0.5">
                {test.independentlyVerified ? (
                  <span className="text-ink">{test.verificationNotes}</span>
                ) : (
                  // Never softened. A reported result and a verified one are
                  // different claims, and this index has only ever made the first.
                  <span className="text-[var(--color-caution)]">
                    Not checked — this index has not verified this result
                  </span>
                )}
              </dd>
            </div>
          </dl>
        </li>
      ))}
    </ul>
  );
}

/** A value the document states, or a marked absence. Never blank, never "N/A". */
function Reported({ label, children }: { label: string; children: string | null }) {
  return (
    <div>
      <dt className="text-xs tracking-wide text-slate uppercase">{label}</dt>
      <dd className="mt-0.5 text-ink">
        {children ?? (
          <span className="text-[var(--color-caution)]">Not stated on this document</span>
        )}
      </dd>
    </div>
  );
}

/**
 * What to ask of a document.
 *
 * Every question is answerable from the document or not, and none of them
 * implies that a particular answer is required — which would smuggle in a
 * specification this index cannot source. "Was a specification stated?" is a
 * question about the document. "Does it meet specification?" would not be.
 */
const QUESTIONS: readonly { question: string; why: string }[] = [
  {
    question: 'Which batch does this document say it describes?',
    why: 'Without a batch, the document cannot be tied to anything you hold.',
  },
  {
    question: 'Does that batch match what is on the container?',
    why: 'A matching number shows the document claims a relationship. It does not demonstrate one.',
  },
  {
    question: 'Who submitted the sample?',
    why: 'A sample submitted by the seller establishes a different chain from one drawn independently.',
  },
  {
    question: 'Which laboratory performed the analysis?',
    why: 'The party issuing a document and the party that tested can be different.',
  },
  {
    question: 'Is the original manufacturer named?',
    why: 'A reseller’s document may or may not point back to who made the material.',
  },
  {
    question: 'What method was used for each result?',
    why: 'A result without a method is hard to interpret and impossible to compare.',
  },
  {
    question: 'Was an acceptance criterion stated, and by whom?',
    why: 'A limit supplied by the party selling the material is a different thing from a compendial one.',
  },
  {
    question: 'Which attributes were not tested at all?',
    why: 'A document is silent about everything it does not list, and silence reads as reassurance.',
  },
  {
    question: 'Can any of it be checked with the issuer?',
    why: 'A professional-looking document is not evidence of its own authenticity.',
  },
];

export function QuestionsToAsk() {
  return (
    <ol className="max-w-[72ch] space-y-3">
      {QUESTIONS.map((item, index) => (
        <li key={item.question} className="grid grid-cols-[1.75rem_1fr] gap-2">
          <span className="tabular text-sm text-slate">{index + 1}.</span>
          <div>
            <p className="text-ink">{item.question}</p>
            <p className="mt-0.5 text-sm text-slate">{item.why}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
