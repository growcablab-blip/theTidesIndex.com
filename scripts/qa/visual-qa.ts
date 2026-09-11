/**
 * Responsive and layout QA measurement, and the rule that a measurement can be
 * invalid.
 *
 * The defect this exists to prevent: during C.8 the browser pane was hidden, so
 * `documentElement.clientWidth` was 0, and the overflow comparison
 * `scrollWidth > clientWidth` came back **true** on every width. Reported as a
 * result, that is "horizontal overflow everywhere" — a confident, wrong answer
 * produced by a page that had not been laid out.
 *
 * A width of zero is not overflow and it is not the absence of overflow. It is
 * an invalid measurement, and the honest output is to say so and refuse to grade
 * the page.
 *
 * The gathering runs in a browser; the judging is pure, so the judging is what
 * is tested. `MEASUREMENT_SCRIPT` is injected into the page under test and
 * returns a `RawMeasurement`, which `evaluateMeasurement` turns into a verdict.
 */

export interface RawMeasurement {
  /** `document.documentElement.clientWidth` */
  readonly clientWidth: number;
  /** `document.documentElement.scrollWidth` */
  readonly scrollWidth: number;
  /** `document.visibilityState === 'visible'` */
  readonly visible: boolean;
  /** `document.readyState === 'complete'` */
  readonly loaded: boolean;
  /** Width of the main content region, if one was found. */
  readonly mainWidth: number | null;
  /** The width the harness asked the viewport to be, where it set one. */
  readonly requestedWidth: number | null;
  readonly label: string;
}

export type Verdict = 'pass' | 'fail' | 'invalid';

export interface Evaluation {
  readonly label: string;
  readonly verdict: Verdict;
  /** Why, in one line, for a terminal. */
  readonly reason: string;
  /** Present only when the verdict is `pass` or `fail`. */
  readonly overflowBy: number | null;
  /** Conditions worth knowing that do not invalidate the measurement. */
  readonly caveats: readonly string[];
}

const INVALID_BANNER = 'MEASUREMENT INVALID — VIEWPORT NOT RENDERED';

/**
 * Judges a measurement, or refuses to.
 *
 * Every invalid condition is checked before any comparison is attempted, so a
 * verdict is never derived from numbers that cannot mean anything.
 */
export function evaluateMeasurement(m: RawMeasurement): Evaluation {
  const invalid = (reason: string): Evaluation => ({
    label: m.label,
    verdict: 'invalid',
    reason: `${INVALID_BANNER}: ${reason}`,
    overflowBy: null,
    caveats: [],
  });

  /*
   * Visibility is a caveat, not an invalidator, and that was calibrated against
   * an observed case rather than assumed. A hidden or backgrounded tab still
   * computes layout: during C.9 the browser pane was hidden and the page
   * measured 1425px throughout, entirely correctly. The C.8 failure was a
   * viewport of *zero width*, which is what the checks above catch.
   *
   * Invalidating on visibility would make this refuse to grade anything in the
   * environment it exists for, which is how a guard gets switched off.
   */
  const caveats = m.visible ? [] : ['measured while the document was not visible'];

  if (!Number.isFinite(m.clientWidth) || !Number.isFinite(m.scrollWidth)) {
    return invalid('width was not a number');
  }
  if (m.clientWidth <= 0) {
    // The C.8 case. A hidden or collapsed pane reports zero, and every
    // comparison against it is meaningless.
    return invalid('viewport width is 0 — the page is hidden, collapsed, or not laid out');
  }
  if (m.scrollWidth <= 0) {
    return invalid('scroll width is 0 — nothing has been laid out');
  }
  if (!m.loaded) {
    return invalid('the document has not finished loading');
  }
  if (m.mainWidth !== null && m.mainWidth <= 0) {
    return invalid('the main content region has zero width');
  }
  if (m.requestedWidth !== null && m.clientWidth > m.requestedWidth + 1) {
    // The viewport is wider than the harness asked for, so the page was never
    // measured at the width being reported.
    return invalid(
      `viewport is ${String(m.clientWidth)}px but ${String(m.requestedWidth)}px was requested — emulation did not take`,
    );
  }

  const overflowBy = m.scrollWidth - m.clientWidth;
  // A sub-pixel difference is rounding, not a layout defect.
  if (overflowBy > 1) {
    return {
      label: m.label,
      verdict: 'fail',
      reason: `horizontal overflow of ${String(overflowBy)}px at ${String(m.clientWidth)}px`,
      overflowBy,
      caveats,
    };
  }

  return {
    label: m.label,
    verdict: 'pass',
    reason: `no horizontal overflow at ${String(m.clientWidth)}px`,
    overflowBy,
    caveats,
  };
}

/** True only when every measurement was valid and none failed. */
export function allPassed(evaluations: readonly Evaluation[]): boolean {
  return evaluations.length > 0 && evaluations.every((e) => e.verdict === 'pass');
}

/** A run containing any invalid measurement has not been checked. */
export function summarise(evaluations: readonly Evaluation[]): string {
  const invalid = evaluations.filter((e) => e.verdict === 'invalid');
  const failed = evaluations.filter((e) => e.verdict === 'fail');

  const lines = evaluations.map((e) => `  ${e.verdict.toUpperCase().padEnd(8)} ${e.label} — ${e.reason}`);

  if (invalid.length > 0) {
    lines.push('');
    lines.push(
      `  ${String(invalid.length)} of ${String(evaluations.length)} measurements were invalid. ` +
        'This page has NOT been checked at those widths — re-measure with the pane visible.',
    );
  } else if (failed.length > 0) {
    lines.push('');
    lines.push(`  ${String(failed.length)} width(s) overflow.`);
  } else {
    lines.push('');
    lines.push('  All widths checked and clean.');
  }

  return lines.join(String.fromCharCode(10));
}

/**
 * Injected into the page under test. Returns a `RawMeasurement`; it makes no
 * judgement, because the judgement is what is tested.
 *
 * `__TIDES_LABEL__` and `__TIDES_REQUESTED__` are replaced before injection.
 */
export const MEASUREMENT_SCRIPT = `
(() => {
  const d = document.documentElement;
  const main = document.querySelector('main');
  return {
    label: '__TIDES_LABEL__',
    requestedWidth: __TIDES_REQUESTED__,
    clientWidth: d.clientWidth,
    scrollWidth: d.scrollWidth,
    visible: document.visibilityState === 'visible',
    loaded: document.readyState === 'complete',
    mainWidth: main ? Math.round(main.getBoundingClientRect().width) : null,
  };
})()
`;

export function measurementScriptFor(label: string, requestedWidth: number | null): string {
  return MEASUREMENT_SCRIPT.replace('__TIDES_LABEL__', label).replace(
    '__TIDES_REQUESTED__',
    requestedWidth === null ? 'null' : String(requestedWidth),
  );
}
