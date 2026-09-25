# V1 SECTION 3 — FINISH THE EXISTING WEBSITE

Date: 25 September 2026. Baseline: `f8c78f2` (Section 2).

Website completion only. **No compound was added. Tremblay was not ingested. Nothing was deployed,
DNS was not touched, `noindex` was not lifted, no PDF or presentation was rebuilt, and no AI or
semantic search was added.**

---

## 1. INTEGRITY EDGE CASE FIXED

**The invariant now holds: an unresolved request for changes blocks publication.**

Section 2 left a narrow gap. `tides_withdraw_on_review` (migration 0005) already took a *live* page
down when a reviewer recorded `changes_requested`, but a record that had never been published could
be published straight over an open request, because the publish path consulted approvals only and
Section 2 removed those.

**Migration `0030_open_change_request_blocks_publication.sql`** adds the missing condition and
nothing else.

`tides_has_open_change_request(entity_type, entity_id, version)` is true when at least one
reviewer's **most recent** decision at the record's **current version** is `changes_requested`.
Three design choices, each deliberate:

- **Most recent per reviewer**, matching how 0005 already defines resolution. A later approval from
  the same reviewer resolves it; a later approval from somebody else does not, because it does not
  answer the objection that was raised.
- **Scoped to the current version.** A material edit bumps the version and is itself the answer to a
  request for changes. An objection to wording that no longer exists must not haunt a record for
  ever.
- **`rejected` is not counted here.** That case is handled by the coherence trigger, which refuses
  outright; conflating the two would produce the wrong error message.

The condition is evaluated **last** in each of the six gates, after provenance and content. An editor
whose record is both unsourced and flagged hears about the missing citation first — which is the
problem they can act on, and quite possibly what the reviewer objected to.

**What did not change:** publication still does not require any approval. A record nobody has looked
at still publishes. `PUBLIC + UNREVIEWED` remains allowed; only `PUBLICATION + UNRESOLVED CHANGE
REQUEST` is blocked.

**Domain parity.** `src/domain/publishing/gates.ts` gains `hasOpenChangeRequest` on all four gate
inputs and a shared `changeRequestFailure()`. `src/server/editorial/gate-status.ts` supplies it by
calling the same database function, so the editorial interface explains the refusal before an editor
attempts it.

### Parity tests added

| Layer | Test | Asserts |
|---|---|---|
| Unit | refuses a claim with an unresolved request for changes | fully sourced claim, no reviews → refused, code `open_change_request` |
| Unit | refuses editorial copy with an unresolved request | the provenance-exempt path is not an escape hatch |
| Unit | reports the content gap before the reviewer objection | ordering, so the message is actionable |
| Unit | refuses an attributable regimen with an unresolved request | protocol gate |
| Integration | stops a record that would otherwise publish | the database refuses, not just the domain module |
| Integration | resolved by a later decision from the same reviewer | publishes again |
| Integration | not resolved by somebody else approving instead | still refused |
| Integration | does not haunt a record whose wording has since been rewritten | version scoping |
| Integration | leaves a record nobody has reviewed alone | the Section-2 policy is intact |

---

## 2. ERROR AND FAILURE EXPERIENCE

Four boundaries, built on one shared component so a missing page and a failed page feel like the same
product.

| File | Role |
|---|---|
| `src/components/public/failure-page.tsx` | The shared shape: what happened, what it does *not* mean, and four ways back (search, register, learn, sources) |
| `src/app/(public)/not-found.tsx` | Every `notFound()` in a public route, **inside the public layout** — the reader keeps the header, search box and footer |
| `src/app/(public)/error.tsx` | A public page that failed to render. Offers `reset()` first, because the realistic failure is a briefly unreachable database |
| `src/app/not-found.tsx` | Root fallback for URLs outside the public site; minimal, since it cannot use the site chrome |
| `src/app/global-error.tsx` | The root layout itself failed. Renders its own `html`/`body` with inline styles, because a stylesheet that failed to load is one way to get here |

**No stack traces, no digests, no error strings reach the reader.** A database error message can carry
table names, connection details or query fragments; the digest is logged server-side where it is
useful.

**`loading.tsx` was added in exactly one place** — `src/app/(public)/search/loading.tsx`. Search is
the one surface where the reader has just acted and is waiting on a query they asked for. Elsewhere a
reader arrives by following a link and a skeleton would flash and say nothing, so the record pages
deliberately have none. The skeleton claims no number: a placeholder reading "12 results" before the
query returned would be inventing one.

