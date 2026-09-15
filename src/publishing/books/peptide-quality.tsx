import { Document, Text, View } from '@react-pdf/renderer';
import {
  Body,
  Bullets,
  Callout,
  Cover,
  CurrentVersionBlock,
  ChapterOpener,
  DemonstrationStamp,
  EvidenceNote,
  Figure,
  InPreparation,
  Lede,
  PublicationPage,
  SectionHeading,
  SourceNote,
  SubHeading,
  Table,
} from '../primitives';
import {
  CertificateAnatomyFigure,
  ContentFigure,
  ProvenanceChainFigure,
  QualityDimensionsFigure,
  SeriesMark,
  TraceabilityFigure,
} from '../figures';
import { IllustrationPlate } from '../illustration-print';
import { QUALITY_SPINE_STAGES, type SpineStageKey } from '@/components/illustrations';
import { colour, contentWidth, leading, sans, serif, type } from '../theme';

/**
 * PEPTIDE QUALITY — From Manufacturing to the Final Vial.
 *
 * A first-edition excerpt, and honest about being one. Every substantive
 * statement here traces to a claim in the evidence architecture: the HPLC,
 * identity, content and certificate packets. Nothing is written to fill a page.
 *
 * Three editorial rules, applied throughout:
 *
 *   **Paraphrase, never transcribe.** The sources are third-party copyrighted
 *   works. Statements are put in this index's own words and located, not quoted
 *   at length.
 *
 *   **A gap is printed as a gap.** Where the register does not support a point,
 *   the page says so in the same typeface as everything else. The
 *   `EvidenceNote` and `InPreparation` primitives exist so this cannot be
 *   quietly skipped.
 *
 *   **Nothing is claimed as reviewed.** No human has approved any of this. It
 *   is on the cover, it is on the status line, and it is in the back matter.
 */

/**
 * The full title, and the short form.
 *
 * `TITLE` is the volume's name and belongs on the cover, in the file
 * metadata, in the version block and anywhere the volume is referred to.
 * `PUBLICATION` is the running header printed at the top of every page in
 * letter-spaced capitals, where the full title would run into the section
 * name and clip. A running head is a locator, not a citation.
 */
const TITLE = 'Peptide Quality: From Manufacturing to the Final Vial';
const PUBLICATION = 'Peptide Quality';
const ISSUED = '14 September 2026';

/**
 * Where a chapter sits on the spine.
 *
 * The book's visual spine is the path from sequence to vial, drawn in full as
 * figure one. Each chapter opener repeats it as a single line with its own
 * stages marked, so a reader always knows which point on the path a test
 * describes — and, by implication, which points it says nothing about.
 */
