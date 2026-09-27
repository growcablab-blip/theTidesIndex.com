# PRODUCTION BACKUP AND RESTORE

How the production database is backed up, and — the part that matters — how it
is put back.

**Status: the restore procedures are written and one of the two has been
rehearsed. The provider-native half cannot be configured until the production
database exists.** See §6 for exactly what is outstanding.

---

## 1. Why there are two paths, not one

This database holds two kinds of thing, and they need different answers.

| | Where it comes from | Reproducible from git? |
|---|---|---|
| **Evidence content** — compounds, claims, protocols, sources, locators, gaps | `data/seed/**` and `SOURCE_MANIFEST.json`, loaded by `npm run db:seed` | **Yes, exactly** |
| **Publication state** — which records are public | `npm run db:publish-library`, through the real gates | **Yes, deterministically** |
| **Editorial history** — staff profiles, reviews, revisions, corrections, change requests | Created by people, in the application | **No. Once lost it is gone** |

So:

- **Path A — rebuild from source.** Recreates the entire public library from
  version-controlled files. Free, already exercised, and covers the content.
  It does **not** restore editorial history.
- **Path B — provider snapshot.** The only thing that restores reviews,
  approvals, corrections and staff accounts.

Path A is the reason a catastrophic content loss is survivable. Path B is the
reason the review workflow is survivable. **Neither substitutes for the other.**

---

## 2. Path A — rebuild from source

```bash
npm run db:migrate           # schema, in order, including 0031 and 0032
npm run db:seed              # evidence content from data/seed/**
npm run db:strip-demo        # refuses to leave demonstration rows behind
npm run db:publish-library   # publication through the real gates
```

Then verify:

```bash
npm run qa:production
npm run qa:publication-integrity
npm run qa:doses
npm run evidence:locators
npm run evidence:transcript-locators
```

**One hazard to know about.** A re-seed on a database whose protocols are
already published used to withdraw every one of them — the provenance watchdog
saw a rebuild mid-flight. Migration 0031 made the guards deferred and the seed
transactional, and `qa:publication-integrity` is the standing check that it has
not come back. If protocols ever come back `withdrawn` after a seed, that is
the regression, and the recovery is in §5.

### Rehearsed

| When | Result |
|---|---|
| 27 September 2026, development database | seed → publish → **924 published records, 28 compounds, 0 withdrawn**; `qa:publication-integrity` confirmed a deterministic re-seed preserves every published record |

This path has been exercised repeatedly across Sections 4, 5 and 5B. It works.

---

## 3. Path B — provider snapshot

**To be configured when the production database is provisioned.** The intended
shape:

| Setting | Intended value |
|---|---|
| Mechanism | Provider-native automated backup (Supabase Postgres, or the managed Postgres attached to the application host) |
| Frequency | Daily, automatic |
| Retention | 7 days minimum; 30 preferred |
| Point-in-time recovery | Enable if the plan offers it — the gap between "last night" and "the moment before the mistake" is where editorial work lives |
| Manual snapshot | One immediately before launch, and one before each migration |
| Responsible account | The owner's provider account. Not a shared login |
| Location | The provider's managed storage, in the project's own region |

### Restoring from a snapshot

1. **Restore into a new database, never over the live one.** Every managed
   provider supports this, and it turns a restore from an irreversible act into
   a reversible one.
2. Point a scratch environment at it:
   `DATABASE_URL='<restored connection string>'`.
3. Verify before switching anything:
   ```bash
   npm run qa:production
   npm run qa:publication-integrity
   npm run db:bootstrap-admin -- --list    # staff survived
   ```
4. Compare counts against §4.
5. Only then repoint the application's `DATABASE_URL` and redeploy.

### Manual snapshot without provider tooling

`pg_dump` is **not installed on the maintainer's machine** (checked
27 September 2026: `pg_dump`, `pg_restore` and `psql` are all absent). Either
install the Postgres client tools or take snapshots through the provider's
dashboard or CLI. Do not invent a third mechanism.

---

## 4. The numbers a restore must reproduce

The source-of-truth state at commit `f190a7b`:

```
28   public compounds
924  published records
113  practitioner protocols public
0    withdrawn
0    records claiming a human review
220  registered sources, 97 of them held
224  PDF/document locators resolved, 0 failed
21   transcript locators resolved, 0 failed
8    publication refusals — the unwritten quality topics, expected
```

A restored database that does not match these, after Path A, has a problem that
must be understood before it serves anyone.

---

## 5. If a re-seed withdraws protocols

The Section-4 regression, and its recovery, kept here because the symptom is
alarming and the fix is two commands:

```sql
UPDATE protocols SET publication_state = 'unpublished'
 WHERE publication_state = 'withdrawn';
```

```bash
npm run db:publish-library    # back through the real gates
```

This resets only `withdrawn → unpublished`, which is the *less* public state,
and republication then passes the gates normally. It does not resurrect a
record that was withdrawn for a real reason — those fail the gate again and are
reported.

---

## 6. Outstanding

| Item | Status |
|---|---|
| Path A, rebuild from source | **Done and rehearsed** |
| Restore-verification commands | **Done** |
| Provider automated backups | **Blocked** — no production database exists yet |
| Retention and point-in-time recovery settings | **Blocked** — same |
| Pre-launch manual snapshot | **Blocked** — same |
| Restore rehearsal from a provider snapshot | **Blocked** — same |
| Postgres client tools on the maintainer's machine | **Absent**; needed only if snapshots are taken outside the provider dashboard |

**A backup that has never been restored is a hope, not a backup.** Path A has
been restored, many times. Path B must be rehearsed once — into a scratch
database, never over production — before the site carries editorial history
worth losing.
