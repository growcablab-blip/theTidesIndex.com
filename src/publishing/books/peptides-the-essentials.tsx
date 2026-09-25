import { Document, Text, View } from '@react-pdf/renderer';
import {
  Body,
  Bullets,
  Callout,
  ChapterOpener,
  Comparison,
  Cover,
  CurrentVersionBlock,
  Lede,
  PublicationPage,
  SectionHeading,
  SourceNote,
  Table,
} from '../primitives';
import { TideMark } from '../figures';
import { ConceptPlate, patientIllustration } from '../illustration-print';
import { colour, leading, sans, serif, type } from '../theme';

/**
 * PEPTIDES: THE ESSENTIALS — the clinic handout.
 *
 * A short, highly visual booklet derived from the same evidence system as
 * Understanding Peptides, for a clinic to hand to a patient. It does not replace
 * that volume; it points to it.
 *
 * Nothing here is new writing about peptides. The concepts are the patient
 * figures and their captions; the evidence, safety and question pages reuse the
 * sourced or method-based wording of Understanding Peptides chapters seven, eight
 * and ten; and every page names where its fuller account is. No dose, no
 * protocol, no administration instruction appears anywhere, by design.
 */

const PUBLICATION = 'Peptides: The Essentials';
const ISSUED = '15 September 2026';
const FULL = 'Understanding Peptides';

function Pointer({ children }: { children: string }) {
  return (
    <Text style={{ fontFamily: sans, fontSize: type.micro, color: colour.deepTide, marginTop: 6 }}>{children}</Text>
  );
}

