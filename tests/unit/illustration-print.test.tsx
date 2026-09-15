import { describe, expect, it } from 'vitest';
import { Document, Page, renderToBuffer } from '@react-pdf/renderer';
import { ILLUSTRATIONS, type IllustrationKey } from '@/components/illustrations';
import { basisLine, IllustrationPlate, printableIllustration } from '@/publishing/illustration-print';
import { registerFonts } from '@/publishing/theme';

/**
 * Every web illustration must print.
 *
 * The publications draw their figures through the same element tree the site
 * renders. A figure the converter cannot read would otherwise surface as a
 * failed book build — or worse, as a quietly missing label — so each one is
 * converted and rendered here.
 */
const keys = Object.keys(ILLUSTRATIONS) as IllustrationKey[];

describe('web illustrations in print', () => {
  it.each(keys)('%s converts with its caption and basis intact', (key) => {
    const figure = printableIllustration(key);
    expect(figure.title.length).toBeGreaterThan(0);
    expect(figure.caption).not.toBeNull();
    expect(figure.viewWidth).toBeGreaterThan(0);
    expect(basisLine(figure.basis).length).toBeGreaterThan(10);
    expect(figure.drawing(400).props).toMatchObject({ width: 400 });
  });

  it('renders every figure into one PDF', async () => {
    registerFonts();
    const buffer = await renderToBuffer(
      <Document>
        {keys.map((key) => (
          <Page key={key} size="A4" style={{ padding: 40 }}>
            <IllustrationPlate illustration={key} number="Figure" />
          </Page>
        ))}
      </Document>,
    );
    expect(buffer.byteLength).toBeGreaterThan(10_000);
  }, 60_000);
});
