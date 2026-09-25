import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement, type ComponentType } from 'react';
import { Document, Page, renderToBuffer } from '@react-pdf/renderer';
import { ILLUSTRATIONS, type IllustrationKey } from '@/components/illustrations';
import { PATIENT_ILLUSTRATIONS, type PatientIllustrationKey } from '@/components/illustrations/patient';
import {
  basisLine,
  IllustrationPlate,
  patientIllustration,
  printableIllustration,
} from '@/publishing/illustration-print';
import { registerFonts } from '@/publishing/theme';

/**
 * Every illustration must print, and patient versions must stay legible.
 *
 * The publications draw their figures through the same element tree the site
 * renders. A figure the converter cannot read would otherwise surface as a
 * failed book build — or worse, as a quietly missing label — so each one is
 * converted and rendered here. Patient versions are held to the same rules as
 * the web registry (no numerals in labels) and to their narrower canvas, which
 * is what makes their labels print near nine to ten points.
 */
const keys = Object.keys(ILLUSTRATIONS) as IllustrationKey[];
const patientKeys = Object.keys(PATIENT_ILLUSTRATIONS) as PatientIllustrationKey[];

/** SVG text content of a rendered figure, entities decoded. */
function labelText(component: ComponentType<Record<string, unknown>>): string {
  const html = renderToStaticMarkup(createElement(component));
  const texts = [...html.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)].map((m) => (m[1] ?? '').replace(/<[^>]+>/g, ' '));
  return texts
    .join(' ')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&');
}

describe('web illustrations in print', () => {
  it.each(keys)('%s converts with its caption and basis intact', (key) => {
    const figure = printableIllustration(key);
    expect(figure.title.length).toBeGreaterThan(0);
    expect(figure.caption).not.toBeNull();
    expect(figure.viewWidth).toBeGreaterThan(0);
    expect(basisLine(figure.basis).length).toBeGreaterThan(10);
    expect(figure.drawing(400).props).toMatchObject({ width: 400 });
  });
});

describe('patient illustrations', () => {
  it.each(patientKeys)('%s converts, keeps a basis, and is drawn narrow enough to print legibly', (key) => {
    const figure = patientIllustration(key);
    expect(figure.caption).not.toBeNull();
    expect(basisLine(figure.basis).length).toBeGreaterThan(10);
    // The narrow canvas is the legibility rule: at the text measure, an 11.5-unit
    // label prints at or above nine points only if the canvas is at most ~580 wide.
    expect(figure.viewWidth).toBeLessThanOrEqual(580);
  });

  it.each(patientKeys)('%s carries no numerals in its labels', (key) => {
    const text = labelText(PATIENT_ILLUSTRATIONS[key]);
    expect(text).not.toMatch(/[0-9]/);
  });

  it('every patient version corresponds to a registered drawing or is a named body-context drawing', () => {
    const bodyContext = new Set(['signals-near-far', 'body-map']);
    for (const key of patientKeys) {
      expect(key in ILLUSTRATIONS || bodyContext.has(key), key).toBe(true);
    }
  });
});

describe('rendering', () => {
  it('renders every web and patient figure into one PDF', async () => {
    registerFonts();
    const buffer = await renderToBuffer(
      <Document>
        {keys.map((key) => (
          <Page key={key} size="A4" style={{ padding: 40 }}>
            <IllustrationPlate illustration={key} number="Figure" />
          </Page>
        ))}
        {patientKeys.map((key) => (
          <Page key={`patient-${key}`} size="A4" style={{ padding: 40 }}>
            <IllustrationPlate illustration={patientIllustration(key)} number="Figure" />
          </Page>
        ))}
      </Document>,
    );
    expect(buffer.byteLength).toBeGreaterThan(10_000);
  }, 90_000);
});
