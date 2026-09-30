/**
 * The protocol guide register on the public holding experience.
 *
 * A guide is owner-supplied artwork; the register only presents it. These tests
 * hold that line: the register cannot carry dosing fields, a guide without
 * finished artwork cannot be opened, and presentation copy stays free of the
 * amount/frequency language that belongs only in the artwork itself.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  guideBySlug,
  guideHref,
  isGuideReady,
  PROTOCOL_GUIDES,
  type ProtocolGuide,
} from '@/domain/showcase/protocol-guides';

const ALLOWED_FIELDS = new Set(['slug', 'title', 'focus', 'compounds', 'description', 'state', 'artwork', 'accent']);

/** Units and cadence words that would mean a regimen has leaked into the copy. */
const DOSING_PATTERN = /\b\d+(\.\d+)?\s?(mg|mcg|µg|iu|ml|units?)\b|\b(daily|weekly|twice|per day|per week|dose|dosing|inject)/i;

describe('protocol guide register', () => {
  it('has unique slugs', () => {
    const slugs = PROTOCOL_GUIDES.map((g) => g.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('carries presentation fields only — no regimen fields', () => {
    for (const guide of PROTOCOL_GUIDES) {
      for (const key of Object.keys(guide)) {
        expect(ALLOWED_FIELDS.has(key), `${guide.slug}.${key}`).toBe(true);
      }
    }
  });

  it('keeps dosing language out of the presentation copy', () => {
    for (const guide of PROTOCOL_GUIDES) {
      const copy = [guide.title, guide.focus, guide.description, ...guide.compounds, guide.artwork?.alt ?? ''].join(' ');
      expect(copy, guide.slug).not.toMatch(DOSING_PATTERN);
    }
  });

  it('lists the recovery guide compounds exactly as the owner specified', () => {
    expect(guideBySlug('recovery-protocol')?.compounds).toEqual(['BPC-157', 'TB-500', 'GHK-Cu', 'KPV']);
  });

  it('never marks a guide ready without its artwork file', () => {
    for (const guide of PROTOCOL_GUIDES) {
      if (guide.state !== 'ready') continue;
      expect(guide.artwork, guide.slug).not.toBeNull();
      if (guide.artwork !== null) {
        expect(existsSync(join(process.cwd(), 'public', guide.artwork.src)), guide.artwork.src).toBe(true);
      }
    }
  });
});

describe('isGuideReady', () => {
  const base: ProtocolGuide = {
    slug: 'example',
    title: 'Example',
    focus: 'Example focus',
    compounds: ['A'],
    description: 'An example.',
    state: 'in_preparation',
    artwork: null,
    accent: 'cyan',
  };
  const artwork = { src: '/guides/example.webp', width: 1200, height: 1500, alt: 'Example guide layout' };

  it('is false while in preparation, even with artwork', () => {
    expect(isGuideReady({ ...base, artwork })).toBe(false);
  });

  it('is false when marked ready but the artwork is missing', () => {
    expect(isGuideReady({ ...base, state: 'ready' })).toBe(false);
  });

  it('is true only when ready and the artwork exists', () => {
    expect(isGuideReady({ ...base, state: 'ready', artwork })).toBe(true);
  });

  it('builds the guide route from the slug', () => {
    expect(guideHref(base)).toBe('/guides/example');
  });
});
