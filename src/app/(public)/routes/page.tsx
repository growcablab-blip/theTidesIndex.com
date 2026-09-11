import Link from 'next/link';
import type { Metadata } from 'next';
import { listRoutes } from '@/server/public/queries';
import { getReadingMode } from '@/server/public/reading-mode';
import { Callout, Container, Section } from '@/components/public/primitives';
import { ModeSwitch } from '@/components/public/mode-switch';

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
  title: 'Administration routes',
  description:
    'What each route means in general — and why a general statement about a route is never a statement about a specific compound.',
};

/**
 * The route ontology.
 *
 * Descriptions here are about the route, not about any compound. That separation
 * is the entire point of the page: "peptides can be taken intranasally" is the
 * kind of sentence that sounds informative and is not, because absorption is
 * specific to a molecule and its formulation.
 */
export default async function RoutesPage() {
  const [routes, mode] = await Promise.all([listRoutes(), getReadingMode()]);
  const simple = mode === 'simple';

  return (
    <Container className="py-10 sm:py-14">
      <header className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
        <div className="max-w-[62ch]">
          <h1 className="font-serif text-3xl text-ink sm:text-4xl">Administration routes</h1>
          <p className="mt-3 text-lg text-ink-soft">
            How a compound can be given, and what each route means in general.
          </p>
        </div>
        <ModeSwitch mode={mode} path="/routes" />
      </header>

      <div className="mt-8 max-w-[62ch]">
        <Callout tone="caution" title="These pages describe routes, not compounds">
          <p>
            Whether a particular compound has been studied or reported by a particular route is
            recorded on that compound&rsquo;s own page, with the source, the formulation and the
            population. Absorption depends on the molecule and how it is formulated, so evidence that
            one peptide is absorbed by a route says nothing about another.
          </p>
        </Callout>
      </div>

      <Section id="routes" title="Routes">
        <div className="grid gap-4 sm:grid-cols-2">
          {routes.map((route) => (
            <article
              key={route.key}
              className="rounded-md border border-rule bg-warm-white px-5 py-4"
            >
              <h2 className="font-serif text-lg text-ink">{route.name}</h2>
              <p className="mt-1.5 text-sm text-ink-soft">
                {(simple ? route.descriptionSimple : route.descriptionPractitioner) ??
                  route.descriptionSimple}
              </p>
              {route.generalLimitations ? (
                <p className="mt-2.5 border-t border-rule-soft pt-2.5 text-xs text-slate">
                  {route.generalLimitations}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      </Section>

      <Section id="finding" title="Finding route evidence for a compound">
        <p className="max-w-[62ch] text-ink-soft">
          Search can filter to compounds with route evidence recorded — but only reviewed records are
          searchable, so an empty result means the extraction work has not been done rather than that
          no evidence exists.{' '}
          <Link href="/search" className="underline decoration-rule underline-offset-2">
            Search the index
          </Link>
          .
        </p>
      </Section>
    </Container>
  );
}
