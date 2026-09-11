'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { isReadingMode, READING_MODE_COOKIE } from '@/server/public/reading-mode';

/**
 * Sets the reading depth.
 *
 * A server action rather than client state, because the mode decides which
 * database relation a page reads from. Doing it on the client would mean the
 * practitioner payload had already been sent to a reader in patient mode.
 */
export async function setReadingModeAction(formData: FormData): Promise<void> {
  const requested = formData.get('mode');
  const path = formData.get('path');

  if (!isReadingMode(requested)) return;

  const store = await cookies();
  store.set(READING_MODE_COOKIE, requested, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
    httpOnly: false,
  });

  revalidatePath(typeof path === 'string' && path.startsWith('/') ? path : '/', 'page');
}
