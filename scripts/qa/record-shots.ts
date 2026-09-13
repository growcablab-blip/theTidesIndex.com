/**
 * Captures one or more peptide records for review.
 *
 *   npm run tides                                  (in one terminal)
 *   npm run shots:record -- retatrutide ghk-cu     (in another)
 *
 * Each slug goes to its own review folder (review/<folder>-v1/), named as the
 * expansion brief names them. Reading depth is a cookie set by a server
 * action, so a capture that wants both modes presses the switch and waits.
 */
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium, type Browser, type Page } from 'playwright-core';

const BASE = process.env.TIDES_BASE_URL ?? 'http://localhost:3000';
const REVIEW = fileURLToPath(new URL('../../review/', import.meta.url));
const MAX_CAPTURE_HEIGHT = 14_000;

const FOLDERS: Record<string, string> = {
  retatrutide: 'retatrutide-v1',
  'ghk-cu': 'ghkcu-v1',
  'cjc-1295': 'cjc-v1',
  ipamorelin: 'ipamorelin-v1',
  'mots-c': 'motsc-v1',
  semax: 'semax-v1',
  selank: 'selank-v1',
};

const SECTIONS: readonly [string, string][] = [
  ['nomenclature', 'nomenclature-map'],
  ['evidence', 'evidence'],
  ['literature', 'evidence-landscape'],
  ['replication', 'replication'],
  ['pharmacokinetics', 'pharmacokinetics'],
  ['routes', 'routes'],
  ['protocols', 'protocols'],
  ['disagreements', 'disagreements'],
  ['research-questions', 'research-opportunities'],
  ['regulatory', 'regulatory'],
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

async function setMode(page: Page, mode: 'Simple' | 'Practitioner'): Promise<void> {
  const button = page.getByRole('button', { name: mode, exact: true }).first();
  if ((await button.getAttribute('aria-pressed')) === 'true') return;
  await Promise.all([page.waitForLoadState('networkidle'), button.click()]);
  await page.waitForTimeout(600);
}

async function full(page: Page, out: string, file: string, label: string): Promise<void> {
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  const width = await page.evaluate(() => document.documentElement.clientWidth);
  const parts = Math.max(1, Math.ceil(height / MAX_CAPTURE_HEIGHT));
  for (let index = 0; index < parts; index++) {
    const y = index * MAX_CAPTURE_HEIGHT;
    const name = parts === 1 ? file : file.replace(/\.png$/, `-part${String(index + 1)}.png`);
    await page.screenshot({
      path: `${out}${name}`,
      fullPage: true,
      ...(parts === 1 ? {} : { clip: { x: 0, y, width, height: Math.min(MAX_CAPTURE_HEIGHT, height - y) } }),
      animations: 'disabled',
      caret: 'hide',
      timeout: 90_000,
      scale: 'css',
    });
    console.log(`  ${label.padEnd(40)} ${name}`);
  }
}

async function capture(page: Page, out: string, selector: string, file: string, label: string): Promise<void> {
  const node = page.locator(selector).first();
  if ((await node.count()) === 0 || !(await node.isVisible())) {
    console.log(`  ${label.padEnd(40)} (not on page)`);
    return;
  }
  await node.screenshot({ path: `${out}${file}` });
  console.log(`  ${label.padEnd(40)} ${file}`);
}

const slugs = process.argv.slice(2).filter((arg) => !arg.startsWith('-'));
if (slugs.length === 0) {
  console.error(`Name at least one record: ${Object.keys(FOLDERS).join(', ')}`);
  process.exit(1);
}

const browser = await launch();
try {
  for (const slug of slugs) {
    const out = `${REVIEW}${FOLDERS[slug] ?? `${slug}-v1`}/`;
    mkdirSync(out, { recursive: true });
    console.log(`\n${slug}`);

    const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    const page = await desktop.newPage();
    await page.goto(`${BASE}/peptides/${slug}`, { waitUntil: 'networkidle', timeout: 60_000 });

    await setMode(page, 'Simple');
    await full(page, out, `${slug}-simple.png`, 'Simple');

    await setMode(page, 'Practitioner');
    await full(page, out, `${slug}-practitioner.png`, 'Practitioner');
    await capture(page, out, 'section[aria-labelledby="at-a-glance"]', `${slug}-at-a-glance.png`, 'Evidence at a glance');
    for (const [id, name] of SECTIONS) {
      await capture(page, out, `#${id}`, `${slug}-${name}.png`, id);
    }

    await page.goto(`${BASE}/protocols?peptide=${slug}`, { waitUntil: 'networkidle', timeout: 60_000 });
    await capture(page, out, '#comparison', `${slug}-protocol-comparison.png`, 'Protocol comparison');
    await desktop.close();

    const mobile = await browser.newContext({
      viewport: { width: 375, height: 812 },
      deviceScaleFactor: 1,
      reducedMotion: 'reduce',
      isMobile: true,
      hasTouch: true,
    });
    const phone = await mobile.newPage();
    await phone.goto(`${BASE}/peptides/${slug}`, { waitUntil: 'networkidle', timeout: 60_000 });
    await setMode(phone, 'Simple');
    await full(phone, out, `mobile-${slug}-simple.png`, 'Mobile simple');
    await mobile.close();
    console.log(`  ${out}`);
  }
} catch (error) {
  console.error('Capture failed:', error);
  process.exitCode = 1;
} finally {
  await browser.close();
}
