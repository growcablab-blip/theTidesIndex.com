'use client';

import { useEffect } from 'react';
import { expandForPrint } from '@/domain/presentation/print-expansion';

/**
 * Opens every `<details>` for printing and restores the reader's view afterwards.
 *
 * Mounted once in the public layout. Renders nothing. See
 * `src/domain/presentation/print-expansion.ts` for the rule it enforces; the
 * print stylesheet in `globals.css` reveals closed disclosures on its own where
 * the browser supports it, so a page printed with JavaScript off is still whole.
 */
export function PrintExpander(): null {
  useEffect(() => {
    let restore: (() => void) | null = null;

    const beforePrint = () => {
      // A second beforeprint without an afterprint must not record the
      // already-opened disclosures as "open before printing".
      if (restore !== null) return;
      restore = expandForPrint(document.querySelectorAll('details'));
    };
    const afterPrint = () => {
      restore?.();
      restore = null;
    };

    window.addEventListener('beforeprint', beforePrint);
    window.addEventListener('afterprint', afterPrint);
    return () => {
      window.removeEventListener('beforeprint', beforePrint);
      window.removeEventListener('afterprint', afterPrint);
    };
  }, []);

  return null;
}
