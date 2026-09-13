import { Document, Svg, Rect, Line, Text, View } from '@react-pdf/renderer';
import {
  Body,
  Bullets,
  Callout,
  ChapterOpener,
  Comparison,
  Cover,
  CurrentVersionBlock,
  EvidenceNote,
  Lede,
  PublicationPage,
  SectionHeading,
  SourceNote,
  SubHeading,
  Table,
} from '../primitives';
import { SeriesMark } from '../figures';
import { colour, contentWidth, leading, sans, serif, type } from '../theme';

/**
 * UNDERSTANDING PEPTIDES — design skeleton, with one chapter written.
 *
 * Structure and page templates, plus chapter eight. **No medical content.**
 *
 * This publication is the patient- and new-staff-facing one, which makes it the
 * single most dangerous thing in the programme to draft speculatively: it will
 * be read by people with the least ability to check it, and a plausible
 * paragraph written to fill a page is indistinguishable from a sourced one once
 * it is set in the same typeface.
 *
 * So every chapter here is a *brief*: what the chapter will cover, what kind of
 * source it needs, and an illustration placeholder sized to the real layout.
 * Nothing on these pages states anything about peptides that a reader could
 * mistake for a finding. The skeleton proves the design travels to a second
 * publication; the content waits for extraction and review.
 *
 * Chapter eight is the exception, and it is an exception for a reason that does
 * not generalise: it is about how to read a claim rather than about any claim,
 * so it rests on the editorial method — documented, implemented, tested —
 * rather than on a peptide source. It is written. It is not yet reviewed.
 */

const PUBLICATION = 'Understanding Peptides';
const ISSUED = '12 September 2026';

/** A sized, labelled hole where an illustration will go. */
function IllustrationSlot({
  label,
  height,
  note,
}: {
  label: string;
  height: number;
  note?: string;
}) {
  const width = contentWidth;
  return (
    <View style={{ marginVertical: 12 }} wrap={false}>
      <Svg width={width} height={height} viewBox={`0 0 ${String(width)} ${String(height)}`}>
        <Rect
          x={0.5}
          y={0.5}
          width={width - 1}
          height={height - 1}
          fill={colour.mist}
          stroke={colour.rule}
          strokeWidth={1}
          strokeDasharray="4 3"
          rx={3}
        />
        <Line x1={0} y1={0} x2={width} y2={height} stroke={colour.ruleSoft} strokeWidth={0.5} />
        <Line x1={width} y1={0} x2={0} y2={height} stroke={colour.ruleSoft} strokeWidth={0.5} />
      </Svg>
      <View
        style={{
          position: 'absolute',
          top: height / 2 - 16,
          left: 0,
          right: 0,
          alignItems: 'center',
        }}
      >
        <Text
          style={{
            fontFamily: sans,
            fontSize: type.micro,
            letterSpacing: 1.4,
            textTransform: 'uppercase',
            color: colour.slate,
          }}
        >
          Illustration
        </Text>
        <Text
          style={{
            fontFamily: serif,
            fontSize: type.small,
            color: colour.inkSoft,
            marginTop: 3,
            textAlign: 'center',
          }}
        >
          {label}
        </Text>
        {note === undefined ? null : (
          <Text
            style={{
              fontFamily: sans,
              fontSize: type.micro,
              color: colour.slate,
              marginTop: 3,
              textAlign: 'center',
            }}
          >
            {note}
          </Text>
        )}
      </View>
    </View>
  );
}

