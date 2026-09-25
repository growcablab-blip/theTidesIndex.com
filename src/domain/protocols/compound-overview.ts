import { isNotReported } from './field-comparison';
import {
  KEY_COMPARISON_FIELDS,
  byFieldImportance,
  compareProtocolFields,
  groupByState,
  type ComparableProtocol,
  type ProtocolFieldComparison,
} from './protocol-comparison';

/**
 * The one-page overview that opens each compound in the Protocol Quick
 * Reference: which sources and routes are represented, where the regimens agree,
 * where they differ, what varies within one source, what only one source reports
 * and what nobody reports.
 *
 * Owner brief: "Never average. Never recommend a regimen." So this module only
 * *selects and counts*. Every wording it carries is one regimen's own text, cut
 * short only visibly (with an ellipsis and a `truncated` flag); no number is
 * computed from a record, no range is drawn and no regimen is singled out. The
 * only ordering is of *fields* (key comparison fields first), never of regimens
 * or sources, which keep the order the book prints them in.
 *
 * ## The fitting rule
 *
 * The overview must fit one page, and a compound with ten regimens can carry
 * more than a page of findings. Rather than overflow, each list is capped, and
 * whatever a cap leaves out is still *named* — "and 3 more: Timing · Titration ·
 * Cycle" — so a field is never silently missing from the overview; its detail is
 * in the full comparison that follows.
 *
 *   1. Start from the default caps (`DEFAULT_OVERVIEW_LIMITS`).
 *   2. Estimate the page cost in lines (`overviewLineCost`): one line per source,
 *      difference and variation item; an agreement item's line count follows the
 *      length of its wording; inline lists cost their wrapped length; every
 *      "and N more" summary costs one line.
 *   3. While the estimate exceeds the line budget, lower by one the cap of the
 *      first list, in `REDUCTION_ORDER`, that is still above its minimum.
 *      Agreement goes first (it is the least urgent to see before reading a
 *      regimen); differences go last (they are the reason the page exists).
 *   4. "Not reported by any regimen" is never capped: it is a single list of
 *      field names, printed once.
 *
 * The rule is deterministic, so the same records always produce the same page.
 */

export interface OverviewProtocol extends ComparableProtocol {
  readonly sources: readonly {
    readonly sourceKey: string;
    readonly sourceTitle?: string | null | undefined;
  }[];
}

export interface OverviewLimits {
  readonly sources: number;
  readonly agreement: number;
  readonly difference: number;
  readonly variation: number;
  readonly single: number;
  readonly keyGaps: number;
}

export const DEFAULT_OVERVIEW_LIMITS: OverviewLimits = {
  sources: 10,
  agreement: 5,
  difference: 10,
  variation: 5,
  single: 10,
  keyGaps: 6,
};

export const OVERVIEW_MINIMUMS: OverviewLimits = {
  sources: 4,
  agreement: 2,
  difference: 5,
  variation: 2,
  single: 3,
  keyGaps: 3,
};

/** Which cap gives way first when the page is over budget. */
export const REDUCTION_ORDER: readonly (keyof OverviewLimits)[] = [
  'agreement',
  'single',
  'keyGaps',
  'sources',
  'variation',
  'difference',
];

/** Lines of variable content the overview page has room for, at the overview's type size. */
export const OVERVIEW_LINE_BUDGET = 38;
/** Characters of overview text per line, at the overview's measure and type size. */
export const OVERVIEW_CHARS_PER_LINE = 100;
/** A quoted agreement wording longer than this is cut, visibly. */
export const OVERVIEW_WORDING_CHARS = 150;

export interface OverviewSource {
  readonly sourceKey: string;
  readonly title: string | null;
  /** The kinds of source its regimens are recorded as, in order of appearance. */
  readonly kinds: readonly string[];
  /** Column (regimen) indexes that cite it. */
  readonly columns: readonly number[];
}

export interface OverviewRoute {
  readonly route: string;
  readonly columns: readonly number[];
}

export interface AgreementItem {
  readonly comparison: ProtocolFieldComparison;
  /** The shared wording, as the first reporting regimen words it. */
  readonly wording: string;
  readonly truncated: boolean;
  /** Set when every reporting regimen comes from this one source. */
  readonly withinSource: string | null;
}

export interface DifferenceItem {
  readonly comparison: ProtocolFieldComparison;
  readonly wordingCount: number;
  /** Sources of the reporting regimens, in column order. */
  readonly sourceKeys: readonly string[];
  /** Sources whose own regimens also vary on this field. */
  readonly variesWithin: readonly string[];
}

export interface VariationItem {
  readonly comparison: ProtocolFieldComparison;
  readonly wordingCount: number;
  readonly sourceKey: string;
}

export interface SingleItem {
  readonly comparison: ProtocolFieldComparison;
  readonly sourceKey: string | null;
  readonly column: number;
}

