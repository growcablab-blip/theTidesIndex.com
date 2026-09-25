import { Document, Text, View } from '@react-pdf/renderer';
import type { DocumentProps } from '@react-pdf/renderer';
import type { ReactElement } from 'react';
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
import { IllustrationPlate } from '../illustration-print';
import { colour, contentWidth, serif, type } from '../theme';
import type { PeptidePage } from '@/server/public/queries';

/**
 * PEPTIDE SCIENCE & APPLICATIONS — first edition.
 *
 * The clinician-facing volume: the general science a reader needs in order to
 * read the compound records well. Two rules shaped it.
 *
 * First, it is not a textbook. A disconnected account of peptide chemistry
 * would be both worse than the textbooks it paraphrased and unanchored to
 * anything this index holds. So every chapter ends by naming where the idea
 * bites in the register — which record it explains, which disagreement it
 * settles, which absence it accounts for — and those passages are computed
 * from the records rather than typed, so they cannot drift.
 *
 * Second, it says only what this index can source. The register holds
 * extracted claims on synthesis, purification, characterisation, stability and
 * good-manufacturing expectations, and those chapters are written from them.
 * Since 14 September 2026 it also holds general receptor pharmacology from a
 * partial, translated textbook sample, so the receptor half of chapter four is
 * written and labelled as such. It holds nothing on intracellular signalling or
 * absorption physiology, so those parts state the question, state that the
 * index cannot yet answer it, and stop. A chapter written from general
 * knowledge would read exactly like the sourced ones, which is the danger.
 */

export interface ScienceApplicationsProps {
  readonly peptides: readonly PeptidePage[];
  readonly generatedAt: string;
}

const PUBLICATION = 'Peptide Science & Applications';

/** Where an idea shows up in the register, computed rather than asserted. */
function InTheRecords({ title, lines }: { title: string; lines: readonly string[] }) {
  if (lines.length === 0) return null;
  return (
    <View
      style={{
        borderLeftWidth: 2,
        borderLeftColor: colour.tideTeal,
        backgroundColor: colour.mist,
        paddingVertical: 9,
        paddingHorizontal: 12,
        marginVertical: 9,
        maxWidth: contentWidth,
      }}
      wrap={false}
    >
      <Text
        style={{
          fontFamily: serif,
          fontSize: type.small,
          color: colour.deepTide,
          marginBottom: 4,
        }}
      >
        {title}
      </Text>
      {lines.map((line) => (
        <Text
          key={line}
          style={{
            fontFamily: serif,
            fontSize: type.small,
            color: colour.inkSoft,
            lineHeight: 1.45,
            marginBottom: 2,
          }}
        >
          — {line}
        </Text>
      ))}
    </View>
  );
}

/** A chapter the index cannot yet source, stated as such rather than filled. */
function SourceNeeded({
  question,
  whatIsMissing,
  whatExists,
}: {
  question: string;
  whatIsMissing: string;
  whatExists?: string;
}) {
  return (
    <View
      wrap={false}
      style={{
        borderWidth: 0.75,
        borderColor: colour.caution,
        backgroundColor: colour.cautionBg,
        padding: 12,
        marginVertical: 9,
        maxWidth: contentWidth,
      }}
    >
      <Text
        style={{
          fontFamily: serif,
          fontSize: type.small,
          color: colour.ink,
          lineHeight: 1.45,
        }}
      >
        <Text style={{ color: colour.caution }}>Source needed. </Text>
        {question} {whatIsMissing}
      </Text>
      {whatExists === undefined ? null : (
        <Text
          style={{
            fontFamily: serif,
            fontSize: type.small,
            color: colour.inkSoft,
            lineHeight: 1.45,
            marginTop: 5,
          }}
        >
          {whatExists}
        </Text>
      )}
    </View>
  );
}

