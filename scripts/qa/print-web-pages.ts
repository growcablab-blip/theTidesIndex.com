/**
 * Web print QA — the public site as it prints (browser print / Save as PDF).
 *
 *   npm run tides   (or the `tides-web` preview)   site on :3000
 *   npm run qa:print [-- name-filter ...]
 *   TIDES_BASE_URL=http://localhost:3001 npm run qa:print
 *
 * Owner decision (closed): printed material never hides content merely because
 * the web interface uses progressive disclosure. For each page, in the reading
 * mode(s) that matter, this:
 *
 *   1. loads the page with the reading-mode cookie and print media emulated,
 *      at the width an A4 page is laid out at;
 *   2. checks the stylesheet alone reveals every closed disclosure body
 *      (a page printed with JavaScript off is still whole);
 *   3. fires `beforeprint`, as a browser does, and checks no <details> is left
 *      closed and no disclosure body is invisible;
 *   4. checks no interactive-only instruction is visible on paper and nothing
 *      runs past the page edge (which makes Chromium shrink every page);
 *   5. writes review/publications-v2/web-print/NN-name-mode.pdf;
 *   6. fires `afterprint` and checks the reader's open/closed state came back.
 *
 * A page that errors, or turns into an error screen before it is saved (the dev
 * server reloads when files change), is retried: the dev database is shared and
 * fails transiently under load. Any failed check fails the run.
 */
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const BASE = process.env.TIDES_BASE_URL ?? 'http://localhost:3000';
const OUT = fileURLToPath(new URL('../../review/publications-v2/web-print/', import.meta.url));

/**
 * A4 sheet width in CSS px (210mm). Chromium's PDF output applies the page's
 * responsive breakpoints at the sheet width, not at the 178mm left inside the
 * margins — measured: at a 673px viewport the wide protocol matrix stayed hidden
 * and this check passed, while the PDF showed it and shrank every page. Checking
 * at the sheet width sees the layout the PDF actually uses.
 */
const PAPER_WIDTH = 794;
const ATTEMPTS = 4;

type Mode = 'simple' | 'practitioner';

interface PrintPage {
  readonly name: string;
  readonly path: string;
  readonly modes: readonly Mode[];
}

const PAGES: readonly PrintPage[] = [
  { name: '01-home', path: '/', modes: ['simple'] },
  { name: '02-learn', path: '/learn', modes: ['simple'] },
  { name: '03-learn-what-is-a-peptide', path: '/learn/what-is-a-peptide', modes: ['simple', 'practitioner'] },
  { name: '04-peptide-retatrutide', path: '/peptides/retatrutide', modes: ['simple', 'practitioner'] },
  { name: '05-protocols', path: '/protocols', modes: ['practitioner'] },
  { name: '06-research', path: '/research', modes: ['simple', 'practitioner'] },
  { name: '07-quality', path: '/quality', modes: ['simple'] },
  { name: '08-sequence-to-vial', path: '/quality/sequence-to-vial', modes: ['simple', 'practitioner'] },
  { name: '09-quality-sterility', path: '/quality/sterility', modes: ['simple', 'practitioner'] },
];

/** Words that only make sense on a screen. Visible on paper, they are a defect. */
const INTERACTIVE_ONLY = [
  /scroll (the|this) (drawing|figure|table) sideways/i,
  /\bclick (here|to)\b/i,
  /\btap (here|to)\b/i,
  /\bshow all \d+ references\b/i,
];

/*
 * In-page code is passed as strings. tsx compiles inline functions with helper
 * calls (`__name`) that do not exist in the page, so a function literal handed
 * to page.evaluate would throw there.
 */
const VISIBLE = `
  const visible = (el) =>
    el === null || el === undefined || el.checkVisibility({ checkOpacity: false, checkVisibilityCSS: true });
  const bodyOf = (d) => Array.from(d.children).find((c) => c.tagName !== 'SUMMARY') ?? null;
  const summaryOf = (d) => (d.querySelector('summary')?.textContent ?? '(no summary)');
`;

const BEFORE_SCRIPT = `(() => {
  ${VISIBLE}
  const all = Array.from(document.querySelectorAll('details'));
  const closedBodiesHiddenByCss = [];
  for (const d of all) {
    if (d.open) continue;
    // A disclosure inside hidden chrome (e.g. the research filters) is not content.
    if (!visible(d)) continue;
    const body = bodyOf(d);
    if (body !== null && !visible(body)) closedBodiesHiddenByCss.push(summaryOf(d));
  }
  return { total: all.length, openStates: all.map((d) => d.open), closedBodiesHiddenByCss };
})()`;

