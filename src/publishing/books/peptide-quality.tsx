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
  ChromatogramFigure,
  ContentFigure,
  IdentityVersusPurityFigure,
  ProvenanceChainFigure,
  QualityDimensionsFigure,
  ThreeQuestionsFigure,
  TideMark,
  TraceabilityFigure,
} from '../figures';
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

const PUBLICATION = 'Peptide Quality';
const ISSUED = '12 September 2026';

export function PeptideQuality() {
  return (
    <Document
      title="Peptide Quality — From Manufacturing to the Final Vial"
      author="The Tides Index"
      subject="What analytical tests establish about a peptide preparation, and what they do not"
      creator="The Tides Index"
      producer="The Tides Index"
    >
      {/* ================= 1. COVER ==================================== */}
      <Cover
        imprint="The Tides Index"
        title="Peptide Quality"
        subtitle="From Manufacturing to the Final Vial"
        descriptor="Independent peptide science & clinical reference"
        editionLine={`First edition excerpt · prototype · issued ${ISSUED}`}
        statusLine="Awaiting scientific review. Nothing in this document has been approved by a reviewer."
        mark={<TideMark width={300} />}
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

        <SectionHeading>Four things a purity figure is not</SectionHeading>
        <Bullets
          items={[
            'It is not a statement of identity. A high figure says the sample was homogeneous by that method; it does not say what the substance is.',
            'It is not a statement of quantity. A proportion carries no amount — two vials with the same figure can hold very different masses of peptide.',
            'It is not a statement about sterility or endotoxin. Chromatography does not address either.',
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
          standfirst="Purity, identity and content are separate undertakings, and no single technique addresses more than one of them well."
        />

        <Body>
          Evaluating a synthetic peptide has two distinct goals: establishing how homogeneous the
          preparation is, and establishing that the covalent structure is the intended one. No
          single analytical technique addresses both. A third question — how much peptide is
          actually present — is separate again.
        </Body>

        <Figure
          number="Figure 1"
          caption="Three questions, three measurements. An answer to one implies nothing about the other two."
        >
          <ThreeQuestionsFigure width={contentWidth - 32} />
        </Figure>

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

        <Figure
          number="Figure 2"
          caption="The same sample, analysed twice. Resolution is a property of the method, not of the material."
        >
          <ChromatogramFigure width={contentWidth - 32} />
        </Figure>

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

        <Body>
          Assessing homogeneity and establishing correct covalent structure are separate
          undertakings, and the separation methods used for the first do not answer the second.
          Determining the overall mass of a synthetic peptide is the most practical and common use
          of mass analysis, and is usually sufficient to evaluate whether the intended product was
          obtained.
        </Body>

        <Figure
          number="Figure 3"
          caption="Two instruments, two questions. Neither substitutes for the other."
        >
          <IdentityVersusPurityFigure width={contentWidth - 32} />
        </Figure>

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

        <Body>
          Determining how much peptide is present is a different analytical question from assessing
          how heterogeneous a preparation is. Amino acid analysis is described as the best method
          for determining the amount of peptide — still the best among the techniques under
          discussion for peptide quantitation.
        </Body>

        <Figure
          number="Figure 4"
          caption="Two preparations reporting the same purity figure, holding different amounts of peptide."
        >
          <ContentFigure width={contentWidth - 32} />
        </Figure>

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

        <Body>
          A certificate of analysis collects results under a single heading. That presentation
          invites a reader to treat it as one verdict on one thing. It is not. Each line is a
          separate test, performed by a separate method, answering a separate question; and a test
          that does not appear was not necessarily performed.
        </Body>

        <Figure
          number="Figure 5"
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

        <Figure
          number="Figure 6"
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
              ['Sterility', 'Not stated', '—', 'Absent. Chromatography does not address it.'],
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
              'Chromatography does not address it.',
              'Recorded gap',
            ],
            [
              'Endotoxin content',
              'Chromatography does not address it.',
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

      {/* ================= 11. MULTI-DIMENSIONAL ====================== */}
      <PublicationPage publication={PUBLICATION} section="The whole picture">
        <ChapterOpener
          eyebrow="Ten"
          title="Quality is multi-dimensional"
          standfirst="And this reference is not finished. Here is exactly how far it has got."
        />

        <Figure
          number="Figure 7"
          caption="The dimensions this index recognises, and the state of each."
        >
          <QualityDimensionsFigure
            width={contentWidth - 32}
            dimensions={[
              { label: 'Purity', written: true },
              { label: 'Identity', written: true },
              { label: 'Content', written: true },
              { label: 'Certificates', written: true },
              { label: 'Sterility', written: false },
              { label: 'Endotoxin', written: false },
              { label: 'Residual solvents', written: false },
              { label: 'Water content', written: false },
              { label: 'Heavy metals', written: false },
              { label: 'Storage', written: false },
              { label: 'Transport', written: false },
              { label: 'Manufacturing', written: false },
            ]}
          />
        </Figure>

        <InPreparation>
          Sterility, bacterial endotoxin, residual solvents and water content cannot be written
          until this index holds the compendial chapters they depend on. Obtaining lawful access is
          in progress. Until then these subjects are named and left unwritten rather than filled in
          from general knowledge — an index that wrote them from memory would be exactly the kind of
          source it exists to be an alternative to.
        </InPreparation>

        <Body>
          The four written subjects are the analytical ones, and they are the ones a test report
          raises. They are not the whole of quality, and this publication does not present them as
          such.
        </Body>
      </PublicationPage>

      {/* ================= 12. METHOD AND VERSION ====================== */}
      <PublicationPage publication={PUBLICATION} section="Method">
        <ChapterOpener
          eyebrow="Eleven"
          title="How this was made"
          standfirst="Source, locator, claim, review, publication — and what happens when any of them changes."
        />

        <Figure number="Figure 8" caption="The chain every statement in this publication travelled.">
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
          version={`Peptide Quality · first edition excerpt · issued ${ISSUED}`}
          note="QR placeholder. The published code will resolve to the current version of each record cited here."
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