export function PeptidesTheEssentials() {
  return (
    <Document
      title={PUBLICATION}
      author="The Tides Index"
      subject="A short patient handout: eight essential ideas about peptides, what evidence means, and questions to ask a clinician. No dosing, no protocols, no administration instructions. Draft for review."
      creator="The Tides Index"
    >
      <Cover
        imprint="The Tides Index"
        series="Clinic handout"
        title="Peptides:"
        subtitle="The Essentials"
        descriptor="Independent peptide science & clinical reference"
        editionLine={`Draft for scientific and clinical review · issued ${ISSUED}`}
        statusLine="Not yet reviewed. No dosing, no protocols, no administration instructions, no treatment advice."
        mark={<TideMark width={300} />}
      />

      {/* --- About this booklet ------------------------------------------- */}
      <PublicationPage publication={PUBLICATION} section="About this booklet">
        <ChapterOpener
          eyebrow="Start here"
          title="The essentials, in a few minutes"
          standfirst="Look at each drawing, read the line beneath it, and stop whenever you have what you need."
        />
        <Lede>
          This booklet gives eight essential ideas about peptides, one drawing each, then what
          evidence means, what is not known about safety, and questions worth asking a clinician.
        </Lede>
        <Body>
          Every statement in it comes from a named source, and where the sources run out, the page says
          so. The fuller account of each idea, with its sources, is in the volume {FULL}.
        </Body>
        <Callout title="What this booklet is not">
          <Text>
            It is not advice about treatment. It contains no amounts, schedules, protocols or
            instructions for giving anything, and that is deliberate: a decision about treatment belongs
            to you and a clinician who knows your history, with the evidence in front of you both.
          </Text>
        </Callout>
        <SectionHeading>Inside</SectionHeading>
        <Table
          head={['Page by page', '']}
          widths={[1.4, 2]}
          rows={[
            ['Eight ideas', 'What a peptide is, how one is made, how it signals, the body’s own peptides, how it is studied, routes, evidence, quality'],
            ['What evidence means', 'Three kinds of evidence, kept apart'],
            ['Animal evidence', 'Why it is not human evidence'],
            ['Safety and unknowns', 'Why “no reported harm” is not “shown to be safe”'],
            ['Questions to ask', 'About the evidence, the material and the plan'],
            ['Learn more', 'Where the fuller account is'],
          ]}
        />
      </PublicationPage>

      {/* --- Eight essential ideas ------------------------------------------ */}
      <PublicationPage publication={PUBLICATION} section="Eight essential ideas">
        <ConceptPlate
          eyebrow="One of eight"
          headline="What is a peptide?"
          illustration={patientIllustration('chain-scale')}
          more={`${FULL}, chapters one and two`}
        />
        <ConceptPlate
          eyebrow="Two of eight"
          headline="How is one made?"
          illustration={patientIllustration('sequence-to-vial')}
          more={`${FULL}, chapter nine`}
        />
        <ConceptPlate
          eyebrow="Three of eight"
          headline="How does a peptide send a signal?"
          illustration={patientIllustration('message-receiver')}
          more={`${FULL}, chapters four and five`}
        />
        <ConceptPlate
          eyebrow="Four of eight"
          headline="What happens to the body’s own peptides?"
          illustration={patientIllustration('peptide-lifecycle')}
          more={`${FULL}, chapter three`}
        />
        <ConceptPlate
          eyebrow="Five of eight"
          headline="How can it be studied?"
          illustration={patientIllustration('study-design')}
          more={`${FULL}, chapter seven`}
        />
        <ConceptPlate
          eyebrow="Six of eight"
          headline="How do routes differ?"
          illustration={patientIllustration('routes')}
          explanation="This describes routes; it is not a guide to giving anything. A route decides what a molecule has to get past on the way in. A swallowed peptide meets acid, enzymes and a tightly sealed gut lining — which is why most peptide medicines are injected."
          more={`${FULL}, chapter six`}
        />
        <ConceptPlate
          eyebrow="Seven of eight"
          headline="What does evidence mean?"
          illustration={patientIllustration('evidence-lanes')}
          more={`${FULL}, chapter seven`}
        />
        <ConceptPlate
          eyebrow="Eight of eight"
          headline="How is quality checked?"
          illustration={patientIllustration('separate-questions')}
          more={`${FULL}, chapter nine`}
        />
      </PublicationPage>

      {/* --- What evidence means --------------------------------------------- */}
      <PublicationPage publication={PUBLICATION} section="What evidence means">
        <ChapterOpener
          eyebrow="Evidence"
          title="What evidence means"
          standfirst="Three kinds of thing get called evidence, and they support different statements."
        />
        <Body>
          The Tides Index sorts every statement it holds into one of three classes before it does anything
          else with it. The class is not a score. It describes where a statement came from, and therefore
          what it is able to support.
        </Body>
        <Table
          head={['Class', 'What it is', 'What it can support']}
          rows={[
            ['Human', 'A study in people, or labelling authorised by a regulator', 'A statement about people, within the population studied'],
            ['Preclinical', 'Animals, tissue, cells, models, and analytical measurement of a substance', 'A statement about that model, or about what a substance is'],
            ['Reference and opinion', 'Textbooks, reviews, a named clinician’s described practice, reported experience', 'A statement about what a source says — attributed to it'],
          ]}
          widths={[1, 1.5, 1.6]}
        />
        <Body>
          The third class is the one most often mistaken for the first. A practitioner handbook describing a
          regimen is a reliable record of what that clinician recommends. It is not a study, and no number
          of handbooks agreeing turns it into one.
        </Body>

        <SectionHeading>Animal evidence is not human evidence</SectionHeading>
        <Comparison
          left={{
            title: 'What an animal study establishes',
            items: [
              'That something happened in that species, in that model, at that exposure',
              'A reason to run a human study',
              'A mechanism worth testing',
            ],
          }}
          right={{
            title: 'What it does not establish',
            items: [
              'That the same thing happens in a person',
              'That the amount used translates to a human amount',
              'That an absence of harm in the animals means safety in people',
            ],
          }}
        />
        <Body>
          Most of what is written about peptides in public rests on animal and laboratory work, and the step
          from that to a sentence about people is usually taken silently. In this index it cannot be taken
          silently: a preclinical record is labelled as one everywhere it appears.
        </Body>
        <Pointer>{`The fuller account: ${FULL}, chapter seven.`}</Pointer>
      </PublicationPage>

      {/* --- Safety and unknowns ------------------------------------------------ */}
      <PublicationPage publication={PUBLICATION} section="Safety and unknowns">
        <ChapterOpener
          eyebrow="Safety"
          title="Safety, and what is not known"
          standfirst="The most common mistake is to treat silence as reassurance."
        />
        <SectionHeading>“No reported harm” is not “shown to be safe”</SectionHeading>
        <Comparison
          left={{
            title: 'What a small study can show',
            items: [
              'That the people in it, for as long as it ran, mostly tolerated it',
              'That common, obvious, early problems did not appear in that group',
            ],
          }}
          right={{
            title: 'What it cannot show',
            items: [
              'That an uncommon harm does not exist — a study of twelve people cannot find a one-in-a-thousand problem',
              'What happens after the study ended',
              'What happens to someone older, iller, pregnant, or taking something else',
            ],
          }}
        />
        <Body>
          This is why a record in the Tides Index will say that safety is not established even when no source
          reports a problem. The two statements are compatible, and only one of them is about the compound.
        </Body>
        <SectionHeading>How uncertainty is shown</SectionHeading>
        <Bullets
          items={[
            'Not established: the index looked and found nothing that supports the statement.',
            'Sources disagree: two named sources say different things, and both are shown.',
            'Not obtained: a study exists and the index has not been able to read it.',
            'Not assessed: nobody has checked whether the finding has ever been repeated.',
          ]}
        />
        <Callout title="What to do with an unknown">
          <Text>
            An unknown is a reason to ask a question, not a reason to assume either answer. If something
            matters to a decision you are making, take it to a clinician who knows your history.
          </Text>
        </Callout>
        <Pointer>{`The fuller account: ${FULL}, chapter eight.`}</Pointer>
      </PublicationPage>

      {/* --- Questions to ask ------------------------------------------------------ */}
      <PublicationPage publication={PUBLICATION} section="Questions to ask">
        <ChapterOpener
          eyebrow="Take this page with you"
          title="Questions to ask your clinician"
          standfirst="These are questions, not advice. The point is to hear how they are answered."
        />
        <SectionHeading>About the evidence</SectionHeading>
        <Bullets
          items={[
            'Has this been studied in people, or only in animals and laboratories?',
            'If it has been studied in people, was there a comparison group?',
            'What outcome was actually measured — and is it the thing I care about, or a stand-in for it?',
            'Who was in the study, and are they like me?',
            'Has anyone other than the original group found the same thing?',
          ]}
        />
        <SectionHeading>About the material</SectionHeading>
        <Bullets
          items={[
            'What exactly is this substance — its sequence and mass, not just its trade name?',
            'Where does it come from, and what testing has been done on this batch?',
            'Can I see the certificate, and does it name the batch I would be given?',
            'Is it made for use in people, or labelled for research?',
          ]}
        />
        <SectionHeading>About the plan</SectionHeading>
        <Bullets
          items={[
            'What would tell us this is working, and by when?',
            'What would make you stop?',
            'What are we going to monitor, and how often?',
            'What are the known risks, and what is simply unknown?',
            'What are the alternatives, including doing nothing for now?',
          ]}
        />
      </PublicationPage>

      {/* --- Learn more, and how this booklet is made ------------------------------ */}
      <PublicationPage publication={PUBLICATION} section="Learn more">
        <ChapterOpener eyebrow="Going further" title="Where to learn more" />
        <View style={{ marginBottom: 6 }}>
          {[
            [FULL, 'The full plain-language volume: eleven chapters, each ending with what we know, what remains uncertain, and its sources.'],
            ['Peptide Quality', 'What tests on a vial establish and what they do not — purity, identity, content, sterility and endotoxin as separate questions.'],
            ['The Tides Index website', 'Each compound’s record, in a plain-language view with no amounts or schedules, and the open research questions — the honest map of what nobody knows yet.'],
          ].map(([title, text]) => (
            <View
              key={title}
              wrap={false}
              style={{ borderLeftWidth: 2, borderLeftColor: colour.tideTeal, paddingLeft: 11, marginBottom: 10 }}
            >
              <Text style={{ fontFamily: serif, fontSize: type.subsection, color: colour.ink }}>{title}</Text>
              <Text style={{ fontFamily: serif, fontSize: type.small, lineHeight: leading.tight, color: colour.inkSoft, marginTop: 2 }}>
                {text}
              </Text>
            </View>
          ))}
        </View>

        <SectionHeading>How this booklet is made</SectionHeading>
        <Body>
          Every statement comes from a named source or, for how evidence is read, from the Tides Index’s
          documented method. The drawings are the index’s own, simplified so they can be read at this size;
          each states beneath it the claims it was drawn from. The concepts and the pages on evidence, safety
          and questions are drawn from {FULL}, where each is set out with its sources.
        </Body>
        <SourceNote
          items={[
            `${FULL} — chapters one to ten, with their sources and recorded open questions.`,
            'Drawn-from claim keys are printed beneath each drawing in this booklet.',
            'The Tides Index evidence-type taxonomy and editorial method, for the pages on evidence and safety.',
          ]}
        />
        <CurrentVersionBlock
          url="thetidesindex.com"
          version={`${PUBLICATION} · draft for review · issued ${ISSUED}`}
          note="Not yet reviewed by a scientist or a clinician. No dosing, protocols or administration instructions."
        />
      </PublicationPage>
    </Document>
  );
}
