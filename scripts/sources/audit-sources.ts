/**
 * Source integrity audit (verification issue V-014).
 *
 * Establishes the chain the registry depends on:
 *
 *   file identity -> bibliographic identity -> QC status -> citability
 *
 * Eight of the sixteen registered sources were acquired through download
 * aggregators whose filenames are generated, not bibliographic. SRC-011 nearly
 * entered the register under the wrong editor because one of those filenames
 * named a chapter author. This script is the systematic answer: it opens each
 * file, hashes it, counts its pages, reads its front matter, and reports what
 * the work actually appears to be.
 *
 *   npm run sources:audit
 *
 * Output:
 *   data/private/source-audit.json   full detail, including extracted front
 *                                    matter (gitignored — it is copyrighted text)
 *   stdout                           a summary table
 *
 * What it cannot do is decide. Detected metadata is a prompt for a human to
 * open the file and confirm, which is what `title_page_verified` records. The
 * script never sets that flag.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractText, getDocumentProxy, getMeta } from 'unpdf';
import { seedData } from '@db/seed/seed-data';

const SOURCES_DIR = fileURLToPath(new URL('../../sources/', import.meta.url));
const OUT_DIR = fileURLToPath(new URL('../../data/private/', import.meta.url));

/** Pages read from the front of a book when looking for its title page. */
const FRONT_MATTER_PAGES = 14;
/** Pages sampled from the middle and end when checking for contamination. */
const PROBE_POINTS = [0.25, 0.5, 0.75, 0.95];

interface PageSample {
  readonly page: number;
  readonly chars: number;
  readonly text: string;
}

export interface SourceAudit {
  readonly sourceKey: string | null;
  readonly filename: string;
  readonly sha256: string;
  readonly bytes: number;
  readonly pageCount: number | null;
  readonly pdfMetadata: Record<string, unknown>;
  readonly frontMatter: readonly PageSample[];
  readonly probes: readonly PageSample[];
  readonly signals: {
    readonly wrapperPages: number;
    readonly emptyTextPages: number;
    readonly isbnCandidates: readonly string[];
    readonly yearCandidates: readonly string[];
    readonly publisherCandidates: readonly string[];
    readonly looksTruncated: boolean;
    readonly textExtractionFailed: boolean;
  };
  readonly detected: {
    readonly title: string | null;
    readonly authorLine: string | null;
  };
}

/** Phrases that mark an aggregator's wrapper rather than the work itself. */
const WRAPPER_MARKERS = [
  'instant download',
  'full download',
  'download the full',
  'ebook pdf',
  'testbank',
  'test bank',
  'solutions manual',
  'click the link below',
  'visit the link',
  'more products digital',
  'ebookmass',
  'ebookmeta',
  'textbookfull',
  'all chapters',
  'full chapters',
  'instant access',
];

const PUBLISHER_MARKERS = [
  'Humana Press',
  'Springer',
  'Elsevier',
  'Academic Press',
  'CRC Press',
  'Taylor & Francis',
  'Wiley',
  'Royal Society of Chemistry',
  'Oxford University Press',
  'Cambridge University Press',
  'Marcel Dekker',
  'Informa Healthcare',
  'Kluwer',
];

