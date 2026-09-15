import { Document, Line, Svg, Text, View } from '@react-pdf/renderer';
import type { DocumentProps } from '@react-pdf/renderer';
import type { ReactElement, ReactNode } from 'react';
import { colour, contentWidth, leading, RHYTHM, sans, serif, type } from './theme';
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
import { amountAsReported } from '@/domain/protocols/amount';
import { absenceNote, isNotReported, type FieldState } from '@/domain/protocols/field-comparison';
import {
  compareProtocolFields,
  groupByState,
  type ProtocolFieldComparison,
} from '@/domain/protocols/protocol-comparison';
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
 * each compound now opens with an overview, then a source-to-source comparison
 * of every field, then the full entries, then what the sources disagree about
 * and what nobody has tested.
 *
 * The comparison follows the owner's closed decision on semantics, through the
 * same classifier as the website (`@/domain/protocols/field-comparison`):
 * AGREEMENT where two or more regimens report a field alike, DIFFERENCE where
 * two or more report it differently, NOT REPORTED where a source does not
 * specify it. Silence is never counted as a difference. A field only one
 * regimen reports is marked as such — it is neither.
 *
 * Every wording in the grid carries the regimens and sources that report it.
 * There is no Tides row, no consensus row, no average and no range.
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
  ['Amount as reported', (p) => amountAsReported(p)],
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

/** "R3", the regimen's number within its compound. An index, never a rank. */
const regimenRef = (index: number) => `R${String(index + 1)}`;

/* ==========================================================================
   Comparison marks — the same family of bars as the website
   ========================================================================== */

const STATE_STYLE: Readonly<
  Record<FieldState | 'not_reported', { word: string; ink: string; bar: string; bg: string | undefined }>
> = {
  difference: { word: 'Difference', ink: colour.caution, bar: colour.caution, bg: colour.cautionBg },
  agreement: { word: 'Agreement', ink: colour.tideTeal, bar: colour.tideTeal, bg: undefined },
  single: { word: 'One source only', ink: colour.inkSoft, bar: colour.rule, bg: undefined },
  none: { word: 'Not reported', ink: colour.slate, bar: colour.ruleSoft, bg: undefined },
  not_reported: { word: 'Not reported', ink: colour.slate, bar: colour.ruleSoft, bg: undefined },
};

/**
 * Solid bar: a source reports the field. Dashed bar: silence.
 * Equals for agreement, struck equals for difference, one solid over one dashed
 * for a field one regimen reports, two dashed for not reported.
 */
function StateMark({ state, size = 9 }: { state: FieldState | 'not_reported'; size?: number }) {
  const ink = STATE_STYLE[state].ink;
  const solid = { stroke: ink, strokeWidth: 1.7, strokeLinecap: 'round' as const };
  const dashed = { stroke: ink, strokeWidth: 1.2, strokeDasharray: '1.6 1.6' };
  const top = state === 'none' || state === 'not_reported' ? dashed : solid;
  const bottom = state === 'agreement' || state === 'difference' ? solid : dashed;
  return (
    <Svg width={size} height={size} viewBox="0 0 12 12" style={{ marginRight: 4, marginTop: 0.5 }}>
      <Line x1={1.5} y1={4.2} x2={10.5} y2={4.2} {...top} />
      <Line x1={1.5} y1={7.8} x2={10.5} y2={7.8} {...bottom} />
      {state === 'difference' ? <Line x1={8.6} y1={1} x2={3.4} y2={11} {...solid} /> : null}
    </Svg>
  );
}

function StateWord({ state }: { state: FieldState | 'not_reported' }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <StateMark state={state} />
      <Text
        style={{
          fontFamily: sans,
          fontSize: type.micro,
          fontWeight: state === 'difference' ? 600 : 400,
          letterSpacing: 0.7,
          textTransform: 'uppercase',
          color: STATE_STYLE[state].ink,
        }}
      >
        {STATE_STYLE[state].word}
      </Text>
    </View>
  );
}

