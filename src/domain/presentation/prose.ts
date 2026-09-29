/**
 * Splitting a record's prose into sentences, for typographic ranking only.
 *
 * The claim texts on a compound record run to five or six hundred characters,
 * and in one block of running text nothing in them can be found. The fix is to
 * rank what is already there — lead the paragraph with its first sentence and
 * let the rest follow — rather than to summarise, which would put a sentence on
 * the public site that no reviewer wrote.
 *
 * So this function never changes a word, never drops one and never reorders
 * one. `splitSentences(text).join(' ')` returns the input, and there is a test
 * that says so. Every risk here is a *split in the wrong place*, which is a
 * cosmetic fault; there is no path by which it can alter meaning.
 */

/**
 * Abbreviations that end in a full stop mid-sentence.
 *
 * Drawn from what the records actually contain — citations carry "et al.",
 * evidence notes carry "vs." and "approx." — plus the obvious titles. A miss
 * here costs a paragraph break in an odd place, nothing more.
 */
const ABBREVIATIONS: ReadonlySet<string> = new Set([
  'al',
  'approx',
  'cf',
  'dr',
  'e.g',
  'eg',
  'et',
  'fig',
  'i.e',
  'ie',
  'inc',
  'jr',
  'ltd',
  'mr',
  'mrs',
  'ms',
  'no',
  'p',
  'pp',
  'prof',
  'sr',
  'st',
  'vs',
  'vol',
]);

/** The token immediately before a full stop, lower-cased and unpunctuated. */
function tokenBefore(text: string, stopIndex: number): string {
  let start = stopIndex;
  while (start > 0 && /[^\s]/.test(text[start - 1] ?? '')) start -= 1;
  return text.slice(start, stopIndex).toLowerCase();
}

/**
 * Split on sentence boundaries, keeping every character.
 *
 * A boundary is a `.`, `?` or `!` followed by whitespace and an opening
 * character — an upper-case letter, a digit or a quote. Anything else is left
 * alone, which is why decimals, ranges and mid-sentence abbreviations survive.
 */
export function splitSentences(text: string): string[] {
  const sentences: string[] = [];
  let start = 0;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char !== '.' && char !== '?' && char !== '!') continue;

    // Consume a run of terminators, so "…?!" stays with its sentence.
    let end = i;
    while (end + 1 < text.length && /[.?!]/.test(text[end + 1] ?? '')) end += 1;

    const after = text.slice(end + 1);
    const gap = /^\s+/.exec(after);
    if (gap === null) continue;

    const next = after[gap[0].length];
    if (next === undefined) continue;
    // A new sentence opens with a capital, a digit or a quotation mark.
    if (!/[A-Z0-9“"'(]/.test(next)) continue;

    if (char === '.') {
      const token = tokenBefore(text, i);
      if (ABBREVIATIONS.has(token)) continue;
      // A single letter before a stop is an initial: "J. F. Tremblay".
      if (token.length === 1 && /[a-z]/.test(token)) continue;
    }

    sentences.push(text.slice(start, end + 1 + gap[0].length));
    start = end + 1 + gap[0].length;
    i = end;
  }

  const tail = text.slice(start);
  if (tail !== '') sentences.push(tail);
  return sentences;
}

export interface RankedProse {
  /** The first sentence, which in these records carries the finding. */
  readonly lead: string;
  /** Everything after it, grouped into paragraphs. Empty for short texts. */
  readonly rest: readonly string[];
}

/**
 * Rank a record's prose: lead sentence, then the remainder in paragraphs.
 *
 * Below `minLength` the text is left whole, because breaking up two short
 * sentences makes them harder to read rather than easier. Nothing is ever
 * hidden: `rest` is always rendered, immediately under the lead.
 */
export function rankProse(text: string, options: { minLength?: number } = {}): RankedProse {
  const minLength = options.minLength ?? 260;
  const trimmed = text.trim();
  if (trimmed.length < minLength) return { lead: trimmed, rest: [] };

  const sentences = splitSentences(trimmed);
  if (sentences.length < 2) return { lead: trimmed, rest: [] };

  const [first, ...remainder] = sentences;

  // Two sentences to a paragraph, so the remainder has shape without becoming
  // a list of one-liners.
  const paragraphs: string[] = [];
  for (let i = 0; i < remainder.length; i += 2) {
    paragraphs.push(
      remainder
        .slice(i, i + 2)
        .join('')
        .trim(),
    );
  }

  return { lead: (first ?? '').trim(), rest: paragraphs.filter((p) => p !== '') };
}
