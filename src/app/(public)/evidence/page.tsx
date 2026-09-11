import type { Metadata } from 'next';
import Link from 'next/link';
import { listEvidenceTypes, listSourceTypes } from '@/server/public/queries';
import {
  Callout,
  Container,
  EVIDENCE_CLASS_LABEL,
  EvidenceClassTag,
  Section,
  TableScroller,
} from '@/components/public/primitives';
import type { EvidenceClass } from '@/domain/evidence/evidence-types';

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
  title: 'How evidence is classified',
  description:
    'The vocabulary The Tides Index uses for kinds of evidence and kinds of source, and why the two are kept separate.',
};

/**
 * The evidence taxonomy, published.
 *
 * Read from the same reference tables the records use, so this page cannot drift
 * from the labels appearing on compound pages. If a vocabulary term is added,
 * it appears here.
 */
export default async function EvidenceTaxonomyPage() {
  const [evidenceTypes, sourceTypes] = await Promise.all([listEvidenceTypes(), listSourceTypes()]);

  const byClass = new Map<EvidenceClass, typeof evidenceTypes>();
  for (const type of evidenceTypes) {
    const list = byClass.get(type.evidenceClass) ?? [];
    list.push(type);
    byClass.set(type.evidenceClass, list);
  }

  const CLASS_NOTE: Readonly<Record<EvidenceClass, string>> = {
    human: 'Generated in people. This is never inferred from anything else.',
    preclinical:
      'Animal and laboratory work. Informative about mechanism; it does not establish what happens in people, and a regimen used in an animal study is not a human instruction.',
    reference_opinion:
      'What a person or a textbook describes. Attributed by name and never presented as a study result.',
  };

  return (
    <Container className="py-10 sm:py-14">
      <header className="max-w-[62ch]">
        <h1 className="font-serif text-3xl text-ink sm:text-4xl">How evidence is classified</h1>
        <p className="mt-3 text-lg text-ink-soft">
          Two vocabularies, kept apart: what kind of evidence a statement rests on, and what kind of
          source reported it.
        </p>
      </header>

      <div className="mt-8 max-w-[62ch]">
        <Callout title="Why these are two different questions">
          <p>
            A textbook can report a randomised trial. A trial report can contain an author&rsquo;s
            opinion. If the kind of source decided the kind of evidence, both of those would be
            mislabelled — so the evidence type belongs to the individual statement, and the source
            type describes the work it came from.
          </p>
          <p className="mt-2">
            This is also why there is no single quality score. Two statements can come from the same
            book and carry entirely different weight.
          </p>
        </Callout>
      </div>

      <Section id="evidence-types" title="Kinds of evidence">
        <div className="space-y-8">
          {(['human', 'preclinical', 'reference_opinion'] as const).map((evidenceClass) => (
            <div key={evidenceClass}>
              <div className="flex flex-wrap items-center gap-3">
                <EvidenceClassTag evidenceClass={evidenceClass} />
                <h3 className="font-serif text-lg text-ink">
                  {EVIDENCE_CLASS_LABEL[evidenceClass]}
                </h3>
              </div>
              <p className="mt-1.5 max-w-[62ch] text-sm text-slate">{CLASS_NOTE[evidenceClass]}</p>

              <TableScroller>
                <table className="mt-3 w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-rule text-left">
                      <th className="w-[16rem] py-2 pr-4 font-medium text-slate">Label</th>
                      <th className="py-2 font-medium text-slate">What it means</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(byClass.get(evidenceClass) ?? []).map((type) => (
                      <tr key={type.key} className="border-b border-rule-soft align-top">
                        <td className="py-2.5 pr-4 font-medium text-deep-tide">
                          {type.publicLabel}
                        </td>
                        <td className="py-2.5 text-ink-soft">{type.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableScroller>
            </div>
          ))}
        </div>
      </Section>

      <Section
        id="source-types"
        title="Kinds of source"
        lede="What sort of work, body or person produced it."
      >
        <TableScroller>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-rule text-left">
                <th className="w-[16rem] py-2 pr-4 font-medium text-slate">Label</th>
                <th className="py-2 font-medium text-slate">What it means</th>
              </tr>
            </thead>
            <tbody>
              {sourceTypes.map((type) => (
                <tr key={type.key} className="border-b border-rule-soft align-top">
                  <td className="py-2.5 pr-4 font-medium text-deep-tide">{type.publicLabel}</td>
                  <td className="py-2.5 text-ink-soft">{type.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroller>
      </Section>

      <Section id="reading" title="Reading an evidence card">
        <div className="prose-tides max-w-[62ch]">
          <p>
            Each card on a compound page carries the class of evidence as a word and a tint, the
            specific kind of evidence, the population or model it applies to, and the source with its
            exact location. Where The Tides Index has formed a view about what a passage supports,
            that view is shown separately and labelled as an interpretation — never merged into the
            statement itself.
          </p>
          <p>
            Cards marked <em>Contradicts</em> are evidence against the statement they sit under. They
            are shown deliberately: a disagreement is information, and removing it would make the
            page look more settled than the literature is.
          </p>
          <p>
            See the{' '}
            <Link href="/methodology">methodology</Link> for what has to be true before any of this
            is published.
          </p>
        </div>
      </Section>
    </Container>
  );
}
