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
}

export function currentIndexingEnv(): IndexingEnv {
  return { flag: process.env.TIDES_ALLOW_INDEXING };
}

export function indexingAllowed(env: IndexingEnv): boolean {
  return env.flag === '1';
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
