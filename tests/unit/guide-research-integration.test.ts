/**
 * The join between the public guides and the research engine.
 *
 * This is the seam where a presentation register meets a reviewed evidence
 * corpus, and there are exactly three ways it can go wrong:
 *
 *  1. a guide points at a compound slug the register does not carry;
 *  2. a guide's printed name is used to find a record, which silently
 *     resolves TB-500 to thymosin beta-4 and vice versa;
 *  3. the public surface serves a compound nobody has approved for it.
 *
 * All three are checked here against the register's own seed file, so the
 * tests fail if the data moves underneath the guides rather than after someone
 * notices a wrong page in production.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PROTOCOL_GUIDES, isGuideReady } from '@/domain/showcase/protocol-guides';
import { isPublicSurfacePath } from '@/domain/publishing/surface';
import { isExposedCompound } from '@/server/public/guide-research';

interface SeedPeptide {
  readonly slug: string;
  readonly canonicalName?: string;
  readonly canonical_name?: string;
  readonly aliases?: readonly (string | { alias?: string })[];
}

function registerPeptides(): readonly SeedPeptide[] {
  const raw: unknown = JSON.parse(
    readFileSync(join(process.cwd(), 'data', 'seed', 'peptides.json'), 'utf8'),
  );
  if (Array.isArray(raw)) return raw as SeedPeptide[];
  const record = raw as Record<string, unknown>;
  const list = record['peptides'] ?? Object.values(record).find((v) => Array.isArray(v));
  return (list ?? []) as SeedPeptide[];
}

const REGISTER = registerPeptides();
const SLUGS = new Set(REGISTER.map((p) => p.slug));

describe('guide compound slugs', () => {
  it('reads a register with the compounds we expect', () => {
    expect(SLUGS.size).toBeGreaterThanOrEqual(28);
    expect(SLUGS).toContain('bpc-157');
    expect(SLUGS).toContain('tb-500');
    expect(SLUGS).toContain('thymosin-beta-4');
  });

  it.each(PROTOCOL_GUIDES.map((g) => [g.slug, g.compoundSlugs] as const))(
    '%s references only registered compounds',
    (_guide, slugs) => {
      for (const slug of slugs) expect(SLUGS, `unknown compound slug "${slug}"`).toContain(slug);
    },
  );

  it('never declares more slugs than the guide names compounds', () => {
    // A slug list longer than the printed compound list means the register is
    // claiming the artwork covers something it does not.
    for (const guide of PROTOCOL_GUIDES) {
      expect(guide.compoundSlugs.length, guide.slug).toBeLessThanOrEqual(guide.compounds.length);
    }
  });

  it('uses no duplicate slug within a guide', () => {
    for (const guide of PROTOCOL_GUIDES) {
      expect(new Set(guide.compoundSlugs).size, guide.slug).toBe(guide.compoundSlugs.length);
    }
  });
});

describe('the TB-500 / thymosin beta-4 conflation', () => {
  /*
   * The register deliberately holds each name as an alias of the other,
   * because sources use them interchangeably. These tests encode why the
   * guides must join on slugs: a name lookup is genuinely ambiguous, and
   * resolving it either way would put a wrong attribution on a public page.
   */
  const aliasesOf = (slug: string): string[] => {
    const p = REGISTER.find((x) => x.slug === slug);
    return (p?.aliases ?? []).map((a) => (typeof a === 'string' ? a : (a.alias ?? ''))).filter(Boolean);
  };

  it('still holds the two names as aliases of each other', () => {
    expect(aliasesOf('tb-500').map((a) => a.toLowerCase())).toContain('thymosin beta-4');
    expect(aliasesOf('thymosin-beta-4').map((a) => a.toLowerCase())).toContain('tb-500');
  });

  it('keeps the Recovery guide pointed at TB-500 itself, not at thymosin beta-4', () => {
    const recovery = PROTOCOL_GUIDES.find((g) => g.slug === 'recovery-protocol');
    expect(recovery?.compounds).toContain('TB-500');
    expect(recovery?.compoundSlugs).toContain('tb-500');
    expect(recovery?.compoundSlugs).not.toContain('thymosin-beta-4');
  });
});

describe('the public surface allowlist', () => {
  it.each([
    '/',
    '/guides/recovery-protocol',
    '/compounds/bpc-157',
    '/robots.txt',
  ])('serves %s', (path) => {
    expect(isPublicSurfacePath(path)).toBe(true);
  });

  it.each([
    '/peptides/bpc-157',
    '/protocols',
    '/protocols/stacks/bpc-157-tb-500',
    '/search',
    '/admin',
    '/admin/review',
    '/sources/SRC-001',
    '/reference',
    '/compounds',
    '/compounds/bpc-157/edit',
  ])('refuses %s', (path) => {
    expect(isPublicSurfacePath(path)).toBe(false);
  });
});

describe('finished guides', () => {
  it('every ready guide has artwork and at least one researched compound or none at all', () => {
    for (const guide of PROTOCOL_GUIDES.filter(isGuideReady)) {
      expect(guide.artwork).not.toBeNull();
      // Slugs are optional — a guide may name only unregistered compounds —
      // but whatever it declares has to be real, which the suite above checks.
      expect(Array.isArray(guide.compoundSlugs)).toBe(true);
    }
  });
});

describe('which guides show the research block', () => {
  /*
   * A guide renders the block only if one of its compounds has a profile the
   * public surface will serve. Counts with nothing to open are a dead end, and
   * a guide gaining a block is a visible change to a page the owner approved —
   * so the set is asserted, not merely derived.
   */
  const showing = PROTOCOL_GUIDES.filter((g) => g.compoundSlugs.some(isExposedCompound)).map(
    (g) => g.slug,
  );

  it('is exactly the Recovery guide today', () => {
    expect(showing).toEqual(['recovery-protocol']);
  });

  it('leaves every other guide as its artwork alone', () => {
    for (const guide of PROTOCOL_GUIDES.filter(isGuideReady)) {
      if (guide.slug === 'recovery-protocol') continue;
      expect(
        guide.compoundSlugs.some(isExposedCompound),
        `${guide.slug} would gain a research block`,
      ).toBe(false);
    }
  });
});
