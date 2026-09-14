/**
 * The amount a source reported, with its unit attached.
 *
 * Two source conventions collide here, and printing either one naively is
 * wrong:
 *
 *   - Most sources write the unit into the amount: "500 mcg", "1-2 mg". The
 *     parsed `amountUnit` beside it is a filtering hint, and appending it
 *     printed "500 mcg mcg".
 *   - Some write the amount alone and put the unit in a column heading:
 *     "250", with `mcg` in the unit field. Printing that verbatim gives a
 *     clinician a bare number in a dosing table, which is the worse failure
 *     of the two — it is not ambiguous, it is unreadable.
 *
 * So the unit is appended only when the source's own wording carries no
 * letters. The reported value is never converted, normalised or recalculated;
 * this adds the unit the record already holds and nothing else.
 *
 * Found by reading a review screenshot of the BPC-157 practitioner card,
 * which showed "Amount 250" — five regimens on that record and one on
 * tesamorelin store the amount this way.
 */
export interface ReportedAmount {
  readonly amountReported: string | null;
  readonly amountUnit: string | null;
}

export function amountAsReported(protocol: ReportedAmount): string | null {
  const amount = protocol.amountReported?.trim();
  if (amount === undefined || amount === '') return null;

  const unit = protocol.amountUnit?.trim();
  if (unit === undefined || unit === '') return amount;

  return /[A-Za-z]/.test(amount) ? amount : `${amount} ${unit}`;
}
