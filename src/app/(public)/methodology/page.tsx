import Link from 'next/link';
import type { Metadata } from 'next';
import { Container, Section } from '@/components/public/primitives';

export const metadata: Metadata = {
  title: 'Methodology',
  description:
    'How a statement gets into The Tides Index: extraction, provenance, review gates, and what is refused.',
};

/**
 * Methodology.
 *
 * Written in the second person and in plain terms, because the audience is a
 * clinician deciding whether to trust the index, not an auditor. The specific
 * mechanisms are named — a reader can check that the claims made here are
 * actually enforced, which is the point of publishing them.
 */
export default function MethodologyPage() {
  return (
    <Container width="reading" className="py-10 sm:py-14">
      <header>
        <h1 className="font-serif text-3xl text-ink sm:text-4xl">Methodology</h1>
        <p className="mt-3 text-lg text-ink-soft">
          How something gets onto this site, what has to be true before it does, and what this index
          refuses to do.
        </p>
      </header>

      <div className="prose-tides mt-10">
        <Section id="path" title="The path a statement takes">
          <p>
            Nothing is written directly onto a page. Every statement here begins as a record that
            points at a specific location in a specific source, and it travels the same route:
          </p>
          <p className="rounded-md border border-rule bg-mist px-5 py-4 font-mono text-sm">
            source → exact location in that source → evidence link → statement → page
          </p>
          <p>
            The consequence is that any statement can be run backwards. If you want to know where
            something came from, the citation names the work, the kind of work it is, and the page.
            If a statement cannot be run backwards like that, it is not published.
          </p>
        </Section>

        <Section id="separations" title="Four things kept apart">
          <p>
            Most of the ways a peptide reference goes wrong come from collapsing distinctions that
            matter. Four are kept structurally separate here — not by convention, but as separate
            fields that cannot be merged:
          </p>
          <ul>
            <li>
              <strong>What kind of source it is.</strong> A practitioner handbook, a textbook, a
              trial report and a regulatory label are four different things.
            </li>
            <li>
              <strong>What kind of evidence it is.</strong> A textbook can report a randomised trial;
              a trial report is not a practitioner&rsquo;s opinion. The evidence type belongs to the
              statement, not to the source.
            </li>
            <li>
              <strong>How far it has been checked.</strong> Captured, source checked, reviewed by a
              scientist, by a clinician, by compliance — these are stages, not a single flag.
            </li>
            <li>
              <strong>Its regulatory standing.</strong> Always tied to a jurisdiction and a date,
              because it is both specific and perishable.
            </li>
          </ul>
          <p>
            <Link href="/evidence">How evidence is classified</Link> sets out the full vocabulary.
          </p>
        </Section>

        <Section id="gates" title="What has to be true before something is published">
          <p>
            These are enforced by the database, not by a checklist someone remembers. A statement
            that does not meet them cannot be published by any route — not through the editorial
            interface, not by an import, not by someone with direct database access.
          </p>
          <ul>
            <li>
              A statement needs at least one evidence link to an <em>exact location</em> in a source
              whose held copy is sound, a written record of how that evidence was read, and approved
              source and scientific review.
            </li>
            <li>
              A high-impact statement additionally has to say what remains uncertain about it, and
              pass compliance review. &ldquo;Not established&rdquo; is an acceptable answer; leaving
              it blank is not.
            </li>
            <li>
              A protocol record needs provenance, the population or model it applies to, the route,
              an explicit statement of whether it is approved labelling, a study regimen or
              practitioner practice — and four separate approvals.
            </li>
            <li>
              A compound page cannot be published unless it states what is <em>not</em> established
              about that compound.
            </li>
            <li>
              A quality topic cannot be published unless it states what its test does not show, as
              well as what it does.
            </li>
          </ul>
        </Section>

        <Section id="review" title="Review, and what an approval is worth">
          <p>
            Reviews are recorded against a specific version of a record and in the name of the person
            who gave them. Editing a record advances its version, which strands the approvals it
            already had — a reviewer approved the text they read, not the text that replaced it.
          </p>
          <p>
            The roles are separated so that no single account can assemble every approval a protocol
            needs. A scientific reviewer cannot sign the clinical gate, and nobody can record a
            review in someone else&rsquo;s name.
          </p>
        </Section>

        <Section id="withdrawal" title="When something stops being true">
          <p>
            Quality state propagates. If a source is later found to be corrupted or is marked for
            replacement, every published statement resting on it is withdrawn from the site
            automatically and queued for re-review — the reason is recorded on the record.
          </p>
          <p>
            The same applies if the evidence behind a statement is removed. Nothing stays public on
            the strength of provenance that no longer exists.
          </p>
        </Section>

        <Section id="refusals" title="What this index will not do">
          <ul>
            <li>
              <strong>Invent content to fill a page.</strong> Most of this reference is deliberately
              empty. An empty section states why it is empty.
            </li>
            <li>
              <strong>Merge protocols.</strong> Where several sources describe a regimen differently,
              all are shown, attributed. There is no averaged or &ldquo;typical&rdquo; regimen,
              because no source stated one.
            </li>
            <li>
              <strong>Present animal results in human terms.</strong> Preclinical evidence is
              labelled as such wherever it appears.
            </li>
            <li>
              <strong>Score evidence.</strong> Collapsing a body of evidence into a number out of ten
              invents precision that is not there. Statements describe what exists instead.
            </li>
            <li>
              <strong>Show doses in patient mode.</strong> The patient view is read from a source
              that has no dose in it, so the values are never sent to the browser.
            </li>
            <li>
              <strong>Generate answers.</strong> Search returns records. No summary is produced that
              cannot be traced back to a reviewed statement.
            </li>
            <li>
              <strong>Sell anything.</strong> No products, no vendor rankings, no affiliate links.
            </li>
          </ul>
        </Section>

        <Section id="ai" title="Where automation is used">
          <p>
            Software helps organise, normalise and flag contradictions, and can draft from records
            that have already been reviewed. It cannot approve anything. Every gate requires an
            approval attributable to a named person, which is a constraint in the database rather
            than a policy — an automated actor cannot satisfy it.
          </p>
        </Section>

        <Section id="corrections" title="Corrections">
          <p>
            Material errors are corrected in public, with what changed stated plainly, and dependent
            pages are flagged for re-review. See{' '}
            <Link href="/corrections">corrections</Link>.
          </p>
        </Section>
      </div>
    </Container>
  );
}
