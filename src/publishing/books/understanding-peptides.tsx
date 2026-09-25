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
  SubHeading,
  Table,
} from '../primitives';
import { SeriesMark } from '../figures';
import { ConceptPlate, IllustrationPlate, patientIllustration } from '../illustration-print';
import { colour, leading, sans, serif, type } from '../theme';

/**
 * UNDERSTANDING PEPTIDES — the patient- and new-staff-facing volume.
 *
 * Built to be taught from. Each idea arrives first as a question, a drawing and
 * one short explanation — the short course — and the chapters underneath give
 * the fuller, attributed account for a reader who wants it.
 *
 * The drawings are the site's own illustrations, printed through
 * `illustration-print`, so a figure corrected on the web is corrected here, and
 * each one states what it was drawn from.
 *
 * Nothing is written from general knowledge. Eleven chapters rest on located
 * sources or on the editorial method; a twelfth is planned and held back from
 * print until it can be sourced. A point no held source supports is printed as
 * what remains uncertain, where the point would have been, and a conclusion drawn
 * openly from several claims as what the sources add up to. Unmarked text is
 * source fact, and every chapter ends with its sources.
 *
 * The page speaks to a patient; the record keeps its exact state. Each chapter
 * closes with what we know, what remains uncertain and what would answer it, in
 * plain words, and the back matter prints the internal evidence states and the
 * recorded open questions verbatim, so nothing is hidden and nothing reads like
 * an audit report on the way through.
 */

const PUBLICATION = 'Understanding Peptides';
const ISSUED = '15 September 2026';

interface ChapterPlan {
  readonly number: string;
  readonly title: string;
  readonly standfirst: string;
  readonly covers: readonly string[];
  readonly needs: string;
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
  readonly written?:
    | 'evidence'
    | 'safety'
    | 'quality'
    | 'clinician'
    | 'using'
    | 'receptors'
    | 'peptide'
    | 'building-blocks'
    | 'body'
    | 'signalling'
    | 'routes';
}

/**
 * The chapters as printed. A chapter still at the brief stage is not printed —
 * a planned chapter set as an outline reads as unfinished work in a booklet a
 * clinic hands to patients — so printed chapters are numbered in order.
 */
const NUMBER_WORDS = ['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve'];

type WrittenKind = NonNullable<ChapterPlan['written']>;

function printedChapters(): readonly ChapterPlan[] {
  return CHAPTERS.filter((c) => c.written !== undefined).map((c, i) => ({ ...c, number: NUMBER_WORDS[i] ?? c.number }));
}

function chapterNumber(kind: WrittenKind): string {
  return (printedChapters().find((c) => c.written === kind)?.number ?? '').toLowerCase();
}

/**
 * The close of a chapter, for a patient reader: what the sources establish, what
 * they leave open, and what kind of evidence would settle it. The exact internal
 * state of each chapter's record is printed in the back matter (REVIEW_STATE).
 */
function WhatWeKnow({ know, uncertain, answer }: { know: string; uncertain: string; answer?: string }) {
  const rows: readonly [string, string, string][] = [
    ['What we know', know, colour.tideTeal],
    ['What remains uncertain', uncertain, colour.caution],
    ...(answer === undefined ? [] : ([['What would answer it', answer, colour.deepTide]] as [string, string, string][])),
  ];
  return (
    <View
      wrap={false}
      style={{
        borderTopWidth: 0.75,
        borderTopColor: colour.rule,
        borderBottomWidth: 0.75,
        borderBottomColor: colour.rule,
        paddingVertical: 8,
        marginVertical: 10,
      }}
    >
      {rows.map(([label, text, tone]) => (
        <View key={label} style={{ flexDirection: 'row', paddingVertical: 3 }}>
          <Text
            style={{
              width: 112,
              fontFamily: sans,
              fontSize: type.micro,
              letterSpacing: 0.9,
              textTransform: 'uppercase',
              color: tone,
              paddingTop: 1.5,
            }}
          >
            {label}
          </Text>
          <Text style={{ flex: 1, fontFamily: serif, fontSize: type.small, lineHeight: leading.tight, color: colour.ink }}>
            {text}
          </Text>
        </View>
      ))}
    </View>
  );
}

const CHAPTERS: readonly ChapterPlan[] = [
  {
    number: 'One',
    title: 'What is a peptide?',
    standfirst: 'The definition, and where the boundary with proteins sits.',
    covers: [
      'What distinguishes a peptide from a protein, and why the boundary is a convention rather than a fact of nature',
      'The peptide bond',
      'Why the distinction matters for how something is made, stored and measured',
    ],
    needs:
      'Written from claims FND-01 to FND-07 and FND-16 to FND-19, extracted from CC BY-licensed reviews and a public-domain US government glossary.',
    written: 'peptide',
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
    needs: 'Written from claims FND-08 to FND-17, extracted from CC BY-licensed reviews.',
    written: 'building-blocks',
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
      'Written from claims END-03 to END-13, extracted from CC BY-licensed reviews and a public-domain US government overview. The strictest sourcing in the book: two points no source held states are marked SOURCE NEEDED on the page, and one conclusion drawn from its claims is marked as a Tides synthesis.',
    written: 'body',
  },
  {
    number: 'Four',
    title: 'How peptide signalling works',
    standfirst: 'Messages, not machinery.',
    covers: [
      'Signalling as a message-and-receiver system',
      'Why specificity matters',
      'How a signal is switched off',
    ],
    needs:
      'Written from claims SIG-01 to SIG-07, SIG-09, SIG-12 and SIG-13, extracted from CC BY-licensed reviews and a public-domain US government overview.',
    written: 'signalling',
  },
  {
    number: 'Five',
    title: 'Receptors',
    standfirst: 'Why a molecule only acts where something is listening.',
    covers: [
      'Receptor binding as recognition',
      'Selectivity, and what follows from a molecule binding more than one target',
    ],
    needs:
      'Written from sixteen claims extracted from chapter 2 of Rang and Dale’s Pharmacology, 10th edition, held only as a Spanish-language publisher sample (SRC-121). Each is a paraphrase of the Spanish text, to be re-checked against the English edition, and none is yet scientifically reviewed.',
    written: 'receptors',
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
      'Written from claims RTE-01 to RTE-14, RTE-19 to RTE-23 and RTE-25 to RTE-28, PKG-12 to PKG-14, and PK-02 to PK-04, PK-11 and PK-15: FDA route data standards and US regulation (public domain), the NCI Thesaurus (CC BY 4.0) and reviews licensed CC BY 4.0.',
    written: 'routes',
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
    case 'receptors':
      return <Receptors chapter={chapter} />;
    case 'peptide':
      return <WhatIsAPeptide chapter={chapter} />;
    case 'building-blocks':
      return <AminoAcidsPeptidesProteins chapter={chapter} />;
    case 'body':
      return <PeptidesInTheBody chapter={chapter} />;
    case 'signalling':
      return <PeptideSignalling chapter={chapter} />;
    case 'routes':
      return <RoutesOfAdministration chapter={chapter} />;
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

        <IllustrationPlate illustration={patientIllustration('evidence-lanes')} />

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
        <IllustrationPlate illustration={patientIllustration('study-design')} />

        <SectionHeading>A claim with no source attached</SectionHeading>
        <Body>
          The most useful habit this chapter can leave a reader with is to ask, of any claim, what it
          is attached to. Not whether it sounds plausible, and not whether the person saying it seems
          knowledgeable — what specific source says it, and what that source actually did.
        </Body>
        <WhatWeKnow
          know="How this index sorts evidence into studies in people, studies in animals or cells, and reference or opinion — its own documented method, which states nothing about any peptide."
          uncertain="Anything about a particular peptide. This chapter explains how to read evidence; it does not assess any."
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

      <IllustrationPlate illustration="known-unknown" />

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

        <IllustrationPlate illustration={patientIllustration('separate-questions')} />

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

        <WhatWeKnow
          know="Why purity, identity and amount are three separate questions — from a peptide chemistry textbook and its laboratory protocols."
          uncertain="Anything about a specific product. These are the questions to ask, not answers about any vial."
        />

        <SourceNote
          items={[
            'SRC-006 — Synthetic Peptides: A User’s Guide, 2nd edition.',
            'SRC-011 — Peptide Characterization and Application Protocols.',
            'SRC-017 — ICH Q7, Good Manufacturing Practice Guide for Active Pharmaceutical Ingredients.',
            'The fuller treatment is in Peptide Quality: From Manufacturing to the Final Vial, from the same records.',
          ]}
        />
      </PublicationPage>
    </>
  );
}

