import { Document, Text, View } from '@react-pdf/renderer';
import type { DocumentProps } from '@react-pdf/renderer';
import type { ReactElement } from 'react';
import { colour, contentWidth, sans, serif, type } from './theme';
import {
  Body,
  Bullets,
  Callout,
  ChapterOpener,
  Cover,
  CurrentVersionBlock,
  Lede,
  PublicationPage,
  SectionHeading,
  SubHeading,
  Table,
} from './primitives';
import { SeriesMark } from './figures';
import type { LibraryProtocol, ProtocolLibrary } from '@/server/public/protocol-library';
import type { PeptidePage } from '@/server/public/queries';

/**
 * PEPTIDE PROTOCOLS & CLINICAL QUICK REFERENCE.
 *
 * Generated from the protocol library, never written. Every regimen appears as
 * one named source published it, with the kind of evidence it rests on as the
 * first line of its entry.
 *
 * Version two exists because version one was a list. A clinician holding a
 * list of eighty-four regimens still has to do the work the book should have
 * done: find the four entries for this compound, work out which came from a
 * trial and which from a handbook, and notice that two of them disagree. So
 * each compound now opens with an overview, then a side-by-side comparison of
 * every regimen recorded for it, then the full entries, then what the sources
 * disagree about and what nobody has tested.
 *
 * The comparison table is the one piece that needed care. Putting regimens in
 * a row invites averaging them by eye, so the first column of every row is the
 * source and the second is the kind of source — you cannot read across without
 * reading who said it. There is no Tides row, no consensus row, and no column
 * for one.
 */

export interface ProtocolBookProps {
  readonly library: ProtocolLibrary;
  /** The compound records, for what surrounds a regimen: disagreements, gaps. */
  readonly records: readonly PeptidePage[];
  readonly generatedAt: string;
}

const PUBLICATION = 'Peptide Protocols & Clinical Quick Reference';
const RULE = { borderBottomWidth: 0.5, borderBottomColor: colour.ruleSoft } as const;

const CONTEXT: Record<string, { label: string; order: number; note: string }> = {
  approved_label_evidence: {
    label: 'Approved-label regimen',
    order: 0,
    note: 'Specified in labelling a regulator authorised, for that product and indication only.',
  },
  human_rct: {
    label: 'Human trial regimen',
    order: 1,
    note: 'The schedule a randomised trial tested in its population.',
  },
  human_controlled_nonrandomized: {
    label: 'Human controlled-study regimen',
    order: 2,
    note: 'The schedule a controlled, non-randomised human study used.',
  },
  human_prospective_uncontrolled: {
    label: 'Human study regimen',
    order: 3,
    note: 'The schedule a human study without a comparison group used.',
  },
  human_observational: {
    label: 'Human observational',
    order: 4,
    note: 'What was given to people outside a study, reported afterwards.',
  },
  human_pk_pd: {
    label: 'Human pharmacokinetic study',
    order: 5,
    note: 'A schedule used to measure what the body does to the substance, not whether it helps.',
  },
  animal_in_vivo: { label: 'Preclinical — animal', order: 6, note: 'An animal dosing schedule.' },
  practitioner_reference: {
    label: 'Practitioner handbook',
    order: 7,
    note: 'What a clinician or author reports using. No study is behind it unless stated.',
  },
  expert_commentary: {
    label: 'Expert commentary',
    order: 8,
    note: 'A named individual’s opinion, identified by speaker and date.',
  },
  experiential_anecdotal: {
    label: 'Experiential report',
    order: 9,
    note: 'Self-reported experience. Never used to support an efficacy or safety claim.',
  },
};

function contextOf(protocol: LibraryProtocol): { label: string; order: number } {
  return CONTEXT[protocol.evidenceTypeKey] ?? { label: protocol.evidenceTypeLabel, order: 10 };
}

const FIELDS: readonly [string, (p: LibraryProtocol) => string | null][] = [
  ['Population or model', (p) => p.populationModel],
  ['Route', (p) => p.routeName],
  ['Formulation', (p) => p.formulation],
  ['Amount as reported', (p) => p.amountReported],
  ['Frequency', (p) => p.frequencyText],
  ['Timing', (p) => p.timingText],
  ['Duration', (p) => p.durationText],
  ['Cycle / off period', (p) => p.cycleText],
  ['Titration', (p) => p.titrationText],
  ['Combinations', (p) => p.combinationsText],
  ['Monitoring', (p) => p.monitoringText],
  ['Cautions', (p) => p.contraindicationsText],
  ['Side effects reported', (p) => p.safetyNotes],
  ['Evidence basis', (p) => p.regulatoryContext],
];