function sha256(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

function isWrapperPage(text: string): boolean {
  const lower = text.toLowerCase();
  return WRAPPER_MARKERS.some((marker) => lower.includes(marker));
}

function tidy(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Best guess at the work's title from its front matter.
 *
 * A guess, deliberately: the value is in surfacing a mismatch with the registry
 * for a human to resolve, not in being authoritative. Aggregator wrapper pages
 * are skipped because their headings are the aggregator's, not the book's.
 */
function detectTitle(pages: readonly PageSample[]): string | null {
  for (const page of pages) {
    if (isWrapperPage(page.text)) continue;
    const lines = page.text
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 8 && line.length < 140);
    const candidate = lines.find(
      (line) =>
        !/^\d+$/.test(line) &&
        !/^(page|chapter|contents|copyright|isbn|doi)\b/i.test(line) &&
        /[A-Za-z]{4}/.test(line),
    );
    if (candidate) return tidy(candidate);
  }
  return null;
}

function detectAuthorLine(pages: readonly PageSample[]): string | null {
  for (const page of pages) {
    if (isWrapperPage(page.text)) continue;
    const match = page.text.match(/^\s*(Edited by|Editors?|By)\s*[:\n ]+(.{4,160})$/im);
    if (match) return tidy(`${match[1] ?? ''} ${match[2] ?? ''}`);
  }
  return null;
}

async function auditFile(filename: string): Promise<SourceAudit> {
  const path = join(SOURCES_DIR, filename);
  const buffer = readFileSync(path);
  const bytes = statSync(path).size;
  const hash = sha256(buffer);

  const registered = seedData.sourceManifest.sources.find(
    (source) => source.known_local_filename === filename,
  );

  let pageCount: number | null = null;
  let pdfMetadata: Record<string, unknown> = {};
  const frontMatter: PageSample[] = [];
  const probes: PageSample[] = [];
  let textExtractionFailed = false;

  try {
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    pageCount = pdf.numPages;

    try {
      const meta = await getMeta(pdf);
      pdfMetadata = { info: meta.info, metadata: meta.metadata };
    } catch {
      pdfMetadata = {};
    }

    const { text } = await extractText(pdf, { mergePages: false });
    const pages = Array.isArray(text) ? text : [String(text)];

    for (let i = 0; i < Math.min(FRONT_MATTER_PAGES, pages.length); i++) {
      const pageText = pages[i] ?? '';
      frontMatter.push({ page: i + 1, chars: pageText.length, text: pageText.slice(0, 2500) });
    }

    for (const fraction of PROBE_POINTS) {
      const index = Math.min(pages.length - 1, Math.floor(pages.length * fraction));
      const pageText = pages[index] ?? '';
      probes.push({ page: index + 1, chars: pageText.length, text: pageText.slice(0, 1200) });
    }

    const emptyTextPages = pages.filter((p) => (p ?? '').trim().length < 20).length;
    const wrapperPages = frontMatter.filter((p) => isWrapperPage(p.text)).length;
    const combined = frontMatter.map((p) => p.text).join('\n');

    const isbnCandidates = [
      ...new Set((combined.match(/ISBN[-\s]*(?:13|10)?[:\s]*([\d\-Xx ]{10,20})/g) ?? []).map(tidy)),
    ].slice(0, 6);
    const yearCandidates = [
      ...new Set((combined.match(/\b(19[5-9]\d|20[0-4]\d)\b/g) ?? [])),
    ].slice(0, 10);
    const publisherCandidates = PUBLISHER_MARKERS.filter((marker) =>
      combined.toLowerCase().includes(marker.toLowerCase()),
    );

    return {
      sourceKey: registered?.source_key ?? null,
      filename,
      sha256: hash,
      bytes,
      pageCount,
      pdfMetadata,
      frontMatter,
      probes,
      signals: {
        wrapperPages,
        emptyTextPages,
        isbnCandidates,
        yearCandidates,
        publisherCandidates,
        // A real book with almost no extractable text is either scanned or
        // broken; either way it cannot be cited to a page.
        looksTruncated: pages.length > 0 && emptyTextPages / pages.length > 0.6,
        textExtractionFailed: false,
      },
      detected: {
        title: detectTitle(frontMatter),
        authorLine: detectAuthorLine(frontMatter),
      },
    };
  } catch (error) {
    textExtractionFailed = true;
    console.error(`  ! ${filename}: ${String(error)}`);
    return {
      sourceKey: registered?.source_key ?? null,
      filename,
      sha256: hash,
      bytes,
      pageCount,
      pdfMetadata,
      frontMatter,
      probes,
      signals: {
        wrapperPages: 0,
        emptyTextPages: 0,
        isbnCandidates: [],
        yearCandidates: [],
        publisherCandidates: [],
        looksTruncated: true,
        textExtractionFailed,
      },
      detected: { title: null, authorLine: null },
    };
  }
}

const files = readdirSync(SOURCES_DIR).filter((name) => name.toLowerCase().endsWith('.pdf'));

console.log(`Auditing ${String(files.length)} source files…\n`);

const audits: SourceAudit[] = [];
for (const filename of files) {
  console.log(`  ${filename.slice(0, 70)}`);
  audits.push(await auditFile(filename));
}

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(
  join(OUT_DIR, 'source-audit.json'),
  `${JSON.stringify({ auditedAt: new Date().toISOString(), audits }, null, 2)}\n`,
  'utf8',
);

console.log('\n─────────────────────────────────────────────────────────────────');
console.log('key      pages  wrapper  empty%  publisher            registry title');
console.log('─────────────────────────────────────────────────────────────────');
for (const audit of audits.sort((a, b) => (a.sourceKey ?? 'zz').localeCompare(b.sourceKey ?? 'zz'))) {
  const registered = seedData.sourceManifest.sources.find((s) => s.source_key === audit.sourceKey);
  const emptyPct =
    audit.pageCount && audit.pageCount > 0
      ? `${String(Math.round((audit.signals.emptyTextPages / audit.pageCount) * 100))}%`
      : '—';
  console.log(
    [
      (audit.sourceKey ?? '—').padEnd(8),
      String(audit.pageCount ?? '—').padStart(5),
      String(audit.signals.wrapperPages).padStart(7),
      emptyPct.padStart(7),
      (audit.signals.publisherCandidates[0] ?? '—').padEnd(20),
      (registered?.title ?? 'unregistered').slice(0, 44),
    ].join('  '),
  );
}

console.log('\nFull detail in data/private/source-audit.json (gitignored).');
console.log('Detected metadata is a prompt for human confirmation, not a verdict.');