const AFTER_SCRIPT = `(() => {
  ${VISIBLE}
  const all = Array.from(document.querySelectorAll('details'));
  const closed = all.filter((d) => !d.open).map(summaryOf);
  const hiddenBodies = [];
  for (const d of all) {
    if (!visible(d)) continue;
    const body = bodyOf(d);
    if (body !== null && !visible(body)) hiddenBodies.push(summaryOf(d));
  }
  // Anything past the page edge — scrolling, or clipped by an ancestor — makes
  // Chromium shrink the whole document to fit. Report the innermost offenders.
  const pageWidth = document.documentElement.clientWidth;
  const overflowing = [];
  for (const el of Array.from(document.querySelectorAll('main *'))) {
    if (!visible(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.right <= pageWidth + 1) continue;
    const childOverflows = Array.from(el.children).some((c) => c.getBoundingClientRect().right > pageWidth + 1);
    if (childOverflows) continue;
    overflowing.push('<' + el.tagName.toLowerCase() + ' class="' + String(el.getAttribute('class') ?? '').slice(0, 90) + '"> right ' + Math.round(r.right) + ' > ' + pageWidth);
    if (overflowing.length >= 5) break;
  }
  return { closed, hiddenBodies, overflowing, text: document.body.innerText };
})()`;

const OPEN_STATES_SCRIPT = `Array.from(document.querySelectorAll('details')).map((d) => d.open)`;

const CONTENT_SCRIPT = `({ h1: document.querySelectorAll('main h1').length, mainText: (document.querySelector('main')?.innerText ?? '').length, errorScreen: /This page couldn.t load|Application error|Unhandled Runtime Error|Internal Server Error|Failed query/i.test(document.body.innerText) })`;

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

interface Inspection {
  readonly detailsTotal: number;
  readonly openStates: readonly boolean[];
  readonly closedBodiesHiddenByCss: readonly string[];
  readonly closedAfterBeforePrint: readonly string[];
  readonly hiddenBodiesAfterBeforePrint: readonly string[];
  readonly overflowing: readonly string[];
  readonly visibleText: string;
}

/** A transient failure worth retrying, as opposed to a print defect. */
class TransientPageError extends Error {}

function label(summary: string): string {
  return summary.replace(/\s+/g, ' ').trim().slice(0, 80);
}

/** Throws TransientPageError unless the page is a real, rendered page. */
async function assertRealPage(page: Page, status: number): Promise<void> {
  const content = await page
    .evaluate<{ h1: number; mainText: number; errorScreen: boolean }>(CONTENT_SCRIPT)
    .catch(() => ({ h1: 0, mainText: 0, errorScreen: true }));
  const thin = content.h1 === 0 || content.mainText < 400;
  if (status >= 200 && status < 400 && !content.errorScreen && !thin) return;
  throw new TransientPageError(
    `status ${String(status)}${content.errorScreen ? ', error screen' : ''}${thin ? `, thin page (h1 ${String(content.h1)}, ${String(content.mainText)} chars)` : ''}`,
  );
}

/**
 * The expander is a client effect, so `beforeprint` only reaches it after React
 * has hydrated the layout. In dev, `networkidle` can arrive before that.
 * Returns false if the page never hydrates (e.g. a framework error elsewhere).
 */
async function waitForHydration(page: Page): Promise<boolean> {
  const hydrated = await page
    .waitForFunction(
      `(() => {
        const el = document.querySelector('[data-reading-mode]');
        return !!el && Object.keys(el).some((k) => k.startsWith('__reactFiber'));
      })()`,
      undefined,
      { timeout: 60_000 },
    )
    .then(() => true)
    .catch(() => false);
  // Effects run after the hydration commit.
  await page.waitForTimeout(750);
  return hydrated;
}

async function inspect(page: Page): Promise<Inspection> {
  const before = await page.evaluate<{
    total: number;
    openStates: boolean[];
    closedBodiesHiddenByCss: string[];
  }>(BEFORE_SCRIPT);

  await page.evaluate(`window.dispatchEvent(new Event('beforeprint'))`);

  const after = await page.evaluate<{
    closed: string[];
    hiddenBodies: string[];
    overflowing: string[];
    text: string;
  }>(AFTER_SCRIPT);

  return {
    detailsTotal: before.total,
    openStates: before.openStates,
    closedBodiesHiddenByCss: before.closedBodiesHiddenByCss.map(label),
    closedAfterBeforePrint: after.closed.map(label),
    hiddenBodiesAfterBeforePrint: after.hiddenBodies.map(label),
    overflowing: after.overflowing,
    visibleText: after.text,
  };
}