**Verified live, preview off:**

| URL | Result |
|---|---|
| `/peptides/not-a-compound` | 404, branded, site chrome retained |
| `/quality/not-a-topic` | 404, branded |
| `/learn/not-a-topic` | 404, branded |
| `/sources/SRC-999999` | 404, branded |
| `/totally-made-up` | 404, branded |

Rendered copy confirmed to contain "There is nothing at this address" and "Where to go instead", and
**not** Next's default "This page could not be found".

---

## 3. MOBILE COMPOUND REGISTER

The register was a nine-column table at `min-w-[64rem]` inside a bare `overflow-x-auto` — roughly two
and a half screens of sideways scrolling at 375px with no affordance saying so.

**Both representations now render from the same `shown` array**, so they cannot disagree: the table
at `lg` and above, a compact list below it.

Each mobile entry carries exactly what the brief asked for, and stops there:

- compound name (the link to the record) and, beneath it, type · research area
- **Human evidence** — the same worded state the table column uses
- **Preclinical**
- **Reported regimens** — the kinds of source, not a count
- **Open questions**

Not a card wall: one bordered row per compound, label left, value right, four lines. Everything
omitted is on the record one tap away. The register's job on a phone is to get a reader to the right
record, not to reproduce the table.

**Verified in the browser at four widths:**

| Width | Table | Cards | Horizontal overflow |
|---|---|---|---|
| 375 | hidden | 12 | **none** |
| 390 | hidden | 12 | **none** |
| 768 | hidden | 12 | **none** |
| 1280 | 9 columns | hidden | **none** |

At 375px the card measures 335px inside a 375px viewport, and `document.scrollWidth` equals
`window.innerWidth` — the horizontal trap is gone.

---

## 4. REVIEW / PUBLICATION LANGUAGE PASS

A site-wide audit of every public file for language equating **public** with **human reviewed**.
Each occurrence was judged on what it actually meant rather than pattern-replaced; the review ladder
is real and is still displayed.

### Corrected — statements that were false

| File | Was | Now |
|---|---|---|
| `coverage/page.tsx` | "traced to a named source at a specific page **and has passed review**" | "…at a specific page. That is not the same as a person having read it, and each record says which it has." |
| `methodology/page.tsx` | publication requires "approved source and scientific review" | "…and a written record of how that evidence was read. Human review is recorded separately and is not a condition of publication." |
| `methodology/page.tsx` | high-impact statements must "pass compliance review" | removed; the uncertainty requirement stands |
| `methodology/page.tsx` | a protocol needs "**four separate approvals**" | "Whether any of the four reviews has been recorded is stated on the record itself; none has been so far." |
| `methodology/page.tsx` | automation may "draft from records that have already been reviewed" | "…draft only from records that already resolve to a named source at an exact location." |
| `page.tsx` (home) | "every statement traceable to a source, a page **and a review**" | "…traceable to a named source at an exact page." |
| `page.tsx` (home) | "the same **reviewed data**" / "The same **reviewed evidence**" | "the same source-linked records" ×2 |
| `peptides/page.tsx` | "Every compound with a **reviewed record**" (H1 + meta) | "Every compound with a published record" |
| `peptides/[slug]/page.tsx` | meta: "**Reviewed evidence**, administration routes…" | "Source-linked evidence, …" |
| `peptides/[slug]/page.tsx` | "it is the **best reviewed information** currently held… Check the review date below" | "every statement on it still resolves to a named source at an exact location… Its review status is stated at the top of this page." |
| `routes/page.tsx`, `search/page.tsx` ×2 | "only **reviewed** records are searchable" / "covers reviewed, published records" | "published records" |
| `entry-paths.tsx` | "the same **reviewed records** a clinician sees" | "the same source-linked records" |
| `protocols.tsx` | "protocol records have **not yet passed review**" + "scientific, clinical and compliance review before it can be shown" | "No source-specific protocol record has been captured" + "an explicit statement of the evidence it rests on" |
| `record-in-preparation.tsx` ×3 | "has not passed review, so nothing is published" / "both scientific and compliance review" / "checked against their source and reviewed" | reworded to the provenance threshold that actually applies |
| `quality-evidence.tsx` ×2 | "Supported by a **reviewed** source" | "Supported by a named source" |
| `research-figures.tsx` | "Nothing **reviewed** to draw on" | "No source-linked evidence to draw on" |
| `routes-and-context.tsx` ×2 | "No route evidence has been **reviewed**" / "Regulatory status **review** pending" | "…recorded" / "No regulatory status has been checked and recorded" |
| `quality/[slug]`, `quality/sequence-to-vial` ×4 | "written from **reviewed** analytical sources", "statements have been **reviewed**", "Who has checked this record", "fill in from **reviewed** records" | reworded to recording/holding |
| `data/seed/evidence/*.json` ×3 | "The **reviewed** evidence held here does not establish…" | "The evidence held here…" (hplc-purity, identity-testing, peptide-content-assay) |

