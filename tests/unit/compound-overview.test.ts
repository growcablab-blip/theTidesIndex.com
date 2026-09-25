import { describe, expect, it } from 'vitest';
import {
  DEFAULT_OVERVIEW_LIMITS,
  OVERVIEW_MINIMUMS,
  buildCompoundOverview,
  truncateWording,
  type OverviewProtocol,
} from '@/domain/protocols/compound-overview';
import { COMPARISON_FIELDS } from '@/domain/protocols/protocol-comparison';

/**
 * The one-page compound overview. Fixture records only: the tests assert how
 * fields are selected, counted and shortened — never a medical value — and that
 * nothing on the overview is a value no record holds.
 */

function regimen(
  id: string,
  sourceKey: string,
  fields: Partial<OverviewProtocol> = {},
  sourceTitle = `Title of ${sourceKey}`,
): OverviewProtocol {
  return {
    id,
    objectiveContext: `Objective ${id}`,
    populationModel: null,
    routeName: null,
    formulation: null,
    amountReported: null,
    amountUnit: null,
    frequencyText: null,
    timingText: null,
    durationText: null,
    titrationText: null,
    cycleText: null,
    combinationsText: null,
    monitoringText: null,
    contraindicationsText: null,
    regulatoryContext: null,
    sources: [{ sourceKey, sourceTitle }],
    ...fields,
  };
}

const kind = (p: OverviewProtocol) => (p.sources[0]?.sourceKey === 'SRC-T' ? 'Human trial regimen' : 'Practitioner handbook');

const records = [
  regimen('1', 'SRC-T', { routeName: 'Subcutaneous', amountReported: 'Fixture A', frequencyText: 'Fixture daily', monitoringText: 'Fixture panel' }),
  regimen('2', 'SRC-H', { routeName: 'subcutaneous', amountReported: 'Fixture B', frequencyText: 'fixture daily.', durationText: 'Fixture X' }),
  regimen('3', 'SRC-H', { routeName: 'Not specified.', amountReported: 'Fixture C', frequencyText: 'Not stated', durationText: 'Fixture Y' }),
];

describe('compound overview', () => {
  const overview = buildCompoundOverview(records, kind);

  it('names each source once, with its kind and the regimens that cite it', () => {
    expect(overview.sourceCount).toBe(2);
    expect(overview.sources.shown.map((s) => [s.sourceKey, s.kinds, s.columns])).toEqual([
      ['SRC-T', ['Human trial regimen'], [0]],
      ['SRC-H', ['Practitioner handbook'], [1, 2]],
    ]);
  });

  it('lists routes as worded, with the regimens that report them and those that do not', () => {
    expect(overview.routes).toEqual([
      { route: 'Subcutaneous', columns: [0] },
      { route: 'subcutaneous', columns: [1] },
    ]);
    expect(overview.routeNotReportedColumns).toEqual([2]);
  });

  it('separates a difference between sources from variation within one source', () => {
    // Amount: three wordings across two sources — a difference, which also varies within SRC-H.
    const amount = overview.difference.shown.find((d) => d.comparison.field.key === 'amount');
    expect(amount?.wordingCount).toBe(3);
    expect(amount?.sourceKeys).toEqual(['SRC-T', 'SRC-H']);
    expect(amount?.variesWithin).toEqual(['SRC-H']);
    // Duration: two wordings, both from SRC-H — variation, never a difference.
    expect(overview.variation.shown.map((v) => [v.comparison.field.key, v.sourceKey])).toEqual([
      ['duration', 'SRC-H'],
    ]);
    expect(overview.difference.shown.map((d) => d.comparison.field.key)).not.toContain('duration');
  });

  it('quotes agreement as recorded, and never a value no record holds', () => {
    const route = overview.agreement.shown.find((a) => a.comparison.field.key === 'route');
    expect(route?.wording).toBe('Subcutaneous');
    const frequency = overview.agreement.shown.find((a) => a.comparison.field.key === 'frequency');
    expect(frequency?.wording).toBe('Fixture daily');
    const recorded = records.flatMap((p) => COMPARISON_FIELDS.map((f) => f.get(p) ?? ''));
    for (const item of overview.agreement.shown) {
      const head = item.wording.replace(/…$/u, '');
      expect(recorded.some((value) => value.startsWith(head)), item.wording).toBe(true);
    }
  });

  it('names fields no regimen reports once, and leaves out nothing else', () => {
    expect(overview.notReportedByAny).toContain('Titration');
    expect(overview.notReportedByAny).toContain('Cycle / off period');
    expect(new Set(overview.notReportedByAny).size).toBe(overview.notReportedByAny.length);
    // Every field is in exactly one place on the overview.
    const placed = [
      ...overview.agreement.shown.map((i) => i.comparison.field.label),
      ...overview.agreement.omitted,
      ...overview.difference.shown.map((i) => i.comparison.field.label),
      ...overview.difference.omitted,
      ...overview.variation.shown.map((i) => i.comparison.field.label),
      ...overview.variation.omitted,
      ...overview.single.shown.map((i) => i.comparison.field.label),
      ...overview.single.omitted,
      ...overview.notReportedByAny,
    ];
    expect([...placed].sort()).toEqual(COMPARISON_FIELDS.map((f) => f.label).sort());
  });

  it('lists key fields that some regimens leave unspecified', () => {
    const monitoring = overview.keyGaps.shown.find((g) => g.comparison.field.key === 'monitoring');
    expect(monitoring).toMatchObject({ notReportedCount: 2, total: 3 });
    // Regimen 3 leaves the route unspecified.
    expect(overview.keyGaps.shown.find((g) => g.comparison.field.key === 'route')?.notReportedCount).toBe(1);
    expect(overview.keyGaps.shown.find((g) => g.comparison.field.key === 'frequency')?.notReportedCount).toBe(1);
    // A key field no regimen reports is in "not reported by any", not here.
    expect(overview.keyGaps.shown.map((g) => g.comparison.field.key)).not.toContain('population');
  });

  it('orders fields with the key comparison fields first', () => {
    const keys = overview.agreement.shown.map((a) => a.comparison.field.key);
    expect(keys.indexOf('route')).toBeLessThan(keys.indexOf('objective') === -1 ? Infinity : keys.indexOf('objective'));
    expect(overview.single.shown[0]?.comparison.field.key).toBe('monitoring');
  });

  it('marks a single regimen as nothing to compare', () => {
    const one = buildCompoundOverview([records[0]!], kind);
    expect(one.compared).toBe(false);
    expect(one.difference.total).toBe(0);
    expect(one.variation.total).toBe(0);
  });
});

