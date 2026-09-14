/**
 * Product experience v1 — owner review capture.
 *
 *   npm run tides                         (site on :3000 with preview enabled)
 *   python -X utf8 scripts/qa/render-publication-pages.py
 *   npm run shots:experience [-- name-filter ...]
 *
 * Captures the pages the product-experience sprint changed, at desktop and
 * mobile widths, each in the reading mode that matters for it:
 *
 *   review/product-experience-v1/desktop/NN-name.png        full page (capped)
 *   review/product-experience-v1/desktop/NN-name-fold.png   the first screen
 *   review/product-experience-v1/mobile/NN-name.png         full page (capped)
 *   review/product-experience-v1/CONTACT_SHEET.html         the review board
 *   review/product-experience-v1/CONTACT_SHEET.png          the same, as an image
 *
 * The reading mode is set with the site's own cookie rather than by clicking
 * the switch, so every capture is deterministic. A page that answers with an
 * error status, or renders the framework's error screen, is reported and fails
 * the run: a review board of broken pages is worse than none.
 */
import { chromium, type Browser } from 'playwright-core';
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const BASE = process.env.TIDES_BASE_URL ?? 'http://localhost:3000';
const OUT = fileURLToPath(new URL('../../review/product-experience-v1/', import.meta.url));

type Mode = 'simple' | 'practitioner';

interface Shot {
  readonly name: string;
  readonly title: string;
  readonly path: string;
  readonly mode: Mode;
  readonly look: string;
}

const SHOTS: readonly Shot[] = [
  { name: '01-home', title: 'Homepage', path: '/', mode: 'simple', look: 'Within one screen: what this is, what you can learn, where to start, how deep it goes.' },
  { name: '02-learn', title: 'Learn hub', path: '/learn', mode: 'simple', look: 'The seven-question journey is the spine; depth levels and the three statement types are clear.' },
  { name: '03-learn-topic-simple', title: 'Learn topic — Simple', path: '/learn/peptides-in-the-body', mode: 'simple', look: 'Drawing first, plain wording, a synthesis that names its claims, honest source-needed cards.' },
  { name: '04-learn-topic-practitioner', title: 'Learn topic — Practitioner', path: '/learn/peptides-in-the-body', mode: 'practitioner', look: 'The same topic denser: reasoning shown, interpretation and evidence detail available.' },
  { name: '05-figures', title: 'Figure library', path: '/learn/figures', mode: 'simple', look: 'One calm, consistent visual language; every drawing states its basis.' },
  { name: '06-peptides', title: 'Peptides directory', path: '/peptides', mode: 'simple', look: 'Easy to scan; evidence state visible without reading every card.' },
  { name: '07-peptide-simple', title: 'Retatrutide — Simple', path: '/peptides/retatrutide', mode: 'simple', look: 'The first screen says what matters; no doses; spacious and plain.' },
  { name: '08-peptide-practitioner', title: 'Retatrutide — Practitioner', path: '/peptides/retatrutide', mode: 'practitioner', look: 'Structured and source-rich; depth available without leaving the page.' },
  { name: '09-protocols-practitioner', title: 'Protocols — Practitioner', path: '/protocols?peptide=bpc-157', mode: 'practitioner', look: 'Source, route, context, amount, frequency, duration, monitoring side by side; disagreement obvious; nothing averaged.' },
  { name: '10-protocols-simple', title: 'Protocols — Simple', path: '/protocols', mode: 'simple', look: 'No doses; explains what the library is and why regimens are never merged.' },
  { name: '11-research', title: 'Research questions', path: '/research', mode: 'simple', look: 'What we know, what we do not, what is worth studying next — categories distinct at a glance.' },
  { name: '12-quality', title: 'Quality', path: '/quality', mode: 'simple', look: 'One of the strongest visual sections; the sequence-to-vial story anchors it.' },
  { name: '13-sequence-to-vial', title: 'Sequence to final vial', path: '/quality/sequence-to-vial', mode: 'simple', look: 'A story you can follow stage by stage.' },
  { name: '14-quality-sterility', title: 'Quality topic — Sterility', path: '/quality/sterility', mode: 'practitioner', look: 'Drawing, what a result does and does not establish, evidence, and gaps.' },
  { name: '15-publications', title: 'Publications', path: '/learn/publications', mode: 'simple', look: 'Understanding Peptides and Science & Applications: what each volume holds and how far it has got.' },
];

