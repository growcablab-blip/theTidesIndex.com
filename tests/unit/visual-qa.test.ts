import { describe, expect, it } from 'vitest';
import {
  allPassed,
  evaluateMeasurement,
  measurementScriptFor,
  summarise,
  type RawMeasurement,
} from '../../scripts/qa/visual-qa';
import { isPlaceholderString } from '@db/seed/seed-data';

/**
 * Two failure modes that recurred often enough to be fixed at the framework
 * level rather than caught again.
 */

function measurement(overrides: Partial<RawMeasurement> = {}): RawMeasurement {
  return {
    label: 'desktop',
    clientWidth: 1265,
    scrollWidth: 1265,
    visible: true,
    loaded: true,
    mainWidth: 1200,
    requestedWidth: 1280,
    ...overrides,
  };
}

describe('a measurement can be invalid', () => {
  it('refuses to grade a zero-width viewport', () => {
    // The C.8 case exactly: the browser pane was hidden, clientWidth was 0, and
    // `scrollWidth > clientWidth` reported overflow on every width. A confident
    // wrong answer from a page that had never been laid out.
    const result = evaluateMeasurement(measurement({ clientWidth: 0, scrollWidth: 208 }));

    expect(result.verdict).toBe('invalid');
    expect(result.verdict).not.toBe('fail');
    expect(result.verdict).not.toBe('pass');
    expect(result.reason).toContain('MEASUREMENT INVALID — VIEWPORT NOT RENDERED');
    expect(result.reason).toMatch(/hidden, collapsed, or not laid out/);
    expect(result.overflowBy).toBeNull();
  });

  it('refuses when nothing has been laid out', () => {
    expect(evaluateMeasurement(measurement({ scrollWidth: 0 })).verdict).toBe('invalid');
  });

  it('refuses when the document has not finished loading', () => {
    expect(evaluateMeasurement(measurement({ loaded: false })).verdict).toBe('invalid');
  });

  it('still grades a laid-out page that happens to be hidden, with a caveat', () => {
    // Calibrated against an observed case rather than assumed: during C.9 the
    // browser pane was hidden and the page measured 1425px throughout, entirely
    // correctly. A hidden tab still computes layout. Invalidating on visibility
    // would make this refuse to grade anything in the environment it exists for,
    // which is how a guard gets switched off.
    const result = evaluateMeasurement(measurement({ visible: false }));
    expect(result.verdict).toBe('pass');
    expect(result.caveats).toContain('measured while the document was not visible');
  });

  it('refuses when the main region has no width', () => {
    expect(evaluateMeasurement(measurement({ mainWidth: 0 })).verdict).toBe('invalid');
  });

  it('refuses when viewport emulation did not take', () => {
    // Measuring a 1265px viewport and reporting it as a 375px result would be a
    // pass for a width nobody tested.
    const result = evaluateMeasurement(
      measurement({ label: 'mobile', requestedWidth: 375, clientWidth: 1265, scrollWidth: 1265 }),
    );
    expect(result.verdict).toBe('invalid');
    expect(result.reason).toMatch(/emulation did not take/);
  });

  it('refuses on a non-numeric width', () => {
    expect(evaluateMeasurement(measurement({ clientWidth: Number.NaN })).verdict).toBe('invalid');
  });
});

describe('a valid measurement is graded', () => {
  it('passes a page that fits', () => {
    const result = evaluateMeasurement(measurement());
    expect(result.verdict).toBe('pass');
    expect(result.overflowBy).toBe(0);
  });

  it('fails a page that overflows, and says by how much', () => {
    const result = evaluateMeasurement(
      measurement({ label: 'tablet', requestedWidth: 768, clientWidth: 753, scrollWidth: 777 }),
    );
    expect(result.verdict).toBe('fail');
    expect(result.overflowBy).toBe(24);
    expect(result.reason).toMatch(/24px at 753px/);
  });

  it('tolerates a sub-pixel difference as rounding', () => {
    expect(evaluateMeasurement(measurement({ scrollWidth: 1266 })).verdict).toBe('pass');
  });
});

describe('a run is only clean if every measurement was valid', () => {
  it('does not call a run passed when a measurement was invalid', () => {
    const evaluations = [
      evaluateMeasurement(measurement({ label: 'desktop' })),
      evaluateMeasurement(measurement({ label: 'mobile', clientWidth: 0 })),
    ];
    // The trap: one genuine pass and one unmeasurable width is not "all clear".
    expect(allPassed(evaluations)).toBe(false);
    expect(summarise(evaluations)).toMatch(/have NOT been checked|has NOT been checked/);
  });

  it('reports a clean run only when everything was measured and fits', () => {
    const evaluations = [
      evaluateMeasurement(measurement({ label: 'desktop' })),
      evaluateMeasurement(
        measurement({ label: 'mobile', requestedWidth: 375, clientWidth: 375, scrollWidth: 375, mainWidth: 343 }),
      ),
    ];
    expect(allPassed(evaluations)).toBe(true);
    expect(summarise(evaluations)).toMatch(/All widths checked and clean/);
  });

  it('treats an empty run as unchecked rather than clean', () => {
    expect(allPassed([])).toBe(false);
  });

  it('builds an injectable script carrying its own label and request', () => {
    const script = measurementScriptFor('mobile', 375);
    expect(script).toContain("label: 'mobile'");
    expect(script).toContain('requestedWidth: 375');
    expect(script).not.toContain('__TIDES_');
  });
});

describe('absence is absence', () => {
  it('recognises the strings that mean an empty field', () => {
    for (const placeholder of [
      'N/A',
      'n/a',
      'NA',
      'Not stated',
      'not stated',
      '  Unknown  ',
      'None',
      'TBD',
      '-',
      '',
      'null',
    ]) {
      expect(isPlaceholderString(placeholder), placeholder).toBe(true);
    }
  });

  it('leaves real values alone', () => {
    for (const real of [
      'Karl Fischer titration',
      'Reversed-phase HPLC, UV detection at 214 nm',
      'Nanograms',
      'None detected',
      'Not determined',
    ]) {
      // "Not determined" and "None detected" are results a document can report.
      // They are findings, not holes, and belong in a result field untouched.
      expect(isPlaceholderString(real), real).toBe(false);
    }
  });
});
