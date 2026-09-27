# V1 SECTION 6 — PRODUCTION LAUNCH PREPARATION

Date: 27 September 2026. Baseline: `f190a7b` (Section 5B).

**Status: everything that can be done without the owner's accounts is done and
verified. The site is not live, and cannot be, because no hosting account,
database, Supabase project, DNS access or corrections address exists yet.**

Five owner actions stand between this state and a live site. They are in §22,
with exactly what each one needs.

---

## 1. LOCAL BASELINE

HEAD `f190a7b`, working tree clean at the start of the section.

| | |
|---|---|
| Node | v24.19.0 (`engines: >=22`) |
| npm | 11.9.0 |
| Next.js | ^16.3.4, `output: 'standalone'` |
| React | ^19.3.0 |
| Supabase SDK | `@supabase/supabase-js` ^2.60.0, `@supabase/ssr` ^0.12.7 |
| Drizzle ORM | ^0.45.2 · `postgres` ^3.4.7 |
| Migrations | **33**, latest `0032_stable_identity_for_rebuilt_relations` |

| Check | Result |
|---|---|
| `npm run lint` | clean |
| `npm run typecheck` | clean |
| `npx vitest run tests/unit` | 433 passing (438 after this section's new tests) |
| `npm run qa:publication-integrity` | a deterministic re-seed preserves every published record |
| `npm run qa:production` | **No blockers. This database may serve the public.** |
| `npm run qa:doses` | no dose-shaped strings in any patient payload |
| `npm run evidence:locators` | 224 resolved, 0 to check, 0 failed |
| `npm run evidence:transcript-locators` | 21 resolved, 0 ambiguous, 0 failed |
| `npm run build` | succeeds |
| Full integration suite at `f190a7b` | **435 passing, 0 failures** — recorded in Section 5B, not re-run at the unchanged state |

Application code changed during this section (the indexing guard, §21), so the
full suite was re-run afterwards. Result in §15.

---

## 2. INFRASTRUCTURE — WHAT IS ACTUALLY TRUE NOW

Verified, not assumed.

| Requirement | State | Evidence |
|---|---|---|
| Git remote | **MISSING** | `git remote -v` is empty |
| Hosting account (Railway) | **NEEDS OWNER AUTHORIZATION** | No account access; no project |
| Production database | **MISSING** | Only the local PGlite dev database exists |
| Supabase project | **MISSING** | `supabase/` holds a README and nothing else; no keys anywhere |
| DNS / registrar access | **NEEDS OWNER AUTHORIZATION** | No access from here |
| Corrections address | **OWNER INPUT REQUIRED** | `NEXT_PUBLIC_CORRECTIONS_EMAIL` is unset (§3) |
| Error monitoring | **MISSING** | No provider wired; `SENTRY_DSN` appears in `.env.example` only |
| Analytics | **ABSENT, deliberately** | No tracker, no cookie banner, nothing to remove (§12) |
| Deployment config | **READY** | `railway.json`, `.node-version`, standalone start verified (§9) |
| Backups | **PARTLY READY** | Rebuild-from-source rehearsed; provider snapshots blocked (§8) |

Nothing was fabricated: no account created, no credential invented, no DNS
touched.

---

## 3. CORRECTIONS CONTACT — **OWNER INPUT REQUIRED**

`NEXT_PUBLIC_CORRECTIONS_EMAIL` is unset in every environment, and there is no
legitimate Tides address anywhere in the project.

The page behaves correctly without one — verified against a real production
build: it renders the corrections history and explains the position rather than
printing a dead `mailto:`. `correctionsContact()` returns null for an absent or
malformed value, and the page renders whatever it is told.

**No address was invented, and none was borrowed.** Not a test address, not an
address belonging to another organisation, not an investigator's address from a
trial record.

**This is a hard launch blocker.** The site must not be opened to indexing with
a dead correction route: a reader who writes to an unmonitored address believes
they have been heard.

---

## 4. SUPABASE — **NEEDS OWNER AUTHORIZATION**

No project exists. The application is fully wired for one and degrades
gracefully without it, which was verified rather than assumed: `/admin` returns
200 and renders *"Editorial access is not configured on this deployment"*,
naming the two variables it needs. The public site never touches Supabase.

Required when the project exists:

| Variable | Where |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Build **and** runtime (§9) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Build **and** runtime |

**No service-role key is required, and none should be created.** Nothing in this
codebase reads one — confirmed by search. The admin bootstrap deliberately uses
the database owner connection instead (§5).

Also to configure in the Supabase dashboard at that point: the site URL and the
auth redirect allow-list must both be the production origin, matching
`/admin/auth/callback`.

---

## 5. FIRST ADMIN BOOTSTRAP — **READY, AND REHEARSED**

The Section-3 deadlock is resolved without weakening anything.

`profiles` has two policies and both resolve the caller's role *by reading
`profiles`*, so on an empty table nobody may insert — including the person about
to become the administrator. That is the correct failure: the alternative lets
an authenticated stranger appoint themselves.

Row-level security is **not forced** on the table, so the role that owns it — the
one in `DATABASE_URL`, the same connection that runs migrations — is not subject
to the policies. `npm run db:bootstrap-admin` uses that connection and nothing
else. No policy is dropped, relaxed or temporarily disabled; no service-role key
is introduced; nothing about any person is hard-coded.

**Rehearsed end to end against the development database:**

| Step | Result |
|---|---|
| `--list` on an empty table | reported 0 profiles |
| bootstrap with a throwaway uuid and a name | created the profile, role `admin` |
| bootstrap a second time | **refused**, naming the existing administrator |
| delete the rehearsal row | removed cleanly |
| `qa:production` afterwards | **No blockers** |

The rehearsal profile was deleted. Procedure: [`docs/ADMIN_BOOTSTRAP.md`](ADMIN_BOOTSTRAP.md).

**Owner action:** the Supabase account must exist first, and its user id must be
supplied. The script cannot confirm an id belongs to a real account without a
service-role key, which is not worth introducing for one copy-and-paste.

---

## 6. PRODUCTION DATABASE — **NEEDS PROVISIONING**

Not created; the local PGlite database is a development tool and is not a
candidate. When one exists:

```bash
npm run db:migrate    # all 33, in order
```

The integrity behaviour that must exist afterwards, all of it already in the
migrations:

| Behaviour | Migration |
|---|---|
| Deferred provenance guards | 0031 |
| Transactional seed | `db/seed/index.ts`, paired with 0031 |
| Stable identities for rebuilt relations | 0032 |
| Publication preserved across a deterministic seed | verified by `qa:publication-integrity` |
| Unresolved change requests block publication | 0030 |
| Public + unreviewed permitted | 0029 |
| Rejected content blocked | 0029 coherence trigger |

`qa:publication-integrity` is the standing proof that the first four hold, and it
runs against whatever `DATABASE_URL` names — including production, without
modifying it.

---

## 7. PRODUCTION DATA LOAD — PROCEDURE READY

```bash
npm run db:migrate
npm run db:seed              # deterministic, from data/seed/**
npm run db:strip-demo
npm run db:publish-library   # through the real gates; no flags flipped by hand
```

Then `qa:publication-integrity`, `qa:production`, `qa:doses`.

Expected to match the local source of truth at `f190a7b`:

```
28   public compounds
924  published records
113  practitioner protocols public
0    withdrawn
0    records claiming a human review
8    publication refusals — the unwritten quality topics, expected
```

A legitimate difference would be in rows the seed does not own — staff profiles,
reviews, corrections — which a fresh production database has none of. Content
counts that differ are a problem to understand before serving anyone.

---

## 8. BACKUP AND RESTORE — HALF DONE

Full document: [`docs/PRODUCTION_BACKUP_AND_RESTORE.md`](PRODUCTION_BACKUP_AND_RESTORE.md).

Two paths, because the database holds two kinds of thing:

- **Rebuild from source** — recreates the entire public library from
  version-controlled files. **Rehearsed, works, exercised repeatedly.** Does not
  restore editorial history.
- **Provider snapshot** — the only thing that restores reviews, approvals,
  corrections and staff accounts. **Blocked: no production database exists.**

`pg_dump`, `pg_restore` and `psql` are **absent from the maintainer's machine**,
so snapshots must be taken through the provider's dashboard or CLI until those
are installed.

**A backup that has never been restored is a hope.** Path A has been restored
many times. Path B must be rehearsed once — into a scratch database, never over
production — before the site carries editorial history worth losing.

---

## 9. DEPLOYMENT CONFIGURATION — **READY, AND VERIFIED LOCALLY**

`next.config.ts` already sets `output: 'standalone'`, `poweredByHeader: false`,
and three security headers (`X-Content-Type-Options`, `Referrer-Policy`,
`X-Frame-Options: DENY`). No Docker was introduced: nixpacks builds this
natively.

Added:

- **`.node-version`** → `24`, matching the runtime everything was tested on.
- **`railway.json`** — nixpacks build, health check on `/`, restart on failure,
  and the two commands below.

```
build:  npm run build && cp -r .next/static .next/standalone/.next/static && cp -r public .next/standalone/public
start:  node .next/standalone/server.js
```

The copy steps are not optional: a standalone build omits `.next/static` and
`public`, and without them the server starts and serves unstyled pages.

**Verified, not assumed.** The exact production command was run locally against
the real database: `/` and `/peptides/bpc-157` returned 200, and every public
route below returned 200.

### The finding that would have broken the launch

**`NEXT_PUBLIC_*` variables are inlined at build time.** Setting
`NEXT_PUBLIC_SITE_URL` only as a runtime variable does nothing: proven by
running the production server with it set at runtime and getting a sitemap full
of `http://localhost:3000/` URLs. Rebuilt with it set at build time, the same
server produced `https://thetidesindex.com/` throughout.

On Railway these must be present **as build variables**, not merely deploy ones:
`NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_CORRECTIONS_EMAIL`,
`TIDES_ALLOW_INDEXING`.

---

## 10. ENVIRONMENT VARIABLES — NAMES ONLY

No value, secret or credential appears in this document, in the repository, or
in any commit. `.gitignore` covers `.env.*`; only `.env.example` is tracked.

| Name | Needed at | Purpose |
|---|---|---|
| `DATABASE_URL` | Runtime | Production Postgres. Also the owner connection for migrations and bootstrap |
| `DATABASE_POOL_MAX` | Runtime | Optional pool ceiling |
| `NEXT_PUBLIC_SITE_URL` | **Build + runtime** | Canonical origin. Wrong here and the sitemap is wrong |
| `NEXT_PUBLIC_SUPABASE_URL` | **Build + runtime** | Staff auth |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Build + runtime** | Staff auth |
| `NEXT_PUBLIC_CORRECTIONS_EMAIL` | **Build + runtime** | The corrections route. Absent today |
| `TIDES_ALLOW_INDEXING` | **Build + runtime** | The launch switch. Must stay unset until §21 |
| `TIDES_PREVIEW_UNPUBLISHED` | — | **Must not be set in production.** Ignored there anyway (§13) |
| `TIDES_ALLOW_DEMO_DATA` | — | **Must not be set in production** |
| `NODE_ENV` | Runtime | `production` |
| `PORT` | Runtime | Supplied by the platform |

`SUPABASE_SERVICE_ROLE_KEY` appears in `.env.example` and **is read by nothing**.
It should not be created.

---

## 11. ERROR MONITORING — **NEEDS OWNER DECISION**

Nothing is wired. `SENTRY_DSN` is named in `.env.example` and referenced nowhere
in the code.

Recommendation for V1, in order of least commitment:

1. **Platform logs first.** Railway captures stdout/stderr and deploy failures
   with no integration, no account and no code. That covers server errors,
   failed routes and failed deploys — three of the four things needed.
2. **Add Sentry only if application exception detail is wanted.** The variable
   name already exists; the integration point is one config file. It needs an
   account, which needs the owner.

Deliberately not recommended: a full observability platform for a site with one
maintainer and no traffic.

**Owner action if (2):** create the account and supply a DSN. Not a blocker —
the site can launch on platform logs.

---

## 12. ANALYTICS AND PRIVACY — **DECIDED: NONE AT LAUNCH**

There is no analytics in this project. No tracker, no pixel, no cookie banner,
nothing to remove.

**The recommendation is to keep it that way for V1.** A clinical reference a
physician might send to a patient should not carry advertising-adjacent
tracking, and adding cookies would drag in consent machinery for vanity metrics.
Railway reports request volume without touching the application.

If aggregate numbers are wanted later, a cookieless self-hosted or
privacy-preserving counter is the shape to reach for. That remains the owner's
call and is recorded as undecided rather than decided by default in
`docs/OWNER_DECISIONS.md`.

---

## 13. SECURITY REVIEW

| Check | Result |
|---|---|
| `.env.local` tracked? | **No** — `.gitignore:3` covers `.env.*` |
| Any secret-shaped file tracked? | **No** — only `.env.example` |
| Service-role key read anywhere? | **No** — nothing reads it |
| Windows paths in `src/`? | **No** — one comment mentioning the pattern |
| `data/private` referenced from `src/`? | **No** |
| Private transcript text in the build output? | **No** — searched `.next/server` for the snapshot names and transcript hosts; nothing |
| Copyrighted sources tracked? | **No** — `sources/*` and `data/private/*` ignored |
| Tremblay snapshots | Confirmed ignored by `git check-ignore` |
| Security headers | `nosniff`, `strict-origin-when-cross-origin`, `X-Frame-Options: DENY` |
| `poweredByHeader` | disabled |
| `/admin` without a session | 200, rendering "editorial access is not configured", `robots: noindex` |
| `/dev` in production | **404** |

---

## 14. PRIVATE-SOURCE PROTECTION

The three Tremblay transcripts and every copyrighted PDF live under ignored
paths and are referenced only by hash and metadata. A production deployment
builds from git, so **the private material is not present on the server at
all** — not hidden there, absent.

Verified: no snapshot filename, transcript host or private path string appears
anywhere in the compiled server output.

---

## 15. QA AT THE END OF THIS SECTION

Application code changed — the indexing guard in §21 — so everything was re-run
rather than relying on the Section 5B result.

| Check | Result |
|---|---|
| `npm run lint` | clean |
| `npm run typecheck` | clean |
| `npx vitest run tests/unit` | **438 passing** across 31 files (433 + 5 new indexing tests) |
| `npm run qa:publication-integrity` | a deterministic re-seed preserves every published record |
| `npm run qa:production` | **No blockers. This database may serve the public.** |
| `npm run qa:doses` | no dose-shaped strings in any patient payload |
| `npm run evidence:locators` | 224 resolved, 0 to check, 0 failed |
| `npm run evidence:transcript-locators` | 21 resolved, 0 ambiguous, 0 failed |
| `npm run build` | succeeds |
| **`npx vitest run tests/integration`** | **435 passing across 37 files, 0 failures** — re-run because application code changed this section |

The integration run took 61 minutes against a normal 28–50. Nothing was wrong
with it: two production builds, three standalone servers and a development
server were running on the same machine at the time.

---

## 16. PREVIEW IS OFF IN PRODUCTION — VERIFIED

```ts
export function previewAllowed(env: PreviewEnv): boolean {
  return env.nodeEnv !== 'production' && env.flag === '1';
}
```

Two independent conditions, and the first cannot be satisfied in a production
build. **No environment variable can expose unpublished content in production**,
including `TIDES_PREVIEW_UNPUBLISHED=1`, which the production server was started
with during testing and which changed nothing.

---

## 17. ROBOTS AND SITEMAP — VERIFIED IN A REAL PRODUCTION SERVER

With `TIDES_ALLOW_INDEXING` unset, against the standalone production server:

```
User-Agent: *
Disallow: /
```

No sitemap is advertised, which is deliberate: a sitemap offered alongside a
total disallow is a mixed signal. The route stays reachable so it can be
inspected before launch, and it was — **288 URLs, zero `/admin`, zero `/dev`**,
built from the `public_v_*` views rather than a hand-kept list, so an
unpublished slug or a demonstration record cannot reach it by construction.

---

## 18. PRODUCTION-MODE ROUTE QA

Against the standalone server, real database, `NODE_ENV=production`:

| Route | |
|---|---|
| `/` `/learn` `/peptides` `/protocols` `/research` `/quality` `/sources` | 200 |
| `/methodology` `/editorial-policy` `/corrections` `/coverage` | 200 |
| `/peptides/bpc-157` `/peptides/aod-9604` | 200 |
| `/search?q=BPC-157` | 200 |
| `/peptides/not-a-real-compound` | **404** |
| `/dev` | **404** |
| `/admin` | 200 — "editorial access is not configured", noindex |

Full-width, mobile and tablet QA (Part 18 of the brief) is **not done**: it
belongs against the deployed site, and there is no deployment. The same passes
were completed in Section 3 against the development server.

---

## 19. DOMAIN, HTTPS, ADMIN AUTH, NOINDEX REMOVAL, LIVE URLS

**All blocked.** No hosting, no database, no Supabase project, no DNS access.
Nothing was attempted, nothing was half-configured, and `thetidesindex.com` is
untouched.

---

## 20. WHAT WAS BUILT THIS SECTION

| | |
|---|---|
| `scripts/db/bootstrap-admin.ts` | First-administrator bootstrap; rehearsed |
| `docs/ADMIN_BOOTSTRAP.md` | The documented, repeatable procedure |
| `docs/PRODUCTION_BACKUP_AND_RESTORE.md` | Both restore paths, one rehearsed |
| `railway.json`, `.node-version` | Deployment configuration, verified locally |
| `src/domain/publishing/indexing.ts` | The launch switch, hardened (§21) |
| `tests/unit/indexing.test.ts` | 5 tests pinning both failure directions |

---

## 21. THE LAUNCH SWITCH, HARDENED

`TIDES_ALLOW_INDEXING=1` was the single deliberate act that opens the site. One
act that can half-succeed is worse than two, and this one could: setting the
flag while `NEXT_PUBLIC_SITE_URL` still pointed at a development machine would
open crawling **and** publish a sitemap of unreachable URLs under the real
domain's name — silently.

`indexingAllowed` now requires both the flag and a public https origin. An unset
site URL is fine, because the code's own default is the production domain; what
is refused is a *set* one pointing somewhere private.

**Proven in a real production server, not just in tests:**

| Built with | robots.txt |
|---|---|
| flag on, `NEXT_PUBLIC_SITE_URL=http://localhost:3000` | `Disallow: /` — **the guard held** |
| flag on, `NEXT_PUBLIC_SITE_URL=https://thetidesindex.com` | `Allow: /`, `Disallow: /admin`, `Disallow: /dev`, sitemap at the production origin, **0 localhost URLs** |

`indexingRefusal()` says which condition failed, for a deployment log.

---

## 22. REMAINING TRUE LAUNCH BLOCKERS

Five, and every one needs the owner. Nothing else stands in the way.

| # | Blocker | Exactly what is needed |
|---|---|---|
| 1 | **Corrections address** | One real, monitored email address for `NEXT_PUBLIC_CORRECTIONS_EMAIL`. Not a test address, not a borrowed one. The site must not open to indexing with a dead correction route |
| 2 | **Hosting account** | Authorisation on a Railway account (or a named alternative), and a git remote to deploy from — there is none today |
| 3 | **Production database** | A managed Postgres, its connection string, and automated backups enabled on it |
| 4 | **Supabase project** | A project, its URL and anon key, the production site URL and auth redirect allow-list set, and one staff account created so the bootstrap has a user id |
| 5 | **DNS access** | Registrar or DNS-provider access for `thetidesindex.com` to point it at the deployment and obtain a certificate |

Optional, not blocking: an error-monitoring account (§11). Platform logs cover
the launch.

### The order they unlock

1 is independent — it can be supplied now.
2 → 3 → 7 (deploy with noindex on) → 4 → 5 (bootstrap) → 17 (domain and TLS) →
20 (admin auth test) → 21 (lift noindex).

Nothing in the codebase blocks any of it.

---

## 23. FINAL LIVE URLS

None. The site is not deployed.

---

## 24. NON-BLOCKING POST-LAUNCH BACKLOG

Recorded as post-launch development, not launch blockers, per the owner's
decision:

- the 8 unwritten quality topics — they refuse publication at the gate and the
  register shows them as unwritten, which is truthful;
- the 14 single-source compounds — source counts are displayed honestly;
- Section-4 compounds with no literature screen — the pages say so;
- the Larazotide and AOD-9604 literature screens;
- the remaining 20 Tremblay recordings;
- the remaining compound candidates, and the Melanotan and Thymalin identity
  questions;
- the MK-677 and 5-Amino-1MQ taxonomy decision;
- PDFs, presentations, Talk to Tides, semantic search.

---

## 25. POST-LAUNCH PRIORITIES

1. **Rehearse a restore from a provider snapshot**, into a scratch database,
   once editorial history exists. It is the one part of the backup plan that has
   never been exercised.
2. **Literature screens, Larazotide and AOD-9604 first.** Depth on held primary
   evidence is the axis that has not moved in four sections, and 14 compounds
   rest on one source.
3. **The eight quality topics**, written from held sources — not from the
   Tremblay collection, whose quality material is largely unverifiable by its own
   assessment.
4. **Error monitoring**, if platform logs prove too coarse in practice.
5. **The identity questions** — Thymalin versus Thymulin, HGH Frag 176-191
   versus AOD-9604 — both of which the register already carries as open gaps.
