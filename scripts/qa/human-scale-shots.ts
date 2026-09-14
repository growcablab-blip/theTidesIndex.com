/**
 * Review captures at the size a person actually reads at.
 *
 *   npm run tides              (in one terminal)
 *   npm run shots:human        (in another)
 *
 * The existing capture scripts take full-page screenshots, which is right for
 * checking that a long record renders end to end and useless for judging how
 * it looks: a compound record is nineteen thousand pixels tall, and at any
 * size that fits on screen the type is illegible. These are viewport-sized —
 * what a reader sees without scrolling, and what they see after scrolling to
 * the part they came for.
 *
 * Output lands in review/human-scale-v1/, desktop at 1440×900 and mobile at
 * 375×812.
 */
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium, type Browser, type Page } from 'playwright-core';

const BASE = process.env.TIDES_BASE_URL ?? 'http://localhost:3000';
const OUT = fileURLToPath(new URL('../../review/human-scale-v1/', import.meta.url));

type Mode = 'Simple' | 'Practitioner';

interface Shot {
  readonly file: string;
  readonly path: string;
  /** Scroll this section to the top of the viewport before capturing. */
  readonly anchor?: string;
  /** Scroll down by this many viewport heights instead. */
  readonly screens?: number;
  readonly mode?: Mode;
  readonly desktopOnly?: boolean;
}