/** What a chapter will contain, and what it needs before it can be written. */
function ChapterBrief({
  covers,
  needs,
}: {
  covers: readonly string[];
  needs: string;
}) {
  return (
    <View
      style={{
        borderWidth: 0.75,
        borderColor: colour.rule,
        borderRadius: 3,
        padding: 13,
        marginTop: 10,
        backgroundColor: colour.white,
      }}
      wrap={false}
    >
      <Text
        style={{
          fontFamily: sans,
          fontSize: type.micro,
          letterSpacing: 1.2,
          textTransform: 'uppercase',
          color: colour.deepTide,
          marginBottom: 6,
        }}
      >
        This chapter will cover
      </Text>
      {covers.map((item) => (
        <View key={item} style={{ flexDirection: 'row', marginBottom: 3 }}>
          <Text style={{ width: 12, color: colour.tideTeal, fontSize: type.small }}>—</Text>
          <Text
            style={{
              flex: 1,
              fontFamily: serif,
              fontSize: type.small,
              lineHeight: leading.tight,
            }}
          >
            {item}
          </Text>
        </View>
      ))}
      <Text
        style={{
          fontFamily: sans,
          fontSize: type.micro,
          letterSpacing: 1.2,
          textTransform: 'uppercase',
          color: colour.caution,
          marginTop: 9,
          marginBottom: 4,
        }}
      >
        Before it can be written
      </Text>
      <Text style={{ fontFamily: serif, fontSize: type.small, lineHeight: leading.tight }}>
        {needs}
      </Text>
    </View>
  );
}

interface ChapterPlan {
  readonly number: string;
  readonly title: string;
  readonly standfirst: string;
  readonly covers: readonly string[];
  readonly needs: string;
  readonly illustration: string;
  readonly illustrationNote?: string;
  /**
   * Written rather than briefed, and which body of material it rests on.
   *
   * A chapter may only be set here if it can be written from something this
   * index holds: the editorial method, or claims extracted from a named
   * source. Everything else stays a brief. The distinction is not
   * bureaucratic — a chapter written from general knowledge would set in the
   * same typeface as a sourced one, and this is the volume whose readers can
   * least afford that.
   */
  readonly written?: 'evidence' | 'safety' | 'quality' | 'clinician' | 'using';
}

