import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { renderToStaticMarkup } from 'react-dom/server';
import { Disclosure } from '@/components/public/disclosure';
import { expandForPrint } from '@/domain/presentation/print-expansion';

/**
 * Print disclosures (owner decision, closed): printed material never hides
 * content merely because the web interface uses progressive disclosure.
 *
 * That only holds if a collapsed section's body is actually in the document —
 * print CSS can reveal what is there, not fetch what is not — and if the print
 * expander is mounted on every public page.
 */

const root = (path: string) => fileURLToPath(new URL(`../../${path}`, import.meta.url));

describe('print disclosures', () => {
  it('renders the disclosure body into the markup while closed', () => {
    const html = renderToStaticMarkup(
      <Disclosure summary="The sources behind this" count={2}>
        <p>Body that must reach paper</p>
      </Disclosure>,
    );
    expect(html).toContain('<details');
    // The open attribute itself, not the `open:` Tailwind variant in the class.
    expect(html).not.toMatch(/<details[^>]*\sopen(=|>|\s)/);
    expect(html).toContain('Body that must reach paper');
  });

  it('opens every closed disclosure for print and restores only those', () => {
    const closedA = { open: false };
    const alreadyOpen = { open: true };
    const closedB = { open: false };

    const restore = expandForPrint([closedA, alreadyOpen, closedB]);
    expect([closedA.open, alreadyOpen.open, closedB.open]).toEqual([true, true, true]);

    restore();
    expect([closedA.open, alreadyOpen.open, closedB.open]).toEqual([false, true, false]);
  });

  it('mounts the print expander in the public layout', () => {
    const layout = readFileSync(root('src/app/(public)/layout.tsx'), 'utf8');
    expect(layout).toMatch(/import \{ PrintExpander \} from '@\/components\/public\/print-expander'/);
    expect(layout).toContain('<PrintExpander />');

    const expander = readFileSync(root('src/components/public/print-expander.tsx'), 'utf8');
    expect(expander.trimStart().startsWith("'use client'")).toBe(true);
    expect(expander).toContain("'beforeprint'");
    expect(expander).toContain("'afterprint'");
  });

  it('keeps a print rule that reveals closed details content', () => {
    const css = readFileSync(root('src/styles/globals.css'), 'utf8');
    expect(css).toMatch(/details::details-content\s*\{[^}]*content-visibility:\s*visible/);
  });
});
