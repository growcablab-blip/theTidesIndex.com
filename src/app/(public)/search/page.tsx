import Link from 'next/link';
import type { Metadata } from 'next';
import { getPublicDb } from '@/server/db/client';
import { withPublicSession } from '@/server/db/session';
import { configureFuzzyMatching, search, type SearchEntityType } from '@/server/search/search-service';
import { listEvidenceTypes, listRoutes } from '@/server/public/queries';
import {
  Container,
  EmptyState,
  EvidenceClassTag,
  EVIDENCE_CLASS_LABEL,
} from '@/components/public/primitives';
import type { EvidenceClass } from '@/domain/evidence/evidence-types';

/**
 * Rendered on demand rather than at build time.
 *
 * The content of this page changes when an editor publishes, not when the
 * application is deployed, so a build-time snapshot would serve stale evidence
 * until the next deploy. It also means a build does not need database access,
 * which keeps deployment independent of the database being reachable.
 */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Search',
  description:
    'Search compounds, quality topics and registered sources. Results are records, not generated answers.',
};

/**
 * Search.
 *
 * Deterministic and structured: every result is a record that exists, reached by
 * full-text and fuzzy matching over published content only. There is no
 * generated answer layer and there will not be one in front of this — a summary
 * that cannot be traced to a record is exactly what this platform is built to
 * avoid.
 *
 * Filters follow the dimensions the evidence model already keeps separate, which
 * is why "show me only compounds with human evidence" is a query rather than a
 * hand-maintained list.
 */

const ENTITY_LABELS: Readonly<Record<SearchEntityType, string>> = {
  peptide: 'Compound',
  claim: 'Statement',
  protocol: 'Protocol',
  quality_topic: 'Quality topic',
  source: 'Source',
  publication: 'Publication',
};

function hrefFor(entityType: SearchEntityType, slug: string): string {
  switch (entityType) {
    case 'peptide':
      return `/peptides/${slug}`;
    case 'quality_topic':
      return `/quality/${slug}`;
    case 'source':
      return `/sources/${slug}`;
    default:
      return `/search?q=${encodeURIComponent(slug)}`;
  }
}

interface SearchParams {
  q?: string;
  type?: string;
  evidence?: string;
  route?: string;
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const term = (params.q ?? '').trim();

  const entityTypes: SearchEntityType[] | undefined =
    params.type && params.type !== 'all' ? [params.type as SearchEntityType] : undefined;
  const evidenceClasses: EvidenceClass[] | undefined =
    params.evidence && params.evidence !== 'all'
      ? [params.evidence as EvidenceClass]
      : undefined;
  const routeKeys = params.route && params.route !== 'all' ? [params.route] : undefined;

  const [routes, evidenceTypes] = await Promise.all([listRoutes(), listEvidenceTypes()]);

  const results =
    term === ''
      ? []
      : await withPublicSession(getPublicDb(), async (tx) => {
          await configureFuzzyMatching(tx);
          return search(tx, term, {
            ...(entityTypes ? { entityTypes } : {}),
            ...(evidenceClasses ? { evidenceClasses } : {}),
            ...(routeKeys ? { routeKeys } : {}),
            limit: 50,
          });
        });

  const evidenceClassOptions = [...new Set(evidenceTypes.map((t) => t.evidenceClass))];