const CHAPTERS: readonly ChapterPlan[] = [
  {
    number: 'One',
    title: 'What is a peptide?',
    standfirst: 'The definition, and where the boundary with proteins sits.',
    covers: [
      'What distinguishes a peptide from a protein, and why the boundary is a convention rather than a fact of nature',
      'The peptide bond, drawn',
      'Why the distinction matters for how something is made, stored and measured',
    ],
    needs:
      'A biochemistry reference held and verified by this index. Nothing in the current register defines a peptide.',
    illustration: 'The peptide bond, and a chain of three residues',
    illustrationNote: 'Deterministic vector diagram, drawn from a located source',
  },
  {
    number: 'Two',
    title: 'Amino acids, peptides, proteins',
    standfirst: 'One alphabet, three scales.',
    covers: [
      'The twenty proteinogenic amino acids as an alphabet',
      'How sequence gives rise to structure',
      'What changes as a chain gets longer',
    ],
    needs: 'The same biochemistry reference. No claim here may rest on general knowledge.',
    illustration: 'Scale ladder: amino acid → peptide → protein',
  },
  {
    number: 'Three',
    title: 'Peptides in the human body',
    standfirst: 'What the body already makes, and what that does and does not imply.',
    covers: [
      'Endogenous peptides and the roles they play',
      'Why “the body makes it” is not an argument about safety or efficacy',
    ],
    needs:
      'A physiology source. This chapter is where a patient-facing publication is most likely to overstate, so it needs the strictest sourcing in the book.',
    illustration: 'Where endogenous peptides act',
  },
  {
    number: 'Four',
    title: 'How peptide signalling works',
    standfirst: 'Messages, not machinery.',
    covers: [
      'Signalling as a message-and-receiver system',
      'Why specificity matters',
      'What a signalling molecule does not do',
    ],
    needs: 'A physiology or pharmacology source held and verified.',
    illustration: 'Signal, receptor, response — schematic',
  },
  {
    number: 'Five',
    title: 'Receptors',
    standfirst: 'Why a molecule only acts where something is listening.',
    covers: [
      'Receptor binding as recognition',
      'Selectivity, and what follows from a molecule binding more than one target',
    ],
    needs: 'A pharmacology source.',
    illustration: 'Binding and selectivity',
  },
  {
    number: 'Six',
    title: 'Why peptides are studied',
    standfirst: 'The scientific interest, stated without enthusiasm.',
    covers: [
      'What makes peptides attractive as a class to study',
      'The practical difficulties that come with them',
      'The difference between an area of active research and an established treatment',
    ],
    needs:
      'Review literature. This chapter must be written to leave a reader less certain, not more.',
    illustration: 'Research interest and practical difficulty, side by side',
  },
  {
    number: 'Seven',
    title: 'Routes of administration',
    standfirst: 'How a molecule gets in, and why that is not a detail.',
    covers: [
      'The routes and what each demands of a molecule',
      'Why oral administration is hard for peptides',
      'What a route implies for stability and handling',
    ],
    needs:
      'A pharmaceutics source. The existing route taxonomy in the database carries the structure; none of it is yet backed by a located source.',
    illustration: 'Routes, and the barrier each must cross',
  },
  {
    number: 'Eight',
    title: 'Understanding evidence',
    standfirst: 'The chapter this publication exists for.',
    covers: [
      'What a study can and cannot show',
      'Animal evidence, and why it is not human evidence',
      'Practitioner experience, and where it sits',
      'How to read a claim that has no source attached',
    ],
    needs:
      'Written from the editorial method. It states nothing about peptides, so it needed no peptide source; it still requires scientific and clinical review before publication.',
    illustration: 'A hierarchy of evidence, with the limits of each tier marked',
    written: 'evidence',
  },
  {
    number: 'Nine',
    title: 'Safety and uncertainty',
    standfirst: 'What is not known, said plainly.',
    covers: [
      'Why “no reported harm” is not “shown to be safe”',
      'How uncertainty is recorded in this index',
      'What a reader should do with an unknown',
    ],
    needs:
      'Written from the editorial method and from what the register records as unsettled. It makes no safety claim about any compound, because none could be sourced.',
    illustration: 'Known, unknown, and not yet asked',
    written: 'safety',
  },
  {
    number: 'Ten',
    title: 'Quality, source and testing',
    standfirst: 'The short version of the Peptide Quality volume.',
    covers: [
      'The three analytical questions, simply',
      'What a certificate is',
      'Why a purity figure answers less than it appears to',
    ],
    needs:
      'Written from claims extracted into this index from a peptide chemistry textbook and from ICH Q7. Those records are not yet scientifically reviewed, and neither is this chapter.',
    illustration: 'Purity, identity, content — the simplified triangle',
    written: 'quality',
  },
  {
    number: 'Eleven',
    title: 'Questions to ask your clinician',
    standfirst: 'A page to take with you.',
    covers: [
      'Questions about the evidence behind a suggestion',
      'Questions about the material itself',
      'Questions about monitoring and what would change the plan',
    ],
    needs:
      'Written as a prompt sheet. It asks questions and answers none, contains no dose and no protocol, and still requires clinical review before publication.',
    illustration: 'A single-page prompt card',
    written: 'clinician',
  },
  {
    number: 'Twelve',
    title: 'How to use The Tides Index',
    standfirst: 'What the website will and will not tell you.',
    covers: [
      'How a record is arranged, and where to stop reading',
      'What the two reading depths change, and what they do not',
      'How to follow a statement back to the page it came from',
    ],
    needs:
      'Written from the product itself. It describes how the index works and makes no claim about any compound.',
    illustration: 'A record, annotated',
    written: 'using',
  },
];

/**
 * Chapter eight, written.
 *
 * The only chapter in this volume that can be written before the peptide
 * sources exist, because it is about how to read a claim rather than about any
 * claim. Every statement here describes this index's own method, which is
 * documented, implemented and tested — so there is nothing in it a reader
 * could mistake for a finding about a peptide.
 *
 * The three classes and their definitions are the taxonomy the database
 * enforces, not a hierarchy invented for the page.
 */
