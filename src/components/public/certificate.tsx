import Link from 'next/link';
import type {
  CertificateReading,
  CertificateTestReading,
  TransparencyDimension,
} from '@/server/public/certificate';

/**
 * Certificate education.
 *
 * The document is rendered as a document — annotated, with the questions placed
 * where they arise — rather than summarised into prose, because the skill being
 * taught is reading one, and a summary teaches nothing about where to look.
 *
 * Two things are said everywhere and cannot be turned off: that this specimen is
 * fictional, and that every result on it is *reported* rather than verified.
 */

const DOCUMENT_TYPES: Readonly<Record<string, { label: string; meaning: string }>> = {
  manufacturer_coa: {
    label: "Manufacturer's certificate of analysis",
    meaning:
      'Issued by the party that made the material, against a specification, by its own quality unit.',
  },
  third_party_test_report: {
    label: 'Third-party analytical test report',
    meaning:
      'A laboratory reporting on a sample submitted to it. It describes what arrived at the laboratory. It establishes nothing about who made the material, or about where the sample came from, beyond what the submitter said.',
  },
  finished_product_release: {
    label: 'Finished-product release document',
    meaning: 'Release documentation for a finished product.',
  },
  supplier_repacker_certificate: {
    label: 'Supplier, repacker or distributor certificate',
    meaning:
      'Reissued by a party in the supply chain rather than by the manufacturer. What it is worth depends on whether it references the original manufacturer and the original batch certificate.',
  },
  other_unknown: {
    label: 'Type not established',
    meaning:
      'The kind of document has not been determined. A file titled "COA" is not evidence that it is a manufacturer’s certificate.',
  },
};

const MATERIAL_SCOPE: Readonly<Record<string, string>> = {
  api: 'Active pharmaceutical ingredient',
  intermediate: 'Intermediate',
  bulk_material: 'Bulk material',
  finished_product: 'Finished product',
  unknown: 'Not stated on the document',
};

const BATCH_LINKAGE: Readonly<Record<string, { label: string; meaning: string }>> = {
  established: {
    label: 'Established',
    meaning: 'The link from the batch to the tested sample is supported by custody records.',
  },
  stated_only: {
    label: 'Stated, not demonstrated',
    meaning:
      'The document asserts a batch number. That is a claim by whoever issued it, not a demonstrated chain from the batch to the sample that was tested.',
  },
  not_established: {
    label: 'Not established',
    meaning: 'Nothing connects the tested sample to the batch in question.',
  },
  unknown: { label: 'Unknown', meaning: 'Not enough is recorded to say.' },
};

/** The banner that makes the specimen impossible to mistake for a real document. */
export function SpecimenNotice() {
  return (
    <div
      role="note"
      aria-label="Fictional specimen document"
      className="rounded-md border-2 border-dashed border-[var(--color-caution)] bg-[var(--color-caution-bg)] px-5 py-4"
    >
      <p className="text-sm font-semibold tracking-wide text-[var(--color-caution)] uppercase">
        Fictional specimen — not a real certificate
      </p>
      <p className="mt-1.5 max-w-[68ch] text-sm text-ink-soft">
        Every name, number, date and result below was invented for this page. No supplier,
        laboratory, batch or material here corresponds to anything real, and nothing was copied
        from a real certificate. It is deliberately imperfect: what it leaves out is the part
        worth learning.
      </p>
    </div>
  );
}

/** One labelled line of the document, with absence shown rather than hidden. */
/**
 * One numbered marker on the document.
 *
 * The ten fields a reader has to be able to find are marked and keyed, the way
 * an annotated figure in a textbook is. Before this the certificate rendered as
 * two columns of equally weighted rows, which is what a real certificate looks
 * like and is exactly the problem: the reader cannot tell which rows carry the
 * question they came with.
 */