/** Fields a clinician goes looking for, printed even when the source is silent. */
const ALWAYS = new Set(['Route', 'Amount as reported', 'Frequency', 'Duration', 'Monitoring']);

function sourceOf(protocol: LibraryProtocol): string {
  return protocol.sources.map((source) => source.sourceKey).join(', ') || 'Source not recorded';
}

function Entry({ protocol }: { protocol: LibraryProtocol }) {
  const context = contextOf(protocol);
  return (
    <View style={{ ...RULE, paddingVertical: 8 }} wrap={false}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text
          style={{
            fontFamily: sans,
            fontSize: type.micro,
            letterSpacing: 0.9,
            textTransform: 'uppercase',
            color: colour.deepTide,
          }}
        >
          {context.label}
        </Text>
        <Text style={{ fontFamily: sans, fontSize: type.micro, color: colour.slate }}>
          {sourceOf(protocol)}
        </Text>
      </View>
      <Text
        style={{
          fontFamily: serif,
          fontSize: type.body,
          color: colour.ink,
          marginTop: 3,
          maxWidth: contentWidth * 0.86,
        }}
      >
        {protocol.objectiveContext}
      </Text>
      <View style={{ marginTop: 4 }}>
        {FIELDS.filter(([label, read]) => read(protocol) !== null || ALWAYS.has(label)).map(
          ([label, read]) => {
            const value = read(protocol);
            return (
              <View key={label} style={{ flexDirection: 'row', marginTop: 1.5 }}>
                <Text
                  style={{
                    width: 104,
                    fontFamily: sans,
                    fontSize: type.micro,
                    letterSpacing: 0.6,
                    textTransform: 'uppercase',
                    color: colour.slate,
                    paddingTop: 1,
                  }}
                >
                  {label}
                </Text>
                <Text
                  style={{
                    flex: 1,
                    fontFamily: serif,
                    fontSize: type.small,
                    color: value === null ? colour.slate : colour.inkSoft,
                    lineHeight: 1.4,
                  }}
                >
                  {value ?? 'Not stated by this source'}
                </Text>
              </View>
            );
          },
        )}
      </View>
      <Text
        style={{
          fontFamily: sans,
          fontSize: type.micro,
          color: colour.slate,
          marginTop: 4,
        }}
      >
        Exact source:{' '}
        {protocol.sources.map((source) => `${source.sourceKey} — ${source.sourceTitle}`).join('; ')}
      </Text>
    </View>
  );
}

