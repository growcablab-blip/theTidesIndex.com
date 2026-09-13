/**
 * Captures the Thymosin beta-4 / TB-500 records and the site-wide hierarchy
 * correction.
 *
 *   npm run tides           (in one terminal)
 *   npm run shots:tb500     (in another)
 *
 * Two output folders, because they answer two questions:
 *
 *   review/tb500-v1/            the new records and their modules
 *   review/tb500-v1/sitewide/   the existing pages after the emphasis reset
 *
 * Reading depth is a cookie set by a server action, so a capture that wants
 * both modes presses the switch and waits for the round trip.
 */
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium, type Browser, type Page } from 'playwright-core';

const BASE = process.env.TIDES_BASE_URL ?? 'http://localhost:3000';
const OUT = fileURLToPath(new URL('../../review/tb500-v1/', import.meta.url));
const SITEWIDE = `${OUT}sitewide/`;
mkdirSync(SITEWIDE, { recursive: true });

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

/** Chrome refuses a single capture much taller than this. */
const MAX_CAPTURE_HEIGHT = 14_000;

/**
 * A full-page capture, split into segments when the page is too tall for one.
 *
 * The Thymosin beta-4 record is long enough that Chrome's compositor refuses a
 * single full-page screenshot ("Unable to capture screenshot"). Segments are
 * written as `name-part1.png`, `name-part2.png` … in page order, each a clip of
 * the page at its own scroll offset, so nothing is dropped and nothing is
 * scaled into illegibility.
 */
async function full(page: Page, path: string, label: string): Promise<void> {
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  const width = await page.evaluate(() => document.documentElement.clientWidth);

  if (height <= MAX_CAPTURE_HEIGHT) {
    await page.screenshot({
      path,
      fullPage: true,
      animations: 'disabled',
      caret: 'hide',
      timeout: 90_000,
      scale: 'css',
    });
    console.log(`  ${label.padEnd(40)} ${path.slice(OUT.length)}`);
    return;
  }

  const parts = Math.ceil(height / MAX_CAPTURE_HEIGHT);
  for (let index = 0; index < parts; index++) {
    const y = index * MAX_CAPTURE_HEIGHT;
    const partPath = path.replace(/\.png$/, `-part${String(index + 1)}.png`);
    await page.screenshot({
      path: partPath,
      fullPage: true,
      clip: { x: 0, y, width, height: Math.min(MAX_CAPTURE_HEIGHT, height - y) },
      animations: 'disabled',
      caret: 'hide',
      timeout: 90_000,
      scale: 'css',
    });
    console.log(`  ${`${label} (${String(index + 1)}/${String(parts)})`.padEnd(40)} ${partPath.slice(OUT.length)}`);
  }
}

async function section(page: Page, id: string, path: string, label: string): Promise<void> {
  const node = page.locator(`#${id}`).first();
  if ((await node.count()) === 0 || !(await node.isVisible())) {
    console.log(`  ${label.padEnd(40)} (section #${id} not on page)`);
    return;
  }
  await node.screenshot({ path });
  console.log(`  ${label.padEnd(40)} ${path.slice(OUT.length)}`);
}

async function glance(page: Page, path: string, label: string): Promise<void> {
  const node = page.locator('section[aria-labelledby="at-a-glance"]').first();
  if ((await node.count()) === 0) return;
  await node.screenshot({ path });
  console.log(`  ${label.padEnd(40)} ${path.slice(OUT.length)}`);
}

const browser = await launch();

try {
  console.log('');

  // --- Desktop ---------------------------------------------------------------
  const desktop = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
  });
  const page = await desktop.newPage();

  for (const [slug, name] of [
    ['thymosin-beta-4', 'Thymosin beta-4'],
    ['tb-500', 'TB-500'],
  ] as const) {
    await page.goto(`${BASE}/peptides/${slug}`, { waitUntil: 'networkidle', timeout: 45_000 });

    await setMode(page, 'Simple');
    await full(page, `${OUT}${slug}-simple.png`, `${name} simple`);

    await setMode(page, 'Practitioner');
    await full(page, `${OUT}${slug}-practitioner.png`, `${name} practitioner`);

    await glance(page, `${OUT}${slug}-at-a-glance.png`, `${name} evidence at a glance`);
    await section(page, 'nomenclature', `${OUT}${slug}-nomenclature-map.png`, `${name} nomenclature map`);
    await section(page, 'literature', `${OUT}${slug}-evidence-landscape.png`, `${name} evidence landscape`);
    await section(page, 'replication', `${OUT}${slug}-replication.png`, `${name} replication`);
    await section(
      page,
      'research-questions',
      `${OUT}${slug}-research-opportunities.png`,
      `${name} research opportunities`,
    );
    await section(page, 'protocols', `${OUT}${slug}-protocols.png`, `${name} protocols`);
  }

  // --- Site-wide hierarchy correction --------------------------------------
  for (const [path, file, label] of [
    ['/', 'homepage.png', 'Homepage'],
    ['/peptides', 'peptides-index.png', 'Peptides index'],
  ] as const) {
    await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle', timeout: 45_000 });
    await full(page, `${SITEWIDE}${file}`, label);
  }

  for (const [slug, name] of [
    ['tesamorelin', 'Tesamorelin'],
    ['bpc-157', 'BPC-157'],
  ] as const) {
    await page.goto(`${BASE}/peptides/${slug}`, { waitUntil: 'networkidle', timeout: 45_000 });
    await setMode(page, 'Practitioner');
    await glance(page, `${SITEWIDE}${slug}-at-a-glance.png`, `${name} at a glance (reset)`);
    await full(page, `${SITEWIDE}${slug}-practitioner.png`, `${name} practitioner (reset)`);
  }
  await desktop.close();

  // --- Mobile ----------------------------------------------------------------
  const mobile = await browser.newContext({
    viewport: { width: 375, height: 812 },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
    isMobile: true,
    hasTouch: true,
  });
  const phone = await mobile.newPage();
  for (const slug of ['thymosin-beta-4', 'tb-500'] as const) {
    await phone.goto(`${BASE}/peptides/${slug}`, { waitUntil: 'networkidle', timeout: 45_000 });
    await setMode(phone, 'Simple');
    await full(phone, `${OUT}mobile-${slug}-simple.png`, `${slug} mobile simple`);
  }
  await mobile.close();

  console.log(`\n  ${OUT}\n`);
} catch (error) {
  console.error('Capture failed:', error);
  console.error('\nIs the site running? Start it with `npm run tides`.\n');
  process.exitCode = 1;
} finally {
  await browser.close();
}
