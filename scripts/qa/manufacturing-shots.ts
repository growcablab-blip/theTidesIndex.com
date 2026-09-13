/**
 * Captures "From sequence to final vial" and the manufacturing topics.
 *
 *   npm run tides                    (in one terminal)
 *   npm run shots:manufacturing      (in another)
 *
 * Output: review/manufacturing-v1/
 */
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium, type Browser, type Page } from 'playwright-core';

const BASE = process.env.TIDES_BASE_URL ?? 'http://localhost:3000';
const OUT = fileURLToPath(new URL('../../review/manufacturing-v1/', import.meta.url));
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

  await page.goto(`${BASE}/quality/sequence-to-vial`, { waitUntil: 'networkidle', timeout: 60_000 });
  await setMode(page, 'Simple');
  await full(page, 'sequence-to-vial-simple.png', 'Sequence to vial, simple');

  await setMode(page, 'Practitioner');
  await full(page, 'sequence-to-vial-practitioner.png', 'Sequence to vial, practitioner');

  for (const [selector, file, label] of [
    ['section[aria-labelledby="flow"] figure', 'fig1-sequence-to-vial.png', 'Figure 1 flow'],
    ['section[aria-labelledby="api-vs-vial"] figure', 'fig2-api-vs-vial.png', 'Figure 2 API vs vial'],
    ['section[aria-labelledby="checkpoints"] figure', 'fig3-checkpoints.png', 'Figure 3 checkpoints'],
    ['section[aria-labelledby="traceability"] figure', 'fig4-traceability.png', 'Figure 4 traceability'],
    ['section[aria-labelledby="chain"] figure', 'fig5-storage-transport.png', 'Figure 5 storage & transport'],
    ['section[aria-labelledby="know"]', 'know-the-five.png', 'Five things worth knowing'],
    ['#stage-formulation', 'stage-source-needed.png', 'A source-needed stage'],
    ['#stage-purification', 'stage-purification.png', 'Purification stage'],
  ] as const) {
    await section(page, selector, file, label);
  }

  await page.goto(`${BASE}/quality`, { waitUntil: 'networkidle', timeout: 45_000 });
  await section(page, 'section[aria-labelledby="start-here"]', 'quality-index-pathways.png', 'Quality index pathways');

  for (const slug of ['peptide-synthesis-spps', 'purification', 'storage-stability', 'batch-traceability', 'transport-excursions']) {
    await page.goto(`${BASE}/quality/${slug}`, { waitUntil: 'networkidle', timeout: 45_000 });
    await full(page, `topic-${slug}.png`, `Topic ${slug}`);
  }

  await context.close();

  const mobile = await browser.newContext({
    viewport: { width: 375, height: 812 },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
    isMobile: true,
    hasTouch: true,
  });
  const phone = await mobile.newPage();
  await phone.goto(`${BASE}/quality/sequence-to-vial`, { waitUntil: 'networkidle', timeout: 60_000 });
  await setMode(phone, 'Simple');
  await full(phone, 'mobile-sequence-to-vial-simple.png', 'Mobile, simple');
  await mobile.close();

  console.log(`\n  ${OUT}\n`);
} catch (error) {
  console.error('Capture failed:', error);
  process.exitCode = 1;
} finally {
  await browser.close();
}