function WrittenChapter({ chapter }: { chapter: ChapterPlan }) {
  switch (chapter.written) {
    case 'safety':
      return <SafetyAndUncertainty chapter={chapter} />;
    case 'quality':
      return <QualitySourceTesting chapter={chapter} />;
    case 'clinician':
      return <QuestionsToAsk chapter={chapter} />;
    case 'using':
      return <HowToUseTheIndex chapter={chapter} />;
    default:
      return <UnderstandingEvidence chapter={chapter} />;
  }
}

function UnderstandingEvidence({ chapter }: { chapter: ChapterPlan }) {
  return (
    <>
      <PublicationPage publication={PUBLICATION} section={chapter.title}>
        <ChapterOpener
          eyebrow={chapter.number}
          title={chapter.title}
          standfirst={chapter.standfirst}
        />

        <Lede>
          Almost every disagreement about a peptide is really a disagreement about what counts as
          evidence. This chapter is about that question, and it is the one chapter here that can be
          written without saying anything about peptides at all.
        </Lede>

        <SectionHeading>Three kinds of thing get called evidence</SectionHeading>
        <Body>
          This index sorts every statement it holds into one of three classes before it does anything
          else with it. The class is not a score. It describes where a statement came from, and
          therefore what it is able to support.
        </Body>

        <Table
          head={['Class', 'What it is', 'What it can support']}
          rows={[
            [
              'Human',
              'A study in people, or labelling authorised by a regulator',
              'A statement about people, within the population studied',
            ],
            [
              'Preclinical',
              'Animals, tissue, cells, models, and analytical measurement of a substance',
              'A statement about that model, or about what a substance is',
            ],
            [
              'Reference and opinion',
              'Textbooks, reviews, a named clinician’s described practice, reported experience',
              'A statement about what a source says — attributed to it',
            ],
          ]}
          widths={[1, 1.5, 1.6]}
        />

        <Body>
          The third class is the one most often mistaken for the first. A practitioner handbook
          describing a regimen is a reliable record of what that clinician recommends. It is not a
          study, and no number of handbooks agreeing turns it into one.
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
          This is not a technicality. Most of what is written about peptides in public rests on
          animal and laboratory work, and the step from that to a sentence about people is usually
          taken silently. In this index it cannot be taken silently: a preclinical record is labelled
          as one everywhere it appears.
        </Body>
      </PublicationPage>

      <PublicationPage publication={PUBLICATION} section={chapter.title}>
        <SectionHeading>What a study design can and cannot show</SectionHeading>
        <Body>
          Within human evidence, the design decides the question that can be answered. A study
          without a comparison group can describe what happened to the people in it; it cannot
          separate what the treatment did from what would have happened anyway. That matters most for
          conditions that come and go on their own, which is exactly where peptides are most often
          used.
        </Body>
        <Bullets
          items={[
            'A randomised trial with a comparison group can support a statement about effect.',
            'An uncontrolled study can describe a group of people and generate a question.',
            'A single case describes one person and settles nothing on its own.',
            'A pharmacokinetic study answers what the body does to the substance, not whether it helps.',
            'A safety study that found no harm in a small group has not shown that it is safe.',
          ]}
        />

        <SectionHeading>A claim with no source attached</SectionHeading>
        <Body>
          The most useful habit this chapter can leave a reader with is to ask, of any claim, what it
          is attached to. Not whether it sounds plausible, and not whether the person saying it seems
          knowledgeable — what specific source says it, and what that source actually did.
        </Body>
        <EvidenceNote
          supports="How this index classifies and attributes evidence: a documented method, implemented in the database and covered by automated tests."
          doesNotSettle="Anything about any particular peptide. This chapter contains no peptide claims, and the chapters that will are not written yet."
          status="Written from the editorial method · awaiting scientific and clinical review"
        />

        <Callout title="“Not established” is an answer">
          <Body>
            When this index says something is not established, it means it looked, recorded what it
            found, and found nothing that supports the statement. That is different from saying the
            statement is false, and different again from staying silent. Most of what is currently
            known about most peptides is an absence of this kind, and a reference that hides its
            absences is not a reference.
          </Body>
        </Callout>

        <SourceNote
          items={[
            'The Tides Index evidence-type taxonomy: nineteen types in three classes, each with a recorded definition.',
            'Editorial policy: every published statement resolves to an exact location in a named source, and every gap states what would resolve it.',
            'No peptide source is cited in this chapter because no peptide claim is made in it.',
          ]}
        />
      </PublicationPage>
    </>
  );
}

