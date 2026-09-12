/**
 * Renders the publications.
 *
 *   npm run pdf              both
 *   npm run pdf -- quality   one
 *
 * Output lands in `build/publications/`, which is gitignored: a PDF is a build
 * artefact of the evidence architecture, not a source file, and committing one
 * would create a second place the content lives.
 *
 * Rendered with @react-pdf/renderer rather than by printing a web page. The
 * reason is reproducibility: the same input produces the same bytes on any
 * machine, with no browser, no headless Chrome download, and no dependence on
 * how a particular renderer handles a page break. Every diagram is vector and
 * stays vector at any zoom.
 */
import { mkdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { renderToFile, type DocumentProps } from '@react-pdf/renderer';
import { registerFonts } from '@/publishing/theme';
import { PeptideQuality } from '@/publishing/books/peptide-quality';
import { UnderstandingPeptides } from '@/publishing/books/understanding-peptides';

registerFonts();

const OUT = fileURLToPath(new URL('../../build/publications/', import.meta.url));
mkdirSync(OUT, { recursive: true });

const BOOKS: Record<string, { file: string; element: () => React.ReactElement<DocumentProps> }> = {
  quality: { file: 'tides-index-peptide-quality.pdf', element: PeptideQuality },
  understanding: {
    file: 'tides-index-understanding-peptides-skeleton.pdf',
    element: UnderstandingPeptides,
  },
};

const requested = process.argv.slice(2).filter((arg) => !arg.startsWith('-'));
const selected = requested.length > 0 ? requested : Object.keys(BOOKS);

console.log('');
for (const key of selected) {
  const book = BOOKS[key];
  if (book === undefined) {
    console.error(`  Unknown publication '${key}'. Available: ${Object.keys(BOOKS).join(', ')}`);
    process.exitCode = 1;
    continue;
  }

  const path = `${OUT}${book.file}`;
  await renderToFile(book.element(), path);
  const bytes = statSync(path).size;
  console.log(`  ${book.file}  ${(bytes / 1024).toFixed(0)} KB`);
  console.log(`    ${path}`);
}
console.log('');
