# RAILWAY PRODUCTION RECOVERY

Date: 27 September 2026.
Live: `https://thetidesindexcom-production.up.railway.app/`

**Two faults, not one. One is fixed and pushed. The other cannot be fixed from
here — it needs the production database connection string, which I do not
have.**

---

## 1. ROOT CAUSE

### Fault A — every database-backed page returns 500

Measured, not inferred. Every route on the live site:

| Route | Live | Reads the database? |
|---|---|---|
| `/methodology` | **200** | No |
| `/editorial-policy` | **200** | No |
| `/robots.txt` | **200** | No |
| `/` | **500** | Yes |
| `/learn` | **500** | Yes |
| `/peptides` | **500** | Yes |
| `/peptides/bpc-157` | **500** | Yes |
| `/protocols` | **500** | Yes |
| `/research` | **500** | Yes |
| `/quality` | **500** | Yes |
| `/sources` | **500** | Yes |
| **`/sitemap.xml`** | **500** | Yes |
| `/search?q=BPC-157` | 200, **but see below** | Yes |

The split is exact: **everything that touches the database fails, and nothing
that does not.**

`/search` is the one that looks like an exception and is not. It returns 200
because the page shell streams before the suspended query runs; the body that
arrives is the loading state — *"Looking through the index… Searching the
index."* — and the results never come. It is failing in the same way, behind a
200.

`/sitemap.xml` is the cleanest proof. It is built purely from the `public_v_*`
views, with no layout, no components and no client code. It returns 500.

**So: the production application cannot read from its database.** The two
candidate causes are a connection that does not work (wrong or absent
`DATABASE_URL`, or the web service not receiving it) and a database that is
reachable but has no schema (migrations never run). Both produce exactly this
signature, and **they cannot be told apart from outside the deployment.** The
next step needs either the Railway runtime log or the connection string; see
§14.

Not guessed at: the error page's own claim that "the index is probably having
trouble reaching its database" is a guess, which is why it has been removed
(§9).

### Fault B — `/coverage` returns Not Found

**Root cause found exactly: the page had never been committed.**

`.gitignore` carried the conventional `coverage/` rule for test-coverage output.
Unanchored, that rule also matched `src/app/(public)/coverage/` — a real,
working page — so it was silently excluded from every commit and every push. It
works locally because the file is on disk. It 404s in production because it has
never been in a build.

Six places link to it, so the live site had six dead links: the home page,
`/learn`, `/search`, `/corrections`, `/editorial-policy` and the not-found page.

This is **(A) in the brief's list — the route exists locally but is missing from
the deployed commit** — with a specific mechanism. Not a rename, not a routing
fault, not obsolete navigation.

---

## 2. DEPLOYED COMMIT

| | |
|---|---|
| Local HEAD | `edc04ab` (was `0d4623d` when the audit ran) |
| GitHub `phase-a-foundation` | `edc04ab` |
| **Railway deployed commit** | **Not directly readable from outside.** The deployment fingerprints as *older than or equal to* `0d4623d`, and the `/coverage` 404 is consistent with every commit ever pushed, since the page was never in any of them |

The branch is aligned: there is one branch, `phase-a-foundation`, and GitHub made
it the default when it was first pushed to the empty repository.

---

## 3. RAILWAY WEB-SERVICE CONFIGURATION

Observable from the responses:

| | |
|---|---|
| Server | `railway-hikari`, edge `mia1` |
| TLS | Valid; HTTPS served correctly |
| Security headers | `x-content-type-options: nosniff`, `x-frame-options: DENY`, `referrer-policy: strict-origin-when-cross-origin` — all three present, so `next.config.ts` is in effect |
| `x-powered-by` | Absent, as configured |
| Static assets | Served; fonts and CSS preload correctly, so the standalone build's `.next/static` copy step worked |
| Error handling | The application's own boundaries render, not a platform error page |

**The deployment itself is healthy.** The build succeeded, the server is
running, routing works, static assets resolve and the security configuration is
live. Only the database layer is failing.

---

## 4. POSTGRESQL STATE

**Not inspectable from here.** No connection string, no dashboard access.

What the brief states — a PostgreSQL service added but not customised — is
consistent with the observed failure in either of its two forms.

---

## 5. MIGRATION STATE

**Unknown, and probably "none applied."** If the database was added and not
customised, nothing will have run `npm run db:migrate` against it, so it will
have no tables, no `public_v_*` views and none of the functions the publish
gates depend on — which alone would produce exactly the failure above.

No table was created by hand and none will be. The project's migration runner is
the only path.

---

## 6. PRODUCTION DATA COUNTS

**None verifiable.** The local source of truth, which production must match
after the recovery:

```
28   public compounds
924  published records
113  practitioner protocols public
0    withdrawn
0    records claiming a human review
220  registered sources, 97 held
8    publication refusals — the unwritten quality topics, expected
```

---

## 7. ENVIRONMENT VARIABLES

Cannot be read from outside. What must be true, from the Section 6 findings:

| Name | Build | Runtime | Note |
|---|---|---|---|
| `DATABASE_URL` | — | **Yes** | The whole of Fault A hangs on this |
| `NEXT_PUBLIC_SITE_URL` | **Yes** | Yes | **Inlined at build time.** Set only at runtime it does nothing — proven in Section 6, where a runtime-only value produced a sitemap of `localhost` URLs. For Railway it should be the `up.railway.app` origin until the custom domain is live |
| `TIDES_ALLOW_INDEXING` | **Yes** | Yes | **Leave unset.** Verified still unset: live `robots.txt` returns `Disallow: /` |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Yes | Absent; `/admin` degrades gracefully |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Yes | Absent |
| `NEXT_PUBLIC_CORRECTIONS_EMAIL` | Yes | Yes | Absent; still an owner input |
| `TIDES_PREVIEW_UNPUBLISHED` | — | — | **Must not be set.** Ignored in production regardless |
| `TIDES_ALLOW_DEMO_DATA` | — | — | **Must not be set** |

