import { EXPORT_IS_NOT_AN_APPROVAL, type ExportedSource } from '@/server/editorial/packet-export';
import type { BundleClaim, ReviewBundle } from '@/server/editorial/review-bundle';

/**
 * The external review bundle, as a printed submission.
 *
 * Four parts, in the order a reviewer meets them: who is asking and why; what
 * they are being asked to do; the evidence; and a form to answer on.
 *
 * The form is **printed, not interactive**. That is not a limitation of the
 * medium, it is the point: an approval is a row bound to a version, written by
 * an identified person through the application. A form that posted would make a
 * returned document into a review record, and a returned document is not one —
 * a scanned tick cannot be attributed with the confidence an approval needs, and
 * nothing here should make it look as though it can.
 *
 * So the whole document contains no form, button, input, select or textarea, and
 * a test asserts that against the rendered markup.
 */

const PRINT_CSS = `
  @page { margin: 18mm 16mm; }
  .tides-bundle { color: #1a1a1a; }
  .tides-bundle .avoid-break { break-inside: avoid; page-break-inside: avoid; }
  .tides-bundle .page-break { break-before: page; page-break-before: always; }
  @media print {
    .tides-bundle [data-screen-only] { display: none !important; }
    .tides-bundle { font-size: 10pt; line-height: 1.42; }
    .tides-bundle a { text-decoration: none; color: inherit; }
  }
`;

