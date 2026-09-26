/**
 * Which compounds does a held source actually cover, and on which pages?
 *
 *   npm run sources:compound-coverage
 *   npm run sources:compound-coverage -- --out coverage.json
 *
 * Deciding what can honestly be built needs one fact per compound per source:
 * does the work discuss it, and where. `sources:read --find` answers that for a
 * single term, but it re-parses the whole file every time — and one of these
 * handbooks is 99 MB. Asking twenty-five questions that way means twenty-five
 * full parses, which is slow enough that the work gets done from memory
 * instead, which is how a record ends up resting on a page nobody opened.
 *
 * So this parses each file once and asks every question against it.
 *
 * It reports page numbers, not text. A page list is a research lead: somebody
 * still has to open the page and read it before anything is claimed from it.
 * Nothing here is evidence, and nothing here may be cited — extraction remains
 * a human act performed against `sources:read`.
 *
 * Page numbers are the work's own printed pages where the registry records an
 * offset, with the file page beside them, because a locator recorded against
 * the wrong numbering is worse than no locator at all.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { extractText, getDocumentProxy } from 'unpdf';
import { seedData } from '@db/seed/seed-data';

/**
 * The candidate list, with the spellings each work might actually use.
 *
 * Grouped under one canonical name so that "AOD-9604" and "AOD 9604" do not
 * become two findings. A hit on any spelling is a hit for the compound; the
 * spelling that matched is reported, because a work that only ever writes
 * "Epithalon" tells you something about what its monograph is called.
 */
const CANDIDATES: Readonly<Record<string, readonly string[]>> = {
  'AOD-9604': ['AOD-9604', 'AOD 9604'],
  'ARA-290': ['ARA-290', 'ARA 290', 'Cibinetide'],
  Cagrilintide: ['Cagrilintide'],
  Cerebrolysin: ['Cerebrolysin'],
  Dihexa: ['Dihexa'],
  DSIP: ['DSIP', 'Delta Sleep-Inducing', 'Delta sleep inducing'],
  Epitalon: ['Epitalon', 'Epithalon', 'Epithalamin', 'Epithalone'],
  'FGL(L)': ['FGL(L)', 'FGL peptide'],
  'FOXO4-DRI': ['FOXO4-DRI', 'FOXO4 DRI', 'FOX-04'],
  'GHRP-2': ['GHRP-2', 'GHRP 2'],
  'GHRP-6': ['GHRP-6', 'GHRP 6'],
  Hexarelin: ['Hexarelin'],
  'IGF-1 LR3': ['IGF-1 LR3', 'IGF-1LR3', 'LR3'],
  Kisspeptin: ['Kisspeptin'],
  KPV: ['KPV'],
  Larazotide: ['Larazotide'],
  Liraglutide: ['Liraglutide'],
  'LL-37': ['LL-37', 'LL 37', 'Cathelicidin'],
  'Melanotan I': ['Melanotan I', 'Melanotan-1', 'Afamelanotide'],
  'Melanotan II': ['Melanotan II', 'Melanotan-2', 'MT-II'],
  MGF: ['Mechano-growth', 'Mechano growth', 'MGF'],
  'MK-677': ['MK-677', 'MK 677', 'Ibutamoren'],
  'PNC-27': ['PNC-27', 'PNC 27'],
  'PT-141': ['PT-141', 'PT 141', 'Bremelanotide'],
  Semaglutide: ['Semaglutide'],
  Sermorelin: ['Sermorelin'],
  'SS-31': ['SS-31', 'SS 31', 'Elamipretide'],
  'Thymosin alpha-1': ['Thymosin alpha', 'Thymosin alpha-1', 'Thymosin a1', 'TA-1'],
  Thymulin: ['Thymulin', 'Thyamlin'],
  Tirzepatide: ['Tirzepatide'],
  VIP: ['Vasoactive Intestinal', 'VIP'],
  '5-Amino-1MQ': ['5-Amino-1MQ', '5 Amino 1MQ', 'Amino-1MQ'],
};

/** The held practitioner works. Primary literature is not scanned here. */
const HANDBOOKS = ['SRC-001', 'SRC-002', 'SRC-003', 'SRC-004', 'SRC-005'] as const;

interface Hit {
  readonly spelling: string;
  /** The work's own printed page where the registry records an offset. */
  readonly printed: number;
  readonly filePage: number;
}

const outArg = process.argv.indexOf('--out');
const outPath = outArg === -1 ? null : (process.argv[outArg + 1] ?? null);

const report: Record<string, Record<string, Hit[]>> = {};

for (const key of HANDBOOKS) {
  const source = seedData.sourceManifest.sources.find((s) => s.source_key === key);
  if (source === undefined || source.known_local_filename === null) {
    console.error(`${key}: no file held — skipped.`);
    continue;
  }

  const offset = source.printed_page_offset ?? 0;
  const path = fileURLToPath(
    new URL(`../../sources/${source.known_local_filename}`, import.meta.url),
  );

  process.stderr.write(`Reading ${key}…\n`);
  const pdf = await getDocumentProxy(new Uint8Array(readFileSync(path)));
  const { text } = await extractText(pdf, { mergePages: false });
  const pages: string[] = Array.isArray(text) ? text : [String(text)];
  const lowered = pages.map((p) => p.toLowerCase());

  const perCompound: Record<string, Hit[]> = {};

  for (const [compound, spellings] of Object.entries(CANDIDATES)) {
    const hits: Hit[] = [];
    lowered.forEach((page, i) => {
      for (const spelling of spellings) {
        if (page.includes(spelling.toLowerCase())) {
          hits.push({ spelling, printed: i + 1 - offset, filePage: i + 1 });
          return;
        }
      }
    });
    if (hits.length > 0) perCompound[compound] = hits;
  }

  report[key] = perCompound;

  const title = String(source.title ?? key).slice(0, 60);
  console.log(`\n===== ${key} — ${title} (${String(pages.length)} pages, offset ${String(offset)}) =====`);
  const found = Object.entries(perCompound).sort(([a], [b]) => a.localeCompare(b));
  if (found.length === 0) {
    console.log('  no candidate compound found');
    continue;
  }
  for (const [compound, hits] of found) {
    const shown = hits
      .slice(0, 12)
      .map((h) => (offset === 0 ? String(h.printed) : `${String(h.printed)} (file ${String(h.filePage)})`))
      .join(', ');
    const more = hits.length > 12 ? ` … +${String(hits.length - 12)} more` : '';
    console.log(`  ${compound.padEnd(18)} ${String(hits.length).padStart(3)} page(s): ${shown}${more}`);
  }
}

if (outPath !== null) {
  writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(`\nWrote ${outPath}.`);
}

console.log('\nPage lists are leads, not evidence. Open the page with sources:read before citing it.');
