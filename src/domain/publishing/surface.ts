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
 * Next's own assets and common image types never reach this check — the proxy's
 * matcher excludes them — so this decides pages and the few other files the
 * holding experience needs.
 */
export function isPublicSurfacePath(pathname: string): boolean {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  if (PUBLIC_EXACT.has(path)) return true;
  if (/^\/guides\/[a-z0-9-]+$/.test(path)) return true;
  // A guide's own artwork files (images pass the matcher already; a PDF would not).
  if (/^\/guides\/[a-z0-9-]+\.(png|jpe?g|webp|avif|pdf)$/i.test(path)) return true;
  // The hero's own assets: its geometry file and stills. The proxy's matcher
  // lets common image types through already; `.bin` and friends come here.
  return /^\/hero\/[a-z0-9-]+\.[a-z0-9]+$/.test(path);
}