No credential appears in this document.

---

## 8. `/coverage` DIAGNOSIS — RESOLVED

Cause (A): present locally, absent from every deployed commit, because
`.gitignore`'s unanchored `coverage/` rule excluded it.

**Fixed in `edc04ab`:**

- `coverage/`, `build/`, `out/` and `dist/` are now anchored to the repository
  root, so none of them can ever swallow a source directory again.
- `src/app/(public)/coverage/page.tsx` is committed for the first time.
- Every ignored path under `src`, `db`, `scripts`, `data/seed` and `tests` was
  checked: **no other source file was in the same position.**

The page was not recreated. It was already correct; it had simply never been
published.

---

## 9. ERROR-PAGE CORRECTION — DONE

Both boundaries claimed things they cannot know.

**Removed from `(public)/error.tsx`:**

> "Nothing you were reading has been changed or withdrawn."
> "If it keeps happening, the index is probably having trouble reaching its
> database. Trying again in a minute is usually enough."

The first is a false reassurance if a record really had just been withdrawn. The
second is worse in practice: it sent readers away to wait for a fault that might
be permanent — which is precisely what happened here, where every
database-backed page failed for a reason no amount of waiting would fix.

**Now:**

> **We couldn't load this page.**
> The fault is at our end, not with the address you asked for.
> Try again, or return to another section of The Tides Index. If it keeps
> happening, the corrections page explains how to tell us.

"Try again" stays, because a retry is cheap and a transient failure remains one
real possibility among several. The same overreach in `global-error.tsx` was
corrected in the same way.

Recovery links offered are the ones that actually work.

---

## 10. ROUTES VERIFIED

Live, at the time of writing, before any redeploy:

| Working | Failing |
|---|---|
| `/methodology`, `/editorial-policy`, `/robots.txt` | `/`, `/learn`, `/peptides`, `/peptides/bpc-157`, `/protocols`, `/research`, `/quality`, `/sources`, `/sitemap.xml` |
| | `/search?q=BPC-157` — 200, loading state only |
| | `/coverage` — 404, fixed in `edc04ab`, awaiting redeploy |

---

## 11. SEARCH VERIFICATION

Failing. The 200 is the streamed shell; the body is the suspense fallback and no
result ever arrives. It will be re-checked once the database is connected.

---

## 12. SIMPLE / PRACTITIONER VERIFICATION

**Not testable yet** — both modes read from the database. The mode switch itself
renders, and the live search shell shows the Simple-mode banner correctly:
*"Simple reading: plain language. Amounts, frequency and duration are not shown
in this version."* So the mode machinery is deployed and working; it has no data
to act on.

---

## 13. PRIVATE-CONTENT CHECK ON THE LIVE SITE

| Check | Result |
|---|---|
| Private filesystem paths in any response | **None** |
| Tremblay transcript content | **None** — the snapshots are ignored by git and were never deployed |
| `localhost` URLs | None found in any served page |
| `robots.txt` | `Disallow: /` — **noindex intact** |

---

## 14. WHAT IS NEEDED TO FINISH — OWNER ACTION

Fault A cannot be diagnosed further or fixed from here. **One of these two
unblocks it:**

**Either — the production connection string.** Railway's Postgres service
exposes a public proxy URL (`Variables → DATABASE_PUBLIC_URL`, or the
`Connect` tab). With it, I can run the whole recovery from here:

```bash
DATABASE_URL='<production connection string>' npm run db:migrate
DATABASE_URL='<...>' npm run db:seed
DATABASE_URL='<...>' npm run db:strip-demo
DATABASE_URL='<...>' npm run db:publish-library
DATABASE_URL='<...>' npm run qa:production
DATABASE_URL='<...>' npm run qa:publication-integrity   # non-destructive: it rolls back
```

**Or — the runtime log.** The Railway service log for a request to `/sitemap.xml`
will name the exception in one line, and will distinguish "cannot connect" from
"relation does not exist" immediately.

**Also to check in the Railway dashboard, whichever route is taken:**

1. The **web service** has a `DATABASE_URL` variable referencing the Postgres
   service — in Railway that is a reference such as `${{Postgres.DATABASE_URL}}`,
   not a pasted literal. A Postgres service can exist and be perfectly healthy
   while the web service has never been told about it.
2. `NEXT_PUBLIC_SITE_URL` is set as a **build** variable, not only a deploy one.
3. `TIDES_ALLOW_INDEXING` stays unset.

---

## 15. REMAINING PRODUCTION ISSUES

| # | Issue | State |
|---|---|---|
| 1 | Every database-backed route fails | **Open — owner action, §14** |
| 2 | `/coverage` 404 | **Fixed** in `edc04ab`, awaiting redeploy |
| 3 | Error pages speculating about cause | **Fixed** in `edc04ab` |
| 4 | No corrections address | Open — owner input, unchanged since Section 6 |
| 5 | No Supabase project, so no editorial access | Open — degrades gracefully |
| 6 | Indexing | Correctly **off**, and to stay off |