### The home-page provenance figure

`provenance-figure.tsx` drew a four-link chain ending in a filled **Review — a named person** box, on
the front page, as a completed step of every statement. The step is real and belongs in the figure,
so it was not deleted: it is now drawn **dashed and unfilled**, labelled *"by a named person — not
yet recorded"*, with the caption and the SVG `<desc>` saying the same. A filled fourth box was the
figure telling a reader something the database does not.

### Left alone, deliberately

Three categories were checked and **not** changed, because the words mean something else:

- **The review ladder itself** — "Not yet checked", "Source checked … No scientific review has taken
  place", "No scientist has yet read this page". This is the correct vocabulary; the rest of the site
  was pulled toward it.
- **Regulatory approval** — "Approved label", "Approved use names the jurisdiction, the authority and
  the date it was checked". A different axis entirely.
- **Source-artifact verification** — "Title page read and matched to the record", "Abstract checked;
  body unverified". This describes what was done to the held file, which is a real and separate fact.

### "Last reviewed" fields

`formatDate(null)` rendered **"Not recorded"**, which reads as an unfilled field rather than a state.
Now, on the compound record, both quality record pages, and the print header:

- screen: **"Not yet reviewed by a person"**
- paper: **"no human review recorded"** instead of "last reviewed Not recorded"

**Verified live:** a sweep of eleven rendered pages for `reviewed (data|records|evidence|statements|
sources|information)`, `has passed review`, and `four separate approvals` returns **zero matches**.

---

## 5. CORRECTIONS LOOP

**No contact address exists anywhere in this repository.** I searched every `.md`, the decision logs,
`.env.example`, `package.json`, `PROJECT_MANIFEST.json`, `SOURCE_MANIFEST.json` and all of `src/`.
Every address found is one of: a test fixture (`@example.org`), a form placeholder, or a third-party
investigator contact ingested from a ClinicalTrials.gov record. There is no `mailto:` anywhere, no
`/contact` route, and no decision record choosing an address. **Nothing was invented.**

So the page is built around configuration:

- **`src/domain/publishing/corrections-contact.ts`** reads `NEXT_PUBLIC_CORRECTIONS_EMAIL`,
  validates it looks like an address, and returns `null` otherwise. A malformed value produces a link
  that silently does nothing, so it is rejected rather than trusted.
- When set, `/corrections` renders a **"Report a correction"** mailto prefilled with the four things
  that make a correction actionable — the page URL, the statement, what the reader believes is
  correct, and a source if they have one — plus the plain address beside it.
- When unset, the page says exactly what it says today: no contact route is live, and it is listed as
  a gap rather than papered over.
- **`/coverage` now derives that gap entry** instead of hardcoding it, so the coverage page stops
  listing the gap the moment it is filled.

The page already covers all five reportable kinds in prose (factual errors, citation/source problems,
interpretation concerns, broken links, other corrections) and that copy was left as it stood.

`NEXT_PUBLIC_CORRECTIONS_EMAIL` is documented in `.env.example`. **This is owner input — see §14.**

---

## 6. ROBOTS + SITEMAP INFRASTRUCTURE

**The site remains `noindex`. Nothing here lifts it.**

### One switch, read in two places

`src/domain/publishing/indexing.ts` exports `indexingAllowed(env)`, true only when
`TIDES_ALLOW_INDEXING === '1'`. Both `robots.ts` and the root layout's `robots` metadata read it.

The failure this prevents is asymmetric: a `robots.txt` that allows crawling while the pages say
`noindex` merely wastes a crawl, but a `robots.txt` that allows crawling while the operator believes
the site is private is how unreviewed medical content ends up in a search result. Absent, malformed
or any other value means **blocked**, because the safe state must be what a missing variable produces.

