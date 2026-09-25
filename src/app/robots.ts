import type { MetadataRoute } from 'next';
import {
  currentIndexingEnv,
  indexingAllowed,
  NEVER_INDEXED_PATHS,
} from '@/domain/publishing/indexing';

/**
 * robots.txt, generated from the same switch the page metadata reads.
 *
 * While indexing is off this disallows everything, and offers no sitemap: a
 * sitemap advertised alongside a total disallow is a mixed signal, and the
 * sitemap route stays reachable for anyone who wants to inspect it directly.
 */
export const dynamic = 'force-dynamic';

export default function robots(): MetadataRoute.Robots {
  const allowed = indexingAllowed(currentIndexingEnv());
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://thetidesindex.com';

  if (!allowed) {
    return { rules: [{ userAgent: '*', disallow: '/' }] };
  }

  return {
    rules: [{ userAgent: '*', allow: '/', disallow: [...NEVER_INDEXED_PATHS] }],
    sitemap: `${site}/sitemap.xml`,
  };
}
