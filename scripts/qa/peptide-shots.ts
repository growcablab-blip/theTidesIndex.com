/**
 * Captures the compound records in both reading modes.
 *
 *   npm run tides            (in one terminal)
 *   npm run shots:peptides   (in another)
 *
 * The general screenshot script cannot do this: reading depth is a cookie set
 * by a server action, so a capture that wants both modes has to click the
 * switch and wait for the round trip. That is worth automating precisely
 * because the difference between the two modes is the thing most worth looking
 * at, and the thing a person checking by hand is most likely to get bored of.
 */
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium, type Browser, type Page } from 'playwright-core';

const BASE = process.env.TIDES_BASE_URL ?? 'http://localhost:3000';
const OUT = fileURLToPath(new URL('../../review/peptides-v2/', import.meta.url));
mkdirSync(OUT, { recursive: true });

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

/** Sets the reading depth by pressing the switch, and waits for the reload. */
async function setMode(page: Page, mode: 'Simple' | 'Practitioner'): Promise<void> {
  const button = page.getByRole('button', { name: mode, exact: true }).first();
  if ((await button.getAttribute('aria-pressed')) === 'true') return;
  await Promise.all([page.waitForLoadState('networkidle'), button.click()]);
  await page.waitForTimeout(600);
}

async function shoot(page: Page, file: string, label: string): Promise<void> {
  await page.screenshot({
    path: `${OUT}${file}`,
    fullPage: true,
    animations: 'disabled',
    caret: 'hide',
    timeout: 90_000,
    scale: 'css',
  });
  console.log(`  ${label.padEnd(34)} ${file}`);
}

const browser = await launch();

try {
  console.log('');
  for (const viewport of [
    { width: 1440, height: 900, prefix: '', mobile: false },
    { width: 375, height: 812, prefix: 'mobile-', mobile: true },
  ]) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: 1,
      reducedMotion: 'reduce',
      ...(viewport.mobile ? { isMobile: true, hasTouch: true } : {}),
    });
    const page = await context.newPage();

    for (const [slug, name] of [
      ['tesamorelin', 'Tesamorelin'],
      ['bpc-157', 'BPC-157'],
    ] as const) {
      await page.goto(`${BASE}/peptides/${slug}`, { waitUntil: 'networkidle', timeout: 45_000 });

      await setMode(page, 'Simple');
      await shoot(page, `${viewport.prefix}${slug}-simple.png`, `${name} simple`);

      await setMode(page, 'Practitioner');
      await shoot(page, `${viewport.prefix}${slug}-practitioner.png`, `${name} practitioner`);

      // The comparison, on its own, at desktop width only — it is a wide table
      // and a phone capture of it says nothing a reader could not see better on
      // the page itself.
      if (!viewport.mobile && slug === 'bpc-157') {
        // By its caption, not by position: the routes table comes first in the
        // document and `table.first()` quietly captured that instead.
        const table = page
          .locator('table')
          .filter({ has: page.locator('caption', { hasText: 'compared' }) })
          .first();
        if ((await table.count()) > 0 && (await table.isVisible())) {
          await table.screenshot({ path: `${OUT}${slug}-protocol-comparison.png` });
          console.log(`  ${'BPC-157 protocol comparison'.padEnd(34)} ${slug}-protocol-comparison.png`);
        }
      }
      if (!viewport.mobile && slug === 'tesamorelin') {
        const evidence = page.locator('#evidence').first();
        if (await evidence.isVisible()) {
          await evidence.screenshot({ path: `${OUT}${slug}-evidence.png` });
          console.log(`  ${'Tesamorelin evidence section'.padEnd(34)} ${slug}-evidence.png`);
        }
      }
    }
    await context.close();
  }
  console.log(`\n  ${OUT}\n`);
} catch (error) {
  console.error('Capture failed:', error);
  console.error('\nIs the site running? Start it with `npm run tides`.\n');
  process.exitCode = 1;
} finally {
  await browser.close();
}