/**
 * Chapter nine, written.
 *
 * Safety is the chapter a patient-facing volume is most likely to get wrong in
 * the reassuring direction, so this one makes no safety claim about any
 * compound at all. It is about how to read silence — which is the actual
 * situation a reader of this register is in.
 */
function SafetyAndUncertainty({ chapter }: { chapter: ChapterPlan }) {
  return (
    <PublicationPage publication={PUBLICATION} section={chapter.title}>
      <ChapterOpener
        eyebrow={chapter.number}
        title={chapter.title}
        standfirst={chapter.standfirst}
      />

      <Lede>
        The most common mistake in reading about peptides is to treat silence as reassurance.
        Nothing has been reported, so nothing must happen. That is not what silence means.
      </Lede>

      <SectionHeading>&ldquo;No reported harm&rdquo; is not &ldquo;shown to be safe&rdquo;</SectionHeading>
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
        This is why a record in this index will say that safety is not established even when no
        source reports a problem. The two statements are compatible, and only one of them is about
        the compound.
      </Body>

      <SectionHeading>How uncertainty is recorded here</SectionHeading>
      <Body>
        Every important statement in this index has to say what remains unknown about it before it
        can be published. What is not established is a record in its own right, with its own
        reason and its own description of what would settle it — not a caveat at the bottom of a
        page.
      </Body>
      <Bullets
        items={[
          'Not established: this index looked and found nothing that supports the statement.',
          'Sources disagree: two named sources say different things, and both are shown.',
          'Not obtained: a study exists and this index has not been able to read it.',
          'Not assessed: nobody has checked whether the finding has ever been repeated.',
        ]}
      />

      <SectionHeading>People differ, and the record says who was studied</SectionHeading>
      <Body>
        A result belongs to the people it was measured in. Where a record reports a finding, it
        states the population — and where a source extends a finding beyond the group it studied,
        this index records that as something the source did, not as a fact.
      </Body>

      <Callout title="What to do with an unknown">
        <Text>
          An unknown is a reason to ask a question, not a reason to assume either answer. If
          something here matters to a decision you are making, take the page to a clinician who
          knows your history — the index is built so that you can hand them the source, not just
          the claim.
        </Text>
      </Callout>
    </PublicationPage>
  );
}

/**
 * Chapter ten, written.
 *
 * The one chapter in this volume with real chemistry in it, and the only one
 * that could have it: the claims come from a peptide chemistry textbook and
 * from ICH Q7, both held and extracted. The plain-language job here is to keep
 * three questions apart that a certificate routinely runs together.
 */
