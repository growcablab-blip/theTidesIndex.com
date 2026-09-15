import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ILLUSTRATIONS } from '@/components/illustrations';

/**
 * The figure library must list every registered drawing.
 *
 * The library groups figures by hand, so a figure added to the registry — and
 * printed in a publication — could otherwise be missing from the one page where
 * a reviewer checks every drawing against its basis.
 */
describe('the figure library', () => {
  const page = readFileSync('src/app/(public)/learn/figures/page.tsx', 'utf8');
  const block = /const GROUPS[\s\S]*?\n\];/.exec(page)?.[0] ?? '';
  const listed = [...block.matchAll(/'([a-z-]+)'/g)].map((m) => m[1] ?? '');

  it('lists every registered illustration exactly once', () => {
    for (const key of Object.keys(ILLUSTRATIONS)) {
      expect(listed.filter((k) => k === key), key).toHaveLength(1);
    }
  });
});
