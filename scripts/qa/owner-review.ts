/**
 * The owner review board.
 *
 *   npm run tides            (in one terminal)
 *   npm run review:owner     (in another)
 *
 * Fourteen captures and one page that shows them together. This is not the
 * engineering QA set: that one has fifty images and exists to catch
 * regressions. This one exists so a person can look at the product for ten
 * minutes and form a judgement — so it is short, it is ordered as a walk
 * through the site, and each capture carries a line saying what to look at.
 *
 * Writes review/owner-review-v1/ with numbered PNGs and CONTACT_SHEET.html.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium, type Browser, type Page } from 'playwright-core';

const BASE = process.env.TIDES_BASE_URL ?? 'http://localhost:3000';
const OUT = fileURLToPath(new URL('../../review/owner-review-v1/', import.meta.url));

interface Shot {
  readonly file: string;
  readonly title: string;
  /** What the owner should be judging in this capture. */
  readonly look: string;
  readonly path: string;
  readonly mode?: 'Simple' | 'Practitioner';
  readonly anchor?: string;
  readonly mobile?: boolean;
}

const SHOTS: readonly Shot[] = [
  {
    file: '01-home-desktop',
    title: 'Home',
    look: 'Is it obvious in ten seconds what this is and who it is for?',
    path: '/',
  },
  {
    file: '02-home-mobile',
    title: 'Home, mobile',
    look: 'Does the promise survive a phone screen?',
    path: '/',
    mobile: true,
  },
  {
    file: '03-learn-desktop',
    title: 'Learn',
    look: 'Would a newcomer know where to start?',
    path: '/learn',
  },
  {
    file: '04-peptides-directory',
    title: 'Compound directory',
    look: 'Does this read as evidence described, rather than a table of counts?',
    path: '/peptides',
  },
  {
    file: '05-tesamorelin-simple',
    title: 'Tesamorelin — simple',
    look: 'Calm and plain? No amounts anywhere?',
    path: '/peptides/tesamorelin',
    mode: 'Simple',
  },
  {
    file: '06-tesamorelin-practitioner',
    title: 'Tesamorelin — practitioner',
    look: 'Can a clinician reach evidence and regimens quickly?',
    path: '/peptides/tesamorelin',
    mode: 'Practitioner',
  },
  {
    file: '07-bpc157-simple',
    title: 'BPC-157 — simple',
    look: 'The hardest case: mostly absence. Does it read honestly rather than bleakly?',
    path: '/peptides/bpc-157',
    mode: 'Simple',
  },
  {
    file: '08-bpc157-practitioner',
    title: 'BPC-157 — practitioner',
    look: 'Is the gap between discussion and evidence visible?',
    path: '/peptides/bpc-157',
    mode: 'Practitioner',
  },
  {
    file: '09-protocols-library',
    title: 'Protocol library',
    look: 'Does it say what it can answer before it shows a table?',
    path: '/protocols',
  },
  {
    file: '10-protocol-comparison',
    title: 'Protocol comparison',
    look: 'Agreement and difference both visible? Units on every amount?',
    path: '/peptides/bpc-157',
    mode: 'Practitioner',
    anchor: 'protocols',
  },
  {
    file: '11-research',
    title: 'Research agenda',
    look: 'Does it read as an invitation rather than an issue tracker?',
    path: '/research',
  },
  {
    file: '12-sequence-to-vial',
    title: 'From sequence to final vial',
    look: 'Does the journey teach, and are the unsourced stages honest?',
    path: '/quality/sequence-to-vial',
  },
  {
    file: '13-quality',
    title: 'Quality and testing',
    look: 'Is there an obvious first door?',
    path: '/quality',
  },
  {
    file: '14-source-page',
    title: 'A source record',
    look: 'Funding shown as context, never as a verdict.',
    path: '/sources/SRC-050',
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

async function setMode(page: Page, mode: 'Simple' | 'Practitioner'): Promise<void> {
  const button = page.getByRole('button', { name: mode, exact: true }).first();
  if ((await button.count()) === 0) return;
  if ((await button.getAttribute('aria-pressed')) === 'true') return;
  await Promise.all([page.waitForLoadState('networkidle'), button.click()]);
  await page.waitForTimeout(500);
}

function contactSheet(): string {
  const cards = SHOTS.map(
    (shot) => `    <figure>
      <a href="${shot.file}.png"><img src="${shot.file}.png" alt="${shot.title}"></a>
      <figcaption><b>${shot.title}</b><span>${shot.look}</span></figcaption>
    </figure>`,
  ).join('\n');

  return `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>The Tides Index — owner review</title>
<style>
  :root { color-scheme: light; }
  body { margin: 0; padding: 3rem clamp(1rem, 4vw, 4rem);
         background: #fbfcfa; color: #1c2b33;
         font: 16px/1.55 ui-serif, Georgia, serif; }
  header { max-width: 62ch; margin-bottom: 2.5rem; }
  h1 { font-size: 2rem; margin: 0 0 .5rem; font-weight: 500; }
  p.lede { color: #47606d; margin: 0; }
  .grid { display: grid; gap: 2.5rem;
          grid-template-columns: repeat(auto-fit, minmax(430px, 1fr)); }
  figure { margin: 0; }
  img { width: 100%; border: 1px solid #dde5e8; border-radius: 4px;
        background: #fff; display: block; }
  figcaption { margin-top: .6rem; font-size: .85rem; color: #47606d; }
  figcaption b { display: block; color: #1c2b33; font-size: .95rem; }
  figcaption span { display: block; margin-top: .15rem; }
  footer { margin-top: 3rem; max-width: 62ch; font-size: .85rem; color: #6b8391; }
</style>
</head>
<body>
  <header>
    <h1>The Tides Index — owner review</h1>
    <p class="lede">Fourteen views, in the order a reader meets them. Each caption
    says what to judge. Click any image for full size. Nothing here is published:
    every record is awaiting scientific review.</p>
  </header>
  <div class="grid">
${cards}
  </div>
  <footer>Generated by <code>npm run review:owner</code>. Captures are 1440×900,
  except the mobile view at 390×844.</footer>
</body>
</html>
`;
}

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true });
  const browser = await launch();

  try {
    for (const shot of SHOTS) {
      const page = await browser.newPage({
        viewport: shot.mobile === true ? { width: 390, height: 844 } : { width: 1440, height: 900 },
      });
      await page.goto(`${BASE}${shot.path}`, { waitUntil: 'networkidle' });
      if (shot.mode !== undefined) await setMode(page, shot.mode);
      if (shot.anchor !== undefined) {
        const target = page.locator(`#${shot.anchor}`).first();
        await target.waitFor({ state: 'visible', timeout: 20_000 });
        await target.scrollIntoViewIfNeeded();
        await page.evaluate(() => {
          window.scrollBy({ top: -80 });
        });
      }
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${OUT}${shot.file}.png` });
      console.log(`  ${shot.file}.png  ${shot.title}`);
      await page.close();
    }

    writeFileSync(`${OUT}CONTACT_SHEET.html`, contactSheet(), 'utf8');
    console.log(`\n  ${SHOTS.length} captures and CONTACT_SHEET.html in ${OUT}\n`);
  } finally {
    await browser.close();
  }
}

void main();