export function ScienceAndApplications({
  peptides,
  generatedAt,
}: ScienceApplicationsProps): ReactElement<DocumentProps> {
  // --- What the register actually contains, computed ----------------------
  const withPk = peptides.filter((p) => p.pharmacokinetics.length > 0);
  const withoutPk = peptides.filter((p) => p.pharmacokinetics.length === 0);
  const withReplication = peptides.filter((p) => p.replication.length > 0);
  const humanConfirmed = peptides.filter((p) =>
    p.replication.some((assessment) => assessment.humanConfirmed),
  );
  const identityRecords = peptides.filter((p) => p.identities.length > 1);
  const disagreements = peptides.flatMap((p) =>
    p.disagreements.map((d) => ({ compound: p.canonicalName, disagreement: d })),
  );
  const unresolved = disagreements.filter((d) => d.disagreement.resolution === 'unresolved');
  const sourceErrors = disagreements.filter(
    (d) => d.disagreement.resolution === 'source_error_confirmed',
  );
  const routeCount = new Set(peptides.flatMap((p) => p.routes.map((r) => r.routeKey))).size;
  const protocolTotal = peptides.reduce((total, p) => total + p.protocolCountAll, 0);
  const handbookOnly = peptides.filter(
    (p) =>
      p.protocolCountAll > 0 &&
      (p.protocols as readonly { evidenceTypeLabel: string }[]).every((protocol) =>
        /handbook|practitioner|commentary|experiential/i.test(protocol.evidenceTypeLabel),
      ),
  );
  const gapTotal = peptides.reduce((total, p) => total + p.gaps.length, 0);
  const questionTotal = peptides.reduce(
    (total, p) => total + p.gaps.filter((gap) => gap.researchQuestion !== null).length,
    0,
  );

  return (
    <Document
      title={PUBLICATION}
      author="The Tides Index"
      subject="The science behind the records, for clinicians and scientifically confident readers. Not reviewed."
      creator="The Tides Index"
    >
      <Cover
        imprint="The Tides Index"
        series="Reference series · Volume two"
        title="Peptide Science & Applications"
        subtitle="How to read the evidence behind a peptide"
        descriptor="Independent peptide science & clinical reference"
        editionLine={`First edition · generated ${generatedAt}`}
        statusLine="Written from extracted records and the register itself. Awaiting scientific review; where the index holds no source, the page says so."
        mark={<SeriesMark width={300} volume={2} />}
      />

      {/* --- Front matter ---------------------------------------------------- */}
      <PublicationPage publication={PUBLICATION} section="What this volume is">
        <ChapterOpener
          eyebrow="Front matter"
          title="What this volume is"
          standfirst="The general science, tied to the particular records."
        />
        <Lede>
          This volume exists because the compound records assume things. They assume a reader knows
          why an abstract-level reading is weaker than a full text, why a mass spectrum is not a
          purity figure, and why a half-life measured in one product is not a half-life for
          another. This is where those assumptions are written down.
        </Lede>
        <Body>
          It is deliberately not a textbook. Every chapter ends by naming where the idea bites in
          the register — the record it explains, the disagreement it settles, the absence it
          accounts for — and those passages are generated from the records rather than written, so
          a chapter cannot quietly describe a register that no longer exists.
        </Body>

        <SectionHeading>What it will not do</SectionHeading>
        <Bullets
          items={[
            'It will not teach peptide biochemistry from general knowledge. Where this index holds no extracted source, the chapter says "source needed" and stops.',
            'It will not recommend a regimen, and it contains no dose.',
            'It will not rank compounds. Nothing here scores anything.',
            'It has not been reviewed by a person. Neither have the records it draws on.',
          ]}
        />

        <Callout title="Why some chapters are short">
          <Text>
            The register holds extracted claims on synthesis, purification, characterisation,
            stability and manufacturing expectation; on receptor pharmacology, from a partial
            textbook sample and open-access reviews; and on pharmacokinetic concepts and routes,
            from open-access reviews and public reference sources. Where a question has no source
            it holds, a chapter written from general knowledge would look exactly like a sourced
            one on the page — so the chapter states the question and names what is missing.
          </Text>
        </Callout>

        <SectionHeading>How each chapter is built</SectionHeading>
        <Body>
          Concept first: the chapter’s opening line and, where one helps, a drawing. Then the
          explanation. Then technical detail, set under its own label, for the reader who needs the
          terms exactly. Then the sources. A reader can stop at any layer and has not been misled by
          stopping.
        </Body>
        <IllustrationPlate illustration="editorial-states" />
      </PublicationPage>

      {/* --- 1. What a peptide is, at the bench ------------------------------- */}
      <PublicationPage publication={PUBLICATION} section="Chemistry and synthesis">
        <ChapterOpener
          eyebrow="One"
          title="Chemistry, structure and synthesis"
          standfirst="What a peptide is, from the point of view of making one."
        />
        <Body>
          In stepwise solid-phase synthesis the first protected amino acid is anchored to an
          insoluble resin through a linker, and the chain is extended one residue at a time. Keeping
          the growing chain on an insoluble support is what makes the method work: each step can be
          driven towards completion with a large excess of soluble reagent, and the excess is then
          washed away rather than separated.
        </Body>
        <IllustrationPlate illustration="sequence-to-vial" />
        <Body>
          Two consequences follow, and they matter clinically rather than only chemically. Chains
          that fail to react at a step become deletion peptides — molecules one residue short of
          the intended sequence, chemically similar enough to be difficult to separate afterwards.
          And cleavage from the resin generates reactive species: in Fmoc chemistry, tert-butyl
          cations that can alkylate tryptophan, methionine and cysteine. Effective solvation of the
          peptide-resin is described in the source as perhaps the most crucial condition for
          efficient assembly.
        </Body>
        {/*
          Next to the deletion-peptide paragraph its first line refers to. At the
          chapter's end it was carried, with the sources, onto a near-empty page.
        */}
        <InTheRecords
          title="Where this bites in the register"
          lines={[
            'Deletion peptides are why a single symmetrical chromatographic peak is not proof of one substance — the reasoning behind the purity topic.',
            `The register records ${String(peptides.length)} compounds; for none of them does this index hold a manufacturing record for the material any source administered.`,
          ]}
        />
        <Body>
          At manufacturing scale the picture divides. Peptides longer than about ten residues are
          usually made by solid-phase synthesis or by hybrid routes that assemble purified
          fragments; small-scale custom production and commercial manufacture differ in process
          control rather than in chemistry, and every raw material — resin, protected amino acids,
          reagents, solvents — is expected to be specified.
        </Body>
        <EvidenceNote
          supports="Extracted claims from Synthetic Peptides: A User's Guide (SRC-006) and Advances in the Discovery and Development of Peptide Therapeutics (SRC-007), held in full."
          doesNotSettle="What any particular vial contains. A described process is not a measurement of a product."
        />
        <SourceNote
          items={[
            'SRC-006 — Synthetic Peptides: A User’s Guide, 2nd edition.',
            'SRC-007 — Advances in the Discovery and Development of Peptide Therapeutics.',
          ]}
        />
      </PublicationPage>

      {/* --- 2. Purity, identity, content ------------------------------------- */}
      <PublicationPage publication={PUBLICATION} section="Characterisation">
        <ChapterOpener
          eyebrow="Two"
          title="Purity, identity and content"
          standfirst="Three questions that sound like one."
        />
        <Body>
          Evaluating a synthetic peptide has two distinct goals: establishing homogeneity, and
          establishing that the covalent structure is the intended one. A third question — how much
          peptide is actually present — is separate again, and the three are routinely collapsed
          into a single percentage on a certificate.
        </Body>
        <IllustrationPlate illustration="separate-questions" />
        <Comparison
          left={{
            title: 'What each technique establishes',
            items: [
              'Reversed-phase HPLC: the level of heterogeneity in a sample.',
              'Mass spectrometry: an accurate mass, and with fragmentation, sequence information.',
              'Amino acid analysis: how much peptide is present, and the mole ratio of residues.',
            ],
          }}
          right={{
            title: 'What each does not',
            items: [
              'A single symmetrical peak does not establish one species: peptides differing by a single residue can co-elute.',
              'A mass result is a measured value compared with a calculated one, and the comparison carries a margin.',
              'Quantitation by hydrolysis is indirect, and several residues do not survive it intact.',
            ],
          }}
        />
        <Body>
          The techniques are complementary by design, each contributing information the others
          cannot. A certificate quoting one number from one technique has answered one of the three
          questions, and a reader who does not know which one has learned nothing reliable.
        </Body>
        <IllustrationPlate illustration="chromatogram" />
        <EvidenceNote
          supports="Extracted claims from SRC-006 and the characterisation protocols (SRC-011), across the purity, identity and content topics."
          doesNotSettle="Whether any particular certificate is honest. This index holds analytical expectations, not audits of laboratories."
        />
        <InTheRecords
          title="Where this bites in the register"
          lines={[
            `Identity is not a formality: ${String(identityRecords.length)} records hold more than one source-stated identity for the same name.`,
            sourceErrors.length > 0
              ? `${String(sourceErrors.length)} recorded disagreements were resolved as a source error — a stated molecular weight or sequence that does not match the molecule.`
              : 'No source error is currently recorded.',
          ]}
        />
        <SourceNote
          items={[
            'SRC-006 — Synthetic Peptides: A User’s Guide, 2nd edition.',
            'SRC-011 — Peptide Characterization and Application Protocols.',
          ]}
        />
      </PublicationPage>

      {/* --- 3. Stability and the chain --------------------------------------- */}
      <PublicationPage publication={PUBLICATION} section="Stability and handling">
        <ChapterOpener
          eyebrow="Three"
          title="Stability, storage and the cold chain"
          standfirst="A peptide is a molecule that degrades by known routes."
        />
        <Body>
          In solution, peptides degrade by several sequence-dependent routes — oxidation of
          tryptophan, cysteine and methionine among them. For long-term storage of research
          peptides the textbook recommends lyophilisation from a volatile buffer or solvent, and a
          peptide stored for an extended period is worth re-evaluating before use: even lyophilised
          material can contain significant water. Asparagine- and glutamine-containing peptides can
          deamidate in the solid state in the presence of residual acid.
        </Body>
        <Body>
          The manufacturing-standard view runs alongside. Under ICH Q7, materials should be stored
          under appropriate conditions with records kept, stability studies should justify an
          assigned retest or expiry date, and transport should not adversely affect quality. None
          of that is a statement about any particular vial; it is what a compliant process looks
          like, which is the benchmark a reader can hold a supplier against.
        </Body>
        <IllustrationPlate illustration="chain-of-custody" />
        <EvidenceNote
          supports="Extracted claims from SRC-006 and ICH Q7 (SRC-017), across the storage, transport and traceability topics."
          doesNotSettle="What happened to a specific shipment. Excursion records are what would answer that, and this index holds none."
        />
        <Callout title="Country of origin is not a quality test">
          <Text>
            Nothing in the sourced material supports reading quality off a geography. What supports
            a judgement is the process, the test, the batch and the chain of custody — each of which
            is a document somebody either has or does not.
          </Text>
        </Callout>
        <SourceNote
          items={[
            'SRC-006 — Synthetic Peptides: A User’s Guide, 2nd edition.',
            'SRC-017 — ICH Q7, Good Manufacturing Practice Guide for Active Pharmaceutical Ingredients.',
          ]}
        />
      </PublicationPage>

      {/* --- 4. Receptors and signalling ------------------------------------- */}
      <PublicationPage publication={PUBLICATION} section="Receptors and signalling">
        <ChapterOpener
          eyebrow="Four"
          title="Receptors, signalling and modulation"
          standfirst="Both halves of this chapter can now be written, from different sources. One step inside the cell cannot."
        />
        <Body>
          A clinician reading a compound record meets mechanism language constantly: receptor
          agonism, selectivity, downstream signalling, modulation rather than stimulation. Those
          words do real work, and the receptor half of them is now defined against a pharmacology
          textbook — held only as a Spanish-language sample of its chapter 2, and paraphrased.
        </Body>
        <SectionHeading>Binding is not activation</SectionHeading>
        <Body>
          Rang and Dale treat affinity — how readily a drug binds a receptor — and efficacy — how
          readily the bound receptor adopts an active state — as separate properties; an antagonist,
          in the simplest case, has affinity and no efficacy. A partial agonist gives less than the
          maximal response even at full occupancy, and because efficacy has tissue-dependent
          components, the same drug can look like a full agonist, a partial agonist or an antagonist
          depending on receptor expression. “Partial agonist” is therefore a statement about a
          tissue or cell system, not about a molecule in general.
        </Body>
        <IllustrationPlate illustration="receptor-binding" />
        <SubHeading>Technical detail</SubHeading>
        <Body>
          A concentration–effect curve gives a maximum and a half-maximal concentration, but cannot
          measure affinity, because response is generally not proportional to occupancy — in some
          tissues a full response needs only a small fraction of receptors (“spare receptors”). An
          EC50 from one experiment is not a binding constant and does not transfer between systems.
        </Body>
        <SectionHeading>Antagonism, inverse agonism and modulation</SectionHeading>
        <Bullets
          items={[
            'Reversible competitive antagonism can be overcome with more agonist, and shifts the curve without lowering its maximum; irreversible competitive antagonism cannot, and can lower the maximum.',
            'A partial agonist competing with a fuller one reduces its effect, behaving as a competitive antagonist.',
            'Some receptors are active unoccupied; an inverse agonist lowers that baseline, which a neutral antagonist does not. Agonists at one receptor can also favour different downstream responses (“biased agonism”), probably by stabilising different active states.',
            'Allosteric modulators bind away from the agonist site and can raise or lower affinity or efficacy — a narrower meaning of “modulates” than practitioner material usually intends.',
            'Responses can wane with repeated exposure — desensitisation within minutes, tolerance over longer periods — by receptor change, receptor internalisation, mediator depletion, faster metabolism or physiological adaptation.',
          ]}
        />
        <EvidenceNote
          supports="Claims RECEPT-001 to RECEPT-016, extracted from chapter 2 (printed pp. 6–22) of Rang and Dale’s Pharmacology, 10th edition, held as a Spanish-language publisher sample (SRC-121). Paraphrases of the Spanish text, awaiting re-checking against the English edition (SRC-122, not held)."
          doesNotSettle="Which receptor any compound in the register acts on, or how strongly: those are claims about a compound and are sourced, or not, on its record."
        />
        {/*
          Beside the receptor vocabulary it qualifies. At the end of the chapter,
          after the source-needed box, it fell onto a page of its own.
        */}
        <InTheRecords
          title="How mechanism claims appear in the register"
          lines={[
            'Mechanism statements are almost always preclinical or practitioner-reported, and labelled as such wherever they appear.',
            'A mechanism reported in cell culture is not an effect in a body, and the records say so on the claim rather than in a preface.',
            'Where a source describes a bidirectional effect with no criterion for direction, the record says the claim is unfalsifiable as stated.',
          ]}
        />
        <Body>
          English-language open-access sources corroborate that account, and in one place qualify
          it. Higham and Colquhoun (2024) show that measured agonist binding depends on efficacy as
          well as affinity: the two are distinct properties, but cannot simply be read off separately
          from equilibrium binding data. A systematic review of inverse agonism at adrenoceptors
          (Michel et al. 2020) adds that measured inverse agonism is partly a property of the test
          system, so one compound can appear as a partial agonist, a neutral antagonist or an inverse
          agonist in different models.
        </Body>
        <SectionHeading>Inside the cell</SectionHeading>
        <Body>
          For G-protein-coupled receptors, ligand binding causes conformational rearrangement of the
          seven-transmembrane domain, which activates the G protein on the cytoplasmic side (Culhane
          et al. 2015). Receptor groups couple to distinct G-protein subunits and second-messenger
          pathways, and one receptor can activate different G-protein subtypes or arrestin signalling
          depending on the ligand (Cho et al. 2025). Preferential coupling to distinct transducers is
          what the receptor literature calls biased agonism (Liu et al. 2024), and a practical guide
          cautions that biased agonists’ effects often cannot be predicted from their pharmacological
          profiles and must be tested in a physiological context (Gundry et al. 2017).
        </Body>
        <IllustrationPlate illustration="cell-signalling" />
        <Body>
          Tissue differences follow partly from receptor distribution: one paracrine signal can
          activate some cell types and inhibit others through different receptor subtypes, and a
          cell’s output reflects the integration of the many receptors it expresses (Tse and Wong
          2019). Signals are terminated as well as started. After an active receptor is phosphorylated,
          arrestins outcompete G proteins and shut down G-protein signalling; arrestin binding also
          promotes internalisation and initiates signalling of its own (Seyedabadi et al. 2021). With
          prolonged stimulation, receptors are downregulated through lysosomal destruction and reduced
          expression (Liu et al. 2024).
        </Body>
        <EvidenceNote
          supports="Claims SIG-05 to SIG-07, SIG-09, SIG-12 and SIG-13 (learning topic ‘How peptide signalling works’) and REC-06, REC-13, REC-16, REC-17 and REC-20 (learning topic ‘Receptors, agonists and antagonists (English sources)’), from reviews licensed CC BY 4.0, each licence read in the retrieved full text."
          doesNotSettle="Which pathway any peptide in the register activates, in which tissue, or with what result."
          status="Extracted and awaiting scientific review."
        />
        <SourceNeeded
          question="What happens downstream of the second messenger — the kinase cascades that carry a signal on — in terms general enough to apply across receptors?"
          whatIsMissing="The only permissively licensed passage retrieved on this describes the key enzyme incompletely, so it was not used, and the Rang and Dale chapter that covers it (SRC-122) is not held. The question stays open rather than being answered from general knowledge."
        />
      </PublicationPage>

      {/* --- 5. Pharmacokinetics ------------------------------------------------ */}
      <PublicationPage publication={PUBLICATION} section="Pharmacokinetics">
        <ChapterOpener
          eyebrow="Five"
          title="Interpreting pharmacokinetics"
          standfirst="A half-life belongs to a product, a population and a route."
        />
        <Body>
          Pharmacokinetic values travel badly. A figure measured in one presentation, in one
          population, by one route is quoted later as a property of the molecule, and the
          conditions fall away in the quoting. This is why every pharmacokinetic observation in
          this index carries the product, the population, the dose context and the conditions
          alongside the number: two values for the same parameter usually differ because the
          conditions differed, not because one is wrong.
        </Body>
        <Table
          head={['What the register holds', 'Records']}
          rows={[
            ['Compounds with any recorded pharmacokinetic observation', String(withPk.length)],
            ['Compounds with none at all', String(withoutPk.length)],
            ['Distinct administration routes recorded across the register', String(routeCount)],
          ]}
          widths={[3, 1]}
        />
        <Body>
          The second row is the finding. For most of the register, nobody has measured what the
          body does with the compound by any route — which means that a regimen reported for it
          cannot have been derived from exposure data, because none exists.
        </Body>
        <EvidenceNote
          supports="Computed from the pharmacokinetic observations in the records as they stand on the generation date."
          doesNotSettle="Whether the absent measurements exist in literature this index has not screened. An absence here is an absence in the register."
        />
        <SectionHeading>Why swallowing a peptide rarely works</SectionHeading>
        <Body>
          Two open-access reviews of the field answer the qualitative question. A swallowed peptide
          meets stomach acid and protein-cutting enzymes, then more enzymes in the intestine; if it
          survives, it has to cross a mucus layer and a lining of cells sealed by tight junctions.
          The reviews describe peptides as commonly large, water-loving and sensitive to enzymes and
          acidity — properties that limit absorption by mouth — and describe poor membrane
          permeability and poor stability in the body as the two built-in drawbacks of peptides as
          a class, which is why most peptide drugs are injected. Approaches that loosen the gut lining
          can also damage it, and several oral strategies had not been validated in large clinical
          trials as of 2022. On time in the blood, one review states that cleavage by proteases
          limits a peptide’s plasma half-life, and describes two design responses: unnatural building
          blocks at cleavage sites, and attached fatty acids or plasma proteins that take the molecule
          above the size the kidneys filter.
        </Body>
        <EvidenceNote
          supports="Claims PK-01 to PK-05, PK-10 to PK-14 and PK-18, from Chen et al., Theranostics 2022 (SRC-146) and Wang et al., Signal Transduction and Targeted Therapy 2022 (SRC-143), both open-access narrative reviews read in full. Class-level statements as of 2022."
          doesNotSettle="Anything about a particular peptide in the register, including whether an oral product reports any bioavailability. Neither review gives a class-wide bioavailability figure, and the only figures they give are for single products, so none is used."
          status="Extracted and awaiting scientific review. These reviews are cited as themselves; they are not the pharmacology textbook this chapter was planned around."
        />
        <SectionHeading>The terms, defined</SectionHeading>
        <Body>
          Pharmacokinetics is classically described as the quantitative study of absorption,
          distribution, metabolism and elimination, each influenced by the drug’s chemistry, its
          administration (dose, route and schedule) and host factors (Straehla and Warren 2020).
          Metabolism is often defined as enzymatic breakdown into less active components that aids
          elimination, though it can also yield more active compounds; elimination is movement out of
          the body, which can occur in several ways. Plotting blood concentration against time gives
          Cmax and Tmax for a given dose and route (Straehla and Warren 2020), and the area under that
          curve quantifies overall exposure after a single dose; clearance is the aggregate of all
          elimination processes (Yousef et al. 2024).
        </Body>
        <IllustrationPlate illustration="concentration-time" />
        <SubHeading>Technical detail</SubHeading>
        <Body>
          The NCI Thesaurus defines volume of distribution as the apparent volume a compound occupies,
          assuming uniform distribution at the concentration measured in plasma or another tissue, and
          elimination half-life as the time for half of a substance to be removed from the plasma or
          the body. US regulation (21 CFR 314.3, 2025 edition) defines bioavailability as the rate and
          extent to which the active ingredient or moiety is absorbed from a product and becomes
          available at the site of action; intravenous administration, the thesaurus states, gives
          complete bioavailability because there is no absorption phase. Orally absorbed drug crosses
          the intestinal wall into the portal vein and reaches the liver before the systemic
          circulation, and individual differences in this pre-systemic metabolism by gut and liver make
          oral bioavailability vary (Lin and Wong 2017).
        </Body>
        {/*
          Directly after the half-life and bioavailability definitions it is the
          missing half of. After the chapter's last evidence note it stood alone
          on the final page.
        */}
        <SourceNeeded
          question="How long repeated administration takes to reach steady state; what a half-life does not tell you — its dependence on clearance and volume of distribution, and why an effect can outlast the substance; and plasma protein binding in general."
          whatIsMissing="Not stated in general terms by any permissively licensed source retrieved. The one review that states the steady-state rule is a single-author review that also discusses products and dosing intervals, and was not used; the only protein-binding statement retrieved is limited to the blood–brain barrier."
        />

        <SectionHeading>How peptides differ</SectionHeading>
        <Body>
          Mahmood and Pettinato (2021) state that proteolysis is a major elimination pathway for most
          peptides, with clearance able to exceed cardiac output because peptides are degraded in
          blood; that because peptides are generally smaller than 10 kDa their renal clearance may
          reach the glomerular filtration rate; and that their volume of distribution is small and
          limited to the extracellular space. After subcutaneous or intramuscular injection, peptides
          reach the circulation through blood capillaries or the lymphatic system; injection avoids
          gastrointestinal and hepatic enzymes, but degradation at the injection site and in lymph
          lowers bioavailability relative to intravenous administration. The same authors note that
          the intrinsic and extrinsic factors known to change small-molecule pharmacokinetics
          substantially have effects on macromolecules that are not well established. For the approved
          toxin-derived peptide drugs Stepensky (2018) reviews, proteolysis acts at the sites of
          administration and distribution whatever the volume of distribution.
        </Body>
        <IllustrationPlate illustration="circulation" />

        <IllustrationPlate illustration="routes" />
        <SectionHeading>Routes</SectionHeading>
        <Body>
          Subcutaneous injection deposits drug in the interstitial space of the hypodermis — adipose
          tissue with blood and lymph vessels and resident cells — whose negative charge gives low
          hydraulic conductivity and limits injection volume (Pitiot et al. 2022). The NCI Thesaurus
          describes subcutaneous absorption as relatively slow and sustained, perfusion-limited and
          proportional to the amount at the site, and intramuscular absorption, delay and duration of
          effect as perfusion-limited and dependent on molecular size, solution volume and osmolarity,
          local fat content and physical activity. Nasal administration often gives systemic action
          through the nasal mucosa (NCI Thesaurus), but large hydrophilic macromolecules may permeate
          the nasal epithelium and the stratum corneum poorly (Kirkby et al. 2020), and the mechanisms
          of nose-to-brain delivery are still debated (Bose et al. 2022). Sublingual and buccal
          absorption lets certain drugs bypass first-pass metabolism, but earlier macromolecules failed
          on permeability, size and degradation, and retention at the site is complicated by saliva,
          eating and speaking (Bahraminejad and Almoazen 2025). For lung-targeted therapy, barriers
          include the cough reflex, low regional delivery efficiency and rapid loss by degradation,
          clearance or systemic absorption (Plaunt et al. 2022).
        </Body>
        <EvidenceNote
          supports="Claims PKG-01 to PKG-08, PKG-12 to PKG-15 and PKG-17 to PKG-21 (learning topic ‘Pharmacokinetic concepts’) and RTE-11 to RTE-14, RTE-16, RTE-17 and RTE-20 to RTE-27 (learning topic ‘Routes of administration’), from reviews licensed CC BY 4.0, the NCI Thesaurus (CC BY 4.0) and 21 CFR 314.3 (public domain), each licence or terms statement read at the source."
          doesNotSettle="Any parameter for any peptide in the register, or how any product should be given. Several route statements come from reviews written about antibodies or macromolecules generally."
          status="Extracted and awaiting scientific review."
        />
      </PublicationPage>

      {/* --- 6. Human versus preclinical ---------------------------------------- */}
      <PublicationPage publication={PUBLICATION} section="Human and preclinical evidence">
        <ChapterOpener
          eyebrow="Six"
          title="Human evidence, preclinical evidence, and the step between"
          standfirst="The step that is usually taken silently."
        />
        <Body>
          This index sorts evidence into three classes before doing anything else with it: human,
          preclinical, and reference or opinion. The class is not a score. It says where a
          statement came from and therefore what it can support — a statement about people, a
          statement about a model, or a statement about what a source says.
        </Body>
        <IllustrationPlate illustration="evidence-lanes" />
        <Body>
          The step from the second to the first is where most of the field goes wrong. An animal
          result establishes that something happened in that species, in that model, at that
          exposure; it is a reason to run a human study and not a substitute for one. Dose does not
          translate, absence of harm does not translate, and a mechanism demonstrated in culture is
          not an effect in a body.
        </Body>
        <IllustrationPlate illustration="study-design" />
        <Body>
          An uncontrolled study cannot separate treatment from natural course, and that matters most in
          conditions that fluctuate.
        </Body>
        <InTheRecords
          title="Where this bites in the register"
          lines={[
            `${String(peptides.length)} compound records, of which ${String(withReplication.length)} carry at least one replication assessment and ${String(humanConfirmed.length)} carry a finding marked as confirmed in humans.`,
            `${String(protocolTotal)} source-reported regimens are recorded; ${String(handbookOnly.length)} compounds have regimens that come only from handbooks, with no trial or label behind any of them.`,
          ]}
        />
      </PublicationPage>

      {/* --- 7. Replication ------------------------------------------------------ */}
      <PublicationPage publication={PUBLICATION} section="Replication">
        <ChapterOpener
          eyebrow="Seven"
          title="Replication, and why counting papers fails"
          standfirst="Forty papers from one laboratory is a weaker position than two from two."
        />
        <Body>
          A literature search returns publications, and publications are a poor proxy for
          knowledge. They accumulate around whatever is fashionable, they double-count substudies
          of a single trial, and a single productive group can fill a decade of results that have
          never been independently checked. This is why the register records replication as a
          state rather than a count: whether a finding has been repeated, by how many groups, in
          how many countries, and whether any of it was in people.
        </Body>
        <Body>
          It is also why the compound directory on the website describes evidence in words rather
          than printing paper counts side by side. The counts exist on each record, next to the
          database and the search date that produced them, where they mean something.
        </Body>
        <EvidenceNote
          supports="The replication assessments recorded on the compound records, each with its stated basis."
          doesNotSettle="Whether an unreplicated finding is wrong. Unreplicated means unchecked."
        />
        <InTheRecords
          title="Where this bites in the register"
          lines={[
            `${String(withReplication.length)} of ${String(peptides.length)} records carry a replication assessment.`,
            `${String(unresolved.length)} recorded disagreements between sources remain unresolved; each shows both positions with attribution rather than averaging them.`,
          ]}
        />
      </PublicationPage>

      {/* --- 8. Nomenclature ----------------------------------------------------- */}
      <PublicationPage publication={PUBLICATION} section="Names and identity">
        <ChapterOpener
          eyebrow="Eight"
          title="Names, and the molecules behind them"
          standfirst="The most consequential error in this field is a naming error."
        />
        <Body>
          One trade name can denote two different molecules. A name can be used by a seller for a
          shorter, cheaper peptide than the one a trial studied. A fragment can be sold under the
          name of the parent protein it was cut from. In each case the evidence attached to the
          name travels to a molecule that never earned it, and no amount of care further down the
          page repairs that.
        </Body>
        <Body>
          The register therefore keeps identity as its own kind of record: what each source says
          the name denotes, with the analytical measurements first, because a measurement of a
          substance outranks a statement about it. Where sources use one name for two molecules,
          there are two records and no evidence crosses between them.
        </Body>
        <InTheRecords
          title="Where this bites in the register"
          lines={[
            `${String(identityRecords.length)} records hold more than one source-stated identity under a single name.`,
            'Two identity-separated pairs are maintained deliberately, and merging either would attach trial evidence to a molecule that was never in the trial.',
          ]}
        />
        <Callout title="What to ask of any peptide you are told about">
          <Text>
            What sequence and what mass? Measured by whom, or stated by whom? If the answer is a
            trade name, the question has not been answered.
          </Text>
        </Callout>
      </PublicationPage>

      {/* --- 9. Protocols and their basis ---------------------------------------- */}
      <PublicationPage publication={PUBLICATION} section="Protocols and evidence basis">
        <ChapterOpener
          eyebrow="Nine"
          title="Where regimens come from"
          standfirst="A schedule in circulation is not a schedule that was tested."
        />
        <Body>
          Every regimen in this index is recorded as one named source published it, with the kind
          of source stated on the entry. That distinction carries most of the weight: an
          approved-label regimen is what a regulator authorised for one product and one indication;
          a trial regimen is what a study administered to its population; a handbook regimen is
          what a clinician reports using, and usually cites no study for its amounts.
        </Body>
        <Body>
          Nothing is averaged. Where three sources describe three different schedules, the register
          shows three schedules with three attributions, because the average of three unsourced
          numbers is a fourth unsourced number with a false air of consensus.
        </Body>
        <IllustrationPlate illustration="protocol-comparison" />
        <Table
          head={['In the register', 'Count']}
          rows={[
            ['Source-reported regimens', String(protocolTotal)],
            ['Compounds whose regimens come only from handbooks', String(handbookOnly.length)],
            ['Recorded disagreements between sources', String(disagreements.length)],
          ]}
          widths={[3, 1]}
        />
        <EvidenceNote
          supports="The protocol records and their attributions, as loaded from the extraction packets."
          doesNotSettle="Whether any regimen is appropriate for anyone. No regimen here has been evaluated, and this index issues none of its own."
        />
      </PublicationPage>

      {/* --- 10. What is not known ------------------------------------------------ */}
      <PublicationPage publication={PUBLICATION} section="What is not known">
        <ChapterOpener
          eyebrow="Ten"
          title="Absence, recorded"
          standfirst="The largest finding in the register is how much of it is missing."
        />
        <Body>
          A reference that prints only what is known misrepresents a field by omission, and in this
          field the omission would be most of it. So absence is a record type here: what is not
          established, why the sources do not settle it, and what would.
        </Body>
        <IllustrationPlate illustration="known-unknown" />
        <Table
          head={['Across the register', 'Count']}
          rows={[
            ['Recorded gaps', String(gapTotal)],
            ['Gaps carrying a research question', String(questionTotal)],
            ['Unresolved disagreements between sources', String(unresolved.length)],
          ]}
          widths={[3, 1]}
        />
        <Body>
          The questions are deliberately questions for research rather than suggestions to try.
          Some of them wait on a study nobody has run; others wait on a paper that exists and this
          index has not obtained, which is a different problem with a different owner.
        </Body>
        <Callout title="Reading an absence correctly">
          <Text>
            &ldquo;Not established&rdquo; means this index looked and found nothing that supports
            the statement. It is not a finding that the statement is false, and it is not a reason
            to assume the opposite. It is an honest description of where the evidence stops.
          </Text>
        </Callout>
      </PublicationPage>

      {/* --- Back matter ----------------------------------------------------------- */}
      <PublicationPage publication={PUBLICATION} section="Method">
        <ChapterOpener
          eyebrow="Back matter"
          title="Method, sources and review state"
          standfirst="What this volume rests on."
        />
        <Body>
          The chapters on chemistry, characterisation and stability are written from claims
          extracted into this index from named textbooks and standards, each resolving to an exact
          location in the source. The chapters describing the register are computed from the
          records themselves on the date of generation. The chapters marked &ldquo;source
          needed&rdquo; are neither: they state a question this index cannot yet answer from a
          source it holds.
        </Body>
        <Body>
          No record in this edition has been through scientific review, and neither has this
          volume.
        </Body>
        <SourceNote
          items={[
            'SRC-006 — Synthetic Peptides: A User’s Guide, 2nd edition.',
            'SRC-007 — Advances in the Discovery and Development of Peptide Therapeutics.',
            'SRC-011 — Peptide Characterization and Application Protocols.',
            'SRC-017 — ICH Q7, Good Manufacturing Practice Guide for Active Pharmaceutical Ingredients.',
            'Register-derived passages are computed from the compound records; each record cites its own sources in full.',
          ]}
        />
        <CurrentVersionBlock
          url="thetidesindex.com"
          version={`Peptide Science & Applications · first edition · generated ${generatedAt}`}
          note="Records unreviewed. Chapters marked source needed are gaps in this index, not in the science."
        />
      </PublicationPage>
    </Document>
  );
}