const VIEWPORTS = {
  desktop: { width: 1440, height: 900, cap: 6400 },
  mobile: { width: 390, height: 844, cap: 9000 },
} as const;

async function launch(): Promise<Browser> {
  for (const channel of ['chrome', 'msedge'] as const) {
    try {
      return await chromium.launch({ channel });
    } catch {
      // try the next installed browser
    }
  }
  throw new Error('No installed Chrome or Edge found for playwright-core.');
}

async function main(): Promise<void> {
  // `--sheet` rebuilds only the contact sheet from captures already on disk.
  const sheetOnly = process.argv.includes('--sheet');
  const filters = process.argv.slice(2).filter((a) => a !== '--sheet');
  const shots = sheetOnly
    ? []
    : filters.length === 0
      ? SHOTS
      : SHOTS.filter((s) => filters.some((f) => s.name.includes(f)));
  for (const dir of ['desktop', 'mobile']) mkdirSync(`${OUT}${dir}`, { recursive: true });

  const browser = await launch();
  const failures: string[] = [];
  const host = new URL(BASE).hostname;

  for (const [viewportName, vp] of Object.entries(VIEWPORTS)) {
    for (const shot of shots) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: 1,
        reducedMotion: 'reduce',
        ...(viewportName === 'mobile' ? { isMobile: true, hasTouch: true } : {}),
      });
      await context.addCookies([
        { name: 'tides-reading-mode', value: shot.mode, domain: host, path: '/', sameSite: 'Lax' },
      ]);
      const page = await context.newPage();
      try {
        const response = await page.goto(`${BASE}${shot.path}`, { waitUntil: 'networkidle', timeout: 90_000 });
        const status = response?.status() ?? 0;
        const errorScreen = await page
          .locator('text=/Application error|Unhandled Runtime Error|This page could not be found/i')
          .count();
        if (status >= 400 || errorScreen > 0) {
          failures.push(`${viewportName} ${shot.name}: status ${String(status)}${errorScreen > 0 ? ', error screen' : ''}`);
        }
        await page.waitForTimeout(400);
        const height = await page.evaluate(() => document.documentElement.scrollHeight);
        await page.screenshot({
          path: `${OUT}${viewportName}/${shot.name}.png`,
          fullPage: true,
          clip: { x: 0, y: 0, width: vp.width, height: Math.min(height, vp.cap) },
        });
        // First screens for the contact sheet: a full phone page can be tens of
        // thousands of pixels tall, more than Chrome will raster in one sheet.
        await page.screenshot({ path: `${OUT}${viewportName}/${shot.name}-fold.png` });
        console.log(`  ${viewportName.padEnd(8)} ${shot.name}  ${String(status)}  ${String(height)}px`);
      } catch (error) {
        failures.push(`${viewportName} ${shot.name}: ${(error as Error).message}`);
      } finally {
        await context.close();
      }
    }
  }

  writeContactSheet();
  const sheet = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  const sheetPage = await sheet.newPage();
  await sheetPage.goto(pathToFileURL(`${OUT}CONTACT_SHEET.html`).href, { waitUntil: 'load' });
  await sheetPage.waitForTimeout(800);
  await sheetPage.screenshot({ path: `${OUT}CONTACT_SHEET.png`, fullPage: true });
  await sheet.close();
  await browser.close();

  console.log(`\n  written to ${OUT}`);
  if (failures.length > 0) {
    console.error(`\n  ${String(failures.length)} capture problem(s):`);
    for (const f of failures) console.error(`   - ${f}`);
    process.exitCode = 1;
  }
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function writeContactSheet(): void {
  const cards = SHOTS.filter((s) => existsSync(`${OUT}desktop/${s.name}-fold.png`))
    .map(
      (s) => `
      <figure>
        <a href="desktop/${s.name}.png"><img src="desktop/${s.name}-fold.png" alt="${escapeHtml(s.title)}, first screen"></a>
        <figcaption>
          <strong>${escapeHtml(s.title)}</strong> <span class="mode">${s.mode}</span>
          <span class="look">${escapeHtml(s.look)}</span>
          <span class="links"><a href="desktop/${s.name}.png">full page</a> · <a href="mobile/${s.name}.png">mobile</a></span>
        </figcaption>
      </figure>`,
    )
    .join('');
  const mobiles = SHOTS.filter((s) => existsSync(`${OUT}mobile/${s.name}-fold.png`))
    .map((s) => `<a class="phone" href="mobile/${s.name}.png"><img src="mobile/${s.name}-fold.png" alt="${escapeHtml(s.title)} on a phone"><span>${escapeHtml(s.title)}</span></a>`)
    .join('');
  const pubDir = `${OUT}publications`;
  const pubs = existsSync(pubDir)
    ? readdirSync(pubDir)
        .filter((f) => f.endsWith('.png'))
        .sort()
        .map((f) => `<a class="pub" href="publications/${f}"><img src="publications/${f}" alt="${escapeHtml(f)}"><span>${escapeHtml(f.replace(/\.png$/, ''))}</span></a>`)
        .join('')
    : '';

  writeFileSync(
    `${OUT}CONTACT_SHEET.html`,
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>The Tides Index — Product experience v1</title>
<style>
  body{margin:0;padding:40px 48px 64px;background:#fbfcfa;color:#0b1f2a;font-family:Georgia,'Source Serif 4',serif}
  h1{font-size:34px;margin:0 0 6px} h2{font-size:22px;margin:48px 0 16px;border-top:1px solid #d6e0e2;padding-top:28px}
  p.lede{font-family:Inter,system-ui,sans-serif;color:#2c4551;max-width:80ch;margin:0 0 8px;font-size:15px;line-height:1.6}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(460px,1fr));gap:26px}
  figure{margin:0;background:#fff;border:1px solid #d6e0e2;border-radius:10px;overflow:hidden}
  figure img{display:block;width:100%;border-bottom:1px solid #e6edee}
  figcaption{padding:12px 14px 14px;font-family:Inter,system-ui,sans-serif;font-size:13px;line-height:1.5}
  figcaption strong{font-family:Georgia,serif;font-size:16px;font-weight:600}
  .mode{display:inline-block;margin-left:6px;padding:1px 8px;border-radius:99px;background:#dcedef;color:#123f4a;font-size:11px;text-transform:uppercase;letter-spacing:.06em}
  .look{display:block;color:#2c4551;margin-top:4px} .links{display:block;margin-top:6px;color:#5d6b72} a{color:#123f4a}
  .phones,.pubs{display:flex;flex-wrap:wrap;gap:18px}
  .phone,.pub{display:flex;flex-direction:column;gap:6px;text-decoration:none;font-family:Inter,system-ui,sans-serif;font-size:12px;color:#2c4551}
  .phone img{width:170px;height:360px;object-fit:cover;object-position:top;border:1px solid #d6e0e2;border-radius:14px;background:#fff}
  .pub img{width:210px;border:1px solid #d6e0e2;background:#fff;box-shadow:0 1px 3px rgba(11,31,42,.08)}
</style></head><body>
<h1>The Tides Index — Product experience v1</h1>
<p class="lede">Owner review board. Desktop first screens (1440 wide), each linked to its full page and its phone rendering (390 wide), then the phone renderings together, then pages from the two publications. Captured against the development preview: nothing here is published, and the site remains noindex.</p>
<h2>Desktop — first screens</h2><div class="grid">${cards}</div>
<h2>Phone</h2><div class="phones">${mobiles}</div>
${pubs ? `<h2>Understanding Peptides and Science &amp; Applications</h2><div class="pubs">${pubs}</div>` : ''}
</body></html>`,
    'utf8',
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
