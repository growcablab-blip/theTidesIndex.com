import {
  EXPORT_IS_NOT_AN_APPROVAL,
  type ExportedPacket,
  type ExportedSource,
} from '@/server/editorial/packet-export';
import type { ReviewPacketClaim } from '@/server/editorial/review-packet';

/**
 * The review packet as a printed document.
 *
 * Deliberately not the screen panel with print styles bolted on. A document
 * leaves the application: it has to identify itself, say what version it
 * describes, say what it is missing, and say what it cannot do — none of which
 * the screen needs, because on screen the surrounding application answers all
 * four.
 *
 * It contains **no interactive controls of any kind**: no form, no button, no
 * input, no link that submits. That is the mechanical expression of "this
 * document cannot record a review", and it is asserted as a rendering property
 * in `tests/unit/packet-export-document.test.tsx` rather than left as an
 * intention.
 */

const PRINT_CSS = `
  @page { margin: 18mm 16mm; }
  .tides-doc { color: #1a1a1a; }
  .tides-doc .avoid-break { break-inside: avoid; page-break-inside: avoid; }
  .tides-doc .page-break { break-before: page; page-break-before: always; }
  @media print {
    .tides-doc [data-screen-only] { display: none !important; }
    .tides-doc { font-size: 10.5pt; line-height: 1.45; }
    .tides-doc a { text-decoration: none; color: inherit; }
  }
`;

