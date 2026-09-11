import Link from 'next/link';
import type { Metadata } from 'next';
import { Callout, Container, Section } from '@/components/public/primitives';

export const metadata: Metadata = {
  title: 'Editorial policy',
  description:
    'The standards The Tides Index holds itself to: attribution, uncertainty, language, and independence.',
};

export default function EditorialPolicyPage() {
  return (
    <Container width="reading" className="py-10 sm:py-14">
      <header>
        <h1 className="font-serif text-3xl text-ink sm:text-4xl">Editorial policy</h1>
        <p className="mt-3 text-lg text-ink-soft">
          What this index will and will not say, and the standards it holds itself to.
        </p>
      </header>

      <div className="prose-tides mt-10">
        <Section id="mission" title="The position">
          <p>
            The Tides Index exists to explain peptide science clearly without turning uncertainty
            into certainty, or one practitioner&rsquo;s practice into established medicine. Where the
            evidence is thin, saying so is the useful contribution — a reader who learns that human
            evidence is absent has learned the most important thing on the page.
          </p>
        </Section>

        <Section id="disagreement" title="When sources disagree">
          <p>
            Disagreements are displayed, not resolved. Where two sources describe something
            differently, both are shown with their attribution and the kind of evidence behind each,
            together with what might account for the difference — route, formulation, population,
            amount, study design, terminology, or the dates they were written.
          </p>
          <p>
            Averaging them would produce a position no source holds. That is worse than either
            source, because it cannot be checked against anything.
          </p>
        </Section>

        <Section id="distinctions" title="Distinctions that are always kept">
          <ul>
            <li>
              <strong>Approved use</strong> names the jurisdiction, the authority, and the date it
              was checked.
            </li>
            <li>
              <strong>Investigational human evidence</strong> describes the actual population,
              design, route and schedule rather than gesturing at &ldquo;studies&rdquo;.
            </li>
            <li>
              <strong>Preclinical evidence</strong> says animal or laboratory wherever it appears,
              and its regimens are never rendered as human instructions.
            </li>
            <li>
              <strong>Practitioner reference</strong> is attributed by name — &ldquo;LaValle
              describes…&rdquo; — and never written as clinical consensus.
            </li>
            <li>
              <strong>Expert commentary</strong> identifies the speaker, the source and the date, and
              says whether it has been independently checked.
            </li>
            <li>
              <strong>Experiential reports</strong> are not used to support efficacy or safety claims
              at all. They may be recorded as an open question.
            </li>
          </ul>
        </Section>

        <Section id="language" title="Language">
          <p>
            Words like <em>proven</em>, <em>safe</em>, <em>effective</em>, <em>cures</em>,{' '}
            <em>reverses</em> and <em>prevents</em> require unusually strong, directly relevant
            evidence, and are avoided where that evidence does not exist. Promotional phrasing is not
            used anywhere.
          </p>
          <p>
            The preferred constructions are the plain ones: &ldquo;human evidence is
            limited&rdquo;, &ldquo;this route has been reported in…&rdquo;, &ldquo;in this animal
            model…&rdquo;, &ldquo;regulatory status checked on…&rdquo;, &ldquo;evidence remains
            uncertain&rdquo;.
          </p>
        </Section>

        <Section id="patient" title="Patient-facing content">
          <p>
            Pages in simple mode explain rather than prescribe. They state evidence strength and
            uncertainty, describe why sourcing and handling matter, and encourage a conversation with
            a qualified clinician.
          </p>
          <p>
            They do not carry dose, frequency or duration. That is enforced at the data layer rather
            than by the interface: the patient view is read from a source that has no such columns in
            it.
          </p>
        </Section>

        <Section id="quotation" title="Quotation and copyright">
          <p>
            Sources are paraphrased with exact citations. Short quotations are used only where the
            wording itself matters. Source materials are private research inputs and are not
            redistributed; the{' '}
            <Link href="/sources">source register</Link> publishes bibliographic metadata so that
            statements can be traced without copying the works.
          </p>
        </Section>

        <Section id="independence" title="Independence">
          <Callout>
            <p>
              The Tides Index sells nothing, ranks no vendors, carries no affiliate links, and
              accepts no sponsored content. It is not affiliated with any supplier or compounding
              service. If that ever changes it will be disclosed here first.
            </p>
          </Callout>
        </Section>

        <Section id="see-also" title="See also">
          <ul>
            <li>
              <Link href="/methodology">Methodology</Link> — what has to be true before something is
              published.
            </li>
            <li>
              <Link href="/evidence">How evidence is classified</Link> — the vocabulary in use.
            </li>
            <li>
              <Link href="/coverage">What is and is not here</Link> — the current extent of the
              index.
            </li>
          </ul>
        </Section>
      </div>
    </Container>
  );
}