/** One attempt at one page in one mode. Returns print problems found. */
async function printOnce(context: BrowserContext, url: string, file: string): Promise<{ problems: string[]; summary: string }> {
  const page = await context.newPage();
  const problems: string[] = [];
  try {
    await page.emulateMedia({ media: 'print' });
    const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 120_000 }).catch(() => null);
    await assertRealPage(page, response?.status() ?? 0);

    if (!(await waitForHydration(page))) {
      problems.push('page did not hydrate; the beforeprint expander could not run');
    }
    // The dev-only error/issue badge is not part of the page.
    await page.evaluate(`document.querySelectorAll('nextjs-portal').forEach((n) => n.remove())`);

    const result = await inspect(page);

    for (const s of result.closedBodiesHiddenByCss) problems.push(`print CSS leaves closed disclosure hidden: "${s}"`);
    for (const s of result.closedAfterBeforePrint) problems.push(`<details> still closed after beforeprint: "${s}"`);
    for (const s of result.hiddenBodiesAfterBeforePrint) problems.push(`disclosure body not visible in print: "${s}"`);
    for (const s of result.overflowing) problems.push(`runs past the page edge: ${s}`);
    for (const pattern of INTERACTIVE_ONLY) {
      const match = pattern.exec(result.visibleText);
      if (match) problems.push(`interactive-only wording visible in print: "${match[0]}"`);
    }

    // A dev-server reload can swap the page for an error screen after it loaded.
    await assertRealPage(page, 200);
    await page.pdf({ path: file, format: 'A4', printBackground: false, preferCSSPageSize: true });

    await page.evaluate(`window.dispatchEvent(new Event('afterprint'))`);
    const restored = await page.evaluate<boolean[]>(OPEN_STATES_SCRIPT);
    if (restored.length !== result.openStates.length) {
      // The page re-rendered (dev reload) between print and restore; not a defect.
      throw new TransientPageError('page re-rendered during the check');
    }
    const differing = result.openStates
      .map((open, i) => (restored[i] === open ? null : `#${String(i)} was ${String(open)}, now ${String(restored[i])}`))
      .filter((s): s is string => s !== null);
    if (differing.length > 0) {
      problems.push(`open/closed state was not restored after afterprint (${differing.slice(0, 5).join('; ')})`);
    }

    const closedOnScreen = result.openStates.filter((open) => !open).length;
    return { problems, summary: `${String(result.detailsTotal)} details, ${String(closedOnScreen)} closed on screen` };
  } finally {
    await page.close();
  }
}

async function main(): Promise<void> {
  const filters = process.argv.slice(2);
  const pages = filters.length === 0 ? PAGES : PAGES.filter((p) => filters.some((f) => p.name.includes(f)));
  mkdirSync(OUT, { recursive: true });

  const browser = await launch();
  const failures: string[] = [];
  const host = new URL(BASE).hostname;

  try {
    for (const spec of pages) {
      for (const mode of spec.modes) {
        const tag = `${spec.name}-${mode}`;
        const file = `${OUT}${tag}.pdf`;
        const context = await browser.newContext({ viewport: { width: PAPER_WIDTH, height: 1000 } });
        await context.addCookies([{ name: 'tides-reading-mode', value: mode, domain: host, path: '/' }]);
        try {
          let outcome: { problems: string[]; summary: string } | null = null;
          let lastError = '';
          for (let attempt = 1; attempt <= ATTEMPTS && outcome === null; attempt += 1) {
            try {
              outcome = await printOnce(context, `${BASE}${spec.path}`, file);
            } catch (error) {
              if (!(error instanceof TransientPageError) && !String(error).includes('Target page')) throw error;
              lastError = error instanceof Error ? error.message : String(error);
              console.warn(`    retry ${String(attempt)} for ${tag}: ${lastError}`);
              await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
            }
          }
          if (outcome === null) throw new Error(`could not print a real page after ${String(ATTEMPTS)} attempts: ${lastError}`);

          if (outcome.problems.length === 0) {
            console.log(`  ok    ${tag}  (${outcome.summary}) -> ${file}`);
          } else {
            console.log(`  FAIL  ${tag}  (${outcome.summary})`);
            for (const p of outcome.problems) console.log(`          - ${p}`);
            failures.push(...outcome.problems.map((p) => `${tag}: ${p}`));
          }
        } catch (error) {
          console.log(`  FAIL  ${tag}: ${String(error)}`);
          failures.push(`${tag}: ${String(error)}`);
        } finally {
          await context.close();
        }
      }
    }
  } finally {
    await browser.close();
  }

  if (failures.length > 0) {
    console.error(`\n${String(failures.length)} print problem(s).`);
    process.exitCode = 1;
  } else {
    console.log(`\nAll pages print whole. PDFs in ${OUT}`);
  }
}

await main();
