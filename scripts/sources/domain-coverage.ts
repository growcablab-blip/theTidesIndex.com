/**
 * Domain-coverage probe.
 *
 * The audit found that several files whose wrapper pages carry the right title
 * contain unrelated text further in. "Incomplete copy" and "not the work at all"
 * demand different QC statuses, and the difference matters: a partial copy can
 * be cited for the pages it actually contains, whereas a decoy can be cited for
 * nothing.
 *
 * This distinguishes them by scanning every page for the vocabulary the work
 * would necessarily use. A peptide chemistry text without the word "peptide" on
 * any page is not a peptide chemistry text.
 *
 *   npm run sources:coverage
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractText, getDocumentProxy } from 'unpdf';
import { seedData } from '@db/seed/seed-data';

const SOURCES_DIR = fileURLToPath(new URL('../../sources/', import.meta.url));

/** Vocabulary any peptide-science work would use repeatedly. */
const DOMAIN_TERMS = [
  'peptide',
  'amino acid',
  'chromatograph',
  'hplc',
  'mass spectrom',
  'lyophil',
  'synthesis',
  'residue',
  'sequence',
  'purification',
];

const files = readdirSync(SOURCES_DIR).filter((n) => n.toLowerCase().endsWith('.pdf'));

console.log('Scanning every page for domain vocabulary…\n');
console.log('key      pages  pages with domain terms   verdict');
console.log('──────────────────────────────────────────────────────────────────');

const results: { key: string; pages: number; hits: number; share: number }[] = [];

for (const filename of files) {
  const registered = seedData.sourceManifest.sources.find(
    (s) => s.known_local_filename === filename,
  );
  const key = registered?.source_key ?? '—';

  try {
    const pdf = await getDocumentProxy(new Uint8Array(readFileSync(join(SOURCES_DIR, filename))));
    const { text } = await extractText(pdf, { mergePages: false });
    const pages = Array.isArray(text) ? text : [String(text)];

    const hits = pages.filter((page) => {
      const lower = (page ?? '').toLowerCase();
      return DOMAIN_TERMS.some((term) => lower.includes(term));
    }).length;

    const share = pages.length > 0 ? hits / pages.length : 0;
    results.push({ key, pages: pages.length, hits, share });
  } catch (error) {
    console.error(`  ! ${key}: ${String(error)}`);
  }
}

for (const r of results.sort((a, b) => a.key.localeCompare(b.key))) {
  // A genuine work in this field mentions its own subject constantly. A handful
  // of hits across two hundred pages is a wrapper's title bleeding through, not
  // content.
  const verdict =
    r.share > 0.4
      ? 'consistent with the registered work'
      : r.share > 0.05
        ? 'partial — genuine content in places'
        : 'NOT THE REGISTERED WORK';

  console.log(
    [
      r.key.padEnd(8),
      String(r.pages).padStart(5),
      `${String(r.hits).padStart(6)} (${String(Math.round(r.share * 100)).padStart(3)}%)`.padEnd(24),
      verdict,
    ].join('  '),
  );
}
