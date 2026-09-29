import type { MetadataRoute } from 'next';
import {
  listLearningTopics,
  listPeptides,
  listQualityRegister,
  listSources,
} from '@/server/public/queries';
import { listPublishedStacks } from '@/server/public/stacks';

/**
 * The sitemap, built from the database rather than from a hand-kept list.
 *
 * Everything here comes through a `public_v_*` view, which is the same gate the
 * pages themselves read. That is the whole safety argument: a hand-maintained
 * list could name an unpublished slug, a demonstration record or a route that
 * only exists in development, and nobody would notice until it was indexed. A
 * list derived from the public views cannot, because those views exclude
 * unpublished rows and demonstration records by construction.
 *
 * Not listed, deliberately:
 *   - `/admin` and `/dev`, which are not public;
 *   - compounds in the register with no published record, whose pages say
 *     "record in preparation" and would be thin content in a search result;
 *   - quality topics that have not been written, for the same reason.
 *
 * While `TIDES_ALLOW_INDEXING` is unset, `robots.txt` disallows everything and
 * does not advertise this file. It is generated anyway so that it can be read
 * and checked before launch rather than first appearing on the day it matters.
 */
export const dynamic = 'force-dynamic';

/** Pages that exist regardless of what is in the database. */
const STATIC_PATHS: readonly string[] = [
  '/',
  '/learn',
  '/learn/figures',
  '/learn/publications',
  '/peptides',
  '/protocols',
  '/research',
  '/quality',
  '/quality/certificate-of-analysis',
  '/quality/sequence-to-vial',
  '/sources',
  '/search',
  '/evidence',
  '/routes',
  '/methodology',
  '/editorial-policy',
  '/corrections',
  '/coverage',
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://thetidesindex.com';
  const url = (path: string): string => `${site}${path}`;

  const [peptides, quality, learning, sources, stacks] = await Promise.all([
    listPeptides(),
    listQualityRegister(),
    listLearningTopics(),
    listSources(),
    listPublishedStacks(),
  ]);

  const entries: MetadataRoute.Sitemap = [
    ...STATIC_PATHS.map((path) => ({ url: url(path) })),
    // `listPeptides` reads public_v_peptides, so every row here is published.
    ...peptides.map((p) => ({ url: url(`/peptides/${p.slug}`) })),
    // The register lists unwritten topics too, so this one needs the filter.
    ...quality.filter((t) => t.isPublished).map((t) => ({ url: url(`/quality/${t.slug}`) })),
    ...learning.map((t) => ({ url: url(`/learn/${t.slug}`) })),
    // Sources are public whether or not anything cites them yet: the register is
    // itself a published statement about what this index holds.
    ...sources.map((s) => ({ url: url(`/sources/${s.sourceKey}`) })),
    // Only combinations whose compounds are published: the others have no page.
    ...stacks.map((s) => ({ url: url(`/protocols/stacks/${s.slug}`) })),
  ];

  /*
   * Deduplicated by URL, keeping the first occurrence.
   *
   * Two of the static paths are also quality-topic slugs —
   * /quality/certificate-of-analysis is a real topic with a hand-built page over
   * it — so the two lists legitimately overlap. A sitemap that names the same
   * URL twice is not fatal, but it is the kind of small wrongness that makes a
   * crawler's report harder to read than it needs to be.
   */
  const seen = new Set<string>();
  return entries.filter((entry) => {
    if (seen.has(entry.url)) return false;
    seen.add(entry.url);
    return true;
  });
}