export interface KeyGapItem {
  readonly comparison: ProtocolFieldComparison;
  readonly notReportedCount: number;
  readonly total: number;
}

export interface OverviewList<T> {
  readonly shown: readonly T[];
  /** Everything the cap left out, still named on the page. */
  readonly omitted: readonly string[];
  readonly total: number;
}

export interface CompoundOverview {
  readonly regimenCount: number;
  readonly sourceCount: number;
  /** Two or more regimens: the field states mean something. */
  readonly compared: boolean;
  readonly sources: OverviewList<OverviewSource>;
  readonly routes: readonly OverviewRoute[];
  readonly routeNotReportedColumns: readonly number[];
  readonly agreement: OverviewList<AgreementItem>;
  readonly difference: OverviewList<DifferenceItem>;
  readonly variation: OverviewList<VariationItem>;
  readonly single: OverviewList<SingleItem>;
  /** Fields no regimen reports. Never capped. */
  readonly notReportedByAny: readonly string[];
  /** Key fields some regimens report and others leave unspecified. */
  readonly keyGaps: OverviewList<KeyGapItem>;
  /** The caps the fitting rule settled on. */
  readonly limits: OverviewLimits;
  readonly lineCost: number;
  /** False only when every cap is at its minimum and the estimate is still over budget. */
  readonly fits: boolean;
}