function CompoundSection({
  name,
  protocols,
  record,
}: {
  name: string;
  protocols: readonly LibraryProtocol[];
  record: PeptidePage | undefined;
}) {
  const sources = new Set(protocols.flatMap((p) => p.sources.map((s) => s.sourceKey)));
  const routes = [...new Set(protocols.map((p) => p.routeName ?? 'Not stated'))];
  const kinds = [...new Set(protocols.map((p) => contextOf(p).label))];
  const fromStudy = protocols.filter((p) => contextOf(p).order <= 5).length;
  const questions =
    record?.gaps.filter(
      (gap) =>
        gap.researchQuestion !== null &&
        (gap.opportunityType === 'protocol_validation' ||
          gap.opportunityType === 'dose_response' ||
          gap.opportunityType === 'route_comparison'),
    ) ?? [];
  const doseDisagreements =
    record?.disagreements.filter((d) =>
      /dose|amount|frequency|schedule|regimen/i.test(d.topic),
    ) ?? [];

  return (
    <>
      {/* --- Overview and comparison ------------------------------------- */}
      <PublicationPage publication={PUBLICATION} section={name}>
        <ChapterOpener
          eyebrow="Compound"
          title={name}
          standfirst={`${String(protocols.length)} recorded regimens from ${String(sources.size)} sources.`}
        />

        {record?.shortDescription === undefined || record.shortDescription === null ? null : (
          <Lede>{record.shortDescription}</Lede>
        )}

        <SectionHeading>Before reading the regimens</SectionHeading>
        <Table
          head={['', '']}
          rows={[
            ['Regimens recorded', String(protocols.length)],
            [
              'From a label or a human study',
              fromStudy === 0
                ? 'None — every regimen here comes from a handbook, commentary or report'
                : `${String(fromStudy)} of ${String(protocols.length)}`,
            ],
            ['Kinds of source', kinds.join('; ')],
            ['Routes reported', routes.join(', ')],
            [
              'Recorded as unsettled on this compound',
              record === undefined ? 'Record not loaded' : `${String(record.gaps.length)} points`,
            ],
          ]}
          widths={[1.2, 2.2]}
        />

        <SectionHeading>Side by side</SectionHeading>
        <Body>
          Every regimen recorded for this compound, in one table. Read across a row, never down a
          column: the rows are different sources making different statements, and the distance
          between them is the finding.
        </Body>
        <Table
          head={['Source', 'Kind of source', 'Route', 'Amount as reported', 'Frequency', 'Duration']}
          rows={protocols.map((protocol) => [
            sourceOf(protocol),
            contextOf(protocol).label,
            protocol.routeName ?? 'Not stated',
            protocol.amountReported ?? 'Not stated',
            protocol.frequencyText ?? 'Not stated',
            protocol.durationText ?? 'Not stated',
          ])}
          widths={[0.9, 1.2, 0.9, 1.1, 1.3, 1]}
        />
        <Callout title="No row here is recommended">
          <Text>
            These regimens are not alternatives to choose between. They are records of what
            different sources published, held at different levels of evidence, and no line of this
            table has been evaluated by anyone.
          </Text>
        </Callout>
      </PublicationPage>

      {/* --- Full entries -------------------------------------------------- */}
      <PublicationPage publication={PUBLICATION} section={name}>
        <SectionHeading>Every regimen in full</SectionHeading>
        {protocols.map((protocol) => (
          <Entry key={protocol.id} protocol={protocol} />
        ))}

        {doseDisagreements.length === 0 ? null : (
          <>
            <SectionHeading>Where the sources disagree</SectionHeading>
            {doseDisagreements.map((disagreement) => (
              <View key={disagreement.id} style={{ marginBottom: 8 }} wrap={false}>
                <SubHeading>{disagreement.topic}</SubHeading>
                <Text
                  style={{
                    fontFamily: sans,
                    fontSize: type.micro,
                    letterSpacing: 0.8,
                    textTransform: 'uppercase',
                    color:
                      disagreement.resolution === 'unresolved' ? colour.caution : colour.deepTide,
                  }}
                >
                  {disagreement.resolution.replaceAll('_', ' ')}
                </Text>
                {disagreement.resolutionBasis === null ? null : (
                  <Body>{disagreement.resolutionBasis}</Body>
                )}
                <Bullets
                  items={disagreement.positions.map(
                    (position) =>
                      `${position.citation.sourceKey}: ${position.positionText ?? 'position shown in the full record'}`,
                  )}
                />
              </View>
            ))}
          </>
        )}

        {questions.length === 0 ? null : (
          <Callout title="What nobody has tested">
            <Text>
              Derived from what this index records as unsettled about the schedules above. Each
              describes a study that would settle it; none is a suggestion to try anything.
            </Text>
            <Bullets items={questions.map((gap) => gap.researchQuestion ?? '')} />
          </Callout>
        )}
      </PublicationPage>
    </>
  );
}

