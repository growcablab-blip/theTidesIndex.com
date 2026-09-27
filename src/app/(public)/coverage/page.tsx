import Link from 'next/link';
import type { Metadata } from 'next';
import { currentCorrectionsContact } from '@/domain/publishing/corrections-contact';
import { getCoverageSnapshot, listSources } from '@/server/public/queries';
import { Callout, Container, MetaItem, Section } from '@/components/public/primitives';

/**
 * Rendered on demand rather than at build time.
 *
 * The content of this page changes when an editor publishes, not when the
 * application is deployed, so a build-time snapshot would serve stale evidence
 * until the next deploy. It also means a build does not need database access,
 * which keeps deployment independent of the database being reachable.
 */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'What is and is not here',
  description:
    'An honest account of the coverage of The Tides Index, including what it does not yet contain.',
};

/**
 * Coverage.
 *
 * The page most reference sites do not have. Someone deciding whether to rely on
 * this index needs to know its extent before they trust a page — and knowing
 * that a compound has no reviewed human evidence *recorded here* is different
 * from knowing that no human evidence exists. The distinction is stated rather
 * than left for the reader to infer.
 */
export default async function CoveragePage() {
  const [snapshot, sources] = await Promise.all([getCoverageSnapshot(), listSources()]);
  const unusable = sources.filter((s) => !s.isCitable);

  return (
    <Container width="reading" className="py-10 sm:py-14">
      <header>
        <h1 className="font-serif text-3xl text-ink sm:text-4xl">What is and is not here</h1>
        <p className="mt-3 text-lg text-ink-soft">
          The extent of this index, stated plainly, so you can judge how much weight any page of it
          will bear.
        </p>
      </header>

      <Section id="now" title="Where coverage stands">
        <dl className="grid grid-cols-2 gap-6 rounded-md border border-rule bg-mist px-5 py-5 sm:grid-cols-3">
          <MetaItem label="Compounds published">{snapshot.publishedPeptides}</MetaItem>
          <MetaItem label="Quality topics published">{snapshot.publishedQualityTopics}</MetaItem>
          <MetaItem label="Sourced statements published">{snapshot.publishedClaims}</MetaItem>
          <MetaItem label="Resting on human evidence">{snapshot.claimsWithHumanEvidence}</MetaItem>
          <MetaItem label="Sources registered">{snapshot.registeredSources}</MetaItem>
          <MetaItem label="Sources currently citable">{snapshot.citableSources}</MetaItem>
          {/* The number a reader is most likely to assume rather than check. */}
          <MetaItem label="Records reviewed by a person">{snapshot.recordsHumanReviewed}</MetaItem>
        </dl>
        {/* Publication and review are two different facts, and this page is
            where a reader comes to find out which the index has. Stating it
            beside the counts is cheaper than letting "published" be read as
            "checked". */}
        <p className="mt-4 max-w-[70ch] text-sm text-slate">
          Published means linked to a named source at an exact location. It does not mean a person
          has checked it. Those are two different facts, and every record states its own review
          status rather than leaving it to be inferred from this page.
        </p>
      </Section>

      <Section id="absence" title="What an empty section means">
        <div className="prose-tides">
          <p>
            When a page says no human evidence is recorded, that is a statement about{' '}
            <strong>this index</strong>, not about the literature. It means the work of finding,
            extracting and linking that evidence to an exact source has not been done here yet.
            Studies may well exist.
          </p>
          <p>
            The reverse also holds. Where something <em>is</em> published, it has been traced to a
            named source at a specific page. That is not the same as a person having read it, and
            each record says which it has. Sparse coverage is the cost of that; filling the gaps with unsourced summary would be cheaper and worth nothing.
          </p>
        </div>
      </Section>

      <Section id="gaps" title="Known gaps">
        <div className="prose-tides">
          <ul>
            <li>
              <strong>Compendial and regulatory sources are not yet in the register.</strong> Several
              quality topics — sterility, bacterial endotoxin, GMP systems — depend on official
              standards and guidance that have not been obtained. Those topics cannot be published
              honestly until they are.
            </li>
            <li>
              <strong>
                {unusable.length === 1
                  ? 'One registered source cannot currently be cited.'
                  : `${String(unusable.length)} registered sources cannot currently be cited.`}
              </strong>{' '}
              Their held copies are corrupted, partial, or of unconfirmed identity. They are listed
              in the <Link href="/sources">source register</Link> with the reason.
            </li>
            <li>
              <strong>Primary literature has not been systematically surveyed.</strong> The current
              register is weighted toward textbooks and practitioner references. Tracing the primary
              studies those works cite is ongoing, and until it is done, statements resting on a
              secondary reading are marked as such.
            </li>
            {/* Derived: this page's job is to list gaps, so it must stop listing
                one the moment it is filled. */}
            {currentCorrectionsContact() === null ? (
              <li>
                <strong>No correction contact is live.</strong> See{' '}
                <Link href="/corrections">corrections</Link>.
              </li>
            ) : null}
          </ul>
        </div>
      </Section>

      <Section id="scope" title="What this index is not">
        <div className="prose-tides">
          <Callout tone="caution">
            <p>
              The Tides Index does not give medical advice, recommend treatment, or tell anyone what
              to take. It records what named sources have reported, with the standing of each source
              made explicit, so that a clinician and a patient can have a better-informed
              conversation. It is not a substitute for that conversation.
            </p>
          </Callout>
          <p className="mt-4">
            It also does not sell anything, rank vendors, carry affiliate links, or accept sponsored
            content. Where a compound is investigational or unapproved, the page says so.
          </p>
          <p>
            The current scope is peptides and peptide therapeutics. A small number of compounds
            discussed alongside them are not peptides; where one appears, its record states that
            plainly rather than letting the surrounding context imply otherwise.
          </p>
        </div>
      </Section>
    </Container>
  );
}