  return (
    <Container className="py-10 sm:py-14">
      <header className="max-w-[60ch]">
        <h1 className="font-serif text-3xl text-ink sm:text-4xl">Search</h1>
        <p className="mt-3 text-lg text-ink-soft">
          Compounds, quality topics and registered sources. Every result is a record you can open and
          trace — nothing here is generated.
        </p>
      </header>

      <form method="get" className="mt-8 space-y-4" role="search">
        <div className="flex flex-col gap-3 sm:flex-row">
          <label htmlFor="q" className="sr-only">
            Search
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={term}
            placeholder="Search a peptide, pathway, route, test or topic…"
            className="w-full rounded-md border border-rule bg-warm-white px-4 py-3 text-base text-ink placeholder:text-slate-light focus:border-tide-teal"
          />
          <button
            type="submit"
            className="rounded-md bg-deep-tide px-6 py-3 font-medium text-warm-white sm:w-auto"
          >
            Search
          </button>
        </div>

        <div className="flex flex-wrap gap-4">
          <Filter name="type" label="Kind of record" defaultValue={params.type}>
            <option value="all">Everything</option>
            <option value="peptide">Compounds</option>
            <option value="quality_topic">Quality topics</option>
            <option value="source">Sources</option>
          </Filter>

          <Filter name="evidence" label="Evidence recorded" defaultValue={params.evidence}>
            <option value="all">Any</option>
            {evidenceClassOptions.map((evidenceClass) => (
              <option key={evidenceClass} value={evidenceClass}>
                {EVIDENCE_CLASS_LABEL[evidenceClass]}
              </option>
            ))}
          </Filter>

          <Filter name="route" label="Route evidence" defaultValue={params.route}>
            <option value="all">Any</option>
            {routes.map((route) => (
              <option key={route.key} value={route.key}>
                {route.name}
              </option>
            ))}
          </Filter>
        </div>
      </form>

      <div className="mt-10">
        {term === '' ? (
          <SearchGuidance />
        ) : results.length === 0 ? (
          <EmptyState
            headline={`Nothing published matches “${term}”.`}
            detail="Search covers reviewed, published records only. A compound may be registered and under extraction without being findable here yet."
          >
            <p>
              The{' '}
              <Link href="/coverage" className="underline decoration-rule underline-offset-2">
                coverage page
              </Link>{' '}
              sets out what is and is not in the index.
            </p>
          </EmptyState>
        ) : (
          <>
            <p className="text-sm text-slate">
              {results.length === 50 ? 'First 50 results' : `${String(results.length)} results`} for{' '}
              <span className="text-ink-soft">“{term}”</span>
            </p>
            <ul className="mt-4 divide-y divide-rule border-y border-rule">
              {results.map((result) => (
                <li key={`${result.entityType}-${result.entityId}`}>
                  <Link
                    href={hrefFor(result.entityType, result.slug)}
                    className="group block py-4 transition-colors hover:bg-mist/60"
                  >
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span className="meta-label">{ENTITY_LABELS[result.entityType]}</span>
                      <span className="font-serif text-lg text-ink group-hover:text-deep-tide">
                        {result.title}
                      </span>
                      {result.entityType === 'peptide' && result.matchedAlias ? (
                        // Only meaningful for compounds: on a source record the
                        // indexed alias text is the author list, and calling that
                        // an alternative name would be misleading.
                        <span className="text-xs text-slate">matched an alternative name</span>
                      ) : null}
                    </div>

                    {result.subtitle ? (
                      <p className="mt-1 text-sm text-ink-soft">{result.subtitle}</p>
                    ) : null}

                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {(result.evidenceClasses ?? []).map((evidenceClass) => (
                        <EvidenceClassTag key={evidenceClass} evidenceClass={evidenceClass} />
                      ))}
                      {(result.routeKeys ?? []).length > 0 ? (
                        <span className="text-xs text-slate">
                          routes: {(result.routeKeys ?? []).join(', ')}
                        </span>
                      ) : null}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </Container>
  );
}

function Filter({
  name,
  label,
  defaultValue,
  children,
}: {
  name: string;
  label: string;
  defaultValue?: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={name} className="meta-label block">
        {label}
      </label>
      <select
        id={name}
        name={name}
        defaultValue={defaultValue ?? 'all'}
        className="mt-1 rounded-md border border-rule bg-warm-white px-3 py-1.5 text-sm text-ink"
      >
        {children}
      </select>
    </div>
  );
}

function SearchGuidance() {
  return (
    <div className="max-w-[62ch] space-y-4">
      <p className="text-ink-soft">
        Search matches canonical names, alternative names and misspellings, as well as the text of
        reviewed records.
      </p>
      <div className="rounded-md border border-rule bg-mist px-5 py-4">
        <p className="meta-label">A note on alternative names</p>
        <p className="mt-1.5 text-sm text-ink-soft">
          Some names that are used interchangeably in practice have not been established as the same
          molecule. Searching one will reach the record where that discussion lives, and the record
          will say plainly that the relationship is unresolved rather than quietly treating the two
          as identical.
        </p>
      </div>
      <p className="text-sm text-slate">
        Results come from published records only. Nothing is summarised or generated.
      </p>
    </div>
  );
}