function SpineRail({ highlight }: { highlight: readonly SpineStageKey[] }) {
  return (
    <View
      wrap={false}
      style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginTop: -6, marginBottom: 14 }}
    >
      <Text
        style={{
          fontFamily: sans,
          fontSize: 6.4,
          letterSpacing: 1,
          textTransform: 'uppercase',
          color: colour.slate,
          marginRight: 8,
        }}
      >
        On the path
      </Text>
      {QUALITY_SPINE_STAGES.map((stage, index) => {
        const on = highlight.includes(stage.key);
        return (
          <View key={stage.key} style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 1.5 }}>
            <View
              style={{
                width: 5,
                height: 5,
                borderRadius: 2.5,
                backgroundColor: on ? colour.deepTide : colour.rule,
                marginRight: 3,
              }}
            />
            <Text
              style={{
                fontFamily: sans,
                fontSize: 6.6,
                fontWeight: on ? 600 : 400,
                color: on ? colour.deepTide : colour.slate,
              }}
            >
              {stage.title.join(' ')}
            </Text>
            {index < QUALITY_SPINE_STAGES.length - 1 ? (
              <Text style={{ fontFamily: sans, fontSize: 6.4, color: colour.rule, marginHorizontal: 4 }}>›</Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

export function PeptideQuality() {
  return (
    <Document
      title={TITLE}
      author="The Tides Index"
      subject="What analytical tests establish about a peptide preparation, and what they do not"
      creator="The Tides Index"
      producer="The Tides Index"
    >
      {/* ================= 1. COVER ==================================== */}
      <Cover
        imprint="The Tides Index"
        series="Reference series · Volume five"
        title="Peptide Quality:"
        subtitle="From Manufacturing to the Final Vial"
        descriptor="Independent peptide science & clinical reference"
        editionLine={`First edition excerpt · illustrated · prototype · issued ${ISSUED}`}
        statusLine="Awaiting scientific review. Nothing in this document has been approved by a reviewer."
        mark={<SeriesMark width={300} volume={5} />}
      />

      {/* ================= 2. WHAT QUALITY MEANS ======================= */}
      <PublicationPage publication={PUBLICATION} section="What quality means">
        <ChapterOpener
          eyebrow="One"
          title="What does “quality” actually mean?"
          standfirst="A single number on a certificate is doing far less work than it appears to."
        />

        <Lede>
          A vial arrives with a document. The document says 99%. It is easy to read that as a
          statement about the vial — that it contains the right substance, in the stated amount,
          free of contamination, safe to use.
        </Lede>

        <Body>
          It is none of those things. It is a statement about a sample that was analysed, by one
          method, on one occasion, answering one question. Quality is not a single property that a
          preparation has more or less of. It is a set of separate questions, each answered by a
          different measurement, and an answer to one carries no information about the others.
        </Body>

        <IllustrationPlate illustration="quality-spine" number="Figure 1" />

        <SectionHeading>Four things a purity figure is not</SectionHeading>
        <Bullets
          items={[
            'It is not a statement of identity. A high figure says the sample was homogeneous by that method; it does not say what the substance is.',
            'It is not a statement of quantity. A proportion carries no amount — two vials with the same figure can hold very different masses of peptide.',
            'It is not a statement about sterility or endotoxin. The reviewed evidence here establishes nothing about either from a purity result.',
            'It is not a statement about the material in your hand, unless the chain from product to lot to sample to report is unbroken.',
          ]}
        />

        <Callout title="The shape of this publication">
          Three analytical questions, in the order a test report raises them. Then the document
          itself: what a certificate is, what it should contain, and what a matching lot number does
          and does not establish. Every page states what the evidence supports and what it leaves
          open.
        </Callout>

        <Body>
          This is a first-edition excerpt. It covers the four subjects this index has written and
          says plainly where the others stand. A reference that presented its gaps as completeness
          would be the exact failure it exists to correct.
        </Body>

        <EvidenceNote
          status="Every statement in this publication rests on a located passage in a named source. None has yet been approved by a human scientific reviewer."
        />
      </PublicationPage>

      {/* ================= 3. THREE QUESTIONS ========================== */}
      <PublicationPage publication={PUBLICATION} section="Three questions">
        <ChapterOpener
          eyebrow="Two"
          title="The three analytical questions"
          standfirst="Three separate undertakings. The source held here states that no single technique addresses homogeneity and covalent structure both."
        />
        <SpineRail highlight={['purification', 'identity', 'content']} />

        <Body>
          Evaluating a synthetic peptide has two distinct goals: establishing how homogeneous the
          preparation is, and establishing that the covalent structure is the intended one. No
          single analytical technique addresses both. A third question — how much peptide is
          actually present — is separate again.
        </Body>

        <IllustrationPlate illustration="separate-questions" number="Figure 2" />

        <Table
          head={['Question', 'Typically answered by', 'Says nothing about']}
          widths={[1.1, 1.2, 1.3]}
          rows={[
            ['Purity — how mixed is it?', 'Reversed-phase HPLC', 'What the substance is; how much there is'],
            ['Identity — what is it?', 'Mass analysis', 'How much there is'],
            ['Content — how much?', 'Amino acid analysis', 'Whether other species are present'],
          ]}
        />

        <EvidenceNote
          supports="The separation of homogeneity from covalent structure, and the complementary use of techniques. Both located to chapter and page."
          doesNotSettle="Which techniques are routine today. The source is a 2002 textbook; instrumentation has advanced, the separation of the questions has not."
        />

        <SourceNote
          items={[
            'Grant GA (ed.). Synthetic Peptides: A User’s Guide, 2nd edition. Oxford University Press, 2002 — ch. 4, pp. 222–224, 261.',
          ]}
        />
      </PublicationPage>

      {/* ================= 4. HPLC ===================================== */}
      <PublicationPage publication={PUBLICATION} section="Purity">
        <ChapterOpener
          eyebrow="Three"
          title="Chromatographic purity"
          standfirst="What a peak area percentage examines, and the two ways it can mislead."
        />
        <SpineRail highlight={['purification']} />

        <Body>
          Reversed-phase HPLC separates the components of a mixture and reports how much of the
          detected material each accounts for. It is the standard way to assess heterogeneity. What
          it does not yield is structural information: it tells you how many species were resolved,
          not what any of them is.
        </Body>

        <SectionHeading>One peak is not one substance</SectionHeading>

        <Body>
          A single symmetrical peak is routinely read as proof that only one species is present. It
          is not. Peptides differing by a single residue have been shown to co-elute, and whether a
          difference is resolved depends on the method and the state of the column — one that has
          lost resolving power can let two similar species emerge as one clean peak.
        </Body>

        <IllustrationPlate illustration="chromatogram" number="Figure 3" />

        <EvidenceNote
          supports="Co-elution of closely related peptides, and the dependence of resolution on column condition. Both located."
          doesNotSettle="How a certificate’s purity figure is calculated, and any minimum purity for material intended for human administration. Neither is established by anything this index holds."
        />

        <SourceNote
          items={[
            'Grant GA (ed.). Synthetic Peptides: A User’s Guide, 2nd edition, 2002 — ch. 4, pp. 222–224, 239, 241.',
            'Gaps tracked as verification issues V-015, V-017 and V-018 in the open queue.',
          ]}
        />
      </PublicationPage>

      {/* ================= 5. IDENTITY ================================= */}
      <PublicationPage publication={PUBLICATION} section="Identity">
        <ChapterOpener
          eyebrow="Four"
          title="Identity"
          standfirst="Separation answers how many. Mass answers which."
        />
        <SpineRail highlight={['identity']} />

        <Body>
          Assessing homogeneity and establishing correct covalent structure are separate
          undertakings, and the separation methods used for the first do not answer the second.
          Determining the overall mass of a synthetic peptide is the most practical and common use
          of mass analysis, and is usually sufficient to evaluate whether the intended product was
          obtained.
        </Body>

        <IllustrationPlate illustration="mass-identity" number="Figure 4" />

      </PublicationPage>

      <PublicationPage publication={PUBLICATION} section="Identity">
        <SectionHeading>What a mass result is</SectionHeading>

        <Body>
          A mass result is a measured value compared against a calculated one, and the comparison
          carries a margin. Electrospray ionisation produces a series of multiply charged ions, so a
          single homogeneous peptide gives several signals rather than one, each a mass-to-charge
          ratio from which the mass is derived. Mass measurement can also reveal modifications that
          are unstable or invisible to other procedures.
        </Body>

        <Callout title="Sequence is a further question again">
          Both electrospray and MALDI instruments can produce sequence information by fragmenting a
          selected ion. That is a different measurement, and a matching mass is not a sequence.
        </Callout>

        <EvidenceNote
          supports="The multiply-charged series, the comparison of observed against calculated mass, and fragmentation for sequence information — each located to a passage."
          doesNotSettle="That a matching mass establishes the sequence; how far an observed mass may differ from a calculated one and still be acceptable; and whether mass analysis can distinguish species of equal mass, such as positional isomers."
        />

        <SourceNote
          items={[
            'Grant GA (ed.). Synthetic Peptides: A User’s Guide, 2nd edition, 2002 — ch. 4.',
            'Gaps tracked as V-016 and V-022. V-022 records a primary-source trace attempted and not completed.',
          ]}
        />
      </PublicationPage>

      {/* ================= 6. CONTENT ================================== */}
      <PublicationPage publication={PUBLICATION} section="Content">
        <ChapterOpener
          eyebrow="Five"
          title="Content, or how much is actually there"
          standfirst="A proportion is not a quantity, and a percentage carries no mass."
        />
        <SpineRail highlight={['content']} />

        <Body>
          Determining how much peptide is present is a different analytical question from assessing
          how heterogeneous a preparation is. Amino acid analysis is described as the best method
          for determining the amount of peptide — still the best among the techniques under
          discussion for peptide quantitation.
        </Body>

        <Figure
          number="Figure 5"
          caption="Two preparations reporting the same purity figure, holding different amounts of peptide."
        >
          <ContentFigure width={contentWidth - 32} />
        </Figure>

      </PublicationPage>

      <PublicationPage publication={PUBLICATION} section="Content">
        <SectionHeading>The measurement is indirect</SectionHeading>

        <Body>
          Quantitation by amino acid analysis works by taking the peptide apart. It is hydrolysed
          into its constituent amino acids, each is quantitated, and the amount of peptide is
          derived from the average. That indirection carries consequences: several amino acids do
          not survive standard acid hydrolysis intact — tryptophan is destroyed, and cysteine and
          methionine are affected — which constrains what a compositional analysis can report. The
          detection chemistry sets a floor as well; with post-column ninhydrin detection, levels
          below roughly 100 pmol do not quantitate reliably.
        </Body>

        <Body>
          The same analysis yields the mole ratio of the amino acids, which can be compared against
          the ratio predicted from the intended sequence. That comparison bears on identity as well
          as on amount.
        </Body>

        <InPreparation>
          No source this index holds establishes an acceptable tolerance between a stated label
          amount and a measured one, what method any particular product is required to use, or a
          standard definition of “net peptide content”. Nor does anything here establish that an
          amount of peptide indicates biological potency.
        </InPreparation>

        <SourceNote
          items={[
            'Grant GA (ed.). Synthetic Peptides: A User’s Guide, 2nd edition, 2002 — ch. 4.',
            'Gaps tracked as V-016 and V-020.',
          ]}
        />
      </PublicationPage>

      {/* ================= 7. A CERTIFICATE IS NOT ONE TEST ============ */}
      <PublicationPage publication={PUBLICATION} section="The document">
        <ChapterOpener
          eyebrow="Six"
          title="A certificate is not one test"
          standfirst="One document, several independent measurements — and any of them may simply be absent."
        />
        <SpineRail highlight={['batch']} />

        <Body>
          A certificate of analysis collects results under a single heading. That presentation
          invites a reader to treat it as one verdict on one thing. It is not. Each line is a
          separate test, performed by a separate method, answering a separate question; and a test
          that does not appear was not necessarily performed.
        </Body>

        <Figure
          number="Figure 6"
          caption="The anatomy of a certificate. Absence of a line is not evidence that the attribute is satisfactory."
        >
          <CertificateAnatomyFigure width={contentWidth - 32} />
        </Figure>

        <SectionHeading>What a certificate should contain</SectionHeading>

        <View
          style={{
            borderLeftWidth: 2,
            borderLeftColor: colour.caution,
            paddingLeft: 12,
            marginBottom: 10,
          }}
        >
          <Text
            style={{
              fontFamily: sans,
              fontSize: type.micro,
              letterSpacing: 1.1,
              textTransform: 'uppercase',
              color: colour.caution,
              marginBottom: 4,
            }}
          >
            Scope
          </Text>
          <Text style={{ fontFamily: serif, fontSize: type.small, lineHeight: leading.tight }}>
            What follows governs certificates for <Text style={{ fontStyle: 'italic' }}>active
            pharmaceutical ingredients and intermediates</Text>. It does not describe what a
            certificate for a finished drug product should contain, nor a third-party laboratory’s
            report on a posted sample, nor research-use material. Those are different documents
            under different expectations, and this index does not yet hold sources for them.
          </Text>
        </View>

        <Body>
          Within that scope, a certificate should name the material and its grade, give the batch
          number and the release date, and list each test performed with its acceptance limits and
          the numerical result. It should be dated and signed by authorised personnel of the quality
          unit.
        </Body>

        <Body>
          Where a repacker or reprocessor carried out the analysis, the certificate should carry
          that party’s name and address with a reference to the original manufacturer. A reissued
          certificate should show the name and address of the laboratory that actually performed the
          work.
        </Body>

        <SourceNote
          items={[
            'ICH Q7, Good Manufacturing Practice Guide for Active Pharmaceutical Ingredients — §11.4 and §17.',
            'Scope limitation tracked as V-021.',
          ]}
        />
      </PublicationPage>

      {/* ================= 8. TRACEABILITY ============================= */}
      <PublicationPage publication={PUBLICATION} section="Traceability">
        <ChapterOpener
          eyebrow="Seven"
          title="Which batch was actually tested?"
          standfirst="A result describes the sample that reached the laboratory. Whether that sample came from the material in your hand is a separate question."
        />
        <SpineRail highlight={['batch', 'vial']} />

        <Figure
          number="Figure 7"
          caption="The chain a result has to travel to say anything about the vial in front of you."
        >
          <TraceabilityFigure width={contentWidth - 32} />
        </Figure>

        <Body>
          Agents, brokers, traders, distributors, repackers and relabellers are expected to maintain
          complete traceability, retaining the records that let a batch be followed. A party
          supplying material to a customer should provide the name of the original manufacturer and
          the batch numbers supplied.
        </Body>

        <Callout title="The question worth asking">
          Not “does this certificate look genuine?” but “does this certificate describe the batch I
          am holding, and was the sample it reports on drawn from that batch?”
        </Callout>

        <EvidenceNote
          supports="Traceability and original-manufacturer disclosure expectations for active pharmaceutical ingredients, located to ICH Q7 §17."
          doesNotSettle="That a matching lot number establishes that the tested sample came from the batch in hand. Nothing this index holds supports that inference, and it is the one most often made."
        />

        <SourceNote
          items={['ICH Q7 — §17. Gap tracked as V-015.']}
        />
      </PublicationPage>

      {/* ================= 9. READING A CERTIFICATE ==================== */}
      <PublicationPage publication={PUBLICATION} section="Reading a certificate">
        <ChapterOpener
          eyebrow="Eight"
          title="How to read a certificate"
          standfirst="A worked example, using a document that describes nothing real."
        />
        <SpineRail highlight={['batch']} />

        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <DemonstrationStamp width={160} />
          <Text
            style={{
              flex: 1,
              marginLeft: 12,
              fontFamily: sans,
              fontSize: type.micro,
              color: colour.slate,
              lineHeight: leading.tight,
            }}
          >
            The specimen below is fictional. It describes no product, no supplier and no laboratory,
            and no result in it is a measurement of anything.
          </Text>
        </View>

        <View
          style={{
            borderWidth: 0.75,
            borderColor: colour.rule,
            backgroundColor: colour.white,
            padding: 14,
          }}
        >
          <Text
            style={{
              fontFamily: sans,
              fontSize: type.micro,
              letterSpacing: 1.4,
              textTransform: 'uppercase',
              color: colour.deepTide,
            }}
          >
            Specimen certificate of analysis
          </Text>
          <Table
            head={['Test', 'Method', 'Result', 'Read it as']}
            widths={[1.1, 1, 0.7, 1.6]}
            rows={[
              ['Appearance', 'Visual', 'Conforms', 'A description, not a measurement.'],
              ['Identity', 'Mass analysis', 'Conforms', 'The mass matched a calculation. Not a sequence.'],
              ['Purity', 'RP-HPLC', '99.1%', 'Of the material detected by this method, on this sample.'],
              ['Content', 'Not stated', '—', 'Absent. Nothing here tells you how much peptide is present.'],
              ['Sterility', 'Not stated', '—', 'Absent. Nothing on this document reports it.'],
              ['Endotoxin', 'Not stated', '—', 'Absent.'],
            ]}
          />
        </View>

        <SubHeading>The three questions to ask of any certificate</SubHeading>
        <Bullets
          items={[
            'Which tests are listed, and which are simply not there? An absent line is not a satisfactory result.',
            'What method produced each number, and what question does that method answer?',
            'Does the batch identification tie this document to the material in front of me?',
          ]}
        />

        <EvidenceNote
          status="This page is an illustration of how to read a document. It makes no claim about any real certificate, and it does not assess whether any reported result is correct — that is outside what this index does."
        />
      </PublicationPage>

      {/* ================= 10. WHAT A PERCENTAGE DOES NOT SETTLE ======= */}
      <PublicationPage publication={PUBLICATION} section="Limits">
        <ChapterOpener
          eyebrow="Nine"
          title="What a purity percentage does not settle"
          standfirst="Collected in one place, because this is the page worth keeping."
        />
        <SpineRail highlight={['purification', 'identity', 'content', 'sterility']} />

        <Table
          head={['The figure does not tell you', 'Because', 'Status here']}
          widths={[1.2, 1.5, 0.9]}
          rows={[
            [
              'What the substance is',
              'Separation reports how many species were resolved, not which.',
              'Supported',
            ],
            [
              'How much peptide is present',
              'A proportion carries no quantity; content is a separate measurement.',
              'Supported',
            ],
            [
              'That nothing co-eluted',
              'Closely related peptides can emerge as one peak.',
              'Supported',
            ],
            [
              'Whether the preparation is sterile',
              'No source held here establishes it from this result.',
              'Recorded gap',
            ],
            [
              'Endotoxin content',
              'No source held here establishes it from this result.',
              'Recorded gap',
            ],
            [
              'How the figure itself was calculated',
              'No current reviewed source establishes the convention.',
              'Recorded gap',
            ],
            [
              'What figure would be adequate',
              'No threshold for material intended for human administration is established anywhere this index holds.',
              'Recorded gap',
            ],
          ]}
        />

        <Callout title="Why the gaps are printed">
          A reference that stated only what it could support would look more complete and be less
          useful. Four of the seven rows above are absences this index has recorded rather than
          points it can make, and a reader deciding how much weight to put on a certificate needs
          the absences more than the statements.
        </Callout>

        <Body>
          Each recorded gap is tracked as an open verification issue with a named source that would
          resolve it. Two of them — sterility and endotoxin — wait on compendial chapters this index
          does not currently hold.
        </Body>

        <SourceNote items={['Open verification issues V-015, V-016, V-017, V-018, V-020.']} />
      </PublicationPage>

      {/* ================= 10. SEQUENCE TO FINAL VIAL ================= */}
      <PublicationPage publication={PUBLICATION} section="Sequence to vial">
        <ChapterOpener
          eyebrow="Ten"
          title="From sequence to final vial"
          standfirst="Most of what decides a peptide’s quality happens where nobody holding the vial can see it."
        />

        <Body>
          Longer synthetic peptides are usually built by solid-phase synthesis. The first protected
          amino acid is anchored to an insoluble resin; the chain grows by repeated cycles of
          deprotection and coupling, with excess reagents washed away between steps; and the
          finished chain is cleaved from the support, ideally with its side-chain protecting groups
          removed at the same time. What comes off is crude peptide, and it is never only the
          intended peptide.
        </Body>

        <IllustrationPlate illustration="sequence-to-vial" number="Figure 8" />

        <Body>
          Incomplete couplings leave deletion or terminated sequences that must be separated from
          the product. Acid cleavage can alkylate tryptophan, methionine and tyrosine unless
          scavengers are used. Poorly solvated, aggregating chains couple less efficiently. Each is a
          route by which impurities enter before any test is run.
        </Body>

        <Callout title="There is no single process">
          Research-scale peptides are commonly made quickly on automated equipment with little
          process development; pharmaceutical-scale peptides are made in quantity after it. How far a
          peptide is purified depends on its use: some research peptides are used crude, while
          standards are purified much further. A general sequence of stages is not a description of
          how any product was made.
        </Callout>

        <SubHeading>The stages, and which ones this index can describe</SubHeading>
        <Table
          head={['Stage', 'Held source']}
          widths={[2, 3]}
          rows={[
            ['Sequence and process design', 'Kruger & Albericio, ch. 3'],
            ['Raw materials', 'Kruger & Albericio, ch. 3; ICH Q7 §6.3'],
            ['Chain assembly, cleavage, crude peptide', 'Grant, ch. 3'],
            ['Purification and characterisation', 'Kruger & Albericio, ch. 3; Grant, chs 3–4'],
            ['Bulk peptide (API) and batch record', 'ICH Q7 §§6.5, 8.3, 10.2'],
            ['Formulation', 'Nugrahadi et al. 2023; ICH Q1A(R2); ICH Q5C'],
            ['Fill and finish', 'EU GMP Annex 1 §§8.21–8.25, 8.79, 8.87, 9.1–9.32'],
            ['Lyophilisation as a process', 'Pardeshi et al. 2023; EU GMP Annex 1 §8.121'],
            ['Finished-product release testing', 'EU GMP Annex 1 §§10.3–10.6; USP <71>, <85> (research copies); FDA ORA.007'],
            ['Storage', 'Grant, ch. 4; ICH Q7 §§10.1, 17.5'],
            ['Transport and repackaging', 'ICH Q7 §§10.2, 17.4, 17.6'],
          ]}
        />

        <SourceNote
          items={[
            'Grant GA (ed.). Synthetic Peptides, 2nd edition, 2002 — ch. 3, pp. 95–96, 149, 163, 165; ch. 4, p. 284.',
            'Kruger G, Albericio F (eds). Advances in the Discovery and Development of Peptide Therapeutics, 2015 — ch. 3 (Saneii), pp. 46, 49–50, 52–53.',
          ]}
        />
      </PublicationPage>

      <PublicationPage publication={PUBLICATION} section="Sequence to vial">
        <SectionHeading>After the test: storage and transport</SectionHeading>

        <Body>
          A peptide can change after it has been tested. In solution it can oxidise, hydrolyse at
          acid-sensitive bonds, or rearrange through an aspartimide intermediate into a structurally
          different peptide; asparagine- and glutamine-containing peptides can deamidate even as a
          dry solid if residual acid remains. The textbook held here recommends short solution storage
          only, freeze-drying and desiccated frozen storage for research material, and re-evaluating
          a peptide that has been stored for an extended period.
        </Body>

        <Body>
          For pharmaceutical ingredients, the manufacturing guideline expects storage conditions to be
          recorded where they matter, transport that does not harm quality, special conditions stated
          on the label and followed by the carrier, repackaging under controls that avoid mix-ups and
          contamination, and new stability data when material is moved into a different kind of
          container.
        </Body>

        <IllustrationPlate illustration="chain-of-custody" number="Figure 9" />

        <SectionHeading>Five things worth knowing</SectionHeading>
        <Bullets
          items={[
            'Know the source — a reseller is expected to name the original manufacturer and the batch.',
            'Know the process — research-scale and pharmaceutical-scale manufacture differ, and so does the purification each needs.',
            'Know the test — more than one kind of test should agree, and one discordant result matters.',
            'Know the batch — a batch number is an index to a production record, not a mark of quality.',
            'Know the chain — a result obtained before storage and shipping describes the material before them.',
          ]}
        />

        <Callout title="Country of origin is not a quality test">
          Where a peptide was made does not tell you whether it was made well. The questions above
          can be asked of any manufacturer anywhere, and the harmonised guideline held here asks them
          the same way in every region that adopted it.
        </Callout>

        <InPreparation>
          No source held by this index quantifies what a temperature excursion does to any peptide
          or how long material remains suitable after it is mixed. Formulation, fill and finish,
          freeze-drying and release testing are now described on the next page, from regulatory,
          compendial and review sources — as general principles and expectations for licensed
          medicines, not as a description of any product. What any product contains is not
          knowable from general literature.
        </InPreparation>

        <EvidenceNote
          supports="General synthesis, purification, storage, traceability and transport expectations, located to Grant chs 3–4, Kruger & Albericio ch. 3, and ICH Q7 §§6, 8, 10 and 17."
          doesNotSettle="How any particular product was made, stored or shipped. Every expectation cited from ICH Q7 applies to active pharmaceutical ingredients, not to finished products or research-use material."
        />

        <SourceNote
          items={[
            'Grant GA (ed.). Synthetic Peptides, 2nd edition, 2002 — ch. 3, p. 165; ch. 4, p. 283.',
            'ICH Q7 — §§6.3, 6.5, 8.3, 10.1, 10.2, 17.4, 17.5, 17.6.',
          ]}
        />
      </PublicationPage>

      {/* ====== 10b. THE FINISHED VIAL: FORMULATION, STERILITY, ENDOTOXIN ====== */}
      <PublicationPage publication={PUBLICATION} section="Sequence to vial">
        <SectionHeading>The finished vial: formulating, filling, sealing and freeze-drying</SectionHeading>
        <Body>
          European manufacturing guidance for sterile medicines expects a product that cannot be
          sterilised in its final container to be passed through a sterilising-grade filter and
          filled into sterilised containers under aseptic conditions, with the filter’s integrity
          tested. Containers are to be closed by validated methods and checked for integrity — and
          the same guidance states that looking at a vial is not an acceptable integrity test.
          Storage and shipping are expected not to compromise the sealed product.
        </Body>
        <Body>
          Before any of that, a peptide is usually formulated. In regulatory language an excipient
          is everything in the dosage form other than the active substance. A 2023 review of
          peptide formulation describes the ways a peptide in solution changes — chemically, by
          oxidation, hydrolysis, deamidation and related reactions, and physically, by clumping,
          sticking to surfaces or falling out of solution — and the ingredients used against them:
          buffers because degradation depends strongly on acidity, antioxidants and metal-binding
          agents against oxidation, sugars as stabilisers, surfactants against clumping from
          shaking. The same review reports that some of those ingredients can cause damage
          themselves, and concludes that each peptide’s formulation has to be assessed against the
          stresses it will meet. International stability guidelines for registered medicines treat
          stability — including after the product is mixed, where that applies — as something shown
          by testing the actual product over time.
        </Body>
        <IllustrationPlate illustration="formulation" number="Figure 10" />
        <Body>
          Freeze-drying removes water from a frozen product under low pressure. A 2023 review
          describes how much depends on doing it well: temperatures, pressures and drying times
          affect the finished product, and uncontrolled drying can damage it or collapse the dried
          cake. For sterile medicines, the guidance treats everything during freeze-drying that could
          affect sterility as part of aseptic processing.
        </Body>
        <IllustrationPlate illustration="lyophilisation" number="Figure 11" />

        <SectionHeading>What a sterility result means</SectionHeading>
        <Body>
          The guidance states that monitoring or testing alone does not give assurance of sterility,
          and that the finished-product test is only the last in a series of control measures. The
          compendial sterility chapter says the same from its side: its procedures are not by
          themselves designed to ensure that a batch is sterile, and a satisfactory result only
          indicates that no contaminating microorganism was found in the sample examined. A result
          means something only if the method was shown to work in the presence of that product.
        </Body>
        <IllustrationPlate illustration="sterility" number="Figure 12" />

        <SectionHeading>What an endotoxin result means</SectionHeading>
        <Body>
          Endotoxin, from the outer wall of certain bacteria, can remain when no living organism
          does, and in an injection can cause reactions ranging from fever to death. The compendial
          test detects it with a reagent from horseshoe-crab blood cells, and its result is
          meaningful only against a limit set for each product according to its dose — and only
          where the laboratory has shown the product does not interfere with the test.
        </Body>
        <IllustrationPlate illustration="endotoxin" number="Figure 13" />

        <Callout title="Expectations, not descriptions">
          Everything on this page is what regulators and compendia expect of licensed sterile
          medicines. None of it shows how any peptide product was made or tested, and the existence
          of an expectation is not evidence that anybody met it.
        </Callout>

        <EvidenceNote
          supports="Claims FORM-01 to FORM-28, STER-001 to STER-011, ENDO-001 to ENDO-005 and LYO-001 to LYO-005, extracted from Nugrahadi et al. 2023, ICH Q1A(R2) and Q5C, EU GMP Annex 1 (2022), FDA ORA.007 (Revision 02), USP <71> and <85>, and Pardeshi et al. 2023."
          doesNotSettle="What any product contains or whether it was made or tested this way, what endotoxin limit applies to any peptide without a monograph, how any peptide should be formulated or freeze-dried, or how long anything remains suitable after mixing. ICH Q5C’s stated scope does not cover chemically synthesised peptides."
          status="Extracted and awaiting scientific review. The USP chapters are held research copies whose distribution provenance is unverified."
        />

        <SourceNote
          items={[
            'European Commission. EudraLex Volume 4, GMP Annex 1: Manufacture of Sterile Medicinal Products, C(2022) 5938 final — §§2.2, 2.7, 3.1, 8.21–8.25, 8.79, 8.87, 8.121, 9.1–9.32, 10.3–10.6, glossary.',
            'USP <71> Sterility Tests — held research copy printed 15 October 2020; distribution provenance unverified; not obtained from USP.',
            'USP <85> Bacterial Endotoxins Test — held research copy printed 21 November 2024; distribution provenance unverified; not obtained from USP.',
            'U.S. FDA. ORA.007 Pharmaceutical Microbiology Manual, Revision 02, 2020 — chapters 3–5.',
            'Pardeshi SR et al. Future J Pharm Sci 2023;9:99 — pp. 2–3, 6, 8, 20.',
            'Nugrahadi PP, Hinrichs WLJ, Frijlink HW, Schöneich C, Avanti C. Pharmaceutics 2023;15:935 — §§1, 2, 3.1.1, 3.2.3–3.2.5, 3.4, 4.',
            'ICH Q1A(R2) Stability Testing of New Drug Substances and Products, Step 4, 2003 — §§1.2, 1.3, 2.1.2, 2.2.5, 2.2.7, 3.',
            'ICH Q5C Stability Testing of Biotechnological/Biological Products, Step 4, 1995 — §§1, 2, 5.3, 5.4, 6.6.',
          ]}
        />
      </PublicationPage>

      {/* ================= 11. MULTI-DIMENSIONAL ====================== */}
      <PublicationPage publication={PUBLICATION} section="The whole picture">
        <ChapterOpener
          eyebrow="Eleven"
          title="Quality is multi-dimensional"
          standfirst="And this reference is not finished. Here is exactly how far it has got."
        />

        <Figure
          number="Figure 14"
          caption="The dimensions this index recognises, and the state of each."
        >
          <QualityDimensionsFigure
            width={contentWidth - 32}
            dimensions={[
              { label: 'Purity', written: true },
              { label: 'Identity', written: true },
              { label: 'Content', written: true },
              { label: 'Certificates', written: true },
              { label: 'Sterility', written: true },
              { label: 'Endotoxin', written: true },
              { label: 'Residual solvents', written: false },
              { label: 'Water content', written: false },
              { label: 'Heavy metals', written: false },
              { label: 'Storage', written: true },
              { label: 'Transport', written: true },
              { label: 'Manufacturing', written: true },
            ]}
          />
        </Figure>

        <InPreparation>
          Residual solvents, water content and heavy metals cannot be written until this index
          holds the chapters they depend on, and are named and left unwritten rather than filled in
          from general knowledge. Sterility and bacterial endotoxin are now written from EU GMP
          Annex 1, FDA’s laboratory manual and copies of the USP chapters held for research whose
          distribution provenance is unverified; licensed USP–NF copies would replace those.
        </InPreparation>

        <Body>
          The analytical subjects are the ones a test report raises. Manufacturing, storage and
          transport are now written as far as the held sources reach, which now includes the
          finished vial as regulatory expectation — though never as a description of any product. None of this is the whole of quality, and this publication does not present
          it as such.
        </Body>
      </PublicationPage>

      {/* ================= 12. METHOD AND VERSION ====================== */}
      <PublicationPage publication={PUBLICATION} section="Method">
        <ChapterOpener
          eyebrow="Twelve"
          title="How this was made"
          standfirst="Source, locator, claim, review, publication — and what happens when any of them changes."
        />

        <Figure number="Figure 15" caption="The chain every statement in this publication travelled.">
          <ProvenanceChainFigure width={contentWidth - 32} />
        </Figure>

        <Body>
          Every statement resolves to an exact location in a named source. The reading of that
          passage is recorded separately from the passage itself, so a reader can disagree with the
          interpretation without disputing the citation. What the sources do not settle is recorded
          as a gap, with the kind of source that would close it.
        </Body>

        <Body>
          An approval is bound to the exact version a reviewer read. Editing a record creates a new
          version and strands the approval. This is why a printed document carries a version and a
          date rather than presenting itself as current.
        </Body>

        <SubHeading>Status of this edition</SubHeading>
        <Body>
          A prototype excerpt. The evidence behind it is complete and located; the scientific review
          is not done. No human reviewer has approved any statement here, and it should be read as a
          well-sourced draft rather than as a reviewed reference.
        </Body>

        <CurrentVersionBlock
          url="thetidesindex.com/quality"
          version={`${TITLE} · first edition excerpt · issued ${ISSUED}`}
          note="When the site is public, this block will carry a link to the current version of each record cited here."
        />

        <SourceNote
          items={[
            'Grant GA (ed.). Synthetic Peptides: A User’s Guide, 2nd edition. Oxford University Press, 2002. ISBN 0-19-513261-0.',
            'ICH Q7, Good Manufacturing Practice Guide for Active Pharmaceutical Ingredients.',
            'Source files are private research inputs and are not redistributed. Locators cite each work’s own printed pages.',
          ]}
        />
      </PublicationPage>
    </Document>
  );
}