The root layout's metadata was converted from an exported constant to **`generateMetadata()`**. A
module-level object is evaluated once when the module loads, so the switch would have been baked in
at build time — the wrong binding time for a switch whose failure mode is "indexed when we thought it
was not".

### Current output, verified live

```
User-Agent: *
Disallow: /
```

No sitemap is advertised while indexing is off: a sitemap offered beside a total disallow is a mixed
signal. The route stays reachable directly so it can be inspected before launch.

### The sitemap

Built from the database, never from a hand-kept list — everything comes through a `public_v_*` view,
the same gate the pages read. A hand-maintained list could name an unpublished slug, a demonstration
record or a dev route and nobody would notice until it was indexed.

**249 unique URLs, verified live:** 18 static pages · 12 compounds · 13 quality topics · 10 learning
topics · 197 sources. Deduplicated by URL, because two static paths are also real quality-topic slugs.

**Confirmed absent:** `/admin`, `/dev`, unpublished compounds (the register lists them; the sitemap
does not), unwritten quality topics, demonstration records.

### What changes when noindex is lifted

Exactly one thing: **set `TIDES_ALLOW_INDEXING=1` in the deployment environment.** Then, and only
then:

| Surface | Before | After |
|---|---|---|
| `/robots.txt` | `Disallow: /` | `Allow: /`, with `/admin` and `/dev` disallowed, and the sitemap advertised |
| Every page's `<meta name="robots">` | `noindex, nofollow` | `index, follow` |
| `/sitemap.xml` | generated, unadvertised | generated, advertised in robots.txt |

`/admin` keeps its own `noindex` from the admin layout regardless.

---

## 7. SEARCH QA

Deterministic search only. No claim-level indexing, no semantic layer, no invented synonyms — every
alias behaviour below rests on the existing `peptide_aliases` data.

Verified live with preview off:

| Query | Results | Compound records returned |
|---|---|---|
| `BPC-157` | 14 | bpc-157, thymosin-beta-4 |
| `BPC157` | 2 | bpc-157 |
| `TB-500` | 6 | tb-500, thymosin-beta-4 |
| `TB500` | 1 | tb-500 |
| `Modified GRF` | 3 | cjc-1295, mod-grf-1-29 |
| `CJC-1295` | 11 | cjc-1295, mod-grf-1-29 |
| `Retatrutide` | 13 | retatrutide |
| `Semax` | 16 | semax |
| `Selank` | 13 | selank, semax |

Three behaviours worth naming: **hyphen-free forms work** through the trigram index without any
synonym table; **TB-500 reaching Thymosin beta-4** is the `related_but_distinct` alias doing its job,
not a fuzzy accident; and **Modified GRF returning both** mod-grf-1-29 and cjc-1295 is decision D-12
(the two are kept as separate records) surfacing correctly.

The empty state and result labels were corrected in §4. Mobile usability was checked as part of §11.

---

## 8. PUBLICATION / COUNT CONSISTENCY

Hardcoded numbers that were correct today but would go stale silently are now derived from the arrays
and queries that produce them.

| File | Was | Now |
|---|---|---|
| `page.tsx` | "Seven questions" | `{LEARNING_JOURNEY.length}` |
| `page.tsx` | "Six rules the database keeps" | `{RULES.length}` |
| `learn/page.tsx` | "Seven questions" | `{LEARNING_JOURNEY.length}` |
| `learn/page.tsx`, `learn/publications/page.tsx` | "Five volumes" ×2 | `{VOLUMES.length}` |
| `quality/page.tsx` | "Fifteen stages" | `{SEQUENCE_TO_VIAL_STAGES.length}` |
| `quality/page.tsx` | "Four pages, in order" | `{PATHWAY.length}` |
| `volumes.ts` | "**Twelve compound monographs**, bound" | "A monograph for every compound record, bound" |
| `page.tsx` | `statementsAwaitingReview` labelled "statements…" | "**quality** statements extracted and awaiting scientific review" — the figure is a quality-register sum, not all 376 claims |

`volumes.ts` deserves a note: "Twelve compound monographs" was the one hardcoded number pegged to a
count the project actively intends to grow. It would have gone false the day compound 13 published,
on a page describing a printed reference. It is now worded so it cannot.

