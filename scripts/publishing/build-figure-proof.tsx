/**
 * A proof sheet of every illustration as it prints.
 *
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/publishing/build-figure-proof.tsx
 *   python -X utf8 scripts/qa/render-figure-proof.py
 *
 * One figure per page, at the full text measure, through the same converter the
 * publications use: first every key in the web registry, then every patient
 * version (keys prefixed `patient/`). Written to build/publications/figure-proof.pdf;
 * the Python step renders one PNG per key and fails on a missing or duplicated
 * render, so the proof count and the registry count cannot silently disagree.
 */
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Document, Text } from '@react-pdf/renderer';
import { renderToFile } from '@react-pdf/renderer';
import { ILLUSTRATIONS, type IllustrationKey } from '@/components/illustrations';
import { PATIENT_ILLUSTRATIONS, type PatientIllustrationKey } from '@/components/illustrations/patient';
import {
  IllustrationPlate,
  patientIllustration,
  printableIllustration,
  type PrintableIllustration,
} from '@/publishing/illustration-print';
import { PublicationPage } from '@/publishing/primitives';
import { registerFonts, sans, type } from '@/publishing/theme';

registerFonts();

const OUT = fileURLToPath(new URL('../../build/publications/', import.meta.url));
mkdirSync(OUT, { recursive: true });

const entries: { key: string; figure: PrintableIllustration }[] = [
  ...(Object.keys(ILLUSTRATIONS) as IllustrationKey[]).map((key) => ({ key, figure: printableIllustration(key) })),
  ...(Object.keys(PATIENT_ILLUSTRATIONS) as PatientIllustrationKey[]).map((key) => ({
    key: `patient/${key}`,
    figure: patientIllustration(key),
  })),
];

await renderToFile(
  <Document title="Illustration proof">
    {entries.map(({ key, figure }) => (
      <PublicationPage key={key} publication="Illustration proof" section={key}>
        <Text style={{ fontFamily: sans, fontSize: type.small, marginBottom: 6 }}>
          {key} — {figure.title}
        </Text>
        <IllustrationPlate illustration={figure} number="Figure" />
      </PublicationPage>
    ))}
  </Document>,
  `${OUT}figure-proof.pdf`,
);
process.stdout.write(
  `  ${String(Object.keys(ILLUSTRATIONS).length)} registered + ${String(Object.keys(PATIENT_ILLUSTRATIONS).length)} patient = ${String(entries.length)} figures → ${OUT}figure-proof.pdf\n`,
);
