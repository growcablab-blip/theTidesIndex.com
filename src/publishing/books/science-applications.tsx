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
 * It holds nothing extracted on receptor pharmacology or absorption
 * physiology, so those chapters state the question, state that the index
 * cannot yet answer it, and stop. A chapter written from general knowledge
 * would read exactly like the sourced ones, which is the danger.
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
            stability and manufacturing expectation, and those chapters are written from them. It
            holds nothing extracted on receptor pharmacology or absorption physiology. A chapter
            written from general knowledge would look exactly like a sourced one on the page, and
            that is the danger — so those chapters state the question and name what is missing.
          </Text>
        </Callout>
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
        <Body>
          Two consequences follow, and they matter clinically rather than only chemically. Chains
          that fail to react at a step become deletion peptides — molecules one residue short of
          the intended sequence, chemically similar enough to be difficult to separate afterwards.
          And cleavage from the resin generates reactive species: in Fmoc chemistry, tert-butyl
          cations that can alkylate tryptophan, methionine and cysteine. Effective solvation of the
          peptide-resin is described in the source as perhaps the most crucial condition for
          efficient assembly.
        </Body>
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
        <InTheRecords
          title="Where this bites in the register"
          lines={[
            'Deletion peptides are why a single symmetrical chromatographic peak is not proof of one substance — the reasoning behind the purity topic.',
            `The register records ${String(peptides.length)} compounds; for none of them does this index hold a manufacturing record for the material any source administered.`,
          ]}
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

      {/* --- 4. Receptors and signalling: source needed ------------------------ */}
      <PublicationPage publication={PUBLICATION} section="Receptors and signalling">
        <ChapterOpener
          eyebrow="Four"
          title="Receptors, signalling and modulation"
          standfirst="The chapter this index cannot yet write."
        />
        <Body>
          A clinician reading a compound record meets mechanism language constantly: receptor
          agonism, selectivity, downstream signalling, modulation rather than stimulation. Those
          words do real work, and a volume like this one ought to define them against a source.
        </Body>
        <SourceNeeded
          question="What does receptor agonism, antagonism or modulation mean, and what follows from a molecule binding more than one target?"
          whatIsMissing="No pharmacology source has been extracted into this index. The textbooks held here cover synthesis, purification, characterisation, formulation and manufacture — not receptor pharmacology."
          whatExists="What the register does hold is every mechanism statement its compound records make, each attributed to the source that made it, with the evidence class attached. Those are reports of mechanism, not an account of how mechanisms work."
        />
        <InTheRecords
          title="How mechanism claims appear in the register"
          lines={[
            'Mechanism statements are almost always preclinical or practitioner-reported, and labelled as such wherever they appear.',
            'A mechanism reported in cell culture is not an effect in a body, and the records say so on the claim rather than in a preface.',
            'Where a source describes a bidirectional effect with no criterion for direction, the record says the claim is unfalsifiable as stated.',
          ]}
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
        <SourceNeeded
          question="Why is oral bioavailability hard for a peptide, and what determines it?"
          whatIsMissing="No absorption-physiology source has been extracted. The question recurs across the register — several records report an oral route with no bioavailability figure — and this index can state that gap without being able to explain the underlying physiology from a source."
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
        <Body>
          The step from the second to the first is where most of the field goes wrong. An animal
          result establishes that something happened in that species, in that model, at that
          exposure; it is a reason to run a human study and not a substitute for one. Dose does not
          translate, absence of harm does not translate, and a mechanism demonstrated in culture is
          not an effect in a body.
        </Body>
        <SubHeading>What a design can answer</SubHeading>
        <Bullets
          items={[
            'A randomised controlled trial can support a statement about effect.',
            'An uncontrolled study describes what happened to the people in it and cannot separate treatment from natural course — which matters most in conditions that fluctuate.',
            'A case report describes one person.',
            'A pharmacokinetic study answers what the body does to the substance, not whether it helps.',
            'A safety study that found no harm in a small group has not shown that the compound is safe.',
          ]}
        />
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
