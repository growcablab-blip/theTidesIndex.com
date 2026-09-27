import { describe, expect, it } from 'vitest';
import {
  indexingAllowed,
  indexingRefusal,
  NEVER_INDEXED_PATHS,
} from '@/domain/publishing/indexing';

/**
 * The switch that opens the site to search engines.
 *
 * Worth testing directly because both failure directions are expensive and
 * neither is visible: a site that stays blocked after launch is merely
 * embarrassing, while a site that opens while its canonical URLs point at a
 * development machine publishes a sitemap of unreachable addresses under the
 * real domain's name.
 */

const site = 'https://thetidesindex.com';

describe('indexing switch', () => {
  it('blocks by default, and on any value other than the exact flag', () => {
    // The safe state has to be what a missing variable produces.
    expect(indexingAllowed({ flag: undefined, siteUrl: site })).toBe(false);
    expect(indexingAllowed({ flag: '', siteUrl: site })).toBe(false);
    expect(indexingAllowed({ flag: 'true', siteUrl: site })).toBe(false);
    expect(indexingAllowed({ flag: 'yes', siteUrl: site })).toBe(false);
    expect(indexingAllowed({ flag: '0', siteUrl: site })).toBe(false);
  });

  it('opens on the flag with a public origin, or with none set', () => {
    expect(indexingAllowed({ flag: '1', siteUrl: site })).toBe(true);
    // Unset is fine: the code's own default is the production domain.
    expect(indexingAllowed({ flag: '1', siteUrl: undefined })).toBe(true);
    expect(indexingAllowed({ flag: '1', siteUrl: 'https://www.thetidesindex.com' })).toBe(true);
  });

  it('refuses to open while the site URL points somewhere private', () => {
    // The one this exists for: a development .env copied into a deployment.
    for (const url of [
      'http://localhost:3000',
      'https://localhost:3000',
      'http://127.0.0.1:3000',
      'https://127.0.0.1',
      'https://staging.local',
      'https://tides.test',
      'https://app.internal',
      'https://thetidesindex.com'.replace('https', 'http'),
      'not a url',
      'https://nodots',
    ]) {
      expect(indexingAllowed({ flag: '1', siteUrl: url }), url).toBe(false);
    }
  });

  it('says why it is still blocked', () => {
    expect(indexingRefusal({ flag: undefined, siteUrl: site })).toMatch(/TIDES_ALLOW_INDEXING=1/);
    expect(indexingRefusal({ flag: '1', siteUrl: 'http://localhost:3000' })).toMatch(
      /not a public https origin/,
    );
    // Nothing to say once it is genuinely open.
    expect(indexingRefusal({ flag: '1', siteUrl: site })).toBeNull();
  });

  it('keeps the editorial surface out of robots.txt either way', () => {
    expect([...NEVER_INDEXED_PATHS]).toEqual(['/admin', '/dev']);
  });
});