function Marker({ n }: { n: number }) {
  return (
    <span
      aria-hidden="true"
      className="mr-2 inline-flex h-[1.15rem] w-[1.15rem] shrink-0 items-center justify-center rounded-full bg-deep-tide align-[0.05rem] text-[0.625rem] font-medium text-warm-white"
    >
      {n}
    </span>
  );
}

function Field({
  label,
  value,
  note,
  marker,
}: {
  label: string;
  value: string | null;
  note?: string | undefined;
  marker?: number | undefined;
}) {
  return (
    <div className="border-b border-rule py-2 last:border-b-0">
      <dt className="flex items-center text-xs tracking-wide text-slate uppercase">
        {marker === undefined ? null : <Marker n={marker} />}
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-ink">
        {value ?? (
          // Not blank, not "N/A". A field the document does not carry is the
          // most informative thing on the page and is labelled accordingly.
          <span className="text-[var(--color-caution)]">Not stated on this document</span>
        )}
        {note ? <span className="mt-0.5 block text-xs text-slate">{note}</span> : null}
      </dd>
    </div>
  );
}

/**
 * Ten things to find on any certificate.
 *
 * Numbered here and marked on the document below and in the results table, so a
 * reader can carry the numbers to a real document. Four of the ten are about
 * the *result*; six are about whether the document describes the material in
 * front of them, which is the ratio the page is arguing for.
 */
const ANNOTATIONS: readonly { n: number; label: string; why: string }[] = [
  { n: 1, label: 'Material', why: 'What the document says was tested.' },
  { n: 2, label: 'Batch or lot', why: 'The number to compare against the container.' },
  { n: 3, label: 'Sample', why: 'What actually reached the laboratory.' },
  { n: 4, label: 'Laboratory', why: 'Who performed the analysis, not who issued the document.' },
  { n: 5, label: 'Test', why: 'Each line is a separate measurement.' },
  { n: 6, label: 'Method', why: 'Which question that measurement answers.' },
  { n: 7, label: 'Result', why: 'The number, and what it is a proportion of.' },
  { n: 8, label: 'Date', why: 'When, relative to manufacture and to now.' },
  { n: 9, label: 'Specification', why: 'What the result was judged against, if anything.' },
  { n: 10, label: 'Report ID', why: 'What to quote when asking about this document.' },
];

