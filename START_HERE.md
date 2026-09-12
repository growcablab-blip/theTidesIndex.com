# START HERE

To see The Tides Index on this machine.

---

## One command

Open PowerShell in `C:\The Tides Index` and run:

```bash
npm run tides
```

Or right-click `scripts\start-tides.ps1` and choose **Run with PowerShell**.

That is the whole of it. It starts a database, loads the evidence, starts the
site, and prints the pages worth opening:

```
  THE TIDES INDEX IS READY

  Home                       http://localhost:3000/
  Quality and testing        http://localhost:3000/quality
  — HPLC / purity            http://localhost:3000/quality/hplc-purity
  …
```

**Ctrl+C** stops everything.

First run takes a minute or two while the database is built. After that it is
about ten seconds.

---

## What it is doing

You do not need to know any of this to use it.

| | |
|---|---|
| Database | A real Postgres, compiled to WebAssembly, running from `.pglite/`. Nothing to install, nothing to configure. |
| Evidence | The source register, the four written quality topics, their claims and their recorded gaps. |
| Demonstration compound | One fictional compound, so the compound pages have something published to show. It is labelled as a demonstration everywhere it appears. |
| Preview | Records awaiting scientific review render at their public routes **with a banner saying so**. A production build refuses this outright. |

**Nothing is published.** No human has reviewed anything yet, the publish gates
are untouched, and the site is `noindex`.

---

## If something goes wrong

**"Port 3000 is already in use"** — something else is running there. Close it,
or run `npm run tides` again after it frees up.

**The database will not start** — delete the `.pglite` folder and run
`npm run tides` again. It is a local cache and rebuilds itself.

**A page shows a server error** — stop with Ctrl+C and start again. If it
persists, run `npm run db:migrate` and then `npm run tides`.

---

## Where to go next

`docs/OWNER_PRODUCT_TOUR.md` — what to open, in what order, and what to look at
on each page.

`docs/PRODUCT_VISIBILITY_REPORT.md` — what exists, what is still rough, and what
is deliberately unfinished.