function QualitySourceTesting({ chapter }: { chapter: ChapterPlan }) {
  return (
    <>
      <PublicationPage publication={PUBLICATION} section={chapter.title}>
        <ChapterOpener
          eyebrow={chapter.number}
          title={chapter.title}
          standfirst={chapter.standfirst}
        />

        <Lede>
          Three different questions get asked about a vial, and they are usually answered with one
          number. Is it pure? Is it the right molecule? How much of it is in there?
        </Lede>

        <IllustrationSlot
          label="Purity, identity, content — three questions, three measurements"
          height={150}
          note="Vector diagram, drawn from the analytical sources"
        />

        <SectionHeading>Pure is not the same as correct</SectionHeading>
        <Body>
          The usual purity test separates what is in a sample and shows it as a trace with peaks. A
          single clean peak looks conclusive, and it is not: two peptides differing by a single
          amino acid can come out together and appear as one. A purity figure describes how mixed a
          sample is. It does not say what the substance is.
        </Body>
        <Body>
          Identity is a separate measurement. Weighing the molecule — mass spectrometry — compares
          a measured mass against the one the intended sequence predicts, and the comparison
          carries a margin. It can also reveal changes that other methods miss entirely.
        </Body>
        <Body>
          How much peptide is present is separate again. The established method breaks the peptide
          into its amino acids and measures those, which is indirect: several amino acids do not
          survive the process intact, so what comes back is a considered estimate rather than a
          reading off a scale.
        </Body>
        <EvidenceNote
          supports="Claims extracted into this index from a peptide chemistry textbook (SRC-006) and its characterisation protocols (SRC-011)."
          doesNotSettle="Anything about a specific product. These are the questions to ask, not answers about any vial."
          status="Extracted and awaiting scientific review"
        />
      </PublicationPage>

      <PublicationPage publication={PUBLICATION} section={chapter.title}>
        <SectionHeading>What a certificate is</SectionHeading>
        <Body>
          A certificate of analysis is a document saying which tests were run on a material and
          what they returned. The manufacturing standard this index holds sets out what one should
          contain for an active ingredient: the name of the material, each test performed with its
          limits and result, the date, and a signature from someone authorised. Where the testing
          was done by a repacker rather than the original manufacturer, the certificate should say
          so and name the original.
        </Body>
        <Bullets
          items={[
            'A certificate describes the batch it names, and no other.',
            'A certificate from the seller is not the same as a certificate from an independent laboratory.',
            'A missing test is not a passed test.',
            'A document with no batch number cannot be matched to anything you hold.',
          ]}
        />

        <SectionHeading>Peptides degrade, in known ways</SectionHeading>
        <Body>
          In solution, peptides break down by routes that depend on their sequence. Material kept
          for a long time is worth re-checking before use, and even freeze-dried peptide can hold
          more water than expected. This is why storage and transport are part of quality rather
          than an afterthought: the manufacturing standard expects storage conditions to be
          recorded and transport not to compromise the material.
        </Body>

        <Callout title="Country of origin is not a quality test">
          <Text>
            Nothing in the sources held here supports judging a material by where it was made. What
            supports a judgement is the process, the test, the batch and the chain of custody —
            each of which is a document that someone either has or does not.
          </Text>
        </Callout>

        <SourceNote
          items={[
            'SRC-006 — Synthetic Peptides: A User’s Guide, 2nd edition.',
            'SRC-011 — Peptide Characterization and Application Protocols.',
            'SRC-017 — ICH Q7, Good Manufacturing Practice Guide for Active Pharmaceutical Ingredients.',
            'The fuller treatment is in the Peptide Quality volume, from the same records.',
          ]}
        />
      </PublicationPage>
    </>
  );
}

/**
 * Chapter eleven, written.
 *
 * A prompt sheet. It asks and answers nothing, which is what keeps it on the
 * right side of the line: a patient-facing publication may help someone have a
 * better conversation, and may not conduct it for them.
 */
function QuestionsToAsk({ chapter }: { chapter: ChapterPlan }) {
  return (
    <PublicationPage publication={PUBLICATION} section={chapter.title}>
      <ChapterOpener
        eyebrow={chapter.number}
        title={chapter.title}
        standfirst={chapter.standfirst}
      />

      <Lede>
        These are questions, not advice, and none of them has a right answer printed here. The
        point is to hear how they are answered.
      </Lede>

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

      <Callout title="What this page is not">
        <Text>
          There are no amounts, schedules or instructions anywhere in this volume, and that is
          deliberate. A decision about treatment belongs to you and a clinician who knows your
          history, with the evidence in front of you both.
        </Text>
      </Callout>
    </PublicationPage>
  );
}

/**
 * Chapter twelve, written.
 *
 * Documentation of the product, which makes it the safest chapter in the book
 * to write and one of the most useful: a reader who understands how a record
 * is arranged can find the uncertainty themselves rather than taking a summary
 * on trust.
 */