function AnnotationKey() {
  return (
    <div className="rounded-md border border-rule bg-mist px-5 py-4">
      <p className="meta-label">Ten things to find on any certificate</p>
      <ul className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
        {ANNOTATIONS.map((item) => (
          <li key={item.n} className="flex items-start text-sm">
            <Marker n={item.n} />
            <span>
              <span className="font-medium text-ink">{item.label}</span>{' '}
              <span className="text-slate">— {item.why}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AnnotatedCertificate({
  certificate,
  simple,
}: {
  certificate: CertificateReading;
  simple: boolean;
}) {
  const type = DOCUMENT_TYPES[certificate.certificateType] ?? DOCUMENT_TYPES.other_unknown!;
  const linkage = BATCH_LINKAGE[certificate.batchLinkage] ?? BATCH_LINKAGE.unknown!;

  return (
    <div className="space-y-6">
      <SpecimenNotice />

      <AnnotationKey />

      <article className="rounded-md border border-rule bg-warm-white">
        <header className="border-b border-rule px-5 py-4">
          <p className="text-xs tracking-wide text-slate uppercase">What kind of document is this</p>
          <p className="mt-1 font-serif text-lg text-deep-tide">{type.label}</p>
          <p className="mt-1 max-w-[62ch] text-sm text-ink-soft">{type.meaning}</p>
        </header>

        <div className="grid gap-x-8 px-5 py-2 sm:grid-cols-2">
          <dl>
            <Field label="Document title" value={certificate.documentTitle} />
            <Field label="Issued by" value={certificate.issuingEntity} />
            <Field
              label="Laboratory that performed the analysis"
              value={certificate.laboratoryName}
              marker={4}
            />
            {simple ? null : (
              <Field label="Laboratory address" value={certificate.laboratoryAddress} />
            )}
            <Field
              label="Original manufacturer"
              value={certificate.manufacturerName}
              note={
                certificate.manufacturerName === null
                  ? 'Without this, the material cannot be traced to whoever made it.'
                  : undefined
              }
            />
            <Field label="Supplier or distributor" value={certificate.distributorName} />
            <Field label="Document date" value={certificate.documentDate} marker={8} />
            <Field label="Report number" value={certificate.reportNumber} marker={10} />
          </dl>

          <dl>
            <Field label="Material named" value={certificate.statedMaterialName} marker={1} />
            {simple ? null : <Field label="Grade" value={certificate.statedGrade} />}
            <Field
              label="Batch or lot number"
              value={certificate.batchNumber}
              marker={2}
              note="This is the number to compare against the container in hand."
            />
            <Field
              label="Manufacturer's own batch number"
              value={certificate.manufacturerBatchNumber}
            />
            <Field label="Laboratory sample identifier" value={certificate.sampleIdentifier} marker={3} />
            <Field label="Sample submitted by" value={certificate.submittedBy} />
            <Field label="What was tested" value={MATERIAL_SCOPE[certificate.testedMaterialScope] ?? null} />
            <Field label="Signed by" value={certificate.authorisedBy} />
          </dl>
        </div>

        <div className="border-t border-rule px-5 py-4">
          <p className="text-xs tracking-wide text-slate uppercase">
            Does this document describe the material in hand?
          </p>
          <p className="mt-1 text-sm font-medium text-ink">{linkage.label}</p>
          <p className="mt-1 max-w-[68ch] text-sm text-ink-soft">{linkage.meaning}</p>
        </div>
      </article>

      <TestTable tests={certificate.tests} simple={simple} />
    </div>
  );
}

/**
 * The results, with what is missing given the same weight as what is present.
 *
 * A result with no acceptance criterion cannot be judged, so the absence of one
 * is shown in the same column where a criterion would have been rather than left
 * as white space.
 */
function TestTable({
  tests,
  simple,
}: {
  tests: readonly CertificateTestReading[];
  simple: boolean;
}) {
  return (
    <section aria-labelledby="specimen-results">
      <h3 id="specimen-results" className="font-serif text-lg text-deep-tide">
        What was tested, and what was reported
      </h3>
      <p className="mt-1 max-w-[68ch] text-sm text-slate">
        Every entry below is what the document <em>reports</em>. Nothing on this page has been
        checked against anything other than the document itself.
      </p>

      <ul className="mt-4 space-y-4">
        {tests.map((test) => (
          <li key={test.id} className="rounded-md border border-rule px-5 py-4">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h4 className="text-base font-medium text-ink">{test.testName}</h4>
              <ReportedNotVerified verified={test.independentlyVerified} />
            </div>

            <dl className="mt-3 grid gap-x-8 gap-y-0 sm:grid-cols-2">
              <Field
                label="Reported result"
                value={
                  test.resultNumeric !== null
                    ? `${test.resultNumeric}${test.resultUnit ? ` ${test.resultUnit}` : ''}`
                    : test.resultText
                }
              />
              <Field
                label="Acceptance criterion"
                value={test.specificationText}
                note={
                  test.specificationText === null
                    ? 'Without a stated limit, there is nothing for the result to be measured against.'
                    : undefined
                }
              />
              {simple ? null : <Field label="Method" value={test.analyticalMethod} />}
              {simple ? null : <Field label="Method reference" value={test.methodReference} />}
              {simple ? null : <Field label="Test date" value={test.testDate} />}
              {simple ? null : (
                <Field label="Chromatogram or spectrum" value={test.attachmentReference} />
              )}
            </dl>

            {test.qualityTopicName ? (
              <p className="mt-3 text-sm">
                <span className="text-slate">What this kind of result does and does not show: </span>
                {test.qualityTopicIsPublished && test.qualityTopicSlug ? (
                  <Link
                    href={`/quality/${test.qualityTopicSlug}`}
                    className="underline decoration-rule underline-offset-2 hover:text-deep-tide"
                  >
                    {test.qualityTopicName}
                  </Link>
                ) : (
                  <>
                    {test.qualityTopicName}{' '}
                    <span className="text-xs tracking-wide text-slate uppercase">
                      reference page in preparation
                    </span>
                  </>
                )}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * The distinction the whole certificate section turns on.
 *
 * "The document reports this" and "this index has checked it" are different
 * statements, and the second has never been true of anything here. Shown on
 * every result rather than explained once at the top, because a reader scanning
 * a table will not carry a preamble down the page with them.
 */
export function ReportedNotVerified({ verified }: { verified: boolean }) {
  if (verified) {
    return (
      <span className="rounded-full border border-tide-teal px-2.5 py-0.5 text-xs text-deep-tide">
        Independently checked
      </span>
    );
  }
  return (
    <span className="rounded-full border border-dashed border-rule px-2.5 py-0.5 text-xs text-slate">
      Reported by the document — not independently checked
    </span>
  );
}

/**
 * Transparency dimensions, never a score.
 *
 * A single number would be read as a verdict on the product, and it would be
 * wrong in both directions: a thoroughly documented certificate can describe
 * poor material, and a sparse one can carry a perfectly sound analytical result.
 * So each dimension stands alone, reports which fields are present and which are
 * not, and nothing adds them up.
 */
export function TransparencyDimensions({
  dimensions,
}: {
  dimensions: readonly TransparencyDimension[];
}) {
  const STATE_LABEL: Readonly<Record<string, string>> = {
    present: 'All of these are stated',
    partial: 'Some of these are stated',
    absent: 'None of these are stated',
  };

  return (
    <>
      <p className="max-w-[68ch] text-sm text-slate">
        These describe how much the <em>document</em> tells you. They are not a rating of the
        material, and they are deliberately not added up — a well-documented certificate can
        describe poor material, and a sparse one can carry a perfectly sound result.
      </p>

      <ul className="mt-4 grid gap-3 lg:grid-cols-2">
        {dimensions.map((dimension) => (
          <li
            key={dimension.key}
            className={`rounded-md border px-4 py-3.5 ${
              dimension.state === 'present'
                ? 'border-rule bg-warm-white'
                : 'border-[var(--color-caution-rule)] bg-[var(--color-caution-bg)]'
            }`}
          >
            {/* h3: these sit directly under the section heading, and a jump from
                h2 to h4 breaks the outline a screen-reader user navigates by. */}
            <h3 className="text-sm font-medium text-ink">{dimension.label}</h3>
            <p className="mt-0.5 text-sm text-slate">{dimension.question}</p>
            <p className="mt-2 text-xs tracking-wide text-slate uppercase">
              {STATE_LABEL[dimension.state]}
            </p>
            {dimension.absent.length > 0 ? (
              <ul className="mt-1.5 space-y-0.5 text-sm text-ink-soft">
                {dimension.absent.map((field) => (
                  <li key={field}>
                    <span aria-hidden="true" className="text-[var(--color-caution)]">
                      —{' '}
                    </span>
                    <span className="sr-only">Missing: </span>
                    {field}
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>
    </>
  );
}

/**
 * The chain the reader is being taught to walk, drawn as a chain that breaks.
 *
 * Each step is a link that either holds or does not, and the figure marks which.
 * A diagram showing an unbroken arrow from vial to result would teach exactly
 * the wrong lesson.
 */
export function ChainOfCustodyFigure({
  certificate,
  id = 'fig-coa-chain',
}: {
  certificate: CertificateReading;
  id?: string;
}) {
  const titleId = `${id}-title`;
  const descId = `${id}-desc`;

  const steps: { label: string; value: string | null; holds: boolean }[] = [
    { label: 'Container in hand', value: 'you have this', holds: false },
    { label: 'Batch or lot', value: certificate.batchNumber, holds: certificate.batchNumber !== null },
    {
      label: 'This document',
      value: certificate.reportNumber,
      holds: certificate.reportNumber !== null,
    },
    {
      label: 'Sample tested',
      value: certificate.sampleIdentifier,
      holds: certificate.sampleIdentifier !== null,
    },
    {
      label: 'Laboratory',
      value: certificate.laboratoryName,
      holds: certificate.laboratoryName !== null,
    },
    {
      label: 'Result',
      value: `${String(certificate.tests.length)} reported`,
      holds: certificate.tests.length > 0,
    },
  ];

  const boxWidth = 108;
  const gap = 14;

  return (
    <figure className="my-2">
      <p className="no-print mb-1 text-xs text-slate sm:hidden" aria-hidden="true">
        Scroll the figure sideways to see all of it.
      </p>
      <div className="overflow-x-auto">
        <svg
          viewBox="0 0 736 150"
          role="img"
          aria-labelledby={`${titleId} ${descId}`}
          className="h-auto w-full min-w-[560px] text-ink"
          preserveAspectRatio="xMidYMid meet"
        >
          <title id={titleId}>Can the chain from container to result be connected?</title>
          <desc id={descId}>
            Six steps in a row: the container in hand, the batch or lot, this document, the sample
            that was tested, the laboratory, and the result. The link between the container in hand
            and the batch is marked as not established, because nothing in a certificate connects a
            document to a particular container. The remaining links are marked according to whether
            this document names the identifier that would connect them.
          </desc>

          {steps.map((step, i) => {
            const x = 8 + i * (boxWidth + gap);
            const firstLink = i === 0;
            return (
              <g key={step.label}>
                <rect
                  x={x}
                  y={34}
                  width={boxWidth}
                  height={58}
                  rx="4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.4}
                  strokeDasharray={step.holds ? undefined : '5 4'}
                  className={step.holds ? 'text-rule' : 'text-[var(--color-caution)]'}
                />
                <text x={x + boxWidth / 2} y={58} fill="currentColor" fontSize="11" textAnchor="middle">
                  {step.label.length > 18 ? step.label.slice(0, 17) + '…' : step.label}
                </text>
                <text
                  x={x + boxWidth / 2}
                  y={76}
                  fill="currentColor"
                  fontSize="10"
                  textAnchor="middle"
                  opacity="0.72"
                >
                  {step.value ?? 'not stated'}
                </text>

                {i < steps.length - 1 ? (
                  <>
                    <line
                      x1={x + boxWidth}
                      y1={63}
                      x2={x + boxWidth + gap}
                      y2={63}
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeDasharray={firstLink ? '4 3' : undefined}
                      className={firstLink ? 'text-[var(--color-caution)]' : 'text-ink'}
                    />
                    {firstLink ? (
                      <text
                        x={x + boxWidth + gap / 2}
                        y={108}
                        fill="currentColor"
                        fontSize="9"
                        textAnchor="middle"
                        className="text-[var(--color-caution)]"
                      >
                        broken
                      </text>
                    ) : null}
                  </>
                ) : null}
              </g>
            );
          })}

          <text x="8" y="20" fill="currentColor" fontSize="11" opacity="0.75">
            A dashed box is an identifier this document does not give
          </text>
          <text x="8" y="136" fill="currentColor" fontSize="10" opacity="0.75">
            No certificate can connect itself to a particular container. That link is always made by
            someone, not by the document.
          </text>
        </svg>
      </div>
      <figcaption className="mt-3 max-w-[64ch] text-sm text-slate">
        The first link is the one that is never made by the document itself: nothing printed on a
        certificate shows that the material in a given container is the batch it names. That
        connection is asserted by whoever supplied it.
      </figcaption>
    </figure>
  );
}