const SHOTS: readonly Shot[] = [
  // --- The public surfaces -------------------------------------------------
  { file: 'home-above-fold', path: '/' },
  { file: 'home-mid-page', path: '/', screens: 1.6, desktopOnly: true },
  { file: 'home-what-makes-different', path: '/', screens: 3.2, desktopOnly: true },
  { file: 'learn', path: '/learn' },
  { file: 'peptides-directory', path: '/peptides' },
  { file: 'peptides-directory-table', path: '/peptides', screens: 1.1, desktopOnly: true },
  { file: 'protocols', path: '/protocols' },
  { file: 'research', path: '/research' },
  { file: 'research-questions', path: '/research', screens: 1.4, desktopOnly: true },
  { file: 'sequence-to-vial', path: '/quality/sequence-to-vial' },

  // --- Tesamorelin: the record with an approved label ----------------------
  { file: 'tesamorelin-simple-top', path: '/peptides/tesamorelin', mode: 'Simple' },
  { file: 'tesamorelin-simple-evidence', path: '/peptides/tesamorelin', mode: 'Simple', anchor: 'evidence' },
  {
    file: 'tesamorelin-simple-not-known',
    path: '/peptides/tesamorelin',
    mode: 'Simple',
    anchor: 'research-questions',
  },
  { file: 'tesamorelin-practitioner-top', path: '/peptides/tesamorelin', mode: 'Practitioner' },
  {
    file: 'tesamorelin-practitioner-human-evidence',
    path: '/peptides/tesamorelin',
    mode: 'Practitioner',
    anchor: 'evidence',
  },
  {
    file: 'tesamorelin-practitioner-protocols',
    path: '/peptides/tesamorelin',
    mode: 'Practitioner',
    anchor: 'protocols',
  },

  // --- BPC-157: the record that is mostly absence --------------------------
  { file: 'bpc157-simple-top', path: '/peptides/bpc-157', mode: 'Simple' },
  { file: 'bpc157-simple-evidence', path: '/peptides/bpc-157', mode: 'Simple', anchor: 'evidence' },
  {
    file: 'bpc157-simple-uncertainty',
    path: '/peptides/bpc-157',
    mode: 'Simple',
    anchor: 'research-questions',
  },
  { file: 'bpc157-practitioner-top', path: '/peptides/bpc-157', mode: 'Practitioner' },
  {
    file: 'bpc157-practitioner-protocol-comparison',
    path: '/peptides/bpc-157',
    mode: 'Practitioner',
    anchor: 'protocols',
  },
  {
    file: 'bpc157-practitioner-research-questions',
    path: '/peptides/bpc-157',
    mode: 'Practitioner',
    anchor: 'research-questions',
  },

  // --- Retatrutide: the clinical-development record ------------------------
  { file: 'retatrutide-practitioner-top', path: '/peptides/retatrutide', mode: 'Practitioner' },
  {
    file: 'retatrutide-practitioner-human-evidence',
    path: '/peptides/retatrutide',
    mode: 'Practitioner',
    anchor: 'evidence',
  },
  {
    file: 'retatrutide-practitioner-literature',
    path: '/peptides/retatrutide',
    mode: 'Practitioner',
    anchor: 'literature',
  },

  // --- The identity pair ----------------------------------------------------
  {
    file: 'tb500-nomenclature',
    path: '/peptides/tb-500',
    mode: 'Practitioner',
    anchor: 'nomenclature',
  },
  {
    file: 'thymosin-beta-4-nomenclature',
    path: '/peptides/thymosin-beta-4',
    mode: 'Practitioner',
    anchor: 'nomenclature',
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

/** Reading depth is a cookie set by a server action, so press the switch. */
async function setMode(page: Page, mode: Mode): Promise<void> {
  const button = page.getByRole('button', { name: mode, exact: true }).first();
  if ((await button.count()) === 0) return;
  if ((await button.getAttribute('aria-pressed')) === 'true') return;
  await Promise.all([page.waitForLoadState('networkidle'), button.click()]);
  await page.waitForTimeout(500);
}

async function position(page: Page, shot: Shot, height: number): Promise<void> {
  /*
   * Clamped, because an unclamped scroll produces a blank screenshot.
   *
   * A section near the end of a long record sits below the last scrollable
   * position: asking for its offset scrolls as far as the document goes and
   * leaves the viewport in the trailing whitespace under the footer. Seven
   * captures in the first run came back empty that way, all of them the
   * deepest anchors, and all worse on mobile where the same content is three
   * times taller than the viewport.
   */
  if (shot.anchor !== undefined) {
    // Wait for the section to exist and be painted before scrolling to it.
    // A fixed delay is not enough: switching reading depth reloads the page,
    // and a screenshot taken mid-navigation is a blank image — which is what
    // seven captures in the first run were, all of them deep anchors on a
    // mode-switched record, and worst on mobile where the pages are longest.
    const target = page.locator(`#${shot.anchor}`).first();
    await target.waitFor({ state: 'visible', timeout: 20_000 });
    await target.scrollIntoViewIfNeeded();
    // Then nudge up, so the heading clears the sticky header.
    await page.evaluate(() => {
      window.scrollBy({ top: -80 });
    });
  } else if (shot.screens !== undefined) {
    await page.evaluate((top: number) => {
      const furthest = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      window.scrollTo({ top: Math.min(top, furthest) });
    }, shot.screens * height);
  }
  await page.waitForTimeout(400);
}

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true });
  // `npm run shots:human -- protocol` re-takes only the captures whose name
  // matches, which is what a one-component fix needs: a full pass is twenty
  // minutes and re-photographs forty-eight pages that did not change.
  const filters = process.argv.slice(2).filter((argument) => !argument.startsWith('-'));
  const wanted = SHOTS.filter(
    (shot) => filters.length === 0 || filters.some((filter) => shot.file.includes(filter)),
  );
  if (wanted.length !== SHOTS.length) {
    console.log(`\n  ${wanted.length} of ${SHOTS.length} captures match ${filters.join(', ')}`);
  }
  const browser = await launch();
  let count = 0;

  try {
    for (const viewport of [
      { width: 1440, height: 900, suffix: '' },
      { width: 375, height: 812, suffix: '-mobile' },
    ]) {
      const page = await browser.newPage({
        viewport: { width: viewport.width, height: viewport.height },
      });
      for (const shot of wanted) {
        if (shot.desktopOnly === true && viewport.suffix !== '') continue;
        await page.goto(`${BASE}${shot.path}`, { waitUntil: 'networkidle' });
        if (shot.mode !== undefined) await setMode(page, shot.mode);
        await position(page, shot, viewport.height);
        const file = `${shot.file}${viewport.suffix}.png`;
        // No fullPage: the point of this set is the viewport.
        await page.screenshot({ path: `${OUT}${file}` });
        console.log(`  ${file}`);
        count += 1;
      }
      await page.close();
    }
  } finally {
    await browser.close();
  }

  console.log(`\n  ${count} captures in ${OUT}\n`);
}

void main();