function LetterTag({ letter }: { letter: string }) {
  return (
    <View style={{ width: 14, marginRight: 4, marginTop: 0.5 }}>
      <Text
        style={{
          fontFamily: sans,
          fontSize: 6.8,
          fontWeight: 600,
          lineHeight: 1,
          color: colour.caution,
          textAlign: 'center',
          borderWidth: 0.75,
          borderColor: colour.caution,
          backgroundColor: colour.white,
          borderRadius: 1.5,
          paddingTop: 2,
          paddingBottom: 1.5,
        }}
      >
        {letter}
      </Text>
    </View>
  );
}

/** Headings that must never be left alone at the foot of a page. */
function KeptHeading({ children, ahead = 90 }: { children: ReactNode; ahead?: number }) {
  return (
    <View minPresenceAhead={ahead} wrap={false}>
      <SectionHeading>{children}</SectionHeading>
    </View>
  );
}

/* ==========================================================================
   The regimen index
   ========================================================================== */

// The state column fits the longest state word ("One source only") beside its mark.
const COL = { field: 72, state: 102, by: 104 } as const;

const headCell = {
  fontFamily: sans,
  fontSize: type.micro,
  letterSpacing: 0.9,
  textTransform: 'uppercase',
  color: colour.deepTide,
} as const;

function RegimenIndex({ protocols }: { protocols: readonly LibraryProtocol[] }) {
  return (
    <View style={{ marginTop: 6, marginBottom: 6 }}>
      <View
        fixed
        style={{
          flexDirection: 'row',
          borderBottomWidth: 1,
          borderBottomColor: colour.ink,
          paddingBottom: 4,
        }}
      >
        <Text style={{ ...headCell, width: 28 }}>No.</Text>
        <Text style={{ ...headCell, width: 62 }}>Source</Text>
        <Text style={{ ...headCell, flex: 1, paddingRight: 8 }}>Title</Text>
        <Text style={{ ...headCell, width: 120 }}>Kind of source</Text>
      </View>
      {protocols.map((protocol, index) => (
        <View
          key={protocol.id}
          wrap={false}
          style={{ ...RULE, flexDirection: 'row', paddingVertical: 4 }}
        >
          <Text style={{ width: 28, fontFamily: sans, fontSize: type.small, color: colour.deepTide }}>
            {regimenRef(index)}
          </Text>
          <Text style={{ width: 62, fontFamily: sans, fontSize: type.caption, color: colour.ink }}>
            {sourceOf(protocol)}
          </Text>
          <Text
            style={{
              flex: 1,
              paddingRight: 8,
              fontFamily: serif,
              fontSize: type.caption,
              lineHeight: leading.tight,
              color: colour.inkSoft,
            }}
          >
            {protocol.sources.map((s) => s.sourceTitle).join('; ') || 'Title not recorded'}
          </Text>
          <Text style={{ width: 120, fontFamily: sans, fontSize: type.caption, color: colour.slate }}>
            {contextOf(protocol).label}
          </Text>
        </View>
      ))}
    </View>
  );
}

/* ==========================================================================
   The field-by-field comparison grid
   ========================================================================== */

function attribution(columns: readonly number[], protocols: readonly LibraryProtocol[]): string {
  return columns
    .map((column) => {
      const protocol = protocols[column];
      return `${regimenRef(column)} ${protocol === undefined ? '' : sourceOf(protocol)}`.trim();
    })
    .join(', ');
}

function stateDetail(c: ProtocolFieldComparison): string {
  const of = `${String(c.reportedCount)} of ${String(c.total)}`;
  switch (c.state) {
    case 'difference':
      return `${String(c.wordings.length)} wordings · ${of} report${c.acrossSources ? '' : ' · within one source'}`;
    case 'agreement':
      return `${of} report alike${c.acrossSources ? '' : ' · within one source'}`;
    case 'single':
      return `${of} reports · nothing to compare`;
    default:
      return `0 of ${String(c.total)} report`;
  }
}