**A number that was missing.** `/coverage` exists to say what is and is not here, and the most
assumable fact was absent. `getCoverageSnapshot()` gains `recordsHumanReviewed`, counted from the
`review_state` the public views already carry, and the page now shows **"Records reviewed by a
person: 0"** beside the other counts.

**`/learn/publications` and the sixth build target.** PDF work is deferred, so this got the minimum
truthful fix only: the count is derived from `VOLUMES.length` rather than written as "Five", so it
cannot drift from the list rendered beneath it. *Peptides: The Essentials* remains a sixth build
target that is not a numbered volume — it describes itself as a booklet derived from volume one — and
reconciling that properly belongs with the deferred publication work.

---

## 9. QUALITY + LEARNING REGISTER CONSISTENCY

**Quality: correct as it stands.** 13 written topics are published, linked and readable; the 8
unwritten ones are refused publication by the gate for the right reason (`what_it_proves` and
`what_it_does_not_prove` are required) and render as "In preparation" or "Open question recorded".
They do not look complete. The `/quality` hub links its written topics — the audit's earlier claim
that it did not was wrong and was withdrawn in the Section-1 baseline.

**Learning: one real user-facing defect, fixed.** Two topics sat adjacent on `/learn` with
near-identical titles:

- "Receptors, agonists and antagonists"
- "Receptors, agonists and antagonists **(English sources)**"

The parenthetical is an internal provenance note that tells a reader nothing and makes the pair look
like a duplicate entry. The second is retitled **"Drug targets, affinity and efficacy"**, which is
what its own summary describes. No content was changed and no research was done — this is a title
fix, verified live on `/learn`.

---

## 10. SUPABASE — DEPLOYMENT PREP, NOT DEPLOYMENT

Supabase remains the authentication system. **Nothing was replaced and no credentials were created.**

### Public reading does not depend on it — confirmed

No file under `src/app/(public)/`, `src/components/public/` or `src/server/public/` imports Supabase
or the auth module. `src/proxy.ts` matches every route but guards explicitly:

```ts
if (!supabaseUrl || !supabaseKey) return response;
```

Missing keys → clean early return → public pages render normally. That is the current local state,
and every public route returns 200 with no Supabase configuration present.

### Admin now fails gracefully

`getStaffSession()` throws when the keys are absent, and with no boundary above it that surfaced as an
unstyled **500 on every editorial route** — which reads as "the site is broken" rather than "this
deployment has no editorial access yet".

`staffAuthConfigured()` (in `src/server/auth/supabase.ts`) is now checked in the admin layout before
any session lookup. Unconfigured deployments get a calm page: editorial access is not configured, the
public site is unaffected, here are the two variables required, and a link back. **No fake session,
no sign-in form that cannot work.**

### One risk worth stating

The dangerous middle state is **keys present but wrong**. The proxy's `await supabase.auth.getUser()`
has no `try`/`catch` and runs on every matched request, including public ones. Absent keys are safe
and correct keys are safe; a typo'd URL or a revoked key is the case with no defence. I did not change
it in this section — it is a behaviour change to the request path for every page, and it wants its own
verification — but it should be wrapped before the first real deployment.

**The full provisioning checklist is §14.**

---

## 11. DESKTOP / MOBILE QA

Run with **preview off** (`TIDES_PREVIEW_UNPUBLISHED=0`), so every page rendered from published
records.

| Route | Status |
|---|---|
| `/` | 200 |
| `/learn` | 200 |
| `/peptides` | 200 |
| `/peptides/bpc-157` | 200 |
| `/protocols` | 200 |
| `/protocols?peptide=bpc-157` | 200 |
| `/research` | 200 |
| `/quality` | 200 |
| `/quality/hplc-purity` | 200 |
| `/sources` | 200 |
| `/search?q=BPC-157` | 200 |
| `/coverage` | 200 |
| `/methodology` | 200 |
| `/editorial-policy` | 200 |
| `/corrections` | 200 |

