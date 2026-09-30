/**
 * The public deployment serves the holding experience and nothing else.
 *
 * The research application's routes exist in the same codebase; on the public
 * service they must answer 404 even by direct link, and on the research
 * service (the default) nothing changes.
 */
import { describe, expect, it } from 'vitest';
import { currentSurface, isPublicSurfacePath } from '@/domain/publishing/surface';

describe('currentSurface', () => {
  it('defaults to the research application', () => {
    expect(currentSurface({})).toBe('research');
    expect(currentSurface({ TIDES_SURFACE: '' })).toBe('research');
    expect(currentSurface({ TIDES_SURFACE: 'staging' })).toBe('research');
  });

  it('is public only when explicitly configured', () => {
    expect(currentSurface({ TIDES_SURFACE: 'public' })).toBe('public');
    expect(currentSurface({ TIDES_SURFACE: ' Public ' })).toBe('public');
  });
});

describe('isPublicSurfacePath', () => {
  it('serves the home page and guide pages', () => {
    for (const path of ['/', '/guides/recovery-protocol', '/guides/recovery-protocol/', '/robots.txt', '/hero/figure.bin', '/hero/still-desktop.jpg']) {
      expect(isPublicSurfacePath(path), path).toBe(true);
    }
  });

  it('refuses every research, search and admin route', () => {
    for (const path of [
      '/reference',
      '/peptides',
      '/peptides/bpc-157',
      '/protocols',
      '/protocols/stacks/bpc-157-tb-500',
      '/research',
      '/quality',
      '/quality/certificate-of-analysis',
      '/sources',
      '/sources/some-key',
      '/learn',
      '/search',
      '/coverage',
      '/admin',
      '/admin/sign-in',
      '/dev/review-packet/x',
      '/sitemap.xml',
      '/guides',
      '/guides/a/b',
      '/guides/../admin',
      '/hero',
      '/hero/',
      '/hero/../admin',
      '/hero/nested/file.bin',
    ]) {
      expect(isPublicSurfacePath(path), path).toBe(false);
    }
  });
});