/**
 * The claims chapter five rests on. Exported so a test can hold the chapter to
 * the learning-topic packet: a renamed or removed claim fails the build rather
 * than leaving a paragraph with nothing under it.
 */
/** English-language CC BY claims that corroborate, and in one place qualify, chapter five. */
export const CHAPTER_FIVE_ENGLISH_CLAIMS = ['REC-02', 'REC-03', 'REC-05', 'REC-06', 'REC-25', 'REC-26'] as const;

export const CHAPTER_FIVE_CLAIMS = [
  'RECEPT-001',
  'RECEPT-002',
  'RECEPT-003',
  'RECEPT-004',
  'RECEPT-005',
  'RECEPT-006',
  'RECEPT-007',
  'RECEPT-014',
  'RECEPT-016',
] as const;

/**
 * Chapter five, written.
 *
 * The first chapter in this volume that states anything about how molecules
 * act, so the sourcing is stated on the page as plainly as the content: a
 * pharmacology textbook, held only as a partial Spanish-language sample, read
 * and paraphrased. Every paragraph corresponds to a claim listed above. Nothing
 * here says which receptor any peptide acts on — that is a claim about a
 * compound and belongs to its record.
 */
function Receptors({ chapter }: { chapter: ChapterPlan }) {
  return (
    <>
      <PublicationPage publication={PUBLICATION} section={chapter.title}>
        <ChapterOpener
          eyebrow={chapter.number}
          title={chapter.title}
          standfirst={chapter.standfirst}
        />

        <Lede>
          For most medicines, a molecule has to attach to something specific in the body before it
          can do anything at all. That something is usually a protein, and one kind of protein — a
          receptor — exists to pick up the body’s own chemical messages.
        </Lede>

        <IllustrationPlate illustration="receptor-binding" />

        <SectionHeading>Something has to be listening</SectionHeading>
        <Body>
          A standard pharmacology textbook describes four main kinds of protein that medicines act
          on: receptors, enzymes, transporters and ion channels. In its strict sense, a receptor is
          the kind that recognises one of the body’s own signals and responds to it. The word is
          sometimes used loosely for anything a molecule sticks to; this index uses the narrower
          meaning.
        </Body>

        <SectionHeading>Switching on, and getting in the way</SectionHeading>
        <Body>
          A molecule that switches a receptor on is called an agonist. A molecule that sits in the
          same place without switching it on — and so stops the switching-on molecule from working —
          is called an antagonist. Those two words properly describe receptors, not the other kinds
          of target.
        </Body>
        <Body>
          Attaching and switching on are two different properties. How readily a molecule sticks to
          a receptor is its affinity; how well it switches the receptor on once it is there is its
          efficacy. A partial agonist switches a receptor only part of the way on, so even when it
          fills every receptor the response stays below the maximum — and how strong a molecule
          looks can depend on the tissue it is tested in. A 2024 paper in English adds a caution:
          how strongly an activating molecule appears to attach is partly shaped by how well it
          switches the receptor on, so the two cannot simply be measured separately.
        </Body>
      </PublicationPage>

      <PublicationPage publication={PUBLICATION} section={chapter.title}>
        <SectionHeading>Choosy, but never perfectly</SectionHeading>
        <Body>
          Molecules and their targets are choosy about each other, but the same textbook states that
          no medicine is perfectly choosy, and that at higher amounts many begin to act on targets
          other than the main one — which is one way side effects arise. Recognition can also be
          very precise: the book’s own example is a natural peptide whose activity can be lost when a
          single one of its building blocks is changed. English-language research on anaesthetics
          reaches a similar conclusion for that class of drug: agents described as acting on one
          receptor often act on several, and at high doses may act on receptors beyond their main one.
        </Body>

        <SectionHeading>Why an effect can fade</SectionHeading>
        <Body>
          The body’s response to a substance can weaken with repeated exposure, sometimes within
          minutes and sometimes over weeks, and there are several different reasons it can happen.
          What a molecule does in the first minutes can also differ from what long exposure does
          over days or weeks, and the longer-term changes are often not well understood.
        </Body>

        <Callout title="What this chapter does not tell you">
          <Text>
            It does not say which receptor any particular peptide acts on, how strongly, or with what
            result. Those are statements about a compound, and each has to be sourced on that
            compound’s own record. How a receptor passes its message into the cell is described in
            chapter four.
          </Text>
        </Callout>

        <WhatWeKnow
          know="What receptors are, the difference between attaching and switching on, and why no medicine is perfectly choosy — from a standard pharmacology textbook, read in a partial Spanish-language edition and checked against English-language reviews."
          uncertain="Which receptor any particular peptide acts on, how strongly, or with what result."
          answer="Checking each statement against the English edition of the textbook."
        />

        <SourceNote
          items={[
            'SRC-121 — Rang y Dale. Farmacología, décima edición (Spanish translation of Rang and Dale’s Pharmacology, 10th edition), chapter 2, printed pp. 6–22. Claims RECEPT-001 to RECEPT-007, RECEPT-014 and RECEPT-016.',
            'SRC-122 — Rang and Dale’s Pharmacology, 10th edition (English). Not held; on owner direction no further copy is being sought.',
            'SRC-172 — Watts SW et al. American Journal of Hypertension 2023 (CC BY 4.0). REC-02, REC-05.',
            'SRC-173 — Liu S et al. Circulation Research 2024 (CC BY 4.0). REC-03.',
            'SRC-169 — Higham JP, Colquhoun D. Royal Society Open Science 2024 (CC BY 4.0). REC-06.',
            'SRC-178 — Kale KM et al. Anesthesia and Analgesia 2026 (CC BY 4.0). REC-25, REC-26; evidence about anaesthetics, applied here as an extrapolation.',
          ]}
        />
      </PublicationPage>
    </>
  );
}

