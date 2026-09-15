/**
 * How one field reads across several source-reported records.
 *
 * Owner decision (closed): "Not specified" does NOT count as a disagreement.
 * Three concepts, and absence is never converted into either of the other two:
 *
 *   - AGREEMENT — two or more records report the field, and what they report is
 *     materially consistent.
 *   - DIFFERENCE — two or more records report the field, and what they report
 *     differs.
 *   - NOT REPORTED — a record does not specify the field.
 *
 * Every individual cell is therefore either `reported` or `not_reported`, and a
 * field as a whole is one of four states:
 *
 *   - `agreement`  — at least two cells are reported, and all reported cells share
 *                    one normalised wording.
 *   - `difference` — at least two cells are reported, and they carry two or more
 *                    normalised wordings.
 *   - `single`     — exactly one cell is reported. Neither agreement nor
 *                    difference: there is nothing to compare it with.
 *   - `none`       — no cell is reported.
 *
 * Not-reported cells take no part in the classification at all. A field reported
 * by one record and left unspecified by four is `single`, never `difference`.
 *
 * ## What "materially consistent" means here — deliberately narrow
 *
 * Two reported values are consistent only when they are the same text after
 * normalising **presentation**, and nothing else:
 *
 *   - Unicode compatibility form (NFKC) and letter case;
 *   - whitespace (runs collapsed, ends trimmed);
 *   - punctuation that carries no quantity (full stops, commas, colons,
 *     semicolons, brackets, quotation marks, hyphens between words);
 *   - the space between a number and its unit ("500mcg" = "500 mcg") and the
 *     spacing around symbols ("mg/kg" = "mg / kg").
 *
 * Punctuation that *is* a quantity is kept: a decimal point or comma between
 * digits ("0.5" is not "05"), a hyphen or dash between digits ("1-2" is not
 * "12"; every dash is read as the same range mark), a leading minus, and the
 * symbols `/ + % < > = ~ × ± ≤ ≥ °`.
 *
 * No semantic equivalence is attempted. "mcg" and "µg", "twice daily" and "every
 * 12 hours", "SC" and "subcutaneous", "0.5 mg" and "500 mcg" all remain different
 * wordings. Deciding that they are the same is a scientific judgement, and a
 * normaliser that made it would be able to hide a real difference — the one
 * failure this comparison exists to prevent. Erring this way can only show a
 * difference that a reader will see is superficial; it can never show agreement
 * that is not there.
 *
 * Pure and deterministic: no I/O, no locale-dependent comparison, no ranking.
 */

export type CellState = 'reported' | 'not_reported';
export type FieldState = 'agreement' | 'difference' | 'single' | 'none';

export interface ComparisonInput {
  /** The value exactly as the record holds it. */
  readonly value: string | null | undefined;
  /**
   * The source the record comes from. Used only to say whether a difference or
   * agreement spans sources or sits within one source's records. When absent,
   * the column is treated as its own source.
   */
  readonly sourceKey?: string | null | undefined;
}

export interface ComparisonCell {
  readonly state: CellState;
  /** The record's text, trimmed. Null only when the record holds nothing at all. */
  readonly raw: string | null;
  /** The reported value (the record's own words). Null when not reported. */
  readonly value: string | null;
  /**
   * For a not-reported cell whose placeholder carries more than the bare
   * placeholder — "Not specified by the source; a variant for women is
   * described." — the full text, so nothing the extractor wrote is hidden.
   * Null otherwise.
   */
  readonly note: string | null;
  /** Index of this cell's distinct wording, in left-to-right order. Null when not reported. */
  readonly wording: number | null;
  readonly sourceKey: string | null;
}

export interface Wording {
  readonly index: number;
  /** "A", "B", … — an index, never a rank. */
  readonly letter: string;
  /** The first record's own text for this wording. */
  readonly value: string;
  readonly normalised: string;
  /** Column indexes that report this wording. */
  readonly columns: readonly number[];
}

export interface FieldClassification {
  readonly state: FieldState;
  readonly cells: readonly ComparisonCell[];
  readonly wordings: readonly Wording[];
  readonly total: number;
  readonly reportedCount: number;
  readonly notReportedCount: number;
  /** Distinct sources among the reported cells. */
  readonly reportingSourceCount: number;
  /**
   * True when the reported cells come from more than one source. A difference
   * (or agreement) between two records from the same handbook is still real, but
   * it is not a difference *between sources*, and the label says so.
   */
  readonly acrossSources: boolean;
  /** Column indexes that do not report the field. */
  readonly notReportedColumns: readonly number[];
}

/* ==========================================================================
   Absence
   ========================================================================== */

const ABSENCE_VERB = String.raw`not\s+(?:specified|stated|reported|recorded|given|provided|described)`;
const ABSENCE_WHERE = String.raw`(?:\s+(?:by|in)\s+(?:the|this|these|that)\s+(?:source|sources|abstract|record|paper|article|label|labelling|handbook|document|study|trial))?`;

/** The whole value is a placeholder and nothing more. */
const BARE_ABSENCE = new RegExp(
  String.raw`^(?:${ABSENCE_VERB}${ABSENCE_WHERE}|unspecified|none\s+(?:specified|stated|reported)|n\s*/\s*a|[-‐-―−]+)\s*[.;:]?$`,
  'i',
);

/**
 * The value opens with a placeholder and then qualifies it. The placeholder has
 * to be followed by a sentence break or by "beyond", so "Not more than three
 * months" — a real duration — is never read as absence.
 */
const QUALIFIED_ABSENCE = new RegExp(
  String.raw`^(?:${ABSENCE_VERB}${ABSENCE_WHERE}|unspecified)(?:\s*[.;:,(—–]|\s+beyond\b)`,
  'i',
);