export function ProtocolBook({
  library,
  records,
  generatedAt,
}: ProtocolBookProps): ReactElement<DocumentProps> {
  const byCompound = new Map<string, LibraryProtocol[]>();
  for (const protocol of library.protocols) {
    const list = byCompound.get(protocol.peptideSlug) ?? [];
    list.push(protocol);
    byCompound.set(protocol.peptideSlug, list);
  }
  for (const list of byCompound.values()) {
    list.sort(
      (a, b) =>
        contextOf(a).order - contextOf(b).order ||
        (a.sources[0]?.sourceKey ?? '').localeCompare(b.sources[0]?.sourceKey ?? ''),
    );
  }
  const compounds = [...byCompound.entries()].sort((a, b) =>
    (a[1][0]?.peptideName ?? '').localeCompare(b[1][0]?.peptideName ?? ''),
  );
  const recordFor = new Map(records.map((record) => [record.slug, record]));
  const handbookOnly = compounds.filter(([, list]) =>
    list.every((protocol) => contextOf(protocol).order >= 6),
  ).length;

  return (
    <Document
      title={PUBLICATION}
      author="The Tides Index"
      subject="Source-reported regimens, attributed. No recommendations and no averaged protocol."
      creator="The Tides Index"
    >
      <Cover
        imprint="The Tides Index"
        series="Reference series"
        title="Peptide Protocols"
        subtitle="& Clinical Quick Reference"
        descriptor="Independent peptide science & clinical reference"
        editionLine={`Second version · generated ${generatedAt}`}
        statusLine={`${String(library.totalCount)} regimens, each as one named source published it. Nothing here is recommended, averaged, or reviewed.`}
        mark={<SeriesMark width={300} volume={4} />}
      />

      {/* --- How to read this book ------------------------------------------ */}
      <PublicationPage publication={PUBLICATION} section="How to read this book">
        <ChapterOpener
          eyebrow="Front matter"
          title="How to read this book"
          standfirst="Every entry is a record of what a source said, and where."
        />
        <Lede>
          {library.totalCount} regimens for {library.compounds.length} compounds, from{' '}
          {library.facets.sources.length} sources. Each is reproduced as one named source published
          it, with the kind of source on the first line of the entry.
        </Lede>

        <SectionHeading>What an entry is, and is not</SectionHeading>
        <Bullets
          items={[
            'It is a record that a named source published a schedule, and where to find it.',
            'It is not a recommendation, and not a statement that the schedule works or is safe.',
            'It is not combined with any other entry. Where three sources differ, there are three entries.',
            'There is no Tides regimen anywhere in this book, and no column for one.',
          ]}
        />

        <SectionHeading>Why there is no averaged protocol</SectionHeading>
        <Body>
          The average of three unsourced numbers is a fourth unsourced number with a false air of
          consensus. Most of the regimens here come from practitioner handbooks that cite no study
          for their amounts; averaging them would produce a figure no source stands behind and no
          reader could check.
        </Body>

        <Callout title="Before the first entry">
          <Text>
            {handbookOnly} of {compounds.length} compounds in this book have regimens that come
            only from handbooks, commentary or reports — with no trial and no approved label behind
            any of them. That is the single most useful thing to know before reading further.
          </Text>
        </Callout>
      </PublicationPage>

      {/* --- Evidence context ------------------------------------------------ */}
      <PublicationPage publication={PUBLICATION} section="Kinds of source">
        <ChapterOpener
          eyebrow="Front matter"
          title="Kinds of source"
          standfirst="The first line of every entry, and what it means."
        />
        <Table
          head={['On the entry', 'What stands behind it']}
          rows={Object.values(CONTEXT)
            .sort((a, b) => a.order - b.order)
            .filter((context) => context.note !== '')
            .map((context) => [context.label, context.note])}
          widths={[1.1, 2.4]}
        />
        <Body>
          The order above is the order entries appear within a compound: labelling first, then
          trials, then what practitioners report. That ordering is not a ranking of the regimens —
          it puts what a regulator authorised or a trial tested before what somebody reports using,
          so a reader meets the stronger provenance first and can see, by the label, which is
          which.
        </Body>
        <Callout title="Kind of source is not quality of regimen">
          <Text>
            A trial regimen is better documented than a handbook regimen. That says nothing about
            whether either suits any particular person, which is a clinical judgement this book
            does not make and cannot support.
          </Text>
        </Callout>
      </PublicationPage>

      {/* --- Contents ---------------------------------------------------------- */}
      <PublicationPage publication={PUBLICATION} section="Contents">
        <ChapterOpener eyebrow="Contents" title={`${String(compounds.length)} compounds`} />
        {compounds.map(([slug, list]) => (
          <View
            key={slug}
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              borderBottomWidth: 0.5,
              borderBottomColor: colour.ruleSoft,
              paddingVertical: 7,
            }}
          >
            <Text style={{ fontFamily: serif, fontSize: type.body, color: colour.ink }}>
              {list[0]?.peptideName ?? slug}
            </Text>
            <Text style={{ fontFamily: sans, fontSize: type.micro, color: colour.slate }}>
              {list.length} regimens ·{' '}
              {[...new Set(list.map((protocol) => contextOf(protocol).label))].join(', ')}
            </Text>
          </View>
        ))}
      </PublicationPage>

      {/* --- The compounds ------------------------------------------------------ */}
      {compounds.map(([slug, list]) => (
        <CompoundSection
          key={slug}
          name={list[0]?.peptideName ?? slug}
          protocols={list}
          record={recordFor.get(slug)}
        />
      ))}

      {/* --- Back matter --------------------------------------------------------- */}
      <PublicationPage publication={PUBLICATION} section="Method">
        <ChapterOpener
          eyebrow="Back matter"
          title="Method and review state"
          standfirst="Where every regimen in this book came from."
        />
        <Body>
          Each regimen was extracted from a named source at an exact location, and carries that
          attribution here. Nothing has been combined, converted or recalculated: an amount appears
          in the words the source used.
        </Body>
        <Body>
          No regimen in this book has been through scientific or clinical review, and no record
          behind it has either. This is a working artefact for checking what a source reported —
          not a clinical reference, and not a protocol library to select from.
        </Body>
        <CurrentVersionBlock
          url="thetidesindex.com"
          version={`${PUBLICATION} · second version · generated ${generatedAt}`}
          note="Regimens are source-reported and unreviewed. This index issues no dose."
        />
      </PublicationPage>
    </Document>
  );
}
