/**
 * A proof sheet of every web illustration as it prints.
 *
 *   npx tsx scripts/publishing/build-figure-proof.ts
 *
 * One figure per page, at the full text measure, through the same converter the
 * publications use. Written to build/publications/figure-proof.pdf for visual
 * inspection: clipped labels, misplaced arrowheads and wrong colours show here
 * before they show in a book.
 */
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Document, Text } from '@react-pdf/renderer';
import { renderToFile } from '@react-pdf/renderer';
import { ILLUSTRATIONS, type IllustrationKey } from '@/components/illustrations';
import { IllustrationPlate, printableIllustration } from '@/publishing/illustration-print';
import { PublicationPage } from '@/publishing/primitives';
import { registerFonts, sans, type } from '@/publishing/theme';

registerFonts();

const OUT = fileURLToPath(new URL('../../build/publications/', import.meta.url));
mkdirSync(OUT, { recursive: true });

const keys = Object.keys(ILLUSTRATIONS) as IllustrationKey[];

await renderToFile(
  <Document title="Illustration proof">
    {keys.map((key) => (
      <PublicationPage key={key} publication="Illustration proof" section={key}>
        <Text style={{ fontFamily: sans, fontSize: type.small, marginBottom: 6 }}>
          {key} — {printableIllustration(key).title}
        </Text>
        <IllustrationPlate illustration={key} number="Figure" />
      </PublicationPage>
    ))}
  </Document>,
  `${OUT}figure-proof.pdf`,
);
process.stdout.write(`  ${String(keys.length)} figures → ${OUT}figure-proof.pdf\n`);
