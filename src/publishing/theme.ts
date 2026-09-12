import { Font } from '@react-pdf/renderer';
import { fileURLToPath } from 'node:url';

/**
 * The publication design system.
 *
 * Five flagship publications are planned. This exists so the fifth looks like
 * the first without anybody re-deciding what a figure caption is, and so a
 * change to the palette or the grid reaches all of them.
 *
 * The reference is a well-set scientific monograph: one strong text column, a
 * type scale with real contrast between levels, generous margins, and colour
 * used rarely enough that it means something when it appears. Not a brochure,
 * and emphatically not a slide deck.
 *
 * "Tides" is carried the way it is on the site — by rhythm, layering and a
 * single curved rule — rather than by imagery. There are no waves in here.
 */

const FONT_DIR = fileURLToPath(new URL('../../assets/fonts/', import.meta.url));

/**
 * Source Serif 4 and Inter, both under the SIL Open Font License, vendored
 * under `assets/fonts` so a build does not depend on a network fetch and so the
 * embedded faces are ones this project is licensed to embed.
 *
 * The same two families as the website, which is the point: a reader who has
 * seen the site should recognise the publication as the same organisation.
 */
export function registerFonts(): void {
  Font.register({
    family: 'Source Serif 4',
    fonts: [
      { src: `${FONT_DIR}SourceSerif4-Regular.ttf`, fontWeight: 400 },
      { src: `${FONT_DIR}SourceSerif4-It.ttf`, fontWeight: 400, fontStyle: 'italic' },
      { src: `${FONT_DIR}SourceSerif4-Semibold.ttf`, fontWeight: 600 },
      { src: `${FONT_DIR}SourceSerif4-Bold.ttf`, fontWeight: 700 },
    ],
  });
  Font.register({
    family: 'Inter',
    fonts: [
      { src: `${FONT_DIR}Inter-Regular.ttf`, fontWeight: 400 },
      { src: `${FONT_DIR}Inter-Medium.ttf`, fontWeight: 500 },
      { src: `${FONT_DIR}Inter-SemiBold.ttf`, fontWeight: 600 },
    ],
  });

  // Hyphenation off. A justified scientific text hyphenates badly at this
  // measure, and ragged-right reads better than a page of broken terms.
  Font.registerHyphenationCallback((word) => [word]);
}

/** The site palette, unchanged. A publication that drifted would read as a different organisation. */
export const colour = {
  ink: '#0b1f2a',
  inkSoft: '#2c4551',
  deepTide: '#123f4a',
  tideTeal: '#1f6b73',
  seaGlass: '#dcedef',
  mist: '#f2f7f7',
  warmWhite: '#fbfcfa',
  slate: '#5d6b72',
  rule: '#d6e0e2',
  ruleSoft: '#e6edee',
  surfaceSunk: '#eef4f4',
  caution: '#8a6116',
  cautionBg: '#fbf3e3',
  cautionRule: '#e6d4ad',
  evidenceHuman: '#1f6b73',
  evidenceHumanBg: '#e4f0f1',
  evidenceReference: '#5d6470',
  evidenceReferenceBg: '#eef0f3',
  white: '#ffffff',
} as const;

export const serif = 'Source Serif 4';
export const sans = 'Inter';

/**
 * A4, in points. A4 rather than Letter because the audience is international
 * and a scientific reference is more likely to be read in Europe than not;
 * the margins are generous enough that it prints on Letter without clipping.
 */
export const page = {
  width: 595.28,
  height: 841.89,
  margin: {
    top: 54,
    bottom: 48,
    inner: 58,
    outer: 58,
  },
} as const;

export const contentWidth = page.width - page.margin.inner - page.margin.outer;

/**
 * A twelve-column grid on the text measure.
 *
 * Figures are sized in columns rather than in points so a diagram that spans
 * two thirds of the measure still does after a margin change.
 */
export const GRID_COLUMNS = 12;
export const GUTTER = 12;

export function columns(n: number): number {
  const columnWidth = (contentWidth - GUTTER * (GRID_COLUMNS - 1)) / GRID_COLUMNS;
  return columnWidth * n + GUTTER * (n - 1);
}

/** A 1.25 scale at reading sizes, opening up for display. */
export const type = {
  display: 34,
  title: 26,
  chapter: 22,
  section: 15,
  subsection: 12,
  body: 10.2,
  small: 9,
  caption: 8.2,
  micro: 7.2,
} as const;

export const leading = {
  display: 1.1,
  title: 1.18,
  chapter: 1.22,
  section: 1.28,
  body: 1.5,
  tight: 1.4,
} as const;

/** Vertical rhythm. Section spacing is a multiple of this throughout. */
export const RHYTHM = 12;