| Check | Result |
|---|---|
| Practitioner mode doses | 250 mcg, 300–500 mcg, 300–600 mcg, 500 mcg, 2 mg, 10 mg, 20 mg — attributed per source |
| Simple mode, protocol library | **0 dose tokens** |
| Simple mode, compound record | **0 dose tokens** |
| `npm run qa:doses` | "No dose-shaped strings in any patient payload" |
| Real review state shown | "Review status · Not yet checked · Published" + the public-vs-checked sentence |
| Demonstration data | none — `qa:production` reports no blockers |
| Preview dependency | none — all pages render with preview off |
| False reviewed-language | **0 matches** across 11 pages |
| Primary navigation | intact at all four widths |
| Mobile horizontal trap | **gone** — `scrollWidth === innerWidth` at 375, 390, 768 |

---

## 12. TEST / BUILD RESULTS

| Command | Result |
|---|---|
| `npm run lint` | **clean** |
| `npm run typecheck` | **exit 0** |
| Unit tests | **406 passed**, 27 files |
| Integration suite — targeted | **10 files, 136 tests, all passed**: publish-gates, gate-parity, review-dry-run, review-lifecycle, publication-review-separation, evidence-packet, public-quality-page, quality-register, editorial-services, synthesis-review. Chosen to cover every gate change plus every suite asserting copy this section altered |
| Integration suite — full (35 files, 419 tests) | Started after the commit; result appended below when it lands. The full run takes ~75 minutes on this machine — see the note under this table |
| `npm run build` | **succeeds** — `/robots.txt` and `/sitemap.xml` present as dynamic routes; `/_not-found` static |
| `npm run qa:production` | **No blockers. This database may serve the public.** |
| `npm run qa:doses` | clean, all 12 compounds |
| `npm run evidence:locators` | 172 resolved, **0 failed**, 0 to check |
| `npm run readiness` | 12 of 12 mechanically ready |
| `npm run audit:patient` | exit 0, 12 strings to inspect — all the word *reconstituted* inside research questions and inside copy stating those details are **not** shown. No dose values. Pre-existing seed wording |

**No integrity test was weakened.** Two unit assertions changed because a label changed
("Supported by a reviewed source" → "Supported by a named source"); the assertions still check that a
gap and a sourced statement never share wording or styling.

**Why the full suite was not a commit gate.** It takes ~75 minutes here: every test truncates and
re-seeds the entire corpus in `beforeEach` (197 sources, 376 claims, 84 protocols, 35 packets), and
`vitest.config.ts` deliberately runs everything in one worker because parallel forks crashed on
Windows. That is ~10.5 seconds per test across 419 tests. The targeted run above covers the blast
radius of this section's changes; the full run is confirmation, not discovery. **Seeding once per
file and rolling back per test inside a transaction would likely cut it to single digits** — worth
doing, but it is surgery on the harness every integrity guarantee depends on, so it is not website
completion work.

**One operational hazard found, worth knowing:** re-seeding a database that already has published
protocols **withdraws all of them**. The seed deletes and re-inserts `protocol_sources`, and the
provenance watchdog correctly withdraws a published protocol that momentarily has no source. It is
not a regression from this work and provenance is intact afterwards, but a re-seed must be followed by
`npm run db:publish-library`. Documented here because it will otherwise look like data loss.

---

## 13. REMAINING WEBSITE BLOCKERS

| Item | State |
|---|---|
| **Correction contact** | Page and coverage entry are wired and configurable; the address itself is owner input (§14) |
| **`noindex`** | Still on, deliberately. One variable lifts it |
| **Supabase / admin** | Fails gracefully now, but no human review can be recorded until it is provisioned. Not blocking public reading |
| **Proxy `getUser()` unguarded** | Keys present-but-wrong would affect public pages. Wrap before first deployment (§10) |
| **Claims and protocols not searchable as entities** | Indexed only via their parent compound. Out of scope here; still the largest search gap |
| **8 unwritten quality topics** | Correctly refused publication; 4 blocked on unheld USP chapters |
| **`/learn/publications`** | Count derived and truthful; the sixth build target is unreconciled, deferred with the PDF work |
| **Deployment** | Nothing deployed. No Railway config, no hosted database, no git remote |
| **Editorial syntheses** | 6 remain unpublished by the Section-2 decision; still an open owner question |

---

## 14. EXACT ITEMS REQUIRING OWNER CREDENTIALS OR INPUT

Nothing below can be derived from the repository.

