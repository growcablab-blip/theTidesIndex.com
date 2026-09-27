/**
 * Does patient mode leak a dose anywhere a reader can see it?
 *
 *   npm run tides             (in one terminal)
 *   npm run audit:patient     (in another)
 *
 * The query layer already refuses to select dosing columns in simple mode, and
 * a test asserts that the payload carries no dose-shaped string. This checks
 * the other half: what is actually on the page. A payload can be clean while a
 * caption, an alt attribute, a tooltip, a collapsed disclosure, a search
 * snippet or the print stylesheet puts an amount in front of a patient.
 *
 * It reads every compound record in simple mode and scans:
 *
 *   - the visible text
 *   - alt, title and aria-label attributes
 *   - the contents of every <details>, opened
 *   - the print rendering of the same page
 *   - the search results page for that compound's name
 *
 * Findings are printed and written to the scratchpad as JSON. The script makes
 * no judgement about practitioner mode, which is supposed to carry amounts.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { chromium, type Browser, type Page } from 'playwright-core';

const BASE = process.env.TIDES_BASE_URL ?? 'http://localhost:3000';
/**
 * Where the audit lands. `review/` is the repository's ignored directory for
 * working captures, so the default keeps the output beside the other review
 * artefacts without ever committing it.
 */
const OUT = process.env.TIDES_AUDIT_OUT ?? 'review/patient-audit.json';

const SLUGS = [
  'bpc-157',
  'cjc-1295',
  'ghk-cu',
  'ipamorelin',
  'mod-grf-1-29',
  'mots-c',
  'retatrutide',
  'selank',
  'semax',
  'tb-500',
  'tesamorelin',
  'thymosin-beta-4',
] as const;

/**
 * What counts as a dose leak.
 *
 * Deliberately broader than the payload scan: this is looking at rendered
 * text, where a number and a unit separated by markup still read as a dose.
 */
const PATTERNS: readonly { name: string; re: RegExp }[] = [
  // An amount with a unit. `g/mol` is a molecular weight, not a dose, and is
  // excluded by the lookahead; so is a percentage.
  { name: 'amount with unit', re: /\b\d+(?:[.,]\d+)?\s?(?:mg|mcg|µg|ug|IU|iu|mL|ml|cc)\b(?!\/mol)/g },
  // A range of amounts: "250-500 mcg".
  { name: 'amount range', re: /\b\d+(?:[.,]\d+)?\s?[–—-]\s?\d+(?:[.,]\d+)?\s?(?:mg|mcg|µg|ug|IU|mL|ml)\b/g },
  // A concentration, which is a dose in two parts.
  { name: 'concentration', re: /\b\d+(?:[.,]\d+)?\s?(?:mg|mcg|µg|ug)\s?\/\s?(?:mL|ml|kg|L)\b/g },
  // Reconstitution and administration mechanics.
  {
    name: 'reconstitution or administration detail',
    re: /\b(?:reconstitut\w*|bacteriostatic|insulin syringe|draw up|units? on the syringe|inject\w* (?:into|subcutaneous))/gi,
  },
  // A schedule attached to an amount is the shape of a regimen instruction.
  { name: 'titration language', re: /\b(?:titrat\w+|escalat\w+ (?:to|by)|step up to)\b/gi },
];

interface Finding {
  readonly slug: string;
  readonly surface: string;
  readonly pattern: string;
  readonly match: string;
  readonly context: string;
}

function scan(slug: string, surface: string, text: string): Finding[] {
  const findings: Finding[] = [];
  for (const { name, re } of PATTERNS) {
    re.lastIndex = 0;
    let hit: RegExpExecArray | null;
    while ((hit = re.exec(text)) !== null) {
      const start = Math.max(0, hit.index - 70);
      findings.push({
        slug,
        surface,
        pattern: name,
        match: hit[0],
        context: text.slice(start, hit.index + hit[0].length + 70).replace(/\s+/g, ' ').trim(),
      });
    }
  }
  return findings;
}

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

async function ensureSimple(page: Page): Promise<boolean> {
  const button = page.getByRole('button', { name: 'Simple', exact: true }).first();
  if ((await button.count()) === 0) return false;
  if ((await button.getAttribute('aria-pressed')) === 'true') return true;
  await Promise.all([page.waitForLoadState('networkidle'), button.click()]);
  await page.waitForTimeout(400);
  return true;
}

/** Text a reader can reach: visible copy, attributes, and opened disclosures. */
async function readableText(page: Page): Promise<{ text: string; attributes: string }> {
  return page.evaluate(() => {
    for (const details of Array.from(document.querySelectorAll('details'))) {
      details.open = true;
    }
    const attributes = Array.from(document.querySelectorAll('[alt], [title], [aria-label]'))
      .map((element) =>
        [
          element.getAttribute('alt'),
          element.getAttribute('title'),
          element.getAttribute('aria-label'),
        ]
          .filter((value) => value !== null && value !== '')
          .join(' | '),
      )
      .join('\n');
    return { text: document.body.innerText, attributes };
  });
}

async function main(): Promise<void> {
  const browser = await launch();
  const findings: Finding[] = [];
  const checked: string[] = [];

  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

    for (const slug of SLUGS) {
      await page.goto(`${BASE}/peptides/${slug}`, { waitUntil: 'networkidle' });
      const switched = await ensureSimple(page);
      if (!switched) {
        console.log(`  ${slug.padEnd(18)} no mode switch found — skipped`);
        continue;
      }

      const screen = await readableText(page);
      findings.push(...scan(slug, 'visible text', screen.text));
      findings.push(...scan(slug, 'alt/title/aria-label', screen.attributes));

      // The print stylesheet is a separate rendering and a separate risk: it
      // is where "hidden on screen" stops being true.
      await page.emulateMedia({ media: 'print' });
      const printed = await readableText(page);
      findings.push(...scan(slug, 'print output', printed.text));
      await page.emulateMedia({ media: 'screen' });

      checked.push(slug);
      const own = findings.filter((finding) => finding.slug === slug).length;
      console.log(`  ${slug.padEnd(18)} ${own === 0 ? 'clean' : `${String(own)} to inspect`}`);
    }

    // Search snippets: a different query path, and one that has leaked before.
    for (const slug of ['retatrutide', 'bpc-157', 'tesamorelin']) {
      await page.goto(`${BASE}/search?q=${slug}`, { waitUntil: 'networkidle' });
      const results = await readableText(page);
      findings.push(...scan(slug, 'search results', results.text));
    }

    await page.close();
  } finally {
    await browser.close();
  }

  // The default output directory is ignored by git and may not exist yet.
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify({ checked, findings }, null, 2), 'utf8');

  console.log('');
  if (findings.length === 0) {
    console.log(`  No dose-shaped text on any patient surface across ${String(checked.length)} records.`);
  } else {
    console.log(`  ${String(findings.length)} strings to inspect:`);
    for (const finding of findings.slice(0, 40)) {
      console.log(`    ${finding.slug} · ${finding.surface} · ${finding.pattern}: "${finding.match}"`);
      console.log(`      … ${finding.context}`);
    }
  }
  console.log(`\n  written to ${OUT}\n`);
}

void main();
