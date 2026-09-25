import Link from 'next/link';
import type { RegisteredPeptide } from '@/server/public/queries';
import { Callout, Container, MetaItem, Section } from './primitives';
import { AliasList } from './routes-and-context';

/**
 * A compound that is in scope but has no published record yet.
 *
 * Most references would return a 404 here, or worse, publish a thin page of
 * unsourced summary to have something to show. Both lose the same information:
 * that this compound is being worked on, and how far that work has got.
 *
 * So the page says exactly that, and nothing else. No summary, no claims, no
 * mechanism — those exist only as unreviewed drafts, and an unreviewed draft is
 * not publishable at any level of detail. What a reader gets is an honest
 * position: in scope, not yet ready, here is why that is a high bar.
 */
export function RecordInPreparation({ peptide }: { peptide: RegisteredPeptide }) {
  const started = peptide.draftClaimCount > 0 || peptide.draftProtocolCount > 0;

  return (
    <Container width="reading" className="py-10 sm:py-14">
      <nav aria-label="Breadcrumb" className="no-print mb-6 text-sm text-slate">
        <Link href="/peptides" className="hover:text-deep-tide">
          Compounds
        </Link>
        <span className="mx-2" aria-hidden="true">
          /
        </span>
        <span className="text-ink-soft">{peptide.canonicalName}</span>
      </nav>

      <header>
        <p className="meta-label">Record in preparation</p>
        <h1 className="mt-1.5 font-serif text-3xl text-ink sm:text-4xl">
          {peptide.canonicalName}
        </h1>
        <p className="mt-3 text-lg text-ink-soft">
          This compound is in scope for The Tides Index. Its statements have not yet been linked to
          named sources at exact locations, so nothing about it is published yet.
        </p>
      </header>

      <div className="mt-8">
        <AliasList aliases={peptide.aliases} />
      </div>

      <Section id="why" title="Why there is nothing here yet">
        <div className="prose-tides">
          <p>
            A compound record is published only once it carries a plain-language summary, an explicit
            statement of what is <em>not</em> established about it, and a source for every statement
            on it. Each of those statements has to resolve to an exact location in a source whose
            held copy is sound.
          </p>
          <p>
            That is a deliberately high bar, and it is why this index is small. The alternative — a
            page of plausible summary with no traceable source behind it — is what makes most peptide
            references unusable for clinical work.
          </p>
        </div>
      </Section>

      <Section id="progress" title="Where the work stands">
        <dl className="grid grid-cols-2 gap-5 rounded-md border border-rule bg-mist px-5 py-5 sm:grid-cols-3">
          <MetaItem label="In scope">Yes</MetaItem>
          <MetaItem label="Statements drafted">{peptide.draftClaimCount}</MetaItem>
          <MetaItem label="Protocol records drafted">{peptide.draftProtocolCount}</MetaItem>
        </dl>

        <p className="mt-4 text-sm text-slate">
          {started
            ? 'Extraction has begun. Drafted records are not shown until they have been linked to a named source at an exact location — a draft is a working note, not a finding.'
            : 'Extraction has not begun for this compound. Registered sources that discuss it are listed in the source register.'}
        </p>
      </Section>

      <Section id="meanwhile" title="What you can do meanwhile">
        <div className="prose-tides">
          <ul>
            <li>
              Read the <Link href="/sources">source register</Link> to see which works this index
              draws on, and which held copies are unusable.
            </li>
            <li>
              Read <Link href="/coverage">what is and is not here</Link> for an account of the
              current gaps.
            </li>
            <li>
              Read <Link href="/methodology">the methodology</Link> to judge whether this index is
              worth waiting for.
            </li>
          </ul>
        </div>
      </Section>

      <div className="mt-8">
        <Callout tone="caution">
          <p>
            An absent record here is not a statement about the compound. It means the work of
            finding, extracting, verifying and reviewing evidence for it has not been completed in
            this index. Evidence may well exist elsewhere.
          </p>
        </Callout>
      </div>
    </Container>
  );
}