/**
 * A Tides synthesis: a conclusion drawn from several sourced claims, naming
 * them. Printed where a point follows from the sources on the page but no
 * source states it — so it is neither passed off as a source fact nor left as
 * a gap. Its text is the seeded synthesis (data/seed/syntheses), held equal to
 * it by a unit test.
 */
function TidesSynthesis({
  synthesisKey,
  statement,
  restsOn,
  doesNotConclude,
}: {
  synthesisKey: string;
  statement: string;
  restsOn: string;
  doesNotConclude: string;
}) {
  return (
    <View
      wrap={false}
      style={{
        borderLeftWidth: 2,
        borderLeftColor: colour.deepTide,
        paddingLeft: 11,
        paddingVertical: 2,
        marginVertical: 10,
      }}
    >
      <Text
        style={{
          fontFamily: sans,
          fontSize: type.micro,
          letterSpacing: 1.1,
          textTransform: 'uppercase',
          color: colour.deepTide,
          marginBottom: 3,
        }}
      >
        What these sources add up to
      </Text>
      <Text style={{ fontFamily: serif, fontSize: type.body, lineHeight: leading.body, color: colour.ink }}>
        {statement}
      </Text>
      <Text
        style={{
          fontFamily: sans,
          fontSize: type.micro,
          lineHeight: leading.tight,
          color: colour.slate,
          marginTop: 3,
        }}
      >
        A Tides synthesis ({synthesisKey}), drawn openly by this index from claims {restsOn}. {doesNotConclude}
      </Text>
    </View>
  );
}

/**
 * A point a chapter was planned to make and no held source supports.
 *
 * Printed in place of the point, in the chapter's own flow, so a gap is read
 * where the reader would otherwise have met a sentence written from general
 * knowledge. Quiet by design: a rule and a label, not an alarm.
 */
function SourceNeeded({ point, why }: { point: string; why: string }) {
  return (
    <View
      wrap={false}
      style={{
        borderLeftWidth: 2,
        borderLeftColor: colour.cautionRule,
        paddingLeft: 11,
        paddingVertical: 2,
        marginVertical: 9,
      }}
    >
      <Text
        style={{
          fontFamily: sans,
          fontSize: type.micro,
          letterSpacing: 1.1,
          textTransform: 'uppercase',
          color: colour.caution,
          marginBottom: 3,
        }}
      >
        What remains uncertain
      </Text>
      <Text style={{ fontFamily: serif, fontSize: type.small, lineHeight: leading.tight, color: colour.inkSoft }}>
        {point}
      </Text>
      <Text
        style={{
          fontFamily: sans,
          fontSize: type.micro,
          lineHeight: leading.tight,
          color: colour.slate,
          marginTop: 3,
        }}
      >
        {why}
      </Text>
    </View>
  );
}

/**
 * The claims chapters one to four rest on. Exported so a test can hold each
 * chapter to its learning-topic packet: a renamed or removed claim fails the
 * build rather than leaving a paragraph with nothing under it.
 */
export const CHAPTER_ONE_CLAIMS = [
  'FND-01', 'FND-02', 'FND-03', 'FND-04', 'FND-05', 'FND-06', 'FND-07',
  'FND-16', 'FND-17', 'FND-18', 'FND-19',
] as const;
export const CHAPTER_TWO_CLAIMS = [
  'FND-08', 'FND-09', 'FND-10', 'FND-11', 'FND-12', 'FND-13', 'FND-14', 'FND-15',
  'FND-16', 'FND-17',
] as const;
export const CHAPTER_THREE_CLAIMS = [
  'END-03', 'END-04', 'END-05', 'END-06', 'END-07', 'END-08', 'END-09', 'END-10',
  'END-11', 'END-12', 'END-13',
] as const;
export const CHAPTER_FOUR_CLAIMS = [
  'SIG-01', 'SIG-02', 'SIG-03', 'SIG-04', 'SIG-05', 'SIG-06', 'SIG-07', 'SIG-09',
  'SIG-12', 'SIG-13',
] as const;

/**
 * Chapter one, written.
 *
 * From reviews licensed CC BY and a public-domain US government glossary, each
 * licence read in the source itself (owner decision D-26: OpenStax excluded).
 */
function WhatIsAPeptide({ chapter }: { chapter: ChapterPlan }) {
  return (
    <>
      <PublicationPage publication={PUBLICATION} section={chapter.title}>
        <ChapterOpener
          eyebrow={chapter.number}
          title={chapter.title}
          standfirst={chapter.standfirst}
        />
        <Lede>
          A peptide is a chain of amino acids joined by a particular chemical link, the peptide
          bond. Proteins are built from the same building blocks. The main difference the sources
          describe is size — and where size turns a peptide into a protein is a matter of convention.
        </Lede>

        <SectionHeading>Where a peptide ends and a protein begins</SectionHeading>
        <Body>
          A 2023 review of peptide formulation describes peptides and proteins as both made of amino
          acids: peptides are the smaller molecules, two or more amino acids linked by peptide bonds,
          and proteins are long chains that may contain many more.
        </Body>
        <Body>
          How long is too long to be a peptide is not settled. A 2026 review calls the upper limit an arbitrary cut-off, usually
          set below 50 or 100 amino acids, and a 2021 review notes that published definitions
          contradict each other, drawing the line below 30, at 50, or at up to 100. The US National
          Human Genome Research Institute’s glossary uses one of these conventions: a peptide is
          typically 2 to 50 amino acids, and a chain of 51 or more is a polypeptide.
        </Body>
        <Body>
          The boundary, in other words, is a line scientists choose. It is not one found in nature.
        </Body>

        <SectionHeading>The peptide bond</SectionHeading>
        <Body>
          A 2023 review of peptide chemistry describes the link: the acid (carboxyl) group of one
          amino acid joins the amino group of the next, forming the bond the chemist Emil Fischer
          named the peptide bond. When two amino acids join this way, a molecule of water is released.
        </Body>
        <IllustrationPlate illustration="peptide-bond" />
        <SourceNeeded
          point="What the two ends of a chain — the N-terminus and the C-terminus — are, and what a “residue” is."
          why="No permissively licensed source held by this index defines them, so this chapter does not."
        />
      </PublicationPage>

      <PublicationPage publication={PUBLICATION} section={chapter.title}>
        <SectionHeading>Shape</SectionHeading>
        <Body>
          Proteins usually fold into a defined three-dimensional shape. The 2023 formulation review
          states that peptides generally do not: because they are short, most of their side chains
          stay exposed to the liquid around them. It also notes exceptions — some peptides do hold a
          defined shape, braced by internal links such as disulfide bridges.
        </Body>

        <SectionHeading>Why the difference matters</SectionHeading>
        <Body>
          <Text style={{ fontFamily: sans }}>Making. </Text>A 2022 review states that chains of fewer
          than 50 amino acids are relatively routine to build chemically, while longer chains remain
          challenging to make that way, especially in large quantities.
        </Body>
        <Body>
          <Text style={{ fontFamily: sans }}>Storing. </Text>Because they can be unstable, most
          peptide medicines are stored and transported cold, according to the 2023 formulation
          review. That describes licensed medicines in general; it is not storage advice for any
          product.
        </Body>
        <Body>
          <Text style={{ fontFamily: sans }}>Testing. </Text>For medicines, a 2025 review states that
          characterising a peptide or protein, and the product it is in, is how its identity, purity
          and activity are assured.
        </Body>
        <SourceNeeded
          point="How the way a molecule is measured changes as the chain gets longer."
          why="The sources held say what is measured, not how the methods differ with size."
        />

        <Callout title="What this chapter does not tell you">
          <Text>
            It does not describe any peptide product, say what any vial contains, or say how anything
            should be stored or used.
          </Text>
        </Callout>

        <WhatWeKnow
          know="What a peptide is, how the peptide bond forms, and how short chains differ from proteins — from published reviews and a US government genetics glossary."
          uncertain="Anything about a particular peptide or product. Definitions of ‘peptide’ are conventions, and they differ between sources."
          answer="A published source that defines the ends of a chain and ‘residue’, and one comparing how peptides and proteins are measured."
        />
        <SourceNote
          items={[
            'SRC-145 — Nugrahadi PP et al. Pharmaceutics 2023;15:935 (CC BY 4.0). FND-03, FND-05, FND-16, FND-19.',
            'SRC-160 — López-López E et al. Chemical Science 2026 (CC BY 3.0). FND-01.',
            'SRC-161 — Apostolopoulos V et al. Molecules 2021 (CC BY 4.0). FND-02.',
            'SRC-164 — National Human Genome Research Institute. Talking Glossary of Genomic and Genetic Terms, “Peptide” (public domain; accessed 14 September 2026). Courtesy: National Human Genome Research Institute. FND-04.',
            'SRC-162 — Duengo S et al. Molecules 2023 (CC BY 4.0). FND-06, FND-07.',
            'SRC-143 — Wang L et al. Signal Transduction and Targeted Therapy 2022;7:48 (CC BY 4.0). FND-17.',
            'SRC-163 — Elsayed YY et al. Journal of Peptide Science 2025 (CC BY 4.0). FND-18.',
          ]}
        />
      </PublicationPage>
    </>
  );
}

