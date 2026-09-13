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
import { chromium, type Browser, type Page } from 'playwright-core';

const BASE = process.env.TIDES_BASE_URL ?? 'http://localhost:3000';
const REVIEW = fileURLToPath(new URL('../../review/', import.meta.url));

/**
 * Every surface the completion sprint has to show, plus one record in each
 * reading depth. The two depths are the pair worth capturing: they are the
 * claim that patient mode carries no dosing, and a screenshot is how somebody
 * checks it without reading the query.
 */
const SHOTS: readonly {
  folder: string;
  file: string;
  path: string;
  mode?: 'Simple' | 'Practitioner';
}[] = [
  { folder: 'product-v3', file: 'home', path: '/' },
  { folder: 'product-v3', file: 'learn', path: '/learn' },
  { folder: 'product-v3', file: 'protocols', path: '/protocols' },
  { folder: 'product-v3', file: 'sequence-to-vial', path: '/quality/sequence-to-vial' },
  { folder: 'peptides-v2', file: 'index', path: '/peptides' },
  { folder: 'peptides-v2', file: 'index-given-to-people', path: '/peptides?human=yes' },
  { folder: 'peptides-v2', file: 'index-handbooks-only', path: '/peptides?regimen=handbook-only' },
  { folder: 'research-v1', file: 'research', path: '/research' },
  { folder: 'research-v1', file: 'research-identity', path: '/research?type=identity_clarification' },
  {
    folder: 'product-v3',
    file: 'record-simple',
    path: '/peptides/retatrutide',
    mode: 'Simple',
  },
  {
    folder: 'product-v3',
    file: 'record-practitioner',
    path: '/peptides/retatrutide',
    mode: 'Practitioner',
  },
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

/**
 * Reading depth is a cookie set by a server action, so a capture that wants a
 * particular depth presses the switch and waits for the reload.
 */
async function setMode(page: Page, mode: 'Simple' | 'Practitioner'): Promise<void> {
  const button = page.getByRole('button', { name: mode, exact: true }).first();
  if ((await button.count()) === 0) return;
  if ((await button.getAttribute('aria-pressed')) === 'true') return;
  await Promise.all([page.waitForLoadState('networkidle'), button.click()]);
  await page.waitForTimeout(600);
}

async function main(): Promise<void> {
  const browser = await launch();
  try {
    for (const width of [1280, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      for (const shot of SHOTS) {
        mkdirSync(`${REVIEW}${shot.folder}`, { recursive: true });
        await page.goto(`${BASE}${shot.path}`, { waitUntil: 'networkidle' });
        if (shot.mode !== undefined) await setMode(page, shot.mode);
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