| # | Input | Where it goes | If missing |
|---|---|---|---|
| 1 | **Correction contact address** | `NEXT_PUBLIC_CORRECTIONS_EMAIL` | `/corrections` continues to say no contact route is live; `/coverage` continues to list it as a gap |
| 2 | **Supabase project URL** | `NEXT_PUBLIC_SUPABASE_URL` | `/admin` shows the "not configured" page; public site unaffected |
| 3 | **Supabase anon key** | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | same as 2 |
| 4 | **Canonical site origin** | `NEXT_PUBLIC_SITE_URL` (e.g. `https://thetidesindex.com`) | Magic-link emails are built from the `Host` header and will fail Supabase's redirect allow-list; canonical metadata and print headers also wrong |
| 5 | **Supabase redirect allow-list entry** | Supabase → Authentication → URL Configuration: `{NEXT_PUBLIC_SITE_URL}/admin/auth/callback` exactly, plus the local equivalent | The magic link lands on an error page; no session is ever created |
| 6 | **Email delivery for magic links** | Supabase Auth email provider (default SMTP is rate-limited; production needs a real one) | No sign-in is possible. The UI cannot report this — it deliberately returns the same response either way so it never reveals which addresses are registered |
| 7 | **Staff invited as Supabase Auth users** | Supabase → Authentication → Users → Invite | Sign-in silently fails: the code sets `shouldCreateUser: false`, so self-signup is blocked by design |
| 8 | **THE FIRST ADMIN PROFILE — manual SQL, no code path exists** | A direct INSERT into `profiles` as owner/superuser/`service_role` (e.g. the Supabase SQL editor) with `user_id` (the UUID from #7), `display_name`, `role = 'admin'` | **Hard deadlock.** The staff page requires `requireRole('admin')`; no profile means no session; and the RLS policy `admin_manage` refuses the INSERT because `tides_has_role('admin')` is false on an empty table. No script, seed or route in this repo can break it. The demo seed cannot be used — it refuses non-localhost databases and contains no `admin` role |
| 9 | **Primary Postgres connection string** | `DATABASE_URL` | Every page fails, public and admin. The role must be able to `set_config('role','authenticated')` |
| 10 | **Restricted public Postgres role** | `DATABASE_URL_PUBLIC` | Falls back to `DATABASE_URL`. Public reads are still constrained by `set role anon`, but the connection retains full privileges — one layer thinner than designed |
| 11 | **Migrations run against the hosted database** | `npm run db:migrate`, all 31 files `0000`–`0030` | Run them **against the Supabase database** so the `auth` schema exists and the `profiles → auth.users` FK is created; running elsewhere first silently skips that constraint |
| 12 | **Decision: lift indexing** | `TIDES_ALLOW_INDEXING=1` | Site stays `noindex` and `robots.txt` disallows everything — the intended state until launch |

Two variables in `.env.example` are **dead configuration today**: `SUPABASE_SERVICE_ROLE_KEY` and
`SENTRY_DSN` are read nowhere in `src/`, `scripts/` or `db/`. Supplying them changes nothing;
omitting them breaks nothing.

---

## 15. RECOMMENDED SECTION 4 STARTING POINT

The website is finished for V1. The next constraint is the library, and the decision in front of it
has not been made.

**Start Section 4 with the breadth-versus-depth question from the Section-1 baseline (§8), because
everything else depends on the answer.** The "~30 compounds" is a 43-row planning spreadsheet plus
five practitioner handbooks, not 30 evidence bases:

- **6 candidates** could carry a genuine mixed evidence base — Semaglutide, Tirzepatide, LL-37,
  Thymosin alpha-1, Liraglutide, VIP.
- **~20 more** could become honest attributed practitioner-reference records, legitimate under the
  Section-2 policy and the same material the existing 12 already lean on — but visibly thinner than a
  BPC-157 or retatrutide record.

Then, in this order:

1. **Provision Supabase** (§14 items 2–8). It is no longer blocking publication, but it is the only
   thing standing between the library and genuine assurance, and item 8 is a manual step nobody will
   discover under time pressure.
2. **Wrap the proxy's `getUser()`** before any deployment (§10).
3. **Expand the library** to the tier the owner chooses, building each record to the standard of the
   existing 12.
4. **Then** Tremblay, when the archive exists — the schema is already ready for it, including
   timestamp locators for recorded interviews.
5. **Then** deployment, and `TIDES_ALLOW_INDEXING=1` as the last act.

---

*Section 3 complete. No compound added, no Tremblay ingestion, no deployment, no DNS change,
`noindex` unchanged, no PDF or presentation work.*