/** Chapter two, written. Reviews licensed CC BY. */
function AminoAcidsPeptidesProteins({ chapter }: { chapter: ChapterPlan }) {
  return (
    <>
      <PublicationPage publication={PUBLICATION} section={chapter.title}>
        <ChapterOpener
          eyebrow={chapter.number}
          title={chapter.title}
          standfirst={chapter.standfirst}
        />
        <Lede>
          Amino acids are the building blocks of both peptides and proteins. What a chain is depends
          on which amino acids it contains, and in what order.
        </Lede>
        <IllustrationPlate illustration={patientIllustration('chain-scale')} />

        <SectionHeading>One alphabet</SectionHeading>
        <Body>
          A 2023 review describes every genetically encoded amino acid as sharing the same core: an
          amino group at one end, an acid (carboxyl) group at the other, and a central carbon atom
          between them. What makes each amino acid different is the side chain attached to that
          central carbon. The same review describes the standard set of twenty as an “alphabet”.
        </Body>
        <Body>
          The side chain gives each amino acid its character. A 2020 review states that it decides
          whether the amino acid mixes with water or avoids it, and whether it carries an electric
          charge.
        </Body>

        <SectionHeading>From sequence to shape</SectionHeading>
        <Body>
          The order of amino acids along a chain is called its primary structure. The chain’s
          repeating spine — its backbone, meaning the chain without its side chains — can coil into
          helices or line up into sheets; that is secondary structure. The complete folded shape of a
          protein is its tertiary structure, held together mainly by contacts between side chains.
          All three definitions come from a 2022 review in Essays in Biochemistry.
        </Body>
        <Body>
          A 2016 review, following the work of Anfinsen, states that how a protein folds into its
          working shape is dictated by the information in its amino-acid sequence. One key event in
          folding, it adds, is the chain collapsing so that its water-avoiding side chains are tucked
          away from the surrounding water.
        </Body>
      </PublicationPage>

      <PublicationPage publication={PUBLICATION} section={chapter.title}>
        <SectionHeading>What changes as a chain gets longer</SectionHeading>
        <Body>
          The sources held describe two differences. Short peptides generally do not fold into a
          compact shape, so most of their side chains stay exposed — with the exceptions described in
          chapter one. And longer chains are harder to build chemically: a 2022 review describes
          chains of fewer than 50 amino acids as relatively routine to make that way, and longer ones
          as still challenging.
        </Body>
        <SourceNeeded
          point="What else changes as a chain gets longer — how stable it is, or whether the immune system recognises it."
          why="No permissively licensed source held states these effects of length in general terms."
        />

        <Callout title="What this chapter does not tell you">
          <Text>
            It does not describe the sequence or structure of any peptide in this index. Those are
            claims about a compound, and each belongs on that compound’s record.
          </Text>
        </Callout>

        <WhatWeKnow
          know="The amino-acid alphabet, and how a chain’s sequence gives rise to its shape — from published reviews."
          uncertain="How any particular peptide folds or behaves, and what else changes as a chain gets longer."
          answer="A published review of how a chain’s properties change with its length."
        />
        <SourceNote
          items={[
            'SRC-165 — Brown SM et al. Life 2023 (CC BY 4.0). FND-09, FND-10.',
            'SRC-166 — Idrees M et al. Antibiotics 2020 (CC BY 4.0). FND-11.',
            'SRC-167 — Morris R et al. Essays in Biochemistry 2022 (CC BY 4.0). FND-08, FND-12, FND-13.',
            'SRC-168 — Muñoz V, Cerminara M. Biochemical Journal 2016 (CC BY 4.0). FND-14, FND-15.',
            'SRC-145 — Nugrahadi PP et al. Pharmaceutics 2023 (CC BY 4.0). FND-16.',
            'SRC-143 — Wang L et al. Signal Transduction and Targeted Therapy 2022 (CC BY 4.0). FND-17.',
          ]}
        />
      </PublicationPage>
    </>
  );
}

/**
 * Chapter three, written.
 *
 * The chapter a patient publication is most likely to overstate. Three points
 * it was planned to make are not stated by any source held, and each is printed
 * as SOURCE NEEDED where the point would have been.
 */
