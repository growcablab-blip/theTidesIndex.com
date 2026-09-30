/**
 * Build the hero figure file: `public/hero/figure.bin`.
 *
 *   npm run hero:geometry
 *
 * Samples the body model once (it is deterministic) and writes the compact
 * binary the renderer streams straight to the GPU. Re-run only when
 * `src/components/showcase/hero/body-model.ts` changes; the output is committed.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fillDensity, runNow, sampleFigure } from '../../src/components/showcase/hero/body-model';
import { encodeFigure, FIGURE_URL } from '../../src/components/showcase/hero/figure-format';

/** The top tier's counts. Lower tiers draw a prefix of each range. */
const COUNTS = { surface: 22000, interior: 4000, brain: 2000 } as const;
const GRID = 48;
const DENSITY_RANGE = 0.25;

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const out = join(root, 'public', FIGURE_URL);

const t0 = performance.now();
const figure = runNow(sampleFigure(COUNTS));
const field = runNow(fillDensity(GRID));
const buf = encodeFigure({
  ...COUNTS,
  position: figure.position,
  normal: figure.normal,
  gridSize: GRID,
  field,
  densityRange: DENSITY_RANGE,
});

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, Buffer.from(buf));
console.log(
  `wrote ${FIGURE_URL} — ${String(figure.count)} particles, ${String(GRID)}³ density, ` +
    `${(buf.byteLength / 1024).toFixed(0)} KB, in ${((performance.now() - t0) / 1000).toFixed(1)} s`,
);
