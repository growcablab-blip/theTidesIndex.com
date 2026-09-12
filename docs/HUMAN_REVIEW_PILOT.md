# HUMAN REVIEW PILOT — RUNBOOK

Everything between "we have a packet" and "a named person has approved it", in
the order it happens.

Scientific expansion is frozen for the duration. The purpose of this stage is to
find out whether the editorial system works when a real person is on the other
end of it, and adding more evidence before knowing that would mean building on an
untested assumption.

---

## 1. What the reviewer needs to be

The first packet is **HPLC / chromatographic purity**. It is analytical, not
clinical: nothing in it concerns dosing, administration or patient care.

Suitable:

- analytical chemist
- pharmaceutical QC or QA scientist
- pharmaceutical scientist
- pharmacist with relevant analytical-quality expertise
- equivalent qualified professional

**A peptide clinician is not needed for this packet**, and asking one to review it
would be asking the wrong question of the right person.

They also need **access to a copy of Grant, *Synthetic Peptides: A User's Guide*,
2nd edition** (Oxford University Press, 2002; ISBN 0-19-513261-0). This index
holds a copy and does not send it — it is a third-party copyrighted work. If the
reviewer cannot obtain one, arrange lawful access separately; do not create a
download route and do not attach the file.

---

## 2. What to ask them for

The intake, and nothing beyond it. Validated by
`src/server/editorial/reviewer-intake.ts`, which writes nothing.

| Field | Required | Why it is asked |
|---|---|---|
| Full name | yes | Appears beside a published approval |
| Professional role | yes | What they are — "analytical chemist" — not a job title |
| Relevant expertise | yes | Bounds the review. Approving a purity packet says nothing about microbiology |
| Organisation | no | Only if they wish to give one |
| Credential summary | no | One or two lines. Not a CV, never a publication list |
| Contact email | yes | Operational only. Sending the packet, asking the follow-up. Never published |
| Conflicts | yes | See below |
| Active | — | Defaults true. Deactivation preserves audit history; staff rows are never deleted |

**Not asked, and not to be asked:** date of birth, address, registration number,
CV, publication list, employment history. None of it would help a reader weigh an
approval, and collecting it would make this index the custodian of personal data
it has no use for.

### Conflicts

The reviewer states one of:

- **No relevant conflict disclosed**, or
- **Disclosure provided**, with explanatory text.

A disclosed conflict **does not disqualify anyone**. An analytical chemist who
consults for a contract laboratory is likely to be better at reading a
certificate, not worse; excluding everyone with commercial exposure to
pharmaceutical quality would exclude most people who understand it. The
disclosure is recorded alongside the review so a reader can weigh it. Whether to
proceed is an editorial judgement, made case by case, and is never automatic.

What is not acceptable is an approval by somebody nobody asked. That is why the
column has three states — `false`, `true`, `null` — and why `null` means "nobody
asked" rather than "none".

Two rules are enforced by database constraint and refused earlier by the intake
validator: a declared conflict must say what it is, and any answer must be dated.

---

## 3. Creating the reviewer record

**Not yet.** No reviewer record exists and none should be created until an actual
reviewer has been selected and the owner has authorised it.

When that happens, the record needs a `user_id` from Supabase Auth, which is not
provisioned. `intakeToProfileColumns()` produces the row; nothing in this
codebase writes it.

`is_demonstration` is never set from an intake. That flag belongs to the
demonstration fixture and to nothing else, and `npm run qa:production` refuses a
database that carries it.

---

## 4. Standing up an environment

A freshly seeded database has **nothing awaiting review**. Loading a packet is
data; submitting one is an act the database insists on attributing to a named
editor, so `seedDatabase` cannot perform it and does not try.

This is the step that was previously undocumented and had to be rediscovered.

```bash
npm run db:migrate
npm run db:seed
npm run evidence:submit -- --all --as <staff-user-id>
```

`--as` is required. The source check is recorded as automated and attributed to
the tool, but the session it runs in belongs to a person, and that attribution is
the point of the step. `--all` submits every loaded packet under one editor; a
single packet key submits one.

The acting user must be an **active editor or admin**. In development that is the
"Local Dev Editor" profile, which is flagged as a demonstration record and will
therefore block `qa:production` — correctly.

