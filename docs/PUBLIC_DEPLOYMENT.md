# Public and research deployments

The Tides Index runs as two independently deployable Railway services from two
branches of this repository. They are never merged into each other.

| | Public production | Research / development |
|---|---|---|
| Branch | `public-holding-experience` | `phase-a-foundation` |
| Domain | thetidesindex.com (once approved) | the existing Railway preview domain |
| Serves | the holding home page and finished protocol guides only | the full research application: compounds, evidence, sources, search, quality, admin |
| `TIDES_SURFACE` | `public` | unset |

Both may read the same Railway Postgres over private networking.

## The public surface

With `TIDES_SURFACE=public`, `src/proxy.ts` serves only the paths allowed by
`src/domain/publishing/surface.ts`:

- `/` — the holding experience
- `/guides/<slug>` — a finished protocol guide
- `/robots.txt`, the icons, and static files (`/_next/*`, `/brand/*`, `/guides/*` images)

Every other path — research routes, search, `/reference`, `/admin`,
`/sitemap.xml` — answers 404 with the holding experience's own not-found page
(the proxy rewrites them to `/not-in-index`). Staff use the research service
for admin.

Without the variable, the proxy behaves exactly as before and every route is
served. `tests/unit/deployment-surface.test.ts` pins both behaviours.

## Database independence

The public home page is also the healthcheck path (`railway.json`). Its only
database read is four counts (`src/server/public/showcase.ts`), bounded by a
2.5-second deadline. If the database is unreachable or `DATABASE_URL` is not
set, the telemetry band is omitted and the page still answers 200. Guide pages
read nothing from the database.

## Setting up the public service (after owner approval)

1. Create a second Railway web service from this repository, branch
   `public-holding-experience`. It uses the same `railway.json` build and start
   commands.
2. Set `TIDES_SURFACE=public`, `NEXT_PUBLIC_SITE_URL=https://thetidesindex.com`
   and `DATABASE_URL` (the private-network URL of the shared Postgres; a
   read-only role is sufficient). Supabase variables are not needed.
3. Leave `TIDES_ALLOW_INDEXING` unset until indexing is approved.
4. Attach thetidesindex.com to the new service only after visual review.

The existing research service is not changed by any of this.

## Adding a protocol guide

See the header of `src/domain/showcase/protocol-guides.ts`: put the artwork in
`public/guides/`, set `artwork` with its path and pixel size, and set `state` to
`'ready'`. The guide then appears in the library and at `/guides/<slug>`.
