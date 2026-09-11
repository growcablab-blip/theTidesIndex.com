/**
 * Reads pages of a registered source, by the page numbers the work itself uses.
 *
 *   npm run sources:read -- SRC-006 --printed 220-226
 *   npm run sources:read -- SRC-006 --find "single peak"
 *   npm run sources:read -- SRC-006 --file 231-240
 *
 * Extraction is only reproducible if the next person can open the same page.
 * That is less obvious than it sounds: a held file usually numbers from its
 * cover, while the locator recorded on a claim is the work's own printed page,
 * and the two disagree by a fixed amount. SRC-006 is out by eleven. The registry
 * records that offset per source, so `--printed` means the printed page, and
 * nobody has to rediscover the arithmetic.
 *
 * Output goes to the terminal, or to a file with `--out`. Neither is committed:
 * the text is copyrighted, and this tool exists to let someone read a source,
 * not to make a copy of one (INGESTION_RULES.md).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { extractText, getDocumentProxy } from 'unpdf';
import { seedData } from '@db/seed/seed-data';

interface Args {
  sourceKey: string;
  mode: 'printed' | 'file' | 'find';
  range: string;
  out: string | null;
}

const args = parseArgs(process.argv.slice(2));
if (args === null) {
  console.error('Usage:');
  console.error('  npm run sources:read -- <SRC-KEY> --printed <from[-to]>');
  console.error('  npm run sources:read -- <SRC-KEY> --file <from[-to]>');
  console.error('  npm run sources:read -- <SRC-KEY> --find "<phrase>"');
  console.error('');
  console.error('  --out <path>   write to a file instead of the terminal');
  process.exit(1);
}

const source = seedData.sourceManifest.sources.find((s) => s.source_key === args.sourceKey);
if (source === undefined) {
  console.error(`${args.sourceKey} is not in the registry.`);
  process.exit(1);
}
if (source.known_local_filename === null) {
  console.error(`${args.sourceKey} has no file held.`);
  process.exit(1);
}
if (source.qc_status === 'replace' || source.qc_status === 'exclude') {
  // Not a hard stop: reading a disqualified file is exactly how the audit
  // established that it was disqualified. But nothing read here may be cited.
  console.error(
    `WARNING: ${args.sourceKey} has QC status '${source.qc_status}'. ` +
      `Nothing in this file may support a claim.\n`,
  );
}

const offset = source.printed_page_offset ?? 0;
const path = fileURLToPath(
  new URL(`../../sources/${source.known_local_filename}`, import.meta.url),
);

const pdf = await getDocumentProxy(new Uint8Array(readFileSync(path)));
const { text } = await extractText(pdf, { mergePages: false });
const pages: string[] = Array.isArray(text) ? text : [String(text)];

if (args.mode === 'find') {
  const needle = args.range.toLowerCase();
  const hits: string[] = [];
  pages.forEach((page, i) => {
    if (!page.toLowerCase().includes(needle)) return;
    const filePage = i + 1;
    hits.push(offset === 0 ? `${filePage}` : `${filePage - offset} (file ${filePage})`);
  });
  console.log(`"${args.range}" — ${String(hits.length)} page(s)`);
  console.log(hits.length === 0 ? '  none' : `  ${hits.join(', ')}`);
  if (offset !== 0) console.log('\nPage numbers are the printed pages of the work.');
} else {
  const [from, to] = parseRange(args.range);
  const shift = args.mode === 'printed' ? offset : 0;
  const out: string[] = [];

  for (let printed = from; printed <= to; printed++) {
    const filePage = printed + shift;
    if (filePage < 1 || filePage > pages.length) {
      out.push(`\n===== ${label(args.mode, printed, filePage)} — outside this file =====`);
      continue;
    }
    out.push(`\n===== ${label(args.mode, printed, filePage)} =====\n${pages[filePage - 1] ?? ''}`);
  }

  const body = out.join('\n');
  if (args.out === null) {
    console.log(body);
  } else {
    writeFileSync(args.out, body, 'utf8');
    console.log(`Wrote ${String(to - from + 1)} page(s) to ${args.out}.`);
  }
}

function label(mode: 'printed' | 'file', printed: number, filePage: number): string {
  return mode === 'printed'
    ? `PRINTED PAGE ${String(printed)} (file page ${String(filePage)})`
    : `FILE PAGE ${String(filePage)}`;
}

function parseRange(value: string): [number, number] {
  const [a, b] = value.split('-');
  const from = Number(a);
  const to = b === undefined ? from : Number(b);
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 1 || to < from) {
    console.error(`Not a page range: ${value}`);
    process.exit(1);
  }
  return [from, to];
}

function parseArgs(argv: string[]): Args | null {
  const sourceKey = argv.find((a) => !a.startsWith('--'));
  if (sourceKey === undefined) return null;

  const flag = (name: string): string | null => {
    const i = argv.indexOf(`--${name}`);
    return i === -1 ? null : (argv[i + 1] ?? null);
  };

  for (const mode of ['printed', 'file', 'find'] as const) {
    const value = flag(mode);
    if (value !== null) return { sourceKey, mode, range: value, out: flag('out') };
  }
  return null;
}