/** Cut a wording at a word boundary, marking the cut. Never cuts inside a word or a number. */
export function truncateWording(text: string, max: number = OVERVIEW_WORDING_CHARS): {
  text: string;
  truncated: boolean;
} {
  const trimmed = text.trim();
  if (trimmed.length <= max) return { text: trimmed, truncated: false };
  const cut = trimmed.slice(0, max);
  const space = cut.lastIndexOf(' ');
  const head = (space > max * 0.5 ? cut.slice(0, space) : cut).replace(/[\s,;:.(—–-]+$/u, '');
  return { text: `${head}…`, truncated: true };
}

const sourceOfColumn = (protocols: readonly OverviewProtocol[], column: number): string | null =>
  protocols[column]?.sources[0]?.sourceKey ?? null;

function list<T>(all: readonly T[], cap: number, label: (item: T) => string): OverviewList<T> {
  return { shown: all.slice(0, cap), omitted: all.slice(cap).map(label), total: all.length };
}

const fieldLabel = (item: { comparison: ProtocolFieldComparison }) => item.comparison.field.label;

function assemble(
  protocols: readonly OverviewProtocol[],
  comparisons: readonly ProtocolFieldComparison[],
  kindOf: (protocol: OverviewProtocol) => string,
  limits: OverviewLimits,
): Omit<CompoundOverview, 'lineCost' | 'fits'> {
  // Sources, in the order the book prints their regimens.
  const sourceMap = new Map<string, { title: string | null; kinds: string[]; columns: number[] }>();
  protocols.forEach((protocol, column) => {
    for (const source of protocol.sources) {
      const entry = sourceMap.get(source.sourceKey) ?? {
        title: source.sourceTitle ?? null,
        kinds: [],
        columns: [],
      };
      const kind = kindOf(protocol);
      if (!entry.kinds.includes(kind)) entry.kinds.push(kind);
      if (!entry.columns.includes(column)) entry.columns.push(column);
      sourceMap.set(source.sourceKey, entry);
    }
  });
  const sources: OverviewSource[] = [...sourceMap.entries()].map(([sourceKey, e]) => ({
    sourceKey,
    title: e.title,
    kinds: e.kinds,
    columns: e.columns,
  }));

  const routeMap = new Map<string, number[]>();
  const routeNotReportedColumns: number[] = [];
  protocols.forEach((protocol, column) => {
    if (isNotReported(protocol.routeName)) {
      routeNotReportedColumns.push(column);
      return;
    }
    const route = protocol.routeName!.trim();
    routeMap.set(route, [...(routeMap.get(route) ?? []), column]);
  });

  const byState = groupByState(comparisons);
  const important = (items: readonly ProtocolFieldComparison[]) => [...items].sort(byFieldImportance);

  const agreement = important(byState.agreement).map((comparison): AgreementItem => {
    const cut = truncateWording(comparison.wordings[0]?.value ?? '');
    const reporting = comparison.cells.flatMap((c, column) =>
      c.state === 'reported' ? [sourceOfColumn(protocols, column)] : [],
    );
    const only = reporting[0] ?? null;
    return {
      comparison,
      wording: cut.text,
      truncated: cut.truncated,
      withinSource: !comparison.acrossSources && only !== null ? only : null,
    };
  });

  const reportingSources = (comparison: ProtocolFieldComparison) => [
    ...new Set(
      comparison.cells.flatMap((c, column) =>
        c.state === 'reported' ? [sourceOfColumn(protocols, column) ?? `R${String(column + 1)}`] : [],
      ),
    ),
  ];

  const difference = important(byState.difference).map(
    (comparison): DifferenceItem => ({
      comparison,
      wordingCount: comparison.wordings.length,
      sourceKeys: reportingSources(comparison),
      variesWithin: comparison.sourcesWithVariation,
    }),
  );

  const variation = important(byState.variation).map(
    (comparison): VariationItem => ({
      comparison,
      wordingCount: comparison.wordings.length,
      sourceKey: comparison.sourcesWithVariation[0] ?? reportingSources(comparison)[0] ?? '',
    }),
  );

  const single = important(byState.single).map((comparison): SingleItem => {
    const column = comparison.cells.findIndex((c) => c.state === 'reported');
    return { comparison, column, sourceKey: sourceOfColumn(protocols, column) };
  });

  const keyGaps = comparisons
    .filter(
      (c) => KEY_COMPARISON_FIELDS.includes(c.field.key) && c.state !== 'none' && c.notReportedCount > 0,
    )
    .sort(byFieldImportance)
    .map((comparison): KeyGapItem => ({
      comparison,
      notReportedCount: comparison.notReportedCount,
      total: comparison.total,
    }));

  return {
    regimenCount: protocols.length,
    sourceCount: sources.length,
    compared: protocols.length > 1,
    sources: list(sources, limits.sources, (s) => s.sourceKey),
    routes: [...routeMap.entries()].map(([route, columns]) => ({ route, columns })),
    routeNotReportedColumns,
    agreement: list(agreement, limits.agreement, fieldLabel),
    difference: list(difference, limits.difference, fieldLabel),
    variation: list(variation, limits.variation, fieldLabel),
    single: list(single, limits.single, fieldLabel),
    notReportedByAny: important(byState.none).map((c) => c.field.label),
    keyGaps: list(keyGaps, limits.keyGaps, fieldLabel),
    limits,
  };
}

const wrapped = (chars: number) => Math.max(1, Math.ceil(chars / OVERVIEW_CHARS_PER_LINE));

/** The estimated height of the overview's variable content, in lines. See the fitting rule. */
export function overviewLineCost(overview: Omit<CompoundOverview, 'lineCost' | 'fits'>): number {
  const more = (l: OverviewList<unknown>) => (l.omitted.length > 0 ? 1 : 0);
  const inline = (parts: readonly string[]) =>
    parts.length === 0 ? 1 : wrapped(parts.reduce((n, p) => n + p.length + 3, 0));

  const sources = overview.sources.shown.length + more(overview.sources);
  const routes = inline(overview.routes.map((r) => `${r.route} (${r.columns.map((c) => `R${String(c + 1)}`).join(', ')})`));
  const agreement =
    overview.agreement.shown.reduce(
      (n, item) => n + wrapped(item.comparison.field.label.length + item.wording.length + 6),
      0,
    ) + more(overview.agreement);
  const difference = overview.difference.shown.length + more(overview.difference);
  const variation = overview.variation.shown.length + more(overview.variation);
  const single =
    inline(overview.single.shown.map((s) => `${s.comparison.field.label} (${s.sourceKey ?? ''})`)) +
    more(overview.single);
  const none = inline(overview.notReportedByAny);
  const keyGaps =
    inline(overview.keyGaps.shown.map((g) => `${g.comparison.field.label}: ${String(g.notReportedCount)} of ${String(g.total)}`)) +
    more(overview.keyGaps);
  // Each section carries a heading line.
  const headings = 7;
  return sources + routes + agreement + difference + variation + single + none + keyGaps + headings;
}

export function buildCompoundOverview(
  protocols: readonly OverviewProtocol[],
  kindOf: (protocol: OverviewProtocol) => string,
  options: { readonly limits?: OverviewLimits; readonly budget?: number } = {},
): CompoundOverview {
  const comparisons = compareProtocolFields(protocols);
  const budget = options.budget ?? OVERVIEW_LINE_BUDGET;
  let limits: OverviewLimits = options.limits ?? DEFAULT_OVERVIEW_LIMITS;
  let overview = assemble(protocols, comparisons, kindOf, limits);
  let cost = overviewLineCost(overview);

  while (cost > budget) {
    const shrinkable = REDUCTION_ORDER.find((key) => {
      const shownNow = overview[key].shown.length;
      return shownNow > OVERVIEW_MINIMUMS[key] && limits[key] > OVERVIEW_MINIMUMS[key];
    });
    if (shrinkable === undefined) break;
    limits = { ...limits, [shrinkable]: overview[shrinkable].shown.length - 1 };
    overview = assemble(protocols, comparisons, kindOf, limits);
    cost = overviewLineCost(overview);
  }

  return { ...overview, lineCost: cost, fits: cost <= budget };
}
