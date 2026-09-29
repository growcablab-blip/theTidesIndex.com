/**
 * What a compound is being researched for, read off its held protocols.
 *
 * This used to be a regex table inside a React component, which is the wrong
 * place for it twice over: a category is a statement about what a compound is
 * studied for, and a statement of that kind belongs somewhere it can be tested
 * and reviewed rather than somewhere it is invisible in a render tree.
 *
 * Two properties make it safe:
 *
 *  - **Nothing fires without a record.** A pattern only produces an interest if
 *    it matches the objective text of a protocol actually on the page, and the
 *    result carries that objective verbatim so the card cites rather than
 *    asserts.
 *  - **The table is explicit.** No stemming, no inference, no cleverness. A
 *    compound is never given an interest because it "looks like" something.
 *
 * Simple reading gets nothing from this, and that is correct rather than a
 * gap to paper over — see `SIMPLE_MODE_NOTE` below.
 */
import type { SimpleProtocol } from '@/server/public/shapes';

const INTEREST_SIGNALS: readonly (readonly [RegExp, string])[] = [
  [/tendon|ligament|tissue repair|joint|musculoskelet/i, 'Tissue and joint repair'],
  [/heal|recovery|repair/i, 'Healing and recovery'],
  [/gastro|gut|intestin|ulcer|colitis/i, 'Gastrointestinal research'],
  [/inflamm/i, 'Inflammation'],
  [/skin|derma|hair/i, 'Skin and hair'],
  [/cystitis|bladder|urolog/i, 'Urological research'],
  [/knee|pain/i, 'Pain research'],
  [/muscle|hypertroph|anabolic/i, 'Muscle'],
  [/sleep/i, 'Sleep'],
  [/cognit|neuro|brain/i, 'Neurological research'],
  [/immune/i, 'Immune research'],
  [/metabol|fat loss|weight/i, 'Metabolic research'],
];

export interface ResearchInterest {
  readonly label: string;
  /** How many of the compound's protocols name this context. */
  readonly count: number;
  /** One matching objective, verbatim, so the card quotes rather than asserts. */
  readonly example: string;
}

/**
 * Derive research interests from a compound's protocols.
 *
 * Returns at most six, in table order. A protocol set that mentions nothing
 * recognised produces an empty list, and the band that renders it disappears.
 */
export function researchInterests(protocols: readonly SimpleProtocol[]): ResearchInterest[] {
  const found: ResearchInterest[] = [];
  for (const [pattern, label] of INTEREST_SIGNALS) {
    if (found.some((f) => f.label === label)) continue;
    const matches = protocols.filter((p) => pattern.test(p.objectiveContext));
    if (matches.length === 0) continue;
    found.push({ label, count: matches.length, example: matches[0]?.objectiveContext ?? '' });
  }
  return found.slice(0, 6);
}

/**
 * Why simple reading has no research-interest band, and what would give it one.
 *
 * The interests above are derived from protocol objectives. Every BPC-157
 * protocol carries `patient_visibility = false`, so `public_v_protocol_simple`
 * returns nothing and there is nothing to derive from. That is the patient
 * boundary working, not a bug.
 *
 * Three ways to close it were considered:
 *
 *  1. **Derive from simple-eligible claim prose.** Rejected. It is the same
 *     regex inference applied to a different paragraph, and a research area
 *     inferred from a sentence about pharmacokinetics is a category nobody
 *     assigned.
 *  2. **Use `primary_category_key`.** The register holds exactly one category
 *     per compound — BPC-157 is `repair-recovery`, "Repair and recovery". It is
 *     structured, reviewed and available in both readings, so it is now used
 *     for the hero's classification line. But one value is a classification,
 *     not a set of research interests, and rendering a band from it would
 *     overstate what the register holds.
 *  3. **Tag research areas structurally.** The real fix, and a data-model
 *     change rather than a presentation one: a compound needs a reviewed
 *     many-to-many relation to research areas — or protocols need a
 *     patient-visible research-area column — so the band can be derived from
 *     records rather than from prose, in both readings.
 *
 * Until (3) exists the band stays practitioner-only. Filling the space with an
 * inferred taxonomy would be inventing content to fix a layout.
 */
export const SIMPLE_MODE_NOTE =
  'Research interests derive from protocol objectives, which patient-visible ' +
  'records do not carry. A structured compound-to-research-area relation would ' +
  'be required to render this band in simple reading.';