function GridRow({
  children,
  state,
  first,
  last,
  ahead,
}: {
  children: ReactNode;
  state: FieldState;
  first: boolean;
  last: boolean;
  ahead?: number;
}) {
  const style = STATE_STYLE[state];
  return (
    <View
      wrap={false}
      {...(ahead === undefined ? {} : { minPresenceAhead: ahead })}
      style={{
        flexDirection: 'row',
        borderLeftWidth: state === 'difference' ? 2.5 : 1.5,
        borderLeftColor: style.bar,
        ...(style.bg === undefined ? {} : { backgroundColor: style.bg }),
        paddingLeft: 5,
        paddingTop: first ? 5 : 2.5,
        paddingBottom: last ? 5 : 2.5,
        ...(last ? { borderBottomWidth: 0.5, borderBottomColor: colour.rule } : {}),
      }}
    >
      {children}
    </View>
  );
}

function FieldCell({ label, first }: { label: string; first: boolean }) {
  return (
    <Text
      style={{
        width: COL.field,
        paddingRight: 6,
        fontFamily: sans,
        fontSize: first ? type.micro : 6.2,
        letterSpacing: first ? 0.6 : 0.3,
        textTransform: first ? 'uppercase' : 'none',
        lineHeight: leading.tight,
        color: first ? colour.ink : colour.slate,
        fontWeight: first ? 500 : 400,
      }}
    >
      {first ? label : `${label}, continued`}
    </Text>
  );
}

function FieldGroup({
  comparison,
  protocols,
}: {
  comparison: ProtocolFieldComparison;
  protocols: readonly LibraryProtocol[];
}) {
  const { state, wordings, notReportedColumns, cells, field } = comparison;
  const notes = [
    ...new Set(
      notReportedColumns
        .map((column) => cells[column]?.note ?? null)
        .filter((note): note is string => note !== null),
    ),
  ];
  const rowCount = wordings.length + (notReportedColumns.length > 0 ? 1 : 0);

  return (
    <View>
      {wordings.map((wording, index) => {
        const first = index === 0;
        const last = index === rowCount - 1;
        return (
          <GridRow
            key={wording.letter}
            state={state}
            first={first}
            last={last}
            {...(first && rowCount > 1 ? { ahead: 24 } : {})}
          >
            <FieldCell label={field.label} first={first} />
            <View style={{ width: COL.state, paddingRight: 6 }}>
              {first ? (
                <>
                  <StateWord state={state} />
                  <Text
                    style={{
                      fontFamily: sans,
                      fontSize: 6.2,
                      color: colour.slate,
                      marginTop: 1.5,
                      lineHeight: leading.tight,
                    }}
                  >
                    {stateDetail(comparison)}
                  </Text>
                </>
              ) : null}
            </View>
            <View style={{ flex: 1, flexDirection: 'row', paddingRight: 8 }}>
              {state === 'difference' ? <LetterTag letter={wording.letter} /> : null}
              <Text
                style={{
                  flex: 1,
                  fontFamily: serif,
                  fontSize: type.small,
                  lineHeight: leading.tight,
                  color: state === 'difference' ? colour.ink : colour.inkSoft,
                }}
              >
                {wording.value}
              </Text>
            </View>
            <Text
              style={{
                width: COL.by,
                fontFamily: sans,
                fontSize: type.micro,
                lineHeight: leading.tight,
                color: colour.inkSoft,
              }}
            >
              {attribution(wording.columns, protocols)}
            </Text>
          </GridRow>
        );
      })}

      {notReportedColumns.length === 0 ? null : (
        <GridRow state={state} first={false} last>
          <FieldCell label={field.label} first={false} />
          <View style={{ width: COL.state, paddingRight: 6 }}>
            <StateWord state="not_reported" />
          </View>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text
              style={{
                fontFamily: serif,
                fontSize: type.small,
                fontStyle: 'italic',
                lineHeight: leading.tight,
                color: colour.slate,
              }}
            >
              — Not specified by {notReportedColumns.length === 1 ? 'this source' : 'these sources'}
            </Text>
            {notes.map((note) => (
              <Text
                key={note}
                style={{
                  fontFamily: sans,
                  fontSize: 6.4,
                  lineHeight: leading.tight,
                  color: colour.slate,
                  marginTop: 1.5,
                }}
              >
                Record note: {note}
              </Text>
            ))}
          </View>
          <Text
            style={{
              width: COL.by,
              fontFamily: sans,
              fontSize: type.micro,
              lineHeight: leading.tight,
              color: colour.slate,
            }}
          >
            {attribution(notReportedColumns, protocols)}
          </Text>
        </GridRow>
      )}
    </View>
  );
}

