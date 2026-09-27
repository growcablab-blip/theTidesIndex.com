/**
 * Whether search engines may index this site — one switch, read in two places.
 *
 * `robots.ts` and the root layout's `robots` metadata have to agree. If they
 * ever disagree the failure is silent and expensive in exactly one direction:
 * a `robots.txt` that allows crawling while the pages say `noindex` merely
 * wastes a crawl, but a `robots.txt` that allows crawling while the operator
 * believes the site is private is how unreviewed medical content ends up in a
 * search result.
 *
 * So both read this, and lifting the block is one deliberate act: set
 * `TIDES_ALLOW_INDEXING=1` in the deployment environment. Absent, malformed or
 * any other value means blocked, because the safe state has to be the default
 * that a missing variable produces.
 */

export interface IndexingEnv {
  readonly flag: string | undefined;
  /** What the sitemap and canonical URLs will be built from. */
  readonly siteUrl: string | undefined;
}

export function currentIndexingEnv(): IndexingEnv {
  return {
    flag: process.env.TIDES_ALLOW_INDEXING,
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
  };
}

/**
 * A public origin: https, with a dotted host that is not a development name.
 *
 * The default when the variable is unset is the production domain, so an unset
 * variable is fine. What this catches is a *set* one that points somewhere
 * private — most obviously a development `.env` copied into the deployment,
 * which is how a sitemap full of `http://localhost:3000/` URLs gets published
 * on the day indexing is opened.
 */
function isPublicOrigin(value: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'https:') return false;
  const host = parsed.hostname.toLowerCase();
  if (!host.includes('.')) return false;
  if (host === '127.0.0.1' || host === '[::1]') return false;
  return !/(^|\.)(localhost|local|test|internal)$/.test(host);
}

/**
 * Two conditions, and the second is not decoration.
 *
 * Lifting the block is meant to be one deliberate act, but one act that can
 * half-succeed is worse than two: `TIDES_ALLOW_INDEXING=1` alongside a site URL
 * left pointing at a development machine opens crawling *and* advertises a
 * sitemap of unreachable URLs, and it does it silently. Requiring a public
 * origin makes the switch all-or-nothing.
 */
export function indexingAllowed(env: IndexingEnv): boolean {
  if (env.flag !== '1') return false;
  return env.siteUrl === undefined || isPublicOrigin(env.siteUrl);
}

/** Why indexing is still blocked, for an operator reading a deployment log. */
export function indexingRefusal(env: IndexingEnv): string | null {
  if (env.flag !== '1') {
    return 'Indexing is blocked. Set TIDES_ALLOW_INDEXING=1 to open it.';
  }
  if (env.siteUrl !== undefined && !isPublicOrigin(env.siteUrl)) {
    return (
      `Indexing is blocked although TIDES_ALLOW_INDEXING=1, because ` +
      `NEXT_PUBLIC_SITE_URL is "${env.siteUrl}", which is not a public https origin. ` +
      'Canonical URLs and the sitemap would be built from it.'
    );
  }
  return null;
}

/**
 * Paths no crawler should follow even after launch.
 *
 * The editorial surface, the development preview harness, and the API route
 * that exists only for the evidence form. None of them is public, and two of
 * them require a session, but a disallow line costs nothing and stops a crawler
 * repeatedly asking for pages it will never be shown.
 */
export const NEVER_INDEXED_PATHS: readonly string[] = ['/admin', '/dev'];