function HowToUseTheIndex({ chapter }: { chapter: ChapterPlan }) {
  return (
    <PublicationPage publication={PUBLICATION} section={chapter.title}>
      <ChapterOpener
        eyebrow={chapter.number}
        title={chapter.title}
        standfirst={chapter.standfirst}
      />

      <Lede>
        Every compound record answers the same four questions in the same order, and you can stop
        after any one of them.
      </Lede>

      <Table
        head={['The question', 'What you will find']}
        rows={[
          ['What it is', 'The molecule, the names it is sold under, and whether those names refer to the same thing.'],
          ['What is known', 'What has been measured in people, what only in animals, and whether anyone repeated it.'],
          ['What is not known', 'Recorded as carefully as the findings, because it is usually the larger part.'],
          ['What sources report', 'Regimens attributed to the source that published them — never merged, never averaged.'],
        ]}
        widths={[1, 2.4]}
      />

      <SectionHeading>Two reading depths, one set of records</SectionHeading>
      <Body>
        The site offers a plain-language view and a practitioner view over the same records. The
        difference is depth, not content: the plain view carries no amounts or schedules, and that
        is enforced in the query that builds the page rather than by hiding things on it. Nothing
        is written for one audience and withheld from the other.
      </Body>

      <SectionHeading>Following a statement back</SectionHeading>
      <Body>
        Every statement names the source it came from and the exact place in it — a page, a
        section, a record identifier. Where this index has read only a summary of a study rather
        than the full paper, the record says so. Where a statement rests on a practitioner
        describing their own practice, it says that too, and it is not presented as a study.
      </Body>

      <SectionHeading>What &ldquo;not published&rdquo; means</SectionHeading>
      <Body>
        A record becomes public only after a named scientific reviewer has approved the exact
        version they read. Until then it carries its state openly. Automated extraction is real
        work and it is not review, and this index will not describe one as the other.
      </Body>

      <Callout title="Where to start">
        <Text>
          If you are new: the Learn pages, then a compound record, then the research questions —
          which are the honest map of what nobody knows yet.
        </Text>
      </Callout>
    </PublicationPage>
  );
}