export function PacketExportDocument({ doc }: { doc: ExportedPacket }) {
  const issuedDay = doc.issuedAt.slice(0, 10);

  return (
    <article className="tides-doc mx-auto max-w-[46rem] bg-white px-6 py-8 text-ink">
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />

      <p
        data-screen-only
        className="mb-6 rounded-sm border border-rule bg-mist px-3 py-2 text-xs text-slate"
      >
        Print this page, or save it as a PDF, from your browser. The layout is set for A4 and
        Letter.
      </p>

      {/* --- Masthead ------------------------------------------------------ */}
      <header className="avoid-break border-b-2 border-ink pb-4">
        <p className="text-xs font-semibold tracking-[0.14em] text-slate uppercase">
          The Tides Index · Scientific review packet
        </p>
        <h1 className="mt-2 font-serif text-2xl leading-tight text-ink">{doc.topicName}</h1>
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <Field label="Document">{doc.documentId}</Field>
          <Field label="Topic key">{doc.qualityKey}</Field>
          <Field label="Version">
            {doc.version} — this packet describes version {doc.version} and no other
          </Field>
          <Field label="State">
            {doc.reviewState.replaceAll('_', ' ')} · {doc.publicationState.replaceAll('_', ' ')}
          </Field>
          <Field label="Issued">{issuedDay}</Field>
        </dl>
      </header>

      {/* --- The notice ---------------------------------------------------- */}
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
      </section>

      {/* --- The ask -------------------------------------------------------- */}
      <Section title="What you are being asked" id="the-ask">
        <p className="text-sm">
          {doc.packet.claims.length} statement{doc.packet.claims.length === 1 ? '' : 's'}, each with
          the passage it rests on, how this index reads that passage, and what it records as
          uncertain. Plus {doc.packet.gaps.length} point
          {doc.packet.gaps.length === 1 ? '' : 's'} the index declines to make.
        </p>
        <div className="mt-4 grid gap-6 sm:grid-cols-2">
          <div>
            <SubHeading>You are being asked whether</SubHeading>
            <Bullets
              items={[
                'the source says what this index says it says;',
                'the reading of it is fair, and not stronger than the passage supports;',
                'the stated uncertainty covers what a reader ought to be warned about;',
                'the scope is right — population, material, document type, jurisdiction;',
                'anything is asserted that the cited passage does not carry.',
              ]}
            />
          </div>
          <div>
            <SubHeading>You are not being asked</SubHeading>
            <Bullets
              items={[
                'to write or rewrite the content — request a change instead;',
                'to judge any product, supplier or certificate;',
                'to vouch for sources this index does not hold;',
                'to fill a gap from your own knowledge. If you know something the sources here do not establish, that is a source to acquire, not a claim to approve.',
              ]}
            />
          </div>
        </div>
      </Section>

      {/* --- How a response is recorded ------------------------------------- */}
      <Section title="How your response is recorded" id="how-to-respond">
        <p className="text-sm leading-relaxed">
          Your <strong>comments</strong> can be transcribed against this record by an editor,
          attributed to you, and are kept verbatim.
        </p>
        <p className="mt-2 text-sm leading-relaxed">
          Your <strong>decision</strong> cannot. Approving, or returning a statement for change, is
          an act with your name on it, and it is made by you in the application against the version
          named above. Nobody records it on your behalf, and this index does not represent an
          editor&rsquo;s reading of your letter as your approval.
        </p>
        <p className="mt-2 text-sm leading-relaxed">
          If the version moves before your decision is entered, you will be asked again and shown
          what changed. An approval never carries forward to a version you did not see.
        </p>
      </Section>

      {/* --- Sources required ----------------------------------------------- */}
      <Section title="Sources you need in front of you" id="sources">
        <p className="text-sm leading-relaxed">
          This document cites locations; it does not reproduce them. Locators are the work&rsquo;s
          own printed page numbers, so they can be followed in any copy.
        </p>
        <ul className="mt-4 space-y-4">
          {doc.sources.map((source) => (
            <li key={source.sourceKey} className="avoid-break border-l-2 border-rule pl-4">
              <SourceEntry source={source} />
            </li>
          ))}
        </ul>
      </Section>

      {/* --- The statements -------------------------------------------------- */}
      <section aria-labelledby="statements" className="page-break mt-8">
        <h2 id="statements" className="border-b border-ink pb-1 font-serif text-lg text-ink">
          The statements
        </h2>
        <ol className="mt-5 space-y-8">
          {doc.packet.claims.map((claim) => (
            <li key={claim.id} className="avoid-break">
              <ExportClaim claim={claim} />
            </li>
          ))}
        </ol>
      </section>

      {/* --- Gaps ------------------------------------------------------------ */}
      {doc.packet.gaps.length > 0 ? (
        <Section title="Statements this topic does not make" id="gaps">
          <p className="text-sm leading-relaxed">
            Each is a deliberate absence rather than an omission. You are asked to confirm that the
            absence is right, and to say if something is missing from this list.
          </p>
          <ul className="mt-4 space-y-4">
            {doc.packet.gaps.map((gap) => (
              <li key={gap.statement} className="avoid-break border-l-2 border-rule pl-4">
                <p className="text-sm font-medium">{gap.statement}</p>
                <p className="mt-1 text-sm text-ink-soft">{gap.whyNotSupported}</p>
                {gap.whatWouldResolveIt ? (
                  <p className="mt-1 text-sm text-ink-soft">
                    <span className="font-medium">Would be resolved by:</span>{' '}
                    {gap.whatWouldResolveIt}
                  </p>
                ) : null}
                {gap.verificationIssueKey ? (
                  <p className="mt-1 text-xs tracking-wide text-slate uppercase">
                    {gap.verificationIssueKey}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {/* --- Relationships ---------------------------------------------------- */}
      {doc.packet.relationships.length > 0 ? (
        <Section title="What this topic is said to relate to" id="relationships">
          <p className="text-sm leading-relaxed">
            An edge asserting that this test says nothing about another subject must point at the
            claim or the recorded gap behind it. The map is a way into the evidence, never a second
            place a thing is stated.
          </p>
          <ul className="mt-4 space-y-3">
            {doc.packet.relationships.map((relationship) => (
              <li key={relationship.toSlug} className="avoid-break text-sm">
                <span className="font-medium">{relationship.toName}</span>
                <span className="text-slate">
                  {' '}
                  — {relationship.relationshipType.replaceAll('_', ' ')}
                </span>
                <p className="mt-0.5 text-ink-soft">{relationship.rationale}</p>
                <p className="mt-0.5 text-xs tracking-wide text-slate uppercase">
                  {relationship.claimKey ??
                    relationship.gapKey ??
                    (relationship.isEditorialNavigational
                      ? 'editorial navigation only'
                      : 'no basis recorded')}
                </p>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {/* --- Omissions --------------------------------------------------------- */}
      <Section title="What this document does not contain" id="omissions">
        <Bullets items={doc.omissions} />
      </Section>

      {/* --- Working notes ------------------------------------------------------ */}
      <section aria-labelledby="working-notes" className="page-break mt-8">
        <h2 id="working-notes" className="border-b border-ink pb-1 font-serif text-lg text-ink">
          Working notes
        </h2>
        <p className="mt-2 text-sm leading-relaxed">
          For your own use while reading. This is not a return form: nothing written here reaches
          the record, and a marked-up copy of this document approves nothing.
        </p>
        <ul className="mt-5 space-y-5">
          {doc.packet.claims.map((claim) => (
            <li key={claim.id} className="avoid-break">
              <p className="text-xs font-semibold tracking-wide text-slate uppercase">
                {claim.claimKey}
              </p>
              <div className="mt-1.5 space-y-4">
                <div className="border-b border-rule" />
                <div className="border-b border-rule" />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <footer className="avoid-break mt-10 border-t border-ink pt-3 text-xs text-slate">
        <p>
          {doc.documentId} · version {doc.version} · issued {issuedDay} · The Tides Index. Not for
          circulation beyond the named reviewer. This index does not publish a topic on an approval
          it cannot attribute to a person.
        </p>
      </footer>
    </article>
  );
}

function ExportClaim({ claim }: { claim: ReviewPacketClaim }) {
  const standing = claim.history.filter((entry) => entry.appliesToCurrentVersion);

  return (
    <div>
      <p className="text-xs font-semibold tracking-wide text-slate uppercase">
        {claim.claimKey} · {claim.importance.replaceAll('_', ' ')} · version {claim.version}
        {claim.certificateTypeScope
          ? ` · applies to ${claim.certificateTypeScope.replaceAll('_', ' ')}`
          : ''}
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

      <div className="mt-3">
        <SubHeading>
          {claim.evidence.length === 1
            ? 'Rests on one passage'
            : `Rests on ${String(claim.evidence.length)} passages`}
        </SubHeading>
        <ul className="mt-1.5 space-y-1.5 text-sm">
          {claim.evidence.map((evidence, index) => (
            <li key={`${evidence.sourceKey}-${String(index)}`}>
              <span className="font-medium">{evidence.sourceKey}</span>{' '}
              <span className="text-ink-soft">{evidence.sourceTitle}</span>
              {evidence.locatorText ? (
                <span className="text-ink-soft"> — {evidence.locatorText}</span>
              ) : (
                <span className="text-slate"> — exact location not recorded</span>
              )}
              <span className="text-slate">
                {' '}
                ({evidence.sourceTypeLabel}; {evidence.relationship.replaceAll('_', ' ')})
              </span>
              {evidence.interpretation ? (
                <p className="mt-0.5 text-ink-soft">{evidence.interpretation}</p>
              ) : null}
              {!evidence.primarySourceVerified ? (
                <p className="mt-0.5 text-xs text-slate">
                  The primary study behind this passage has not been opened by this index.
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </div>

      {standing.length > 0 ? (
        <div className="mt-3">
          <SubHeading>Decisions already recorded against this version</SubHeading>
          <ul className="mt-1.5 space-y-1 text-sm text-ink-soft">
            {standing.map((entry, index) => (
              <li key={`${entry.reviewType}-${String(index)}`}>
                {entry.reviewType.replaceAll('_', ' ')} — {entry.outcome.replaceAll('_', ' ')} (
                {entry.performedBy === 'automated'
                  ? `automated: ${entry.automatedTool ?? 'unnamed tool'}`
                  : (entry.reviewerName ?? 'unnamed reviewer')}
                , {entry.reviewedAt.slice(0, 10)})
                {entry.comments ? <span> — {entry.comments}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
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
          In the copy this index holds, printed page + {source.printedPageOffset} gives the file
          page. Locators below are printed pages.
        </p>
      ) : null}
      <p className="mt-1 text-xs text-slate">
        Cited at: {source.locatorsUsed.length > 0 ? source.locatorsUsed.join('; ') : 'no locator recorded'} ·
        for {source.claimKeys.join(', ')}
      </p>
    </>
  );
}

/**
 * The edition, unless the title already carries it.
 *
 * SRC-006's registered title ends "2nd Edition" and its edition field is "2nd",
 * which printed as "Synthetic Peptides: A User's Guide, 2nd Edition, 2nd".
 *
 * The edition is not dropped in general: two editions of one work paginate
 * differently, so a locator is only checkable against the edition it was read
 * in, and that has to reach the reviewer. It is dropped only where repeating it
 * adds nothing.
 */
function editionSuffix(source: ExportedSource): string {
  if (source.edition === null) return '';
  const title = source.title.toLowerCase();
  const edition = source.edition.toLowerCase().replace(/\s*(ed\.|edition)\s*$/, '');
  if (edition.length > 0 && title.includes(edition) && title.includes('edition')) return '';
  return `, ${source.edition}`;
}

/**
 * Access, in a sentence, because a status word alone reads as an attribute of
 * the work rather than a statement about what a reviewer will be able to open.
 */
function accessSentence(source: ExportedSource): string {
  switch (source.accessStatus) {
    case 'held':
      return 'This index holds a copy. It cannot be sent to you — it is a third-party copyrighted work — so you will need your own access.';
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

function Section({
  title,
  id,
  children,
}: {
  title: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="mt-8">
      <h2 id={id} className="border-b border-ink pb-1 font-serif text-lg text-ink">
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold tracking-wide text-slate uppercase">{children}</h3>
  );
}

function Labelled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <p className="mt-2 text-sm leading-relaxed">
      <span className="text-xs font-semibold tracking-wide text-slate uppercase">{label}:</span>{' '}
      {children}
    </p>
  );
}

function Bullets({ items }: { items: readonly string[] }) {
  return (
    <ul className="mt-2 space-y-1.5 text-sm leading-relaxed">
      {items.map((item) => (
        <li key={item} className="pl-4 -indent-4">
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
