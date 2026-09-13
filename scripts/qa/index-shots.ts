/**
 * Captures the two cross-register pages for review.
 *
 *   npm run tides                  (in one terminal)
 *   npm run shots:index            (in another)
 *
 * The compound index goes to review/peptides-v2/ (unfiltered, and filtered to
 * compounds given to people) and the research agenda to review/research-v1/.
 */
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium, type Browser } from 'playwright-core';

const BASE = process.env.TIDES_BASE_URL ?? 'http://localhost:3000';
const REVIEW = fileURLToPath(new URL('../../review/', import.meta.url));

const SHOTS: readonly { folder: string; file: string; path: string }[] = [
  { folder: 'peptides-v2', file: 'index', path: '/peptides' },
  { folder: 'peptides-v2', file: 'index-given-to-people', path: '/peptides?human=yes' },
  { folder: 'peptides-v2', file: 'index-handbooks-only', path: '/peptides?regimen=handbook-only' },
  { folder: 'research-v1', file: 'research', path: '/research' },
  { folder: 'research-v1', file: 'research-identity', path: '/research?type=identity_clarification' },
];

async function launch(): Promise<Browser> {
  for (const channel of ['chrome', 'msedge'] as const) {
    try {
      return await chromium.launch({ channel });
    } catch {
      continue;
    }
  }
  throw new Error('No system Chrome or Edge found.');
}

async function main(): Promise<void> {
  const browser = await launch();
  try {
    for (const width of [1280, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      for (const shot of SHOTS) {
        mkdirSync(`${REVIEW}${shot.folder}`, { recursive: true });
        await page.goto(`${BASE}${shot.path}`, { waitUntil: 'networkidle' });
        const suffix = width < 768 ? '-mobile' : '';
        const out = `${REVIEW}${shot.folder}/${shot.file}${suffix}.png`;
        await page.screenshot({ path: out, fullPage: true });
        console.log(`  ${shot.folder}/${shot.file}${suffix}.png`);
      }
      await page.close();
    }
  } finally {
    await browser.close();
  }
}

void main();