export function ReviewBundleDocument({ bundle }: { bundle: ReviewBundle }) {
  const doc = bundle.document;
  const issuedDay = doc.issuedAt.slice(0, 10);

  return (
    <article className="tides-bundle mx-auto max-w-[46rem] bg-white px-6 py-8 text-ink">
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />

      <p
        data-screen-only
        className="mb-6 rounded-sm border border-rule bg-mist px-3 py-2 text-xs text-slate"
      >
        Print this page, or save it as a PDF, from your browser. Four parts: cover, guide, packet,
        response form. Set for A4 and Letter.
      </p>

      {/* ================= A. COVER ======================================== */}
      <header className="avoid-break">
        <p className="text-xs font-semibold tracking-[0.14em] text-slate uppercase">
          The Tides Index · Part A
        </p>
        <h1 className="mt-2 font-serif text-3xl leading-tight text-ink">
          Request for scientific review
        </h1>
        <p className="mt-3 max-w-[62ch] text-sm leading-relaxed">
          The Tides Index is an independent reference on peptide science, evidence and quality.
          Every statement it publishes resolves to an exact page in a named source, and every page
          states both what a test establishes and what it does not.
        </p>
        <p className="mt-2 max-w-[62ch] text-sm leading-relaxed">
          <strong>Nothing has been published.</strong> This is the first packet prepared for
          scientific review, and no record in it has been approved by anyone.
        </p>

        <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 border-y border-ink py-3 text-sm">
          <Field label="Topic">{doc.topicName}</Field>
          <Field label="Record">
            {doc.qualityKey} · version {doc.version}
          </Field>
          <Field label="Document">{doc.documentId}</Field>
          <Field label="Issued">{issuedDay}</Field>
          <Field label="Addressed to">
            {bundle.addressedTo ?? <span className="italic">reviewer not yet selected</span>}
          </Field>
          <Field label="Statements">
            {doc.packet.claims.length} for review · {doc.packet.gaps.length} declined points
          </Field>
        </dl>
      </header>

      <section aria-labelledby="cover-ask" className="avoid-break mt-6">
        <h2 id="cover-ask" className="font-serif text-lg text-ink">
          What you are being asked to assess
        </h2>
        <Bullets
          items={[
            'whether the source says what this index says it says;',
            'whether the reading of it is fair, and not stronger than the passage supports;',
            'whether the stated uncertainty covers what a reader ought to be warned about;',
            'whether the scope is right — population, material, document type, jurisdiction, era;',
            'whether anything is asserted that the cited passage does not carry.',
          ]}
        />
        <p className="mt-3 max-w-[62ch] text-sm leading-relaxed">
          The expertise this packet calls for is analytical: chromatography and pharmaceutical
          quality control. It does not call for peptide clinical practice — nothing in it concerns
          dosing, administration or patient care.
        </p>
      </section>

      <section
        aria-labelledby="not-an-approval"
        className="avoid-break mt-6 border-2 border-ink px-5 py-4"
      >
        <h2
          id="not-an-approval"
          className="text-xs font-semibold tracking-[0.14em] text-ink uppercase"
        >
          This document is not a review record
        </h2>
        <p className="mt-2 text-sm leading-relaxed">{EXPORT_IS_NOT_AN_APPROVAL}</p>
        <p className="mt-2 text-sm leading-relaxed">
          The response form in part D is how you tell us your decision. It is how the decision
          reaches an editor; it is not where the decision is recorded. See part D.
        </p>
      </section>

      {/* ================= B. GUIDE ======================================== */}
      <section aria-labelledby="guide" className="page-break mt-8">
        <PartHeading part="B" id="guide">
          Before you start
        </PartHeading>

        <h3 className="mt-4 font-serif text-base text-deep-tide">What you are not being asked</h3>
        <Bullets
          items={[
            'Not to write or rewrite the content. If something is wrong, request a change and say what is wrong. An editor revises it and it comes back to you.',
            'Not to judge any product, supplier or certificate. This index describes what tests establish; it does not rate anything.',
            'Not to vouch for sources this index does not hold. If a point needs a source we lack, that is a gap to record, not a statement to approve.',
            'Not to fill a gap from your own knowledge. If you know something our sources do not establish, that is a source for us to acquire. Approving it would make your expertise into a citation, which is not what a citation is.',
          ]}
        />

        <h3 className="mt-5 font-serif text-base text-deep-tide">
          The four things on every statement
        </h3>
        <dl className="mt-2 space-y-1.5 text-sm">
          <Inline term="Claim">the proposition as the index states it;</Inline>
          <Inline term="Evidence">
            the passage it rests on, with source, page, and the kind of source;
          </Inline>
          <Inline term="Interpretation">
            how the index reads that passage — our words, not the source&rsquo;s;
          </Inline>
          <Inline term="Uncertainty">what the index records as unsettled.</Inline>
        </dl>

        <h3 className="mt-5 font-serif text-base text-deep-tide">Three things worth knowing</h3>
        <Bullets
          items={[
            'An approval is bound to the version shown on the cover. Any later edit bumps the version and your approval stops applying — you will be asked again, and shown what changed rather than handed an apparently identical record.',
            'Evidence gaps are part of the review. A gap is a statement this index deliberately does not make because nothing it holds settles the point. A gap wrongly worded as a finding is the same error as an unsupported claim, and a missing gap is worth flagging.',
            'Declining is a legitimate outcome. If the packet is outside your expertise, or you cannot obtain a source, say so. That is more useful to us than a qualified approval.',
          ]}
        />

        <h3 className="mt-5 font-serif text-base text-deep-tide">
          Your standing and your conflicts
        </h3>
        <p className="mt-2 max-w-[64ch] text-sm leading-relaxed">
          Before your review is recorded we ask for your name, professional role, relevant
          expertise, a one- or two-line credential summary, organisation if you wish to give one,
          and a contact address. That is the whole of it; we do not collect anything else.
        </p>
        <p className="mt-2 max-w-[64ch] text-sm leading-relaxed">
          We also ask you to state either <strong>no relevant conflict</strong> or{' '}
          <strong>a disclosure</strong>, with as much explanation as you think the reader needs. A
          disclosed conflict does not disqualify anyone — it is recorded alongside the review so a
          reader can weigh it. What we will not do is publish an approval by someone nobody asked,
          which is why the question has three answers and not two.
        </p>
      </section>

      {/* ================= C. THE PACKET ================================== */}
      <section aria-labelledby="sources" className="page-break mt-8">
        <PartHeading part="C" id="sources">
          The evidence
        </PartHeading>

        <h3 className="mt-4 font-serif text-base text-deep-tide">Sources you need in front of you</h3>
        <p className="mt-1 max-w-[64ch] text-sm leading-relaxed">
          This bundle cites locations; it does not reproduce them. The works are third-party
          copyrighted material and this index does not redistribute them. Locators are each
          work&rsquo;s own printed pages, so they can be followed in any copy — if you cannot obtain
          one, tell us and we will arrange lawful access rather than send you a file.
        </p>
        <ul className="mt-4 space-y-4">
          {doc.sources.map((source) => (
            <li key={source.sourceKey} className="avoid-break border-l-2 border-rule pl-4">
              <SourceEntry source={source} />
            </li>
          ))}
        </ul>

        <h3 className="mt-8 font-serif text-base text-deep-tide">
          The statements ({doc.packet.claims.length})
        </h3>
        <ol className="mt-4 space-y-8">
          {bundle.claims.map((entry) => (
            <li key={entry.claim.id} className="avoid-break">
              <BundleClaimEntry entry={entry} />
            </li>
          ))}
        </ol>

        {doc.packet.gaps.length > 0 ? (
          <>
            <h3 className="mt-10 font-serif text-base text-deep-tide">
              Statements this topic does not make ({doc.packet.gaps.length})
            </h3>
            <p className="mt-1 max-w-[64ch] text-sm leading-relaxed">
              Each is a deliberate absence rather than an omission, and each is recorded against the
              topic rather than against any one statement above. You are asked to confirm the
              absences are right, and to say if something is missing from this list.
            </p>
            <ul className="mt-4 space-y-4">
              {doc.packet.gaps.map((gap, index) => (
                <li key={gap.statement} className="avoid-break border-l-2 border-rule pl-4">
                  <p className="text-xs font-semibold tracking-wide text-slate uppercase">
                    Gap {index + 1}
                    {gap.verificationIssueKey ? ` · ${gap.verificationIssueKey}` : ''}
                  </p>
                  <p className="mt-1 text-sm font-medium">{gap.statement}</p>
                  <p className="mt-1 text-sm text-ink-soft">{gap.whyNotSupported}</p>
                  {gap.whatWouldResolveIt ? (
                    <p className="mt-1 text-sm text-ink-soft">
                      <span className="font-medium">Would be resolved by:</span>{' '}
                      {gap.whatWouldResolveIt}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </>
        ) : null}

        <h3 className="mt-8 font-serif text-base text-deep-tide">
          What this bundle does not contain
        </h3>
        <Bullets items={doc.omissions} />
      </section>

      {/* ================= D. RESPONSE FORM =============================== */}
      <section aria-labelledby="form" className="page-break mt-8">
        <PartHeading part="D" id="form">
          Your response
        </PartHeading>

        <p className="mt-3 max-w-[64ch] text-sm leading-relaxed">
          One row per statement. Mark one of the three boxes and write as much as you need; a change
          request with no reason cannot be acted on, and a comment is worth having even where you
          approve.
        </p>
        <p className="mt-2 max-w-[64ch] text-sm leading-relaxed">
          <strong>What happens to this sheet.</strong> Your comments are transcribed against the
          record verbatim and attributed to you. Your decision is not: an approval or change request
          is entered in the application by you, against version {doc.version} of{' '}
          {doc.qualityKey}. Returning this sheet, signed or ticked, records nothing on its own —
          and an editor will not enter a decision on your behalf.
        </p>

        <ul className="mt-6 space-y-6">
          {bundle.claims.map((entry) => (
            <li key={entry.claim.id} className="avoid-break">
              <ResponseRow claimKey={entry.claim.claimKey} claimText={entry.claim.claimText} />
            </li>
          ))}
          <li className="avoid-break">
            <ResponseRow
              claimKey="Gaps"
              claimText="The statements this topic declines to make, taken together."
            />
          </li>
        </ul>

        <div className="avoid-break mt-8">
          <h3 className="font-serif text-base text-deep-tide">Overall comments</h3>
          <p className="mt-1 text-sm text-ink-soft">
            Anything about the packet as a whole: something missing, something that should not be
            here, or the question we did not think to ask.
          </p>
          <RuledLines count={8} />
        </div>

        <div className="avoid-break mt-8 border-t border-ink pt-4">
          <h3 className="font-serif text-base text-deep-tide">Standing and conflicts</h3>
          <p className="mt-1 max-w-[64ch] text-sm text-ink-soft">
            Recorded alongside your review. A disclosed conflict does not disqualify you.
          </p>
          <dl className="mt-3 space-y-3 text-sm">
            <LabelledLine label="Name" />
            <LabelledLine label="Professional role" />
            <LabelledLine label="Relevant expertise" />
            <LabelledLine label="Organisation (optional)" />
            <LabelledLine label="Credential summary (one or two lines)" />
            <LabelledLine label="Contact email" />
          </dl>
          <p className="mt-4 text-sm">
            <Box /> No relevant conflict to disclose&nbsp;&nbsp;&nbsp;<Box /> Disclosure provided,
            as follows
          </p>
          <RuledLines count={3} />
          <p className="mt-4 text-sm">
            Signed <span className="inline-block w-56 border-b border-ink" />
            &nbsp;&nbsp;Date <span className="inline-block w-32 border-b border-ink" />
          </p>
          <p className="mt-2 text-xs text-slate">
            A signature here records that this sheet is yours. It does not record an approval — see
            the note at the head of part D.
          </p>
        </div>
      </section>

      <footer className="avoid-break mt-10 border-t border-ink pt-3 text-xs text-slate">
        <p>
          {doc.documentId} · {doc.topicName} · version {doc.version} · issued {issuedDay} · The
          Tides Index. Not for circulation beyond the named reviewer. This index does not publish a
          topic on an approval it cannot attribute to a person.
        </p>
      </footer>
    </article>
  );
}

function BundleClaimEntry({ entry }: { entry: BundleClaim }) {
  const { claim, scope, status } = entry;

  return (
    <div>
      <p className="text-xs font-semibold tracking-wide text-slate uppercase">
        {claim.claimKey} · {claim.importance.replaceAll('_', ' ')} · version {claim.version}
      </p>
      <p className="mt-1.5 text-[0.95rem] leading-relaxed font-medium">{claim.claimText}</p>

      {claim.plainLanguageText ? (
        <Labelled label="In plain language">{claim.plainLanguageText}</Labelled>
      ) : null}
      {claim.interpretationNotes ? (
        <Labelled label="How this index reads it">{claim.interpretationNotes}</Labelled>
      ) : null}
      {claim.uncertaintyText ? (
        <Labelled label="What remains uncertain">{claim.uncertaintyText}</Labelled>
      ) : null}

      {/* --- Scope ------------------------------------------------------- */}
      <div className="mt-3">
        <SubHeading>Scope</SubHeading>
        {scope.noRecordedScope ? (
          <p className="mt-1 max-w-[64ch] text-sm text-ink-soft">
            Nothing on this record narrows the statement beyond its own wording. If it should be
            narrower — a material type, a context, an era — that is a change to request.
          </p>
        ) : (
          <ul className="mt-1 space-y-1 text-sm text-ink-soft">
            {scope.certificateTypeScope ? (
              <li>
                Applies to {scope.certificateTypeScope.replaceAll('_', ' ')} documents only.
              </li>
            ) : null}
            {scope.claimCategory ? <li>Claim family: {scope.claimCategory}.</li> : null}
            {scope.sourceSubjects.map((subject) => (
              <li key={subject}>Read within: {subject}.</li>
            ))}
          </ul>
        )}
      </div>

      {/* --- Evidence ---------------------------------------------------- */}
      <div className="mt-3">
        <SubHeading>
          {claim.evidence.length === 1
            ? 'Rests on one passage'
            : `Rests on ${String(claim.evidence.length)} passages`}
        </SubHeading>
        <ul className="mt-1.5 space-y-2 text-sm">
          {claim.evidence.map((evidence, index) => (
            <li key={`${evidence.sourceKey}-${String(index)}`}>
              <span className="font-medium">{evidence.sourceKey}</span>{' '}
              <span className="text-ink-soft">{evidence.sourceTitle}</span>
              <div className="text-ink-soft">
                {evidence.locatorText ?? 'exact location not recorded'}
                {evidence.filePage !== null ? (
                  <span className="text-slate"> (file page {evidence.filePage})</span>
                ) : null}
              </div>
              {evidence.chapter ?? evidence.section ?? evidence.tableNumber ?? evidence.figure ? (
                <div className="text-xs text-slate">
                  {[
                    evidence.chapter,
                    evidence.section,
                    evidence.tableNumber ? `table ${evidence.tableNumber}` : null,
                    evidence.figure ? `figure ${evidence.figure}` : null,
                  ]
                    .filter((v) => v !== null)
                    .join(' · ')}
                </div>
              ) : null}
              <div className="text-xs text-slate">
                {evidence.sourceTypeLabel} · {evidence.relationship.replaceAll('_', ' ')} ·{' '}
                {evidence.evidenceTypeKey.replaceAll('_', ' ')}
              </div>
              {evidence.interpretation ? (
                <p className="mt-0.5 text-ink-soft">{evidence.interpretation}</p>
              ) : null}
            </li>
          ))}
        </ul>
      </div>

      {/* --- Status ------------------------------------------------------ */}
      <div className="mt-3">
        <SubHeading>Evidence status</SubHeading>
        <ul className="mt-1 space-y-0.5 text-sm text-ink-soft">
          <li>
            {status.passagesWithLocator} of {status.passages}{' '}
            {status.passages === 1 ? 'passage resolves' : 'passages resolve'} to an exact location.
          </li>
          <li>
            {status.allSourcesCitable
              ? 'Every source behind this statement is citable.'
              : 'A source behind this statement is under replacement or excluded, and is not treated as authoritative.'}
          </li>
          <li>
            {status.primarySourcesTraced === 0
              ? 'Primary source not traced: nobody at this index has opened the original study behind a cited passage. Where a passage is itself primary, this is not applicable.'
              : `${String(status.primarySourcesTraced)} of ${String(status.passages)} passages have had their primary source opened.`}
          </li>
          <li>
            {status.automatedChecks === 0
              ? 'No automated check recorded.'
              : `${String(status.automatedChecks)} automated check${status.automatedChecks === 1 ? '' : 's'} recorded — locator resolution only. An automated scientific approval cannot be recorded at all.`}
          </li>
          <li className="font-medium">
            {status.humanApprovalStanding
              ? 'A human scientific approval stands at this version.'
              : 'No human has reviewed this statement.'}
          </li>
        </ul>
      </div>
    </div>
  );
}

/** A printed row. Boxes to tick, lines to write on, nothing that posts. */
function ResponseRow({ claimKey, claimText }: { claimKey: string; claimText: string }) {
  return (
    <div className="border-t border-rule pt-3">
      <p className="text-xs font-semibold tracking-wide text-slate uppercase">{claimKey}</p>
      <p className="mt-0.5 text-sm text-ink-soft">
        {claimText.length > 160 ? `${claimText.slice(0, 157)}…` : claimText}
      </p>
      <p className="mt-2 text-sm">
        <Box /> Approve&nbsp;&nbsp;&nbsp;
        <Box /> Request change&nbsp;&nbsp;&nbsp;
        <Box /> Comment only
      </p>
      <RuledLines count={3} />
    </div>
  );
}

function Box() {
  return (
    <span
      aria-hidden="true"
      className="mr-1 inline-block h-3 w-3 translate-y-px border border-ink align-middle"
    />
  );
}

function RuledLines({ count }: { count: number }) {
  return (
    <div className="mt-2 space-y-4">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="border-b border-rule" />
      ))}
    </div>
  );
}

function LabelledLine({ label }: { label: string }) {
  return (
    <div>
      <dt className="text-xs tracking-wide text-slate uppercase">{label}</dt>
      <dd className="mt-2 border-b border-rule" />
    </div>
  );
}

function SourceEntry({ source }: { source: ExportedSource }) {
  const authors =
    source.authors.length === 0
      ? null
      : source.authors.length > 2
        ? `${source.authors[0] ?? ''} et al.`
        : source.authors.join(' and ');

  return (
    <>
      <p className="text-sm">
        <span className="font-medium">{source.sourceKey}</span> — {authors ? `${authors}. ` : ''}
        <cite className="not-italic">{source.title}</cite>
        {editionSuffix(source)}
        {source.publisher ? `. ${source.publisher}` : ''}
        {source.year ? ` (${String(source.year)})` : ''}
      </p>
      <p className="mt-0.5 text-xs text-slate">
        {source.sourceTypeLabel}
        {source.doi ? ` · doi:${source.doi}` : ''}
        {source.pmid ? ` · PMID ${source.pmid}` : ''}
        {source.isbn ? ` · ISBN ${source.isbn}` : ''}
      </p>
      <p className="mt-1 text-sm text-ink-soft">
        <span className="font-medium">Access:</span> {accessSentence(source)}
      </p>
      {!source.isCitable ? (
        <p className="mt-0.5 text-sm font-medium">
          The copy this index holds is marked {source.qcStatus.replaceAll('_', ' ')} and is not
          treated as authoritative.
        </p>
      ) : null}
      {source.printedPageOffset !== null ? (
        <p className="mt-0.5 text-xs text-slate">
          Locators are the work&rsquo;s printed pages. In the copy this index holds, printed page +{' '}
          {source.printedPageOffset} gives the file page.
        </p>
      ) : null}
      <p className="mt-1 text-xs text-slate">
        Cited at: {source.locatorsUsed.length > 0 ? source.locatorsUsed.join('; ') : 'no locator recorded'}{' '}
        · for {source.claimKeys.join(', ')}
      </p>
    </>
  );
}

/** The edition, unless the registered title already carries it. */
function editionSuffix(source: ExportedSource): string {
  if (source.edition === null) return '';
  const title = source.title.toLowerCase();
  const edition = source.edition.toLowerCase().replace(/\s*(ed\.|edition)\s*$/, '');
  if (edition.length > 0 && title.includes(edition) && title.includes('edition')) return '';
  return `, ${source.edition}`;
}

function accessSentence(source: ExportedSource): string {
  switch (source.accessStatus) {
    case 'held':
      return 'This index holds a copy. It cannot be sent to you — it is a third-party copyrighted work — so you will need your own access. Tell us if that is a problem.';
    case 'subscription_required':
      return 'Behind a subscription. This index does not currently hold a copy, and the statements resting on it are limited accordingly.';
    case 'public_not_yet_retrieved':
      return 'Publicly available and not yet retrieved by this index.';
    case 'unavailable':
      return 'Not obtainable by this index at present.';
    default:
      return 'Not recorded.';
  }
}

function PartHeading({
  part,
  id,
  children,
}: {
  part: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <h2 id={id} className="border-b-2 border-ink pb-1 font-serif text-xl text-ink">
      <span className="mr-3 text-sm tracking-[0.14em] text-slate uppercase">Part {part}</span>{' '}
      {children}
    </h2>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return <h4 className="text-xs font-semibold tracking-wide text-slate uppercase">{children}</h4>;
}

function Labelled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <p className="mt-2 text-sm leading-relaxed">
      <span className="text-xs font-semibold tracking-wide text-slate uppercase">{label}:</span>{' '}
      {children}
    </p>
  );
}

function Inline({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="inline font-medium">{term} — </dt>
      <dd className="inline text-ink-soft">{children}</dd>
    </div>
  );
}

function Bullets({ items }: { items: readonly string[] }) {
  return (
    <ul className="mt-2 space-y-1.5 text-sm leading-relaxed">
      {items.map((item) => (
        <li key={item} className="-indent-4 pl-4">
          <span aria-hidden="true">— </span>
          {item}
        </li>
      ))}
    </ul>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-xs font-semibold tracking-wide text-slate uppercase">{label}</dt>
      <dd className="text-ink">{children}</dd>
    </>
  );
}
