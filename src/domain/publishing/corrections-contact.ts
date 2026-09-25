/**
 * Where a reader sends a correction.
 *
 * There is no address in this repository, and one must not be invented: an
 * address printed on a transparency page that nobody reads is worse than an
 * admitted gap, because a reader who writes to it believes they have been
 * heard. So the address is configuration, the page renders whatever it is told,
 * and when it is told nothing the page says so plainly.
 *
 * `NEXT_PUBLIC_CORRECTIONS_EMAIL` is public by necessity — it is rendered as a
 * mailto link — which is also why it is validated here rather than trusted:
 * a malformed value would produce a link that silently does nothing.
 */

export interface CorrectionsContact {
  readonly email: string;
  readonly mailto: string;
}

/** A deliberately conservative check: one @, something either side, a dot after. */
function looksLikeAnAddress(value: string): boolean {
  return /^[^\s@]+@[^\s@.]+\.[^\s@]+$/.test(value);
}

/**
 * Subject and body are prefilled because a correction with no page reference
 * costs an exchange of emails to make actionable.
 */
export function correctionsContact(raw: string | undefined): CorrectionsContact | null {
  const email = raw?.trim() ?? '';
  if (email === '' || !looksLikeAnAddress(email)) return null;

  const subject = encodeURIComponent('Correction — The Tides Index');
  const body = encodeURIComponent(
    [
      'Page (URL):',
      '',
      'The statement I think is wrong:',
      '',
      'What I believe the correct position is:',
      '',
      'Source and page, if you have one:',
      '',
    ].join('\n'),
  );

  return { email, mailto: `mailto:${email}?subject=${subject}&body=${body}` };
}

export function currentCorrectionsContact(): CorrectionsContact | null {
  return correctionsContact(process.env.NEXT_PUBLIC_CORRECTIONS_EMAIL);
}