**Do not fake a named-editor submission during seeding.** An automatic submission
would attribute a real editorial act to nobody, which is the same failure as an
automated scientific approval wearing a person's name.

Then confirm:

```bash
npm run qa:metrics
npm run qa:publication -- hplc-purity
npm run qa:production
```

---

## 5. Producing the bundle

| | |
|---|---|
| In the editorial surface | `/admin/quality-topics/<id>/bundle` — add `?to=Name` to address the cover |
| In development | `/dev/review-packet/<slug>/bundle` |

Four parts: cover, guide, evidence, response form. Print it or save it as a PDF.

Producing a bundle **writes nothing**. In particular it sets no "sent for review"
state, because sending somebody a document is not the same as their having agreed
to review it, and a status that said otherwise would be the first lie in the
chain.

The response form is printed, not interactive, and the document contains no form,
button or input of any kind. That is deliberate and asserted by test: a returned
sheet cannot be a review record, because a scanned tick cannot be attributed with
the confidence an approval needs.

---

## 6. The lifecycle

Do not shortcut any step.

1. A qualified reviewer is selected.
2. Their standing and conflicts position is **recorded first** — before the
   review, never after. A credential written down afterwards is a credential
   chosen to fit the outcome.
3. The packet version is submitted (§4).
4. The bundle is produced and sent (§5).
5. The reviewer reads the evidence, against their own copy of the source.
6. The reviewer approves or requests changes, **in the application, under their
   own account, against the exact version shown**.
7. An editor responds to requested changes.
8. A substantive edit creates a new version.
9. The prior approval is stranded — automatically, by the version binding.
10. The reviewer is shown a diff of what changed.
11. The reviewer re-reviews.
12. The final approval is recorded against the exact version.

### What comes back on paper, and what can be done with it

**Comments** are transcribed against the record verbatim and attributed to the
reviewer.

**A decision is not.** An approval or a change request is entered by the reviewer
themselves. No editor records one on anybody's behalf, and no editor's reading of
a reviewer's letter is stored as their approval. If the reviewer works on paper,
they still enter the decision.

This is not procedural fussiness. The platform's whole claim is that a published
statement was approved by a person answerable for it, and an approval an editor
typed in on somebody's behalf is not that.

---

## 7. The audit trail

Reviews are **append-only in practice**: a later review never overwrites an
earlier one.

Preserved for every decision: the reviewer, the entity version, the outcome, the
timestamp, and the comments. A subsequent revision and a subsequent review are
further rows. `appliesToCurrentVersion` is derived, not stored, so a stranded
approval stays visible as history without being counted as standing.

A reviewer looking at a re-review sees what changed rather than an apparently
identical record — `reviewDiff` compares the snapshot at the version they
approved against the row as it now stands, and says so plainly when a version
moved without touching a field an approval rests on.

---

## 8. Demonstration versus real

Two things must never be confusable.

| | Demonstration reviewer / workflow test | Real reviewer / scientific approval |
|---|---|---|
| Where it lives | Local database only | Production |
| Created by | The demonstration fixture, opt-in and localhost-only | Owner authorisation, after intake |
| Flagged | `is_demonstration = true` | never |
| Effect on production gates | **none — it cannot reach production** | opens the gate |

The publish gate is not taught to recognise a fake person: that would be a worse
gate. Instead the demonstration records are kept out of production entirely, and
`npm run qa:production` is the door.

It rejects a database containing demonstration records, reviews recorded by a
demonstration reviewer, records whose keys name them as test fixtures, a public
view exposing a private source field, a published record with no standing human
approval, or preview enabled in a production build.

**A development database is expected to fail it.** That is not a reason to soften
it. It is a release gate, and the useful property of a gate is that it is closed.

---

## 9. What must not happen during the pilot

- No new scientific topic, peptide packet or bulk extraction.
- No publication. `noindex` stays.
- No substantive change to the HPLC claims to make them easier to approve. The
  packet under review is the one the current system produced, and changing it to
  suit the reviewer would test nothing.
- No fabricated approval, no fictional reviewer, no production reviewer account
  without owner authorisation.
- No copyrighted source in any export, and no public source-download route.
