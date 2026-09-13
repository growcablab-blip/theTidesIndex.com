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
import { mkdirSync, renameSync, statSync } from 'node:fs';
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
    file: 'tides-index-understanding-peptides.pdf',
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

  /*
   * Render beside the target, then replace it.
   *
   * On Windows a PDF viewer holds its file open, so writing straight to the
   * destination fails with EBUSY the moment somebody is reading the last build
   * — which is precisely when they are most likely to rebuild. Rendering to a
   * sibling and renaming means the work is never lost, and a failed replace
   * leaves a file that says where it is rather than an error and nothing.
   */
  const path = `${OUT}${book.file}`;
  const staged = `${path}.new`;
  await renderToFile(book.element(), staged);

  let final = path;
  try {
    renameSync(staged, path);
  } catch {
    final = staged;
  }

  const bytes = statSync(final).size;
  console.log(`  ${book.file}  ${(bytes / 1024).toFixed(0)} KB`);
  console.log(`    ${final}`);
  if (final !== path) {
    console.log(`    (${book.file} is open in another program; close it and re-run to replace it)`);
  }
}
console.log('');