describe('the fitting rule', () => {
  // Ten regimens, each from its own source, differing on every field.
  const many = Array.from({ length: 10 }, (_, i) =>
    regimen(String(i), `SRC-${String(i).padStart(2, '0')}`, {
      populationModel: `Population ${String(i)}`,
      routeName: `Route ${String(i % 2)}`,
      formulation: `Formulation ${String(i)}`,
      amountReported: `Amount wording ${String(i)}`,
      frequencyText: `Frequency ${String(i)}`,
      timingText: 'A long shared timing wording that repeats across every record in the fixture, word for word, to test how agreement is quoted and cut.',
      durationText: 'Shared duration wording',
      titrationText: 'Shared titration wording',
      cycleText: 'Shared cycle wording',
      monitoringText: `Monitoring ${String(i)}`,
      contraindicationsText: `Cautions ${String(i)}`,
      regulatoryContext: `Standing ${String(i)}`,
    }),
  );

  it('fits the budget by shortening agreement before differences, and still names what it shortened', () => {
    const roomy = buildCompoundOverview(many, kind, { budget: 1000 });
    const tight = buildCompoundOverview(many, kind, { budget: 30 });
    expect(roomy.agreement.shown.length).toBeGreaterThan(tight.agreement.shown.length);
    expect(tight.agreement.shown.length).toBeGreaterThanOrEqual(OVERVIEW_MINIMUMS.agreement);
    // Differences give way last, and never below their minimum.
    expect(tight.difference.shown.length).toBeGreaterThanOrEqual(
      Math.min(OVERVIEW_MINIMUMS.difference, tight.difference.total),
    );
    for (const key of ['agreement', 'difference', 'variation', 'single', 'sources'] as const) {
      expect(tight[key].shown.length + tight[key].omitted.length).toBe(tight[key].total);
    }
    expect(tight.agreement.omitted.length).toBeGreaterThan(0);
  });

  it('never shortens the list of fields no regimen reports', () => {
    const silent = many.map((p) => ({ ...p, titrationText: null, cycleText: null }));
    const tight = buildCompoundOverview(silent, kind, { budget: 1 });
    expect(tight.notReportedByAny).toEqual(expect.arrayContaining(['Titration', 'Cycle / off period']));
    expect(tight.fits).toBe(false);
  });

  it('is deterministic', () => {
    expect(buildCompoundOverview(many, kind, { budget: 30 })).toEqual(buildCompoundOverview(many, kind, { budget: 30 }));
  });

  it('starts from the documented defaults when there is room', () => {
    expect(buildCompoundOverview(many, kind, { budget: 1000 }).limits).toEqual(DEFAULT_OVERVIEW_LIMITS);
  });
});

describe('truncating a wording', () => {
  it('leaves a short wording untouched', () => {
    expect(truncateWording('Fixture wording', 40)).toEqual({ text: 'Fixture wording', truncated: false });
  });

  it('cuts at a word boundary and marks the cut', () => {
    const cut = truncateWording('one two three four five six seven eight', 20);
    expect(cut.truncated).toBe(true);
    expect(cut.text.endsWith('…')).toBe(true);
    expect('one two three four five six seven eight'.startsWith(cut.text.slice(0, -1))).toBe(true);
    expect(cut.text).not.toMatch(/\s…$/u);
  });
});
