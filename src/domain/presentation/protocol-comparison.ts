/**
 * What a set of source-reported regimens agrees on, differs on, and never settles.
 *
 * Derived, never authored. A hand-written "the sources agree on X" is a medical
 * claim living in a component, and it goes stale the moment a protocol is
 * edited without anyone noticing. Everything here is counted off the protocol
 * records, so the comparison can only ever say what the records say.
 *
 * Two rules shape it.
 *
 * The first is that records of different kinds are not compared with each
 * other. A practitioner handbook's regimen and a trial's dosing schedule are
 * not two opinions about the same question, and putting them in one column
 * would manufacture a disagreement — or, worse, an agreement — that nobody
 * asserted. So the comparison runs within a kind and reports each separately.
 *
 * The second is that the third bucket is what makes this honest. Sources
 * agreeing is not evidence that any of them is right, and a comparison showing
 * only agreement and difference would imply that between them they had covered
 * the question.
 */
import type { PractitionerProtocol } from '@/server/public/shapes';

/** A field of a regimen, and how to read it off a protocol record. */
interface Dimension {
  readonly key: string;
  /** Noun phrase as it appears after "a"/"the": "route", "reported amount". */
  readonly subject: string;
  /** Whether the field is a dosing-centric detail, suppressed in patient view. */
  readonly dosing: boolean;
  readonly read: (protocol: PractitionerProtocol) => string | null;
}

const DIMENSIONS: readonly Dimension[] = [
  { key: 'route', subject: 'route', dosing: false, read: (p) => p.routeName },
  { key: 'formulation', subject: 'formulation', dosing: false, read: (p) => p.formulation },
  { key: 'amount', subject: 'amount', dosing: true, read: (p) => p.amountReported },
  { key: 'frequency', subject: 'frequency', dosing: true, read: (p) => p.frequencyText },
  { key: 'timing', subject: 'timing', dosing: true, read: (p) => p.timingText },
  { key: 'duration', subject: 'duration', dosing: true, read: (p) => p.durationText },
  { key: 'cycle', subject: 'cycling schedule', dosing: true, read: (p) => p.cycleText },
  { key: 'titration', subject: 'titration', dosing: true, read: (p) => p.titrationText },
  { key: 'monitoring', subject: 'monitoring', dosing: false, read: (p) => p.monitoringText },
  { key: 'outcome', subject: 'measured outcome', dosing: false, read: (p) => p.outcomeContext },
];

/**
 * The kinds of record kept apart.
 *
 * Only two, and the split is the one the evidence model already draws: a
 * record of what happened to people, or a source's account of what it does.
 */
const GROUPS = [
  {
    key: 'human',
    label: 'Records of people',
    noun: 'human record',
    plural: 'human records',
    human: true,
  },
  {
    key: 'reported',
    label: 'Sources reporting their own practice',
    noun: 'reporting source',
    plural: 'reporting sources',
    human: false,
  },
] as const;

export interface ComparisonPoint {
  readonly key: string;
  /** Which kind of record the line counts, so a column can keep them apart. */
  readonly group: string;
  readonly groupLabel: string;
  readonly text: string;
}

export interface ProtocolComparison {
  readonly total: number;
  readonly agree: readonly ComparisonPoint[];
  readonly differ: readonly ComparisonPoint[];
  readonly unknown: readonly ComparisonPoint[];
}

function count(n: number, one: string, many: string): string {
  return `${String(n)} ${n === 1 ? one : many}`;
}

/** "1 of them does" / "3 of them do", for the records that stay silent. */
function silent(n: number): string {
  return `${String(n)} of them ${n === 1 ? 'does' : 'do'} not`;
}

/**
 * Compare the regimens reported for one compound.
 *
 * `includeDosing` is the patient boundary. With it off a dimension such as
 * frequency is not blanked but dropped: "the sources differ on frequency" is
 * itself a dosing-centric statement.
 */
export function compareProtocols(
  protocols: readonly PractitionerProtocol[],
  options: { readonly includeDosing: boolean },
): ProtocolComparison {
  const agree: ComparisonPoint[] = [];
  const differ: ComparisonPoint[] = [];
  const unknown: ComparisonPoint[] = [];
  const total = protocols.length;
  if (total === 0) return { total, agree, differ, unknown };

  for (const group of GROUPS) {
    const members = protocols.filter((p) => p.isHumanEvidence === group.human);
    if (members.length === 0) continue;
    const size = members.length;

    for (const dimension of DIMENSIONS) {
      if (dimension.dosing && !options.includeDosing) continue;
      const id = `${group.key}:${dimension.key}`;

      const stated = members.map(dimension.read).filter((v): v is string => v !== null);
      const distinct = new Set(stated.map((v) => v.trim().toLowerCase()));

      if (stated.length === 0) {
        unknown.push({
          key: id,
          group: group.key,
          groupLabel: group.label,
          text:
            size === 1
              ? `The one ${group.noun} states no ${dimension.subject}.`
              : `None of the ${count(size, group.noun, group.plural)} states a ${dimension.subject}.`,
        });
        continue;
      }

      const first = stated[0] ?? '';
      if (distinct.size === 1) {
        agree.push({
          key: id,
          group: group.key,
          groupLabel: group.label,
          text:
            stated.length === size
              ? `All ${count(size, group.noun, group.plural)} report the same ${dimension.subject}: ${first}.`
              : `The ${count(stated.length, group.noun, group.plural)} that state a ${dimension.subject} report the same one — ${first} — ${silent(size - stated.length)} state it.`,
        });
      } else {
        differ.push({
          key: id,
          group: group.key,
          groupLabel: group.label,
          text:
            stated.length === size
              ? `${count(size, group.noun, group.plural)} report ${count(distinct.size, 'different', 'different')} ${dimension.subject} ${distinct.size === 1 ? 'value' : 'values'}.`
              : `${count(distinct.size, 'different', 'different')} ${dimension.subject} ${distinct.size === 1 ? 'value is' : 'values are'} reported across the ${count(stated.length, group.noun, group.plural)} that state one, and ${silent(size - stated.length)} state it.`,
        });
      }
    }
  }

  // Not a dimension of any single record: the thing no record carries at all.
  unknown.push({
    key: 'derivation',
    group: 'all',
    groupLabel: 'Every record held',
    text: 'No source reports how its regimen was arrived at, so none of these can be traced to a measured outcome.',
  });

  return { total, agree, differ, unknown };
}
