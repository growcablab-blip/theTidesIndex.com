/**
 * Captures the protocol library.
 *
 *   npm run tides                (in one terminal)
 *   npm run shots:protocols      (in another)
 *
 * Output: review/protocols-v2/
 */
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium, type Browser, type Page } from 'playwright-core';

const BASE = process.env.TIDES_BASE_URL ?? 'http://localhost:3000';
const OUT = fileURLToPath(new URL('../../review/protocols-v2/', import.meta.url));
mkdirSync(OUT, { recursive: true });

const MAX_CAPTURE_HEIGHT = 14_000;

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

async function setMode(page: Page, mode: 'Simple' | 'Practitioner'): Promise<void> {
  const button = page.getByRole('button', { name: mode, exact: true }).first();
  if ((await button.getAttribute('aria-pressed')) === 'true') return;
  await Promise.all([page.waitForLoadState('networkidle'), button.click()]);
  await page.waitForTimeout(600);
}

async function full(page: Page, file: string, label: string): Promise<void> {
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  const width = await page.evaluate(() => document.documentElement.clientWidth);
  const parts = Math.max(1, Math.ceil(height / MAX_CAPTURE_HEIGHT));
  for (let index = 0; index < parts; index++) {
    const y = index * MAX_CAPTURE_HEIGHT;
    const path = parts === 1 ? `${OUT}${file}` : `${OUT}${file.replace(/\.png$/, `-part${String(index + 1)}.png`)}`;
    await page.screenshot({
      path,
      fullPage: true,
      ...(parts === 1 ? {} : { clip: { x: 0, y, width, height: Math.min(MAX_CAPTURE_HEIGHT, height - y) } }),
      animations: 'disabled',
      caret: 'hide',
      timeout: 90_000,
      scale: 'css',
    });
    console.log(`  ${label.padEnd(38)} ${path.slice(OUT.length)}`);
  }
}

async function section(page: Page, selector: string, file: string, label: string): Promise<void> {
  const node = page.locator(selector).first();
  if ((await node.count()) === 0 || !(await node.isVisible())) {
    console.log(`  ${label.padEnd(38)} (not on page)`);
    return;
  }
  await node.screenshot({ path: `${OUT}${file}` });
  console.log(`  ${label.padEnd(38)} ${file}`);
}

const browser = await launch();
try {
  console.log('');
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();

  await page.goto(`${BASE}/protocols`, { waitUntil: 'networkidle', timeout: 45_000 });
  await setMode(page, 'Simple');
  await full(page, 'library-simple.png', 'Library, simple');

  await setMode(page, 'Practitioner');
  await full(page, 'library-practitioner.png', 'Library, practitioner');
  await section(page, '#evidence-context', 'evidence-context-legend.png', 'Evidence-context legend');

  for (const [slug, name] of [
    ['bpc-157', 'BPC-157'],
    ['tb-500', 'TB-500'],
    ['thymosin-beta-4', 'Thymosin beta-4'],
    ['tesamorelin', 'Tesamorelin'],
  ] as const) {
    await page.goto(`${BASE}/protocols?peptide=${slug}`, { waitUntil: 'networkidle', timeout: 45_000 });
    await section(page, '#comparison', `comparison-${slug}.png`, `${name} comparison`);
  }

  await page.goto(`${BASE}/protocols?route=subcutaneous`, { waitUntil: 'networkidle', timeout: 45_000 });
  await full(page, 'filter-subcutaneous.png', 'Filter: subcutaneous');

  await page.goto(`${BASE}/search?q=${encodeURIComponent('Seeds protocols')}`, { waitUntil: 'networkidle', timeout: 45_000 });
  await full(page, 'search-seeds-protocols.png', 'Search: "Seeds protocols"');

  await context.close();

  const mobile = await browser.newContext({
    viewport: { width: 375, height: 812 },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
    isMobile: true,
    hasTouch: true,
  });
  const phone = await mobile.newPage();
  await phone.goto(`${BASE}/protocols?peptide=tb-500`, { waitUntil: 'networkidle', timeout: 45_000 });
  await setMode(phone, 'Practitioner');
  await full(phone, 'mobile-tb-500-practitioner.png', 'Mobile TB-500, practitioner');
  await mobile.close();

  console.log(`\n  ${OUT}\n`);
} catch (error) {
  console.error('Capture failed:', error);
  process.exitCode = 1;
} finally {
  await browser.close();
}