function PeptidesInTheBody({ chapter }: { chapter: ChapterPlan }) {
  return (
    <>
      <PublicationPage publication={PUBLICATION} section={chapter.title}>
        <ChapterOpener
          eyebrow={chapter.number}
          title={chapter.title}
          standfirst={chapter.standfirst}
        />
        <Lede>
          The body makes many peptides of its own. This chapter describes, from reviews of
          physiology, some of the kinds it makes, how it makes and removes them, and why what a
          peptide does depends on where and when it acts.
        </Lede>
        <IllustrationPlate illustration={patientIllustration('peptide-lifecycle')} />

        <SectionHeading>Kinds of peptide the body makes</SectionHeading>
        <Body>
          Nerve cells make peptides known as neuropeptides. Some peptides are part of the body’s
          built-in defence against germs: a 2014 review describes host-defence antimicrobial peptides
          as key components of the innate immune system. And specialised cells that make hormones
          and other secreted proteins keep them packed in storage granules and release them when
          stimulated; a 2025 review gives cells of the pituitary gland and the beta cells of the
          pancreas as examples.
        </Body>
        <SourceNeeded
          point="Growth factors, as a class of signal the body makes."
          why="No permissively licensed source held describes them as a class."
        />

        <SectionHeading>Made long, then cut</SectionHeading>
        <Body>
          The body’s peptides are often made first as part of a longer chain. A 2025 review
          describes the classical account for neuropeptides: they are made as long precursor chains,
          trimmed by enzymes into their active form, and stored until the nerve cell’s activity
          releases them — an account its authors note that newer findings have complicated.
          Host-defence peptides, too, are usually made as larger precursor proteins and cut to
          release the working peptide; one example a review gives is a protein called hCAP18, cut to
          produce the active peptide LL-37.
        </Body>

        <SectionHeading>How they are removed</SectionHeading>
        <Body>
          Peptides are also broken down. The 2025 neuropeptide review states that neuropeptides are
          broken down by enzymes, mostly inside compartments of the cell called lysosomes. A 2022
          review gives an example from the hormones: the body’s own GLP-1 is broken down by an enzyme,
          DPP-4, and rapidly inactivated.
        </Body>
        <SourceNeeded
          point="Whether the body’s own peptides are, as a general rule, short-lived."
          why="The sources held describe the breakdown of neuropeptides and give one hormone example; none states a general rule."
        />
      </PublicationPage>

      <PublicationPage publication={PUBLICATION} section={chapter.title}>
        <SectionHeading>What a peptide does depends on context</SectionHeading>
        <Body>Four sources each describe a part of the picture.</Body>
        <Bullets
          items={[
            'What the body’s antimicrobial peptides do can depend on the biological context, how much of the peptide is present, protein-cutting enzymes and the body’s metabolic state (a 2014 review).',
            'The same molecule can be used as a hormone carried in the blood in one setting and as a local signal in another (a 2019 review).',
            'Which receptors are present, where and when, is the chief factor deciding what any chemical messenger does — an argument made by the authors of a 2025 neuropeptide review.',
            'In hormone systems run by the brain’s hypothalamus and pituitary gland, constant feedback keeps the system’s activity within appropriate limits (a 1998 overview).',
          ]}
        />
        <TidesSynthesis
          synthesisKey="SYN-BODY-01"
          statement="The body making a peptide is not, on its own, evidence about what a product containing it will do."
          restsOn="END-10, END-11, END-12 and END-13"
          doesNotConclude="It does not say that any peptide product is safe or unsafe, effective or ineffective. It says only that the fact the body makes a peptide is not the evidence that would show either."
        />

        <Callout title="What this chapter does not tell you">
          <Text>
            It does not say that any peptide taken as a product behaves like one the body makes, or
            describe what any peptide product does.
          </Text>
        </Callout>

        <WhatWeKnow
          know="Some kinds of peptide the body makes, how it makes, stores and removes them, and why what one does depends on context — from published reviews and a US government overview."
          uncertain="Anything about a peptide product or treatment, and the two questions marked in this chapter."
          answer="A published review of growth factors as a class, and one on how the body clears its peptide hormones."
        />
        <SourceNote
          items={[
            'SRC-152 — Hevesi Z, Hökfelt T, Harkany T. BioEssays 2025 (CC BY 4.0). END-03, END-04, END-11.',
            'SRC-153 — Wang G. Pharmaceuticals 2014 (CC BY 3.0). END-06, END-07, END-10.',
            'SRC-151 — Ahmadi SM et al. Frontiers in Endocrinology 2025 (CC BY). END-05.',
            'SRC-154 — Alford MA et al. Frontiers in Microbiology 2020 (CC BY 4.0). END-08.',
            'SRC-143 — Wang L et al. Signal Transduction and Targeted Therapy 2022 (CC BY 4.0). END-09.',
            'SRC-155 — Tse LH, Wong YH. Frontiers in Endocrinology 2019 (CC BY). END-12.',
            'SRC-156 — Hiller-Sturmhöfel S, Bartke A. Alcohol Health and Research World 1998 (public domain). END-13.',
          ]}
        />
      </PublicationPage>
    </>
  );
}

/** Chapter four, written. Reviews licensed CC BY and a public-domain overview. */
function PeptideSignalling({ chapter }: { chapter: ChapterPlan }) {
  return (
    <>
      <PublicationPage publication={PUBLICATION} section={chapter.title}>
        <ChapterOpener
          eyebrow={chapter.number}
          title={chapter.title}
          standfirst={chapter.standfirst}
        />
        <Lede>
          Peptide signalling is a matter of messages and receivers. A messenger reaches a cell;
          whether anything happens depends on whether that cell has a receptor for it, and the change
          takes place inside the receiving cell.
        </Lede>
        <IllustrationPlate illustration={patientIllustration('message-receiver')} />

        <SectionHeading>A message and a receiver</SectionHeading>
        <Body>
          A 1998 overview of the endocrine system explains that a hormone acts only on target cells
          that carry receptors for it, either on the cell surface or inside the cell. When the hormone
          binds its receptor, a chain of chemical reactions starts inside the target cell and changes
          what that cell does. The same overview states that peptide and protein hormones cannot enter
          cells because of their chemical structure, so they act through receptors on the cell
          surface — a categorical statement from a general overview, reported as written.
        </Body>
        <Body>
          In the classical picture, a 2019 review explains, hormones are released into the
          bloodstream and act on target cells in distant parts of the body; the same processes are
          also shaped by several more local forms of communication between cells.
        </Body>
        <SourceNeeded
          point="Plain definitions of the local forms of signalling — paracrine and autocrine."
          why="The sources held name them but do not define them."
        />

        <SectionHeading>Inside the receiving cell</SectionHeading>
        <Body>
          For one large family of receptors, the G-protein-coupled receptors, a 2015 review describes
          the general sequence: the messenger binds, the receptor changes shape, and that change
          switches on a partner protein — a G protein — on the inside of the cell. A 2025 review adds
          that different groups of these receptors connect to different internal relay systems,
          called second-messenger pathways, and that even one receptor can send different internal
          signals depending on which molecule binds it.
        </Body>
        <IllustrationPlate illustration="cell-signalling" />
      </PublicationPage>

      <PublicationPage publication={PUBLICATION} section={chapter.title}>
        <IllustrationPlate illustration={patientIllustration('signals-near-far')} />

        <SectionHeading>Why specificity matters</SectionHeading>
        <Body>
          Because a cell responds only through the receptors it carries, the same signal need not
          have the same effect everywhere. The 2019 review states that one local signal could switch
          some kinds of cell on and others off, through different versions — subtypes — of its
          receptor, and that because most cells carry many receptors, a cell’s final response
          reflects how it combines the signals reaching it.
        </Body>

        <SectionHeading>Switching a signal off</SectionHeading>
        <Body>
          Signals are also switched off. A 2021 review describes one way: once an active receptor has
          been chemically tagged, proteins called arrestins take the G protein’s place and shut down
          that route of signalling. Arrestin binding also helps pull the receptor into the cell, and
          starts signalling of its own — so switching off is not the whole story.
        </Body>

        <Callout title="What this chapter does not tell you">
          <Text>
            It does not say which receptor any peptide acts on, or what any peptide does in the body.
            Those are claims about a compound, and each belongs on that compound’s record.
          </Text>
        </Callout>

        <WhatWeKnow
          know="How a messenger acts through a receptor, what happens inside the receiving cell, and how a signal is switched off — from published reviews and a US government overview."
          uncertain="Which receptor any particular peptide acts on, and plain definitions of local signalling."
          answer="A published source that defines paracrine and autocrine signalling."
        />
        <SourceNote
          items={[
            'SRC-156 — Hiller-Sturmhöfel S, Bartke A. Alcohol Health and Research World 1998 (public domain). SIG-01, SIG-02, SIG-03.',
            'SRC-155 — Tse LH, Wong YH. Frontiers in Endocrinology 2019 (CC BY). SIG-04, SIG-05, SIG-06.',
            'SRC-157 — Culhane KJ et al. Frontiers in Pharmacology 2015 (CC BY 4.0). SIG-07.',
            'SRC-158 — Cho YY et al. Biomolecules 2025 (CC BY 4.0). SIG-09.',
            'SRC-159 — Seyedabadi M et al. Biomolecules 2021 (CC BY 4.0). SIG-12, SIG-13.',
          ]}
        />
      </PublicationPage>
    </>
  );
}