function ComparisonGrid({
  comparisons,
  protocols,
}: {
  comparisons: readonly ProtocolFieldComparison[];
  protocols: readonly LibraryProtocol[];
}) {
  const shown = comparisons.filter((c) => c.state !== 'none');
  const none = comparisons.filter((c) => c.state === 'none');
  return (
    <View style={{ marginTop: 8, marginBottom: 6 }}>
      {/* Repeats at the top of every page the grid runs onto. */}
      <View
        fixed
        style={{
          flexDirection: 'row',
          borderBottomWidth: 1,
          borderBottomColor: colour.ink,
          paddingBottom: 4,
          paddingLeft: 6.5,
          backgroundColor: colour.warmWhite,
        }}
      >
        <Text style={{ ...headCell, width: COL.field }}>Field</Text>
        <Text style={{ ...headCell, width: COL.state }}>State</Text>
        <Text style={{ ...headCell, flex: 1 }}>What is reported, as worded</Text>
        <Text style={{ ...headCell, width: COL.by }}>Reported by</Text>
      </View>
      {shown.map((comparison) => (
        <FieldGroup key={comparison.field.key} comparison={comparison} protocols={protocols} />
      ))}
      {none.length === 0 ? null : (
        <GridRow state="none" first last>
          <Text
            style={{
              width: COL.field,
              paddingRight: 6,
              fontFamily: sans,
              fontSize: type.micro,
              letterSpacing: 0.6,
              textTransform: 'uppercase',
              lineHeight: leading.tight,
              color: colour.slate,
            }}
          >
            {none.map((c) => c.field.label).join(' · ')}
          </Text>
          <View style={{ width: COL.state, paddingRight: 6 }}>
            <StateWord state="none" />
          </View>
          <Text
            style={{
              flex: 1,
              paddingRight: 8,
              fontFamily: serif,
              fontSize: type.small,
              fontStyle: 'italic',
              lineHeight: leading.tight,
              color: colour.slate,
            }}
          >
            — No regimen here specifies {none.length === 1 ? 'this field' : 'these fields'}
          </Text>
          <Text style={{ width: COL.by, fontFamily: sans, fontSize: type.micro, color: colour.slate }}>
            All {protocols.length}
          </Text>
        </GridRow>
      )}
    </View>
  );
}

/** The four states at a glance, above the grid. */
function StateSummary({ comparisons }: { comparisons: readonly ProtocolFieldComparison[] }) {
  const byState = groupByState(comparisons);
  const items: readonly [FieldState, string, readonly ProtocolFieldComparison[]][] = [
    ['difference', 'Difference', byState.difference],
    ['agreement', 'Agreement', byState.agreement],
    ['single', 'Reported by one source only', byState.single],
    ['none', 'Not reported by any', byState.none],
  ];
  return (
    <View
      wrap={false}
      style={{
        borderWidth: 0.75,
        borderColor: colour.rule,
        backgroundColor: colour.white,
        borderRadius: 3,
        paddingVertical: 7,
        paddingHorizontal: 10,
        marginTop: 4,
      }}
    >
      {items.map(([state, title, list]) => (
        <View key={state} style={{ flexDirection: 'row', marginVertical: 1.5 }}>
          <View style={{ width: 188, flexDirection: 'row', alignItems: 'center', paddingRight: 8 }}>
            <StateMark state={state} />
            <Text
              style={{
                fontFamily: sans,
                fontSize: type.micro,
                letterSpacing: 0.6,
                textTransform: 'uppercase',
                fontWeight: state === 'difference' ? 600 : 400,
                color: STATE_STYLE[state].ink,
              }}
            >
              {title} ({list.length})
            </Text>
          </View>
          <Text
            style={{
              flex: 1,
              fontFamily: serif,
              fontSize: type.caption,
              lineHeight: leading.tight,
              color: list.length === 0 ? colour.slate : colour.inkSoft,
            }}
          >
            {list.length === 0 ? '—' : list.map((c) => c.field.label).join(' · ')}
          </Text>
        </View>
      ))}
    </View>
  );
}

