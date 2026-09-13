/**
 * Captures the public pages as images, for review away from a terminal.
 *
 *   npm run tides          (in one terminal)
 *   npm run screenshots    (in another)
 *
 * Output: `review/screenshots/`, gitignored — an image of a page is a snapshot
 * of a moment, and committing one creates a second place the product appears to
 * live.
 *
 * Uses `playwright-core` driving the **browser already installed on this
 * machine** — Chrome, or Edge if Chrome is absent. No browser download: a
 * hundred-megabyte dependency to take six pictures is not a trade worth making,
 * and the system browser renders the same engine the owner will look at the
 * site in.
 */
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium, type Browser } from 'playwright-core';

const BASE = process.env.TIDES_BASE_URL ?? 'http://localhost:3000';
const DIR = process.env.TIDES_SHOT_DIR ?? 'screenshots';
const OUT = fileURLToPath(new URL(`../../review/${DIR}/`, import.meta.url));

/** Phone captures, taken at 375 with a mobile user agent and touch points. */
const MOBILE = process.env.TIDES_SHOT_MOBILE === '1';
mkdirSync(OUT, { recursive: true });

const PAGES: readonly { file: string; path: string; label: string }[] = [
  { file: MOBILE ? '10-mobile-home.png' : '01-home.png', path: '/', label: 'Home' },
  { file: MOBILE ? '11-mobile-quality-index.png' : '02-quality-index.png', path: '/quality', label: 'Quality and testing' },
  { file: MOBILE ? '12-mobile-hplc-purity.png' : '03-hplc-purity.png', path: '/quality/hplc-purity', label: 'HPLC / purity' },
  { file: '04-identity-testing.png', path: '/quality/identity-testing', label: 'Identity testing' },
  {
    file: '05-peptide-content-assay.png',
    path: '/quality/peptide-content-assay',
    label: 'Content / assay',
  },
  {
    file: '06-certificate-of-analysis.png',
    path: '/quality/certificate-of-analysis',
    label: 'Certificate of analysis',
  },
  { file: MOBILE ? '13-mobile-peptides.png' : '07-peptides.png', path: '/peptides', label: 'Compounds' },
  {
    file: MOBILE ? '14-mobile-tesamorelin.png' : '20-tesamorelin.png',
    path: '/peptides/tesamorelin',
    label: 'Tesamorelin',
  },
  {
    file: MOBILE ? '15-mobile-bpc-157.png' : '21-bpc-157.png',
    path: '/peptides/bpc-157',
    label: 'BPC-157',
  },
  { file: '08-sources.png', path: '/sources', label: 'Sources' },
];

/** Chrome first, Edge second. Both are Chromium; either is fine. */
async function launch(): Promise<Browser> {
  const channels = ['chrome', 'msedge'] as const;
  for (const channel of channels) {
    try {
      return await chromium.launch({ channel });
    } catch {
      continue;
    }
  }
  throw new Error(
    'No system Chrome or Edge found. Install either, or set TIDES_BASE_URL and take the ' +
      'screenshots by hand.',
  );
}

const browser = await launch();

try {
  const context = await browser.newContext({
    ...(MOBILE
      ? { viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true }
      : { viewport: { width: 1440, height: 900 } }),
    // 1, not 2. A full-page capture of a long reference page at 2x builds a
    // bitmap large enough to exhaust the Node heap — which it duly did.
    deviceScaleFactor: 1,
    // Smooth scrolling makes a full-page capture chase a moving target; the
    // capture waited for fonts, then timed out waiting for the page to settle.
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();

  console.log('');
  for (const target of PAGES) {
    const response = await page.goto(`${BASE}${target.path}`, {
      waitUntil: 'networkidle',
      timeout: 45_000,
    });
    const status = response?.status() ?? 0;
    if (status >= 400) {
      console.log(`  ${target.label.padEnd(24)} HTTP ${String(status)} — not captured`);
      continue;
    }
    // Full page rather than the fold: these are for reading, not for a hero
    // shot, and the parts worth judging are usually below it.
    await page.screenshot({
      path: `${OUT}${target.file}`,
      fullPage: true,
      animations: 'disabled',
      caret: 'hide',
      timeout: 90_000,
      scale: 'css',
    });
    console.log(`  ${target.label.padEnd(24)} ${target.file}`);
  }
  console.log(`\n  ${OUT}\n`);
} catch (error) {
  console.error('Screenshots failed:', error);
  console.error('\nIs the site running? Start it with `npm run tides`.\n');
  process.exitCode = 1;
} finally {
  await browser.close();
}