export const CHAPTER_SEVEN_CLAIMS = [
  'RTE-01', 'RTE-02', 'RTE-03', 'RTE-04', 'RTE-05', 'RTE-06', 'RTE-07', 'RTE-08', 'RTE-09', 'RTE-10',
  'RTE-11', 'RTE-12', 'RTE-13', 'RTE-14', 'RTE-19', 'RTE-20', 'RTE-21', 'RTE-22', 'RTE-23', 'RTE-25',
  'RTE-26', 'RTE-27', 'RTE-28', 'PKG-12', 'PKG-13', 'PKG-14', 'PK-02', 'PK-03', 'PK-04', 'PK-11', 'PK-15',
] as const;

/**
 * Chapter seven, written.
 *
 * Describes routes; instructs nothing. No volume, site technique, frequency or
 * amount appears, because this is the volume a reader might mistake for a guide
 * to giving something.
 */
function RoutesOfAdministration({ chapter }: { chapter: ChapterPlan }) {
  return (
    <>
      <PublicationPage publication={PUBLICATION} section={chapter.title}>
        <ChapterOpener
          eyebrow={chapter.number}
          title={chapter.title}
          standfirst={chapter.standfirst}
        />
        <Lede>
          How a substance enters the body decides what it has to survive on the way, and how much of
          it arrives where it acts.
        </Lede>
        <IllustrationPlate illustration={patientIllustration('routes')} />

        <View wrap={false}>
        <SectionHeading>The routes, as regulators define them</SectionHeading>
        <Body>
          The US Food and Drug Administration’s data standards give each route a definition.
        </Body>
        <Table
          head={['Route', 'As the FDA’s data standards define it']}
          widths={[1, 2.6]}
          rows={[
            ['Parenteral', 'Given by injection, infusion or implantation'],
            ['Intravenous', 'Into a vein'],
            ['Subcutaneous', 'Beneath the skin'],
            ['Intramuscular', 'Within a muscle'],
            ['Oral', 'By way of the mouth'],
            ['Sublingual', 'Beneath the tongue'],
            ['Buccal', 'Toward the cheek, from within the mouth'],
            ['Nasal', 'By way of the nose'],
            ['Inhalation', 'Into the respiratory tract, by breathing in through the mouth or nose'],
            ['Transdermal', 'Through the skin into the circulation, by diffusion'],
          ]}
        />
        </View>
        <Body>
          US regulation defines bioavailability as how fast and how completely the active substance
          is absorbed from a product and becomes available where it acts. For a substance injected
          into a vein, the NCI Thesaurus states, bioavailability is complete, because there is no
          absorption step to lose any of it.
        </Body>

        <SectionHeading>Under the skin, or into a muscle</SectionHeading>
        <Body>
          A 2022 review describes where an injection under the skin goes: into the layer beneath the
          skin, made up of fatty tissue, small blood vessels, lymph vessels and resident cells. The NCI
          Thesaurus describes absorption from there as relatively slow and sustained. After an injection
          under the skin or into a muscle, a 2021 review states, peptides reach the circulation either
          through small blood vessels or through the lymphatic system. Injecting avoids the enzymes of
          the gut and liver, but the same review states that enzymes at the injection site and in the
          lymphatic system still break some peptide down, so less arrives than after an injection into
          a vein.
        </Body>
      </PublicationPage>

      <PublicationPage publication={PUBLICATION} section={chapter.title}>
        <IllustrationPlate illustration={patientIllustration('body-map')} />

        <SectionHeading>By mouth</SectionHeading>
        <Body>
          The NCI Thesaurus describes the oral route as the most common and convenient, and usually the
          safest and least expensive — but also the one with the most complicated path to the tissues,
          and with variable bioavailability. Anything absorbed from the gut, a 2017 review explains,
          travels to the liver before it reaches the rest of the body.
        </Body>
        <Body>
          For peptides that path is especially hard. Reviews held by this index describe why: a
          swallowed peptide meets stomach acid and protein-cutting enzymes, then more enzymes in the
          intestine, then a layer of mucus and a tightly sealed lining of cells. Peptides tend to be
          large, water-loving and sensitive to enzymes and acidity, all of which limit absorption by
          mouth — and a 2022 review states that, because digestive enzymes break peptides apart, most
          peptide drugs are given by injection.
        </Body>

        <SectionHeading>Nose, skin, mouth lining and lungs</SectionHeading>
        <Body>
          The NCI Thesaurus states that a substance given into the nose often acts on the whole body,
          because it is absorbed through the nasal lining. A 2020 review lists, as a drawback of that
          route, poor passage of large, water-loving molecules across the lining — and the same review
          lists the same drawback for the skin’s outer layer. How substances given into the nose reach
          the brain is, a 2022 review states, still debated.
        </Body>
        <Body>
          Under the tongue or against the cheek, a 2025 review explains, a rich blood supply lets
          certain drugs pass straight into the circulation, skipping the gut and liver. But large
          molecules tried this way were held back by poor passage through the lining, their size and
          breakdown in the mouth, and a product placed there has to stay in place despite saliva,
          eating and speaking. Breathing peptides in was described in 2022 as under investigation for
          specific peptide drugs, not as an established option.
        </Body>
        <SourceNeeded
          point="Whether, and how well, peptides breathed in are absorbed into the body."
          why="The review of inhaled delivery held by this index is written about medicines meant to act in the lung."
        />

        <SectionHeading>What a route implies for the product</SectionHeading>
        <Body>
          For the approved peptide drugs one 2018 review examined, their peptide nature limits how long
          the products keep and calls for specific shipping and storage conditions.
        </Body>
        <SourceNeeded
          point="That a product given by injection must be sterile, stated as a demand of the route itself."
          why="This index’s quality pages describe sterility expectations for licensed sterile medicines from European and US standards; no permissively licensed source held states sterility as a requirement of the route."
        />

        <Callout title="What this chapter does not tell you">
          <Text>
            It is not a guide to giving anything by any route. It does not say how any substance should
            be injected, sprayed, inhaled or swallowed, how much of any product is absorbed, or whether
            any route suits it.
          </Text>
        </Callout>

        <WhatWeKnow
          know="How regulators define each route, what bioavailability means, and why a swallowed peptide faces so many barriers — from US regulatory data standards, a US government terminology and published reviews."
          uncertain="How any product is given, how much of it is absorbed, or whether any route suits it — and the two questions marked in this chapter."
          answer="A published review of how inhaled peptides are absorbed into the body, and a source stating that injected products must be sterile."
        />
        <SourceNote
          items={[
            'SRC-193 — U.S. Food and Drug Administration, Center for Drug Evaluation and Research. Data Standards Manual (monographs): Route of Administration (CDER Data Element C-DRG-00301, version 004). FDA website (government document) (public domain; page current as of 14 November 2017). RTE-01 to RTE-10.',
            'SRC-186 — Office of the Federal Register / U.S. Food and Drug Administration. 21 CFR 314.3 Definitions (Bioavailability) - Code of Federal Regulations, Title 21, vol. 5, revised as of April 1, 2025. Code of Federal Regulations (govinfo.gov annual edition) (public domain; 2025 edition). PKG-12.',
            'SRC-187 — National Cancer Institute, Enterprise Vocabulary Services. NCI Thesaurus concept definitions (pharmacokinetic and route-of-administration terms). NCI Thesaurus (EVS REST API) (CC BY 4.0; retrieved 14 September 2026). PKG-13, RTE-11, RTE-19, RTE-20.',
            'SRC-188 — Pitiot A et al. Antibodies (Basel, Switzerland) 2022 (CC BY 4.0). RTE-12. Written about antibodies; the anatomy described is general.',
            'SRC-185 — Mahmood I, Pettinato M. Antibodies (Basel, Switzerland) 2021 (CC BY 4.0). RTE-13, RTE-14.',
            'SRC-183 — Lin L, Wong H. Pharmaceutics 2017 (CC BY 4.0). PKG-14.',
            'SRC-189 — Kirkby M et al. Pharmaceutical research 2020 (CC BY 4.0). RTE-21, RTE-23.',
            'SRC-190 — Bose M et al. Cells 2022 (CC BY 4.0). RTE-22.',
            'SRC-192 — Bahraminejad S, Almoazen H. Pharmaceutics 2025 (CC BY 4.0). RTE-25, RTE-26, RTE-27.',
            'SRC-184 — Stepensky D. Toxins 2018 (CC BY 4.0). RTE-28. Scoped to the approved toxin-derived peptide drugs it reviews.',
            'SRC-146 — Chen G et al. Theranostics 2022 (CC BY 4.0). PK-02, PK-03, PK-04.',
            'SRC-143 — Wang L et al. Signal Transduction and Targeted Therapy 2022 (CC BY 4.0). PK-11, PK-15.',
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

const REVIEW_STATE_BY_KIND: readonly [WrittenKind, string, string][] = [
  ['evidence', 'How this index classifies and attributes evidence: a documented method, implemented in the database and covered by automated tests.', 'Written from the editorial method · awaiting scientific and clinical review'],
  ['quality', 'Claims extracted into this index from a peptide chemistry textbook (SRC-006) and its characterisation protocols (SRC-011).', 'Extracted and awaiting scientific review'],
  ['receptors', 'Claims extracted into this index from chapter 2 of Rang and Dale’s Pharmacology, 10th edition, held as a Spanish-language publisher sample (SRC-121), each a paraphrase of the Spanish text; corroborated, and in one place qualified, by English-language sources licensed CC BY 4.0 (REC-02, REC-03, REC-05, REC-06, REC-25, REC-26).', 'Extracted from a partial translated source; awaiting scientific review and re-checking against the English edition'],
  ['peptide', 'Claims FND-01 to FND-07 and FND-16 to FND-19 (learning topic ‘What a peptide is’), from reviews licensed CC BY and a public-domain US government glossary, each licence read in the retrieved full text.', 'Extracted; awaiting scientific review'],
  ['building-blocks', 'Claims FND-08 to FND-15 (learning topic ‘Amino acids, peptides, proteins’), with FND-16 and FND-17 from chapter one, all from reviews licensed CC BY 4.0.', 'Extracted; awaiting scientific review'],
  ['body', 'Claims END-03 to END-13 (learning topic ‘Peptides the body makes’), from reviews licensed CC BY and a public-domain 1998 US government overview, each licence read in the retrieved full text.', 'Extracted; awaiting scientific review'],
  ['signalling', 'Claims SIG-01 to SIG-07, SIG-09, SIG-12 and SIG-13 (learning topic ‘How peptide signalling works’), from reviews licensed CC BY 4.0 and a public-domain 1998 US government overview, each licence read in the retrieved full text.', 'Extracted; awaiting scientific review'],
  ['routes', 'Claims RTE-01 to RTE-14, RTE-19 to RTE-23 and RTE-25 to RTE-28 (learning topic ‘Routes of administration’), PKG-12 to PKG-14 (‘Pharmacokinetic concepts’), and PK-02 to PK-04, PK-11 and PK-15 (‘Peptides as medicines’), from FDA route data standards and 21 CFR 314.3 (public domain), the NCI Thesaurus (CC BY 4.0) and reviews licensed CC BY 4.0.', 'Extracted; awaiting scientific review'],
];

/**
 * The open questions this volume prints in plain words, as the learning packets
 * record them — statement and resolution verbatim. Exported so a test holds each
 * to its packet entry.
 */
export const OPEN_QUESTIONS: readonly { statement: string; whatWouldResolveIt: string; chapter: WrittenKind }[] = [
  { statement: 'What the N-terminus and C-terminus of a chain are, and what \'residue\' means.', whatWouldResolveIt: 'A CC BY-type biochemistry review or public-domain glossary entry that defines them.', chapter: 'peptide' },
  { statement: 'How the way a molecule is measured changes with chain length.', whatWouldResolveIt: 'A permissively licensed analytical review comparing peptide and protein characterisation.', chapter: 'peptide' },
  { statement: 'What else changes as a chain gets longer, such as stability or recognition by the immune system.', whatWouldResolveIt: 'A permissively licensed review addressing length-dependent properties.', chapter: 'building-blocks' },
  { statement: 'Growth factors as a class of signals made by the body.', whatWouldResolveIt: 'A CC BY-type review of growth factors, obtained and read.', chapter: 'body' },
  { statement: 'That the body\'s own peptides are, as a general rule, short-lived and cleared by peptidases.', whatWouldResolveIt: 'A permissively licensed review of peptide hormone clearance.', chapter: 'body' },
  { statement: 'Plain definitions of paracrine and autocrine signalling.', whatWouldResolveIt: 'A permissively licensed source defining them.', chapter: 'signalling' },
  { statement: 'Whether, and how well, inhaled peptides are absorbed into the body.', whatWouldResolveIt: 'A permissively licensed review of systemic pulmonary peptide delivery.', chapter: 'routes' },
  { statement: 'Sterility as a requirement of products given by injection, stated as a route demand.', whatWouldResolveIt: 'A permissively licensed source stating that parenteral routes require sterile products.', chapter: 'routes' },
];

export function UnderstandingPeptides() {
  return (
    <Document
      title="Understanding Peptides — draft for review"
      author="The Tides Index"
      subject="Patient-facing draft for scientific and clinical review. Eleven chapters. No dosing, no administration instructions."
      creator="The Tides Index"
    >
      <Cover
        imprint="The Tides Index"
        series="Reference series · Volume one"
        title="Understanding Peptides"
        subtitle="A plain-language introduction"
        descriptor="Independent peptide science & clinical reference"
        editionLine={`Draft for scientific and clinical review · issued ${ISSUED}`}
        statusLine="Not yet reviewed. No dosing, no administration instructions, no treatment advice."
        mark={<SeriesMark width={300} volume={1} />}
      />

      {/* --- Peptides in sixty seconds: the short course ------------------ */}
      <PublicationPage publication={PUBLICATION} section="Peptides in sixty seconds">
        <ChapterOpener
          eyebrow="The short course"
          title="Peptides in sixty seconds"
          standfirst="Eight ideas, one drawing each. Every statement comes from a named source; where the sources run out, the page says so."
        />
        <ConceptPlate
          eyebrow="What a peptide is"
          headline="What is a peptide?"
          illustration={patientIllustration('chain-scale')}
          more={`Chapters ${chapterNumber('peptide')} and ${chapterNumber('building-blocks')}`}
        />
        <ConceptPlate
          eyebrow="How one is made"
          headline="How is one made?"
          illustration={patientIllustration('sequence-to-vial')}
          more={`Chapter ${chapterNumber('quality')}`}
        />
        <ConceptPlate
          eyebrow="How it signals"
          headline="How does a peptide send a signal?"
          illustration={patientIllustration('message-receiver')}
          more={`Chapters ${chapterNumber('signalling')} and ${chapterNumber('receptors')}`}
        />
        <ConceptPlate
          eyebrow="In the body"
          headline="What happens to the body’s own peptides?"
          illustration={patientIllustration('peptide-lifecycle')}
          more={`Chapter ${chapterNumber('body')}`}
        />
        <ConceptPlate
          eyebrow="How it is studied"
          headline="How can it be studied?"
          illustration={patientIllustration('study-design')}
          more={`Chapter ${chapterNumber('evidence')}`}
        />
        <ConceptPlate
          eyebrow="Routes"
          headline="How do routes differ?"
          illustration={patientIllustration('routes')}
          explanation="This describes routes; it is not a guide to giving anything. A route decides what a molecule has to get past on the way in. A swallowed peptide meets acid, enzymes and a tightly sealed gut lining — which is why most peptide medicines are injected."
          more={`Chapter ${chapterNumber('routes')}`}
        />
        <ConceptPlate
          eyebrow="Evidence"
          headline="What does evidence mean?"
          illustration={patientIllustration('evidence-lanes')}
          more={`Chapter ${chapterNumber('evidence')}`}
        />
        <ConceptPlate
          eyebrow="Quality"
          headline="How is quality checked?"
          illustration={patientIllustration('separate-questions')}
          more={`Chapter ${chapterNumber('quality')}`}
        />
      </PublicationPage>

      {/* --- Contents --------------------------------------------------- */}
      <PublicationPage publication={PUBLICATION} section="Contents">
        <ChapterOpener eyebrow="Contents" title="Going deeper" standfirst="Eleven chapters, each ending with what we know, what remains uncertain and the sources." />

        {printedChapters().map((chapter, index) => (
          <View
            key={chapter.title}
            style={{
              flexDirection: 'row',
              borderBottomWidth: 0.5,
              borderBottomColor: colour.ruleSoft,
              paddingVertical: 5.5,
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
        <Body>How this book is made · review state, chapter by chapter · open questions, as recorded · current version.</Body>
      </PublicationPage>

      {/* --- One page per chapter --------------------------------------- */}
      {printedChapters().map((chapter) => (
        <WrittenChapter key={chapter.title} chapter={chapter} />
      ))}

      {/* --- Back matter: how this book is made ------------------------- */}
      <PublicationPage publication={PUBLICATION} section="How this book is made">
        <ChapterOpener
          eyebrow="Back matter"
          title="How this book is made"
          standfirst="Where every statement comes from, and how uncertainty is shown."
        />
        <Body>
          Every substantive statement in this book comes from a named source, at a place in it that can
          be checked. Where the sources run out, the page says so rather than filling the gap from
          general knowledge.
        </Body>
        <IllustrationPlate illustration="editorial-states" />
        <Body>
          Most of the book is the first kind — what a named source states — and it is left unmarked;
          each chapter ends with the sources it rests on. The other two are marked where they appear: a
          conclusion drawn openly from several sourced statements, and a point no source held here
          supports, printed as what remains uncertain.
        </Body>

        <SectionHeading>What each chapter rests on</SectionHeading>
        <Body>
          Four chapters — understanding evidence, safety and uncertainty, questions to ask your
          clinician, and how to use this index — rest on the editorial method and on the product
          rather than on peptide science. The chapter on quality and testing rests on a peptide
          chemistry textbook and a manufacturing standard. Chapters one to four and six rest on
          peer-reviewed open-access reviews and US government reference material whose licences allow
          this index’s AI-assisted extraction, each licence read in the source itself. The chapter on
          receptors rests on a pharmacology textbook held as a partial Spanish-language sample, checked
          against English-language open-access sources.
        </Body>

        <SectionHeading>Review state, chapter by chapter</SectionHeading>
        <Body>
          The chapters speak plainly; the records behind them keep their exact state, printed here as
          recorded. Nothing in this edition has yet been reviewed by a scientist or a clinician.
        </Body>
        <Table
          head={['Chapter', 'Rests on', 'State']}
          widths={[0.8, 2.6, 1.2]}
          rows={REVIEW_STATE_BY_KIND.map(([kind, restsOn, state]) => [
            printedChapters().find((c) => c.written === kind)?.title ?? kind,
            restsOn,
            state,
          ])}
        />

        <SectionHeading>Open questions, as recorded</SectionHeading>
        <Body>
          Each point this book prints as what remains uncertain is a recorded gap. Here is each as the
          record states it, with the kind of source recorded as needed to answer it.
        </Body>
        <Table
          head={['Question', 'Recorded as needing', 'Chapter']}
          widths={[1.7, 1.6, 0.7]}
          rows={OPEN_QUESTIONS.map((q) => [q.statement, q.whatWouldResolveIt, chapterNumber(q.chapter)])}
        />

        <SectionHeading>What this edition leaves out</SectionHeading>
        <Body>
          A chapter on why peptides are studied is planned. It is not printed until it can be written
          from sources this index can use: a planned chapter set as an outline would read as unfinished
          work in a booklet meant to be handed to patients.
        </Body>

        <SectionHeading>The drawings</SectionHeading>
        <Body>
          Every drawing is one of the Tides Index’s own illustrations, printed from the same source as
          the website. Several are simplified versions, drawn with fewer labels so they can be read at
          this size; the fuller versions appear on the website and in the practitioner volumes. Each
          states beneath it what it was drawn from. None shows a value, a dose or a particular product.
        </Body>

        <CurrentVersionBlock
          url="thetidesindex.com"
          version={`Understanding Peptides · draft for review · issued ${ISSUED}`}
          note="Eleven chapters. No dosing anywhere. Not yet reviewed by a scientist or a clinician."
        />
      </PublicationPage>
    </Document>
  );
}