/**
 * Whether a record's value means "this source does not specify the field".
 *
 * Covers what the data actually holds — null, empty or whitespace, "Not
 * specified.", "Not specified by the source.", "Not stated", "Not stated by the
 * source", "Not stated in this abstract" and qualified forms of them — plus the
 * obvious neighbours ("Not reported", "Unspecified", "N/A", a lone dash).
 * "Unknown" is deliberately not treated as absence: in this index it can be an
 * editorial finding rather than a gap in one source.
 */
export function isNotReported(value: string | null | undefined): boolean {
  if (value === null || value === undefined) return true;
  const trimmed = value.trim();
  if (trimmed === '') return true;
  return BARE_ABSENCE.test(trimmed) || QUALIFIED_ABSENCE.test(trimmed);
}

/** The extra text a qualified placeholder carries, or null for bare absence and for reported values. */
export function absenceNote(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = value.trim();
  if (trimmed === '' || BARE_ABSENCE.test(trimmed)) return null;
  return QUALIFIED_ABSENCE.test(trimmed) ? trimmed : null;
}

/* ==========================================================================
   Normalisation — presentation only
   ========================================================================== */

const RANGE = '';
const DECIMAL_POINT = '';
const DECIMAL_COMMA = '';
const MINUS = '';
const KEPT_SYMBOLS = '/+%<>=~×±≤≥°';

/**
 * The comparison key for a reported value. See the module comment for exactly
 * what is and is not normalised.
 */
export function normaliseForComparison(value: string): string {
  let s = value.normalize('NFKC').toLowerCase();

  // Every dash is one range mark; protect it where it sits between digits.
  s = s.replace(/[‐-―−]/g, '-');
  s = s.replace(/(\d)\s*-\s*(?=\d)/g, `$1${RANGE}`);
  s = s.replace(/(^|\s)-(?=\d)/g, `$1${MINUS}`);
  // Separators inside numbers are quantities.
  s = s.replace(/(\d)\.(?=\d)/g, `$1${DECIMAL_POINT}`);
  s = s.replace(/(\d),(?=\d)/g, `$1${DECIMAL_COMMA}`);

  // Everything else that is neither a letter, a digit nor a kept symbol is
  // presentation.
  const kept = KEPT_SYMBOLS.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
  s = s.replace(new RegExp(`[^\\p{L}\\p{N}\\s${kept}${RANGE}${DECIMAL_POINT}${DECIMAL_COMMA}${MINUS}]`, 'gu'), ' ');

  // Spacing around symbols, and between a number and its unit.
  s = s.replace(new RegExp(`\\s*([${kept}])\\s*`, 'g'), ' $1 ');
  s = s.replace(/(\d)(?=\p{L})/gu, '$1 ');

  s = s.replace(/\s+/g, ' ').trim();

  return s
    .replaceAll(RANGE, '-')
    .replaceAll(DECIMAL_POINT, '.')
    .replaceAll(DECIMAL_COMMA, ',')
    .replaceAll(MINUS, '-');
}

/* ==========================================================================
   Classification
   ========================================================================== */

/** A, B, … Z, AA, AB, … — bijective base 26, so a letter never reads as a column number. */
export function wordingLetter(index: number): string {
  let n = index + 1;
  let out = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

export function classifyField(inputs: readonly ComparisonInput[]): FieldClassification {
  const byKey = new Map<string, { index: number; value: string; columns: number[] }>();
  const cells: ComparisonCell[] = inputs.map((input, column) => {
    const raw = input.value === null || input.value === undefined ? null : input.value.trim();
    const sourceKey = input.sourceKey ?? null;
    if (isNotReported(raw)) {
      return {
        state: 'not_reported',
        raw: raw === '' ? null : raw,
        value: null,
        note: absenceNote(raw),
        wording: null,
        sourceKey,
      };
    }
    const value = raw!;
    const key = normaliseForComparison(value);
    let entry = byKey.get(key);
    if (entry === undefined) {
      entry = { index: byKey.size, value, columns: [] };
      byKey.set(key, entry);
    }
    entry.columns.push(column);
    return { state: 'reported', raw: value, value, note: null, wording: entry.index, sourceKey };
  });

  const wordings: Wording[] = [...byKey.entries()].map(([normalised, e]) => ({
    index: e.index,
    letter: wordingLetter(e.index),
    value: e.value,
    normalised,
    columns: e.columns,
  }));

  const reportedCount = cells.filter((c) => c.state === 'reported').length;
  const reportingSources = new Set(
    cells.flatMap((c, column) =>
      c.state === 'reported' ? [c.sourceKey ?? ` column:${String(column)}`] : [],
    ),
  );

  const state: FieldState =
    reportedCount === 0
      ? 'none'
      : reportedCount === 1
        ? 'single'
        : wordings.length > 1
          ? 'difference'
          : 'agreement';

  return {
    state,
    cells,
    wordings,
    total: cells.length,
    reportedCount,
    notReportedCount: cells.length - reportedCount,
    reportingSourceCount: reportingSources.size,
    acrossSources: reportingSources.size > 1,
    notReportedColumns: cells.flatMap((c, column) => (c.state === 'not_reported' ? [column] : [])),
  };
}

/** The owner's words for each state, for any surface that prints one. */
export const FIELD_STATE_TERM: Readonly<Record<FieldState, string>> = {
  agreement: 'Agreement',
  difference: 'Difference',
  single: 'Reported by one only',
  none: 'Not reported',
};

export const NOT_REPORTED_TERM = 'Not reported';
