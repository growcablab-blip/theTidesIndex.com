/**
 * What counts as a dose in a piece of text, in one place.
 *
 * The rule lived inside `scripts/qa/patient-dose-scan.ts` and was about to be
 * written a second time, in an integration test that walks every published
 * compound's simple-mode payload. Two definitions of "this is a dose" drift, and
 * the way they drift is the dangerous way round: the copy that is easier to
 * satisfy becomes the one people run.
 *
 * So the scan and the test share this. Both are as strict as each other, and
 * both get any later refinement at the same time.
 *
 * The pattern is deliberately broad — a false positive costs a minute of
 * reading, a false negative puts an amount in front of a patient — and the
 * exclusions are deliberately narrow.
 */

/**
 * A number followed by a mass, volume or unit of activity, optionally per a
 * body-weight, volume or time basis.
 */
export const DOSE_PATTERN =
  /\b\d+(?:[.,]\d+)?\s*(?:[-–]\s*\d+(?:[.,]\d+)?\s*)?(?:mcg|µg|ug|micrograms?|mg|milligrams?|grams?|g|ml|mL|IU|units)\b(?:\s*(?:\/|per)\s*(?:kg|kilogram|ml|mL|day|dose|vial))?/g;

/**
 * Strings that match the pattern and are not doses. Kept short and specific: a
 * long exclusion list is how a scanner stops scanning.
 */
export const NOT_A_DOSE: readonly RegExp[] = [
  // Molecular weights. "1815.1 g/mol" is a property of the molecule.
  /\b\d+(?:\.\d+)?\s*(?:g\/mol|gm?\/mol|grams? per mole|kDa)\b/i,
  // A biomarker concentration measured in a study is a result, not an amount
  // anybody is given: "IGF-1 rose by 181 micrograms per litre".
  /\b\d+(?:\.\d+)?\s*(?:micrograms?|mcg|µg|ug|mg|ng|pg)\s*(?:per|\/)\s*(?:litre|liter|L|dL)\b/i,
];

/** One dose-shaped string, with where it was found and enough text to judge it. */
export interface DoseHit {
  /** Dotted path from the root of the payload, e.g. `.claims[3].claimText`. */
  readonly path: string;
  /** The matched text with surrounding context, for a person to read. */
  readonly context: string;
}

/** How much text either side of a match to keep, so a reader can judge it. */
const CONTEXT_BEFORE = 40;
const CONTEXT_AFTER = 30;

function scanString(value: string, path: string, hits: DoseHit[]): void {
  for (const match of value.matchAll(DOSE_PATTERN)) {
    const context = value.slice(
      Math.max(0, match.index - CONTEXT_BEFORE),
      match.index + match[0].length + CONTEXT_AFTER,
    );
    if (NOT_A_DOSE.some((allowed) => allowed.test(context))) continue;
    hits.push({ path, context: context.replaceAll('\n', ' ') });
  }
}

/**
 * Every dose-shaped string in a payload, however deeply nested.
 *
 * Identifier fields are skipped: a uuid is not content, and one containing
 * digits should not be read as an amount.
 */
export function findDoses(payload: unknown, path = ''): DoseHit[] {
  const hits: DoseHit[] = [];
  walk(payload, path, hits, new WeakSet());
  return hits;
}

function isIdentifierKey(key: string): boolean {
  return key === 'id' || key.endsWith('Id') || key.endsWith('_id');
}

function walk(value: unknown, path: string, hits: DoseHit[], seen: WeakSet<object>): void {
  if (typeof value === 'string') {
    scanString(value, path, hits);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => walk(item, `${path}[${String(index)}]`, hits, seen));
    return;
  }
  if (value !== null && typeof value === 'object') {
    // Cycles are possible in an assembled payload; a repeat visit adds nothing.
    if (seen.has(value)) return;
    seen.add(value);
    for (const [key, item] of Object.entries(value)) {
      if (isIdentifierKey(key)) continue;
      walk(item, `${path}.${key}`, hits, seen);
    }
  }
}
