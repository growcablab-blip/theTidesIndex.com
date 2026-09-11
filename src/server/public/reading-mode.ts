import 'server-only';
import { cookies } from 'next/headers';
import type { ReadingMode } from '@/domain/presentation/reading-mode';

/**
 * Reading depth, remembered per visitor.
 *
 * Default is `simple`. A reader who has not chosen gets the plain-language
 * presentation, which is the safer default for someone who arrived from a
 * search engine with no clinical background.
 *
 * The mode changes which *relation* a page reads from, not merely which
 * elements render. Patient mode is served from a view with no dosing columns in
 * it, so the choice is enforced at the data boundary.
 */

export const READING_MODE_COOKIE = 'tides-reading-mode';

export async function getReadingMode(): Promise<ReadingMode> {
  const store = await cookies();
  return store.get(READING_MODE_COOKIE)?.value === 'practitioner' ? 'practitioner' : 'simple';
}

export function isReadingMode(value: unknown): value is ReadingMode {
  return value === 'simple' || value === 'practitioner';
}