/* ==========================================================================
   Entries
   ========================================================================== */

function Entry({ protocol, index }: { protocol: LibraryProtocol; index: number }) {
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
          {regimenRef(index)} · {context.label}
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
            const silent = isNotReported(value);
            const note = absenceNote(value);
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
                    color: silent ? colour.slate : colour.inkSoft,
                    lineHeight: 1.4,
                    ...(silent ? { fontStyle: 'italic' as const } : {}),
                  }}
                >
                  {silent ? `— Not reported${note === null ? '' : ` (record note: ${note})`}` : value}
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

function NotRecommended() {
  return (
    <Callout title="No wording here is recommended">
      <Text>
        These regimens are not alternatives to choose between. They are records of what different
        sources published, held at different levels of evidence. Nothing is averaged, no range is
        drawn across them, there is no Tides dose, and no line has been evaluated by anyone.
      </Text>
    </Callout>
  );
}

/* ==========================================================================
   A compound
   ========================================================================== */

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
  const reportedRoutes = [
    ...new Set(protocols.map((p) => p.routeName).filter((r): r is string => !isNotReported(r))),
  ];
  const silentRoutes = protocols.filter((p) => isNotReported(p.routeName)).length;
  const kinds = [...new Set(protocols.map((p) => contextOf(p).label))];
  const fromStudy = protocols.filter((p) => contextOf(p).order <= 5).length;
  const comparisons = protocols.length > 1 ? compareProtocolFields(protocols) : [];
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
          standfirst={`${String(protocols.length)} recorded regimen${protocols.length === 1 ? '' : 's'} from ${String(sources.size)} source${sources.size === 1 ? '' : 's'}.`}
        />

        {record?.shortDescription === undefined || record.shortDescription === null ? null : (
          <Lede>{record.shortDescription}</Lede>
        )}

        <KeptHeading>Before reading the regimens</KeptHeading>
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
            [
              'Routes reported',
              [
                reportedRoutes.length === 0 ? 'None reported' : reportedRoutes.join(', '),
                silentRoutes === 0
                  ? ''
                  : `not reported by ${String(silentRoutes)} of ${String(protocols.length)}`,
              ]
                .filter((part) => part !== '')
                .join('; '),
            ],
            [
              'Recorded as unsettled on this compound',
              record === undefined ? 'Record not loaded' : `${String(record.gaps.length)} points`,
            ],
          ]}
          widths={[1.2, 2.2]}
        />

        <KeptHeading>The regimens</KeptHeading>
        <RegimenIndex protocols={protocols} />

        <KeptHeading ahead={140}>Source to source, field by field</KeptHeading>
        {protocols.length < 2 ? (
          <Body>
            One regimen on file, so there is nothing to set it beside: no field here can agree or
            differ. It is printed in full overleaf, with every field it does not specify marked as
            not reported.
          </Body>
        ) : (
          <>
            <Body>
              Each field, read across every regimen above. Where regimens report a field
              differently, each wording is lettered and printed with the regimens that use it. A
              regimen that does not specify a field is listed as not reported — silence is never
              counted as a difference, and nothing is filled in from another regimen.
            </Body>
            <StateSummary comparisons={comparisons} />
            {/* Before the grid, so it can never be stranded on a page after it. */}
            <Text
              style={{
                fontFamily: sans,
                fontSize: type.micro,
                lineHeight: leading.tight,
                color: colour.slate,
                marginTop: 5,
              }}
            >
              Wordings match when they are identical ignoring letter case, spacing, punctuation and
              the space between a number and its unit. Nothing is converted or interpreted: “mcg”
              and “µg”, or “twice daily” and “every 12 hours”, are different wordings.
            </Text>
            {/*
              Above the grid rather than after it: a grid often ends near the foot
              of a page, and the callout then stood alone on a page of its own.
            */}
            <NotRecommended />
            <ComparisonGrid comparisons={comparisons} protocols={protocols} />
          </>
        )}
        {protocols.length < 2 ? <NotRecommended /> : null}
      </PublicationPage>

      {/* --- Full entries -------------------------------------------------- */}
      <PublicationPage publication={PUBLICATION} section={name}>
        <KeptHeading>Every regimen in full</KeptHeading>
        {protocols.map((protocol, index) => (
          <Entry key={protocol.id} protocol={protocol} index={index} />
        ))}

        {doseDisagreements.length === 0 ? null : (
          <>
            {doseDisagreements.map((disagreement, index) => (
              <View key={disagreement.id} style={{ marginBottom: 8 }} wrap={false}>
                {/* The heading travels with the first disagreement, so it is never orphaned. */}
                {index === 0 ? <SectionHeading>Where the sources disagree</SectionHeading> : null}
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
          // Drawn locally: the shared Callout wraps its children in one Text, which
          // flattened the bullet list into the sentence before it.
          <View
            wrap={false}
            style={{
              borderLeftWidth: 2,
              borderLeftColor: colour.tideTeal,
              backgroundColor: colour.mist,
              paddingVertical: 9,
              paddingHorizontal: 13,
              marginVertical: 9,
            }}
          >
            <Text
              style={{
                fontFamily: sans,
                fontSize: type.micro,
                letterSpacing: 1.2,
                textTransform: 'uppercase',
                color: colour.deepTide,
                marginBottom: 5,
              }}
            >
              What nobody has tested
            </Text>
            <Text
              style={{ fontFamily: serif, fontSize: type.small, lineHeight: leading.body, marginBottom: 5 }}
            >
              Derived from what this index records as unsettled about the schedules above. Each
              describes a study that would settle it; none is a suggestion to try anything.
            </Text>
            <Bullets items={questions.map((gap) => gap.researchQuestion ?? '')} />
          </View>
        )}
      </PublicationPage>
    </>
  );
}

/* ==========================================================================
   Front matter: reading the comparison
   ========================================================================== */

const STATE_EXPLAINED: readonly [FieldState | 'not_reported', string, string][] = [
  [
    'difference',
    'Difference',
    'Two or more regimens report the field, and what they report differs. Printed on a tinted band with a heavier rule; each distinct wording carries a letter (A, B, …) and the regimens that use it. Letters group wordings; they carry no rank.',
  ],
  [
    'agreement',
    'Agreement',
    'Two or more regimens report the field alike. Agreement between sources is not evidence that the value is right, and it is not a recommendation.',
  ],
  [
    'single',
    'One source only',
    'Exactly one regimen reports the field. That is neither agreement nor difference: there is nothing to compare it with.',
  ],
  [
    'not_reported',
    'Not reported',
    'The source does not specify the field. Listed, muted, under every field it applies to — and never counted as a difference or as agreement.',
  ],
];

function StateKey() {
  return (
    <View style={{ marginTop: 4, marginBottom: 8 }}>
      {STATE_EXPLAINED.map(([state, , body]) => (
        <View
          key={state}
          wrap={false}
          style={{
            flexDirection: 'row',
            borderLeftWidth: state === 'difference' ? 2.5 : 1.5,
            borderLeftColor: STATE_STYLE[state].bar,
            ...(state === 'difference' ? { backgroundColor: colour.cautionBg } : {}),
            paddingVertical: 6,
            paddingLeft: 6,
            ...RULE,
          }}
        >
          <View style={{ width: COL.state + 18 }}>
            <StateWord state={state} />
          </View>
          <Text
            style={{
              flex: 1,
              fontFamily: serif,
              fontSize: type.small,
              lineHeight: leading.tight,
              color: colour.inkSoft,
              paddingRight: 6,
            }}
          >
            {body}
          </Text>
        </View>
      ))}
    </View>
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
        series="Reference series · Volume five"
        title="Peptide Protocols"
        subtitle="& Clinical Quick Reference"
        descriptor="Independent peptide science & clinical reference"
        editionLine={`Second version · generated ${generatedAt}`}
        statusLine={`${String(library.totalCount)} regimens, each as one named source published it. Nothing here is recommended, averaged, or reviewed.`}
        mark={<SeriesMark width={300} volume={5} />}
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

        <KeptHeading>What an entry is, and is not</KeptHeading>
        <Bullets
          items={[
            'It is a record that a named source published a schedule, and where to find it.',
            'It is not a recommendation, and not a statement that the schedule works or is safe.',
            'It is not combined with any other entry. Where three sources differ, there are three entries.',
            'There is no Tides regimen anywhere in this book, and no column for one.',
          ]}
        />

        <KeptHeading>Why there is no averaged protocol</KeptHeading>
        <Body>
          The average of three unsourced numbers is a fourth unsourced number with a false air of
          consensus. Most of the regimens here come from practitioner handbooks that cite no study
          for their amounts; averaging them would produce a figure no source stands behind and no
          reader could check.
        </Body>

        <KeptHeading ahead={160}>Reading a comparison</KeptHeading>
        <Body>
          Each compound sets its regimens side by side, one field at a time. Every field is in one
          of these states, and each is marked by a word and a shape, never by colour alone.
        </Body>
        <StateKey />

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
        {compounds.map(([slug, list]) => {
          const differences =
            list.length > 1
              ? compareProtocolFields(list).filter((c) => c.state === 'difference').length
              : 0;
          return (
            <View
              key={slug}
              wrap={false}
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
              <View style={{ alignItems: 'flex-end', maxWidth: contentWidth * 0.62 }}>
                <Text
                  style={{
                    fontFamily: sans,
                    fontSize: type.micro,
                    color: colour.slate,
                    textAlign: 'right',
                  }}
                >
                  {list.length} regimen{list.length === 1 ? '' : 's'} ·{' '}
                  {[...new Set(list.map((protocol) => contextOf(protocol).label))].join(', ')}
                </Text>
                {list.length > 1 ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                    <StateMark state={differences > 0 ? 'difference' : 'agreement'} size={7} />
                    <Text
                      style={{
                        fontFamily: sans,
                        fontSize: type.micro,
                        color: differences > 0 ? colour.caution : colour.slate,
                      }}
                    >
                      {differences > 0
                        ? `Differences on ${String(differences)} field${differences === 1 ? '' : 's'}`
                        : 'No differences among reported fields'}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          );
        })}
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
          Comparisons are mechanical. A field is marked as a difference only where two or more
          regimens report it and their wordings differ after ignoring letter case, spacing,
          punctuation and unit spacing; a field a source does not specify is not reported, and is
          never counted either way.
        </Body>
        <Body>
          No regimen in this book has been through scientific or clinical review, and no record
          behind it has either. This is a working artefact for checking what a source reported —
          not a clinical reference, and not a protocol library to select from.
        </Body>
        <View style={{ marginTop: RHYTHM }} />
        <CurrentVersionBlock
          url="thetidesindex.com"
          version={`${PUBLICATION} · second version · generated ${generatedAt}`}
          note="Regimens are source-reported and unreviewed. This index issues no dose."
        />
      </PublicationPage>
    </Document>
  );
}
