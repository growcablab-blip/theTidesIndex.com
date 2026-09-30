/**
 * Which surface a deployment serves.
 *
 * The same codebase runs as two Railway services:
 *
 *   research  the full research application — compounds, evidence, sources,
 *             search, admin. The default, so an unconfigured deployment behaves
 *             exactly as it always has.
 *   public    the public holding experience only — the cinematic home page and
 *             finished protocol guides. Every other path answers 404, so an
 *             unfinished research page can never be reached on the public
 *             domain, even by a direct link.
 *
 * Set with TIDES_SURFACE=public on the public service. Any other value, or the
 * variable being absent, is `research`.
 */

export type Surface = 'research' | 'public';

export function currentSurface(env: Record<string, string | undefined> = process.env): Surface {
  return env.TIDES_SURFACE?.trim().toLowerCase() === 'public' ? 'public' : 'research';
}

/** Exact paths the public surface serves, beyond the guide pages. */
const PUBLIC_EXACT = new Set(['/', '/robots.txt', '/icon.png', '/apple-icon.png']);

/**
 * Whether the public surface serves this path.
 *
 * Static files and Next's own assets never reach this check — the proxy's
 * matcher excludes them — so this only has to decide between pages.
 */
export function isPublicSurfacePath(pathname: string): boolean {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  if (PUBLIC_EXACT.has(path)) return true;
  return /^\/guides\/[a-z0-9-]+$/.test(path);
}