export function UnderstandingPeptides() {
  return (
    <Document
      title="Understanding Peptides — first draft"
      author="The Tides Index"
      subject="Patient-facing first draft. Five written chapters, seven briefs. No dosing and no reviewed content."
      creator="The Tides Index"
    >
      <Cover
        imprint="The Tides Index"
        series="Reference series · Volume one"
        title="Understanding Peptides"
        subtitle="A plain-language introduction"
        descriptor="Independent peptide science & clinical reference"
        editionLine={`First draft · five chapters written · issued ${ISSUED}`}
        statusLine="Five written chapters and seven briefs, all awaiting review. No dosing, no administration instructions, no treatment advice."
        mark={<SeriesMark width={300} volume={1} />}
      />

      {/* --- What this is ---------------------------------------------- */}
      <PublicationPage publication={PUBLICATION} section="About this skeleton">
        <ChapterOpener
          eyebrow="Skeleton"
          title="What this document is"
          standfirst="Five chapters written, seven still briefs — and the difference is where the sources run out."
        />

        <Lede>
          This is the design skeleton for the patient- and new-staff-facing volume. It exists to
          prove that the publication system carries to a second book, and to fix the structure
          before any content is written.
        </Lede>

        <Body>
          There is no medical content in it, and that is deliberate rather than a stage it has not
          reached yet. Chapter eight is written, and it is written precisely because it makes no
          claim about any peptide: it describes how this index classifies evidence, which is a
          matter of method rather than of science. This is the volume that will be read by the people least able to check it,
          and a plausible paragraph written to fill a page is indistinguishable from a sourced one
          once it is set in the same typeface. So each chapter carries a brief — what it will cover
          and what has to exist before it can be written — and an illustration placeholder at the
          size the real figure will occupy.
        </Body>

        <SectionHeading>What has to happen before it is written</SectionHeading>
        <Body>
          Five chapters are written. Four of them — understanding evidence, safety and uncertainty,
          questions to ask your clinician, and how to use this index — rest on the editorial method
          and on the product rather than on peptide science, so they could be written without a
          peptide source. The fifth, on quality and testing, rests on claims extracted into this
          index from a peptide chemistry textbook and from a manufacturing standard, both held in
          full.
        </Body>
        <Body>
          The remaining seven need sources this index does not hold: a biochemistry reference, a
          physiology source, a pharmacology source. Those chapters stay briefs rather than being
          written from general knowledge, because a paragraph written to fill a page sets in the
          same typeface as a sourced one and this is the volume whose readers can least afford
          that.
        </Body>

        <View
          style={{
            borderLeftWidth: 2,
            borderLeftColor: colour.caution,
            backgroundColor: colour.cautionBg,
            padding: 12,
            marginTop: 10,
          }}
        >
          <Text style={{ fontFamily: serif, fontSize: type.small, lineHeight: leading.tight }}>
            Nothing in this skeleton states anything about peptides. Any sentence that appears to
            is describing what a future chapter will address, not making the claim itself.
          </Text>
        </View>
      </PublicationPage>

      {/* --- Contents --------------------------------------------------- */}
      <PublicationPage publication={PUBLICATION} section="Contents">
        <ChapterOpener eyebrow="Contents" title="Twelve chapters" />

        {CHAPTERS.map((chapter, index) => (
          <View
            key={chapter.title}
            style={{
              flexDirection: 'row',
              borderBottomWidth: 0.5,
              borderBottomColor: colour.ruleSoft,
              paddingVertical: 8,
            }}
          >
            <Text
              style={{
                width: 30,
                fontFamily: sans,
                fontSize: type.small,
                color: colour.tideTeal,
              }}
            >
              {String(index + 1).padStart(2, '0')}
            </Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: serif, fontSize: type.body, color: colour.ink }}>
                {chapter.title}
              </Text>
              <Text
                style={{
                  fontFamily: sans,
                  fontSize: type.micro,
                  color: colour.slate,
                  marginTop: 2,
                }}
              >
                {chapter.standfirst}
              </Text>
            </View>
          </View>
        ))}

        <SubHeading>Back matter</SubHeading>
        <Body>Glossary · sources and method · current version · where to check for revisions.</Body>
      </PublicationPage>

      {/* --- One page per chapter --------------------------------------- */}
      {CHAPTERS.map((chapter) =>
        chapter.written !== undefined ? (
          <WrittenChapter key={chapter.title} chapter={chapter} />
        ) : (
          <PublicationPage key={chapter.title} publication={PUBLICATION} section={chapter.title}>
            <ChapterOpener
              eyebrow={chapter.number}
              title={chapter.title}
              standfirst={chapter.standfirst}
            />
            <IllustrationSlot
              label={chapter.illustration}
              height={170}
              {...(chapter.illustrationNote === undefined
                ? {}
                : { note: chapter.illustrationNote })}
            />
            <ChapterBrief covers={chapter.covers} needs={chapter.needs} />
          </PublicationPage>
        ),
      )}

      {/* --- Back matter ------------------------------------------------ */}
      <PublicationPage publication={PUBLICATION} section="Method">
        <ChapterOpener
          eyebrow="Back matter"
          title="Sources, method and version"
          standfirst="The same chain as every Tides Index publication."
        />
        <Body>
          Every statement in the finished volume will resolve to an exact location in a named source,
          carry a recorded reading distinct from the passage itself, and state what remains
          uncertain. Where the sources settle nothing, the page will say so.
        </Body>
        <Body>
          This volume will additionally require clinical review, which the Peptide Quality volume
          does not: it addresses a reader who may act on it.
        </Body>

        <CurrentVersionBlock
          url="thetidesindex.com"
          version={`Understanding Peptides · design skeleton · issued ${ISSUED}`}
          note="Five written chapters. No dosing anywhere. No review yet, of the chapters or the records behind them."
        />
      </PublicationPage>
    </Document>
  );
}
