# PHASE C.5 REPORT — Certificate and document intelligence

The question this phase exists to make answerable is not *what does the number
say*. It is **does this document describe the material in front of me** — and
the answer lives in fields most readers never look at.

Four failures are each one careless sentence away, and all four are now
structural rather than editorial:

- a Q7 requirement for an API certificate becoming a universal requirement;
- a reported result becoming a verified one;
- a real supplier's certificate reaching a reader;
- a set of transparency dimensions becoming a quality score.

---

## 1. Certificate taxonomy

"COA" is not one document type, and treating it as one is the first mistake.
`certificate_type` distinguishes five:

| Value | What it is | What it establishes |
|---|---|---|
| `manufacturer_coa` | Issued by the maker's quality unit against a specification | The strongest of these, within its scope |
| `third_party_test_report` | A laboratory reporting on a sample sent to it | What arrived at the laboratory. Nothing about who made it |
| `finished_product_release` | Release documentation for a finished product | No source held; registered so it can be distinguished |
| `supplier_repacker_certificate` | Reissued by a party in the chain | Depends entirely on what it references |
| `other_unknown` | Not determined | A file titled "COA" is not evidence of its own type |

Two further axes are separate because collapsing them loses the question:
`tested_material_scope` (api / intermediate / bulk_material / finished_product /
unknown) and `chain_linkage_state` (established / **stated_only** /
not_established / unknown). `stated_only` is the common and important case — a
lot number printed on a document is a claim by its issuer, not a demonstrated
chain.

---

## 2. Schema changes (migrations 0013, 0014)

**New tables.** `certificates` — document identity, material identity, chain and
scope, authorisation, what it does and does not demonstrate, missing fields,
authenticity state. `certificate_tests` — one row per test with method,
specification, result, date, the quality topic it belongs to, and
`independently_verified`.

**Separate identities, per §12.** `laboratory_name`, `manufacturer_name`,
`distributor_name` and `issuing_entity` are four fields, not one "supplier". Q7
§11.43 and §11.44 hold them apart, so the model does.

**Constraints that carry the rules:**

| Constraint | What it prevents |
|---|---|
| `claims_certificate_scope_declared` | A `certificate-content` claim with no document type. Q7's scope cannot be dropped |
| `certificate_tests_verification_explained` | Marking a result verified without saying what was checked |
| `certificates_specimen_declares_itself` | A fictional certificate whose title does not say so |
| `certificates_authenticity_explained` | An authenticity state other than `not_checked` with no note |

**New columns.** `sources.access_status` / `access_notes` — whether a copy is
actually held and why not. `claims.certificate_type_scope`, exposed through
`public_v_claims` in 0014 because a requirement that reaches the database with
its scope and the reader without it has done only the useless half.

**Public views.** `public_v_certificates` and `public_v_certificate_tests` filter
`is_specimen AND NOT is_demonstration`. Not "unpublished by default" —
structurally impossible for a real certificate to be returned.

---

## 3. Official sources registered

Attempted acquisition rather than registering empty shells. The results differ,
and the difference is recorded per source.

**Held, verified, citable** — retrieved directly from `database.ich.org`, title
pages read and compared field by field:

| Key | Source | Pages | Offset |
|---|---|---|---|
| SRC-017 | ICH Q7, GMP for APIs, Step 4, 10 Nov 2000 | 49 | +6 |
| SRC-018 | ICH Q2(R2), Validation of Analytical Procedures | 36 | — |
| SRC-019 | ICH Q14, Analytical Procedure Development | 40 | — |

**A correction to the brief:** Q2(R2) and Q14 were adopted by **ICH on 1 November
2023**. March 2024 is the FDA adoption date. The registry records the ICH date
because the held files are the ICH documents, with the FDA date noted in
`authority_notes`.

**Held, scoped, not extracted from:** SRC-020, the PDG Stage 4 harmonised text of
`<621>`, published by USP itself. It is genuine and it is **not the official
USP-NF chapter** — dated 2021, official from December 2022, with the USP-NF
chapter revised since. Held at `pending` so it cannot be cited as the current
requirement.

**Registered with no copy held:** SRC-021 `<621>`, SRC-022 `<71>`, SRC-023
`<85>`, SRC-024 `<467>`, SRC-025 `<921>`, SRC-026 `<1085>` — all
`access_status: subscription_required`.

**Copies of USP chapters circulate on document-sharing sites and were refused.**
V-014 established what such copies are worth: five of sixteen files in this
register turned out to be decoys carrying the right title and ISBN over unrelated
text. Using one to unblock a topic would discard the entire lesson of C.1. The
chapters are registered as absent, with the absence explained.

A test asserts that no claim anywhere rests on a source whose `access_status` is
not `held`.

---

## 4. Claims captured, and how Q7's scope is kept attached

Seven claims from Q7 §11.4, §17.2 and §17.6, each at a verified printed page
(offset +6 to the held file):

| Key | Substance | Scope | Locator |
|---|---|---|---|
| COA-001 | Name, grade, batch number, release date; expiry/retest | `manufacturer_coa` | §11.41, p. 24 |
| COA-002 | Each test, its acceptance limits, and numerical results | `manufacturer_coa` | §11.42, p. 24 |
| COA-003 | Dated, signed by the quality unit, original manufacturer named | `manufacturer_coa` | §11.43, p. 24 |
| COA-004 | Repacker who tested must be named alongside the manufacturer | `supplier_repacker_certificate` | §11.43, p. 24 |
| COA-005 | Reissued certificates name the laboratory, reference the original, attach it | `supplier_repacker_certificate` | §11.44, p. 24 |
| COA-006 | Distributor traceability records, including the manufacturer's batch number | traceability | §17.20, p. 32 |
| COA-007 | Supplier must give the original manufacturer and batch numbers; §11.4 still applies | traceability | §17.61/§17.63, p. 33 |

**The scope treatment (§3), three layers deep.** The database refuses a
`certificate-content` claim with no `certificate_type_scope`. The reader sees the
scope rendered above the requirement, in both reading modes — *"Applies to a
manufacturer's certificate for an active ingredient or intermediate"*. And the
gaps say plainly that finished products, third-party laboratory reports and
research-use material are **not** covered.

Q7 evidence is typed `regulatory_reference`, a new evidence type added because a
regulatory guideline is not an academic reference: it states what should be done
within a stated scope, and reports no result.

---

## 5. Demonstration certificate architecture

`is_specimen` and `is_demonstration` are separate flags doing separate jobs. The
specimen is **published teaching content**; the demonstration flag marks the local
editorial fixture that `npm run db:verify-production` refuses to find in
production. Certificates now count toward that guard, and a test asserts the
specimen does *not* trip it while a demonstration certificate does.

The specimen is a third-party test report and is **deliberately imperfect**,
because a tidy one would teach readers to look for tidiness:

- no original manufacturer named at all;
- no manufacturer's batch number;
- an acceptance criterion supplied by the party *selling* the material;
- two of four results with no stated limit;
- material scope not stated;
- and a sterility row reading "Not tested", listed precisely because it was not.

Every party is named "(fictional)", the title carries "SPECIMEN", and a test
asserts each named party's string contains *fictional*.

---

## 6. Annotated certificate component

Rendered as a document, annotated where the questions arise, rather than
summarised — the skill being taught is reading one.

- A missing field renders **"Not stated on this document"** in caution colour,
  never as a blank or "N/A". The absences are the lesson.
- Every result carries **"Reported by the document — not independently checked"**,
  on each row rather than once at the top, because a reader scanning a table does
  not carry a preamble down the page.
- The document type is explained where it appears: a third-party report
  *"establishes nothing about who made the material"*.
- Batch linkage renders as **"Stated, not demonstrated"** with the reason.
- Simple mode drops laboratory address, method reference and test dates. It is a
  shorter page, never a more reassuring one — batch number, the reported/verified
  distinction and the specimen warning all survive.

**Chain-of-custody figure.** Six steps, drawn so the first link is visibly
**broken**: nothing printed on a certificate connects it to a particular
container. A dashed box marks an identifier the document does not give.

---

## 7. Traceability model

Q7 §17.20 and §17.61 are the source for keeping the identities apart, and the
model mirrors them: manufacturer identity, manufacturer's *own* batch number, the
reseller's batch number, certificate identity, laboratory identity and
distributor identity are six separate fields. `manufacturer_identity_established`
is a boolean defaulting false — naming a manufacturer is not the same as having
established one.

The certificate topic joins the quality map with six edges, including a
`scoped_by` edge to batch traceability and a `not_addressed_by` edge to sterility
resting on the recorded gap.

---

## 8. Authenticity architecture

Seven states, defaulting to `not_checked`, with a constraint requiring a note for
any other. **There is deliberately no state meaning "looks genuine"** — a
professional-looking PDF is not evidence. Nothing implements verification; this
is architecture for a capability that does not exist yet, and the specimen sits
at `not_checked` where it belongs.

---

## 9. Transparency dimensions, never a score

Seven dimensions — document identity, batch linkage, laboratory identity, method
information, specification information, result information, provenance — each
reporting `present` / `partial` / `absent` **and the specific fields missing**.

The `TransparencyDimension` type has no numeric field at all, so there is nothing
to sum. A test walks every value asserting none is a number, and the rendered
output is checked for anything score-shaped.

**A defect found by reading the rendered page.** The first version marked a
per-test dimension `absent` unless *every* test satisfied it — so a document
stating a method for three of four tests displayed **"None of these are stated"**.
That is simply false, and it is the kind of false that damages a supplier. Now
reported as *"Analytical method: stated for 3 of 4 tests"*.

---

## 10. Evidence gaps recorded

Five on the certificate topic: finished-product certificate content; third-party
laboratory report content; research-use certificate content; whether any reported
result is correct; and whether a matching lot number establishes origin. As
predicted, C.5 produced **more gaps than the claims that motivated them for three
of the five document types** — which is the honest output, not a shortfall.

---

## 11. V-015 status

Broken into per-area issues, as §17 required:

| Issue | Area | State |
|---|---|---|
| V-015 | Umbrella, now an inventory by state | Open |
| V-016 | Chromatography method requirements | Open — PDG text held and scoped; official `<621>` not held |
| V-017 | Sterility | Open — **no source at all** |
| V-018 | Bacterial endotoxin | Open — **no source at all** |
| V-019 | Residual solvents | Open — no source |
| V-020 | Water content | Open — no source |
| V-021 | Certificate content beyond APIs | Open — Q7 covers one document family only |

Nothing is closed. Q7 changed the certificate topic from unwritable to written
for one document type; it closed nothing else. The sterility and endotoxin gaps
now point at V-017 and V-018 rather than at the umbrella.

---

## 12. Tests

**233 passing** (from 196), 19 files. New: `tests/integration/certificates.test.ts`
(20) and `tests/unit/certificate-rendering.test.tsx` (17).

Covering every item in §16:

- a `certificate-content` claim with no document type is refused by the database;
- Q7 claims scope to `manufacturer_coa` and `supplier_repacker_certificate`, and
  to **neither** finished products nor third-party reports;
- every reported result is `independently_verified: false`, and setting it true
  without a note is refused;
- an HPLC entry points at the purity topic and an LC-MS entry at mass
  spectrometry — a purity result never stands in for identity;
- laboratory, manufacturer and distributor remain distinct; the specimen names a
  laboratory and a distributor and **no manufacturer**;
- a missing manufacturer batch number stays missing rather than being copied from
  the batch number;
- a real certificate inserted directly into the table does not appear in the
  public view, and neither do its test rows;
- an undeclared specimen is refused;
- the specimen does not trip the production demonstration guard, and a
  demonstration certificate does;
- the dimensions carry no numeric field and render nothing score-shaped;
- partial coverage counts rather than reading as empty;
- the scope is rendered in both simple and practitioner mode;
- no claim rests on a source whose `access_status` is not `held`.

Migration, schema-parity, gate-parity and data-leakage suites all continue to
pass.

---

## 13. Accessibility, responsive and print

Measured on `/quality/certificate-of-analysis`.

| Check | Result |
|---|---|
| `h1` count | 1 |
| Heading skips | **0** (one found and fixed — dimensions used `h4` under an `h2`) |
| Text below 4.5:1 contrast | **0** |
| SVG title + desc + `aria-labelledby` | present |
| `sr-only` "Missing:" labels on absent fields | 9 |
| Horizontal overflow at 375 / 768 / 1280 | none at any width |

The chain figure scrolls inside its own container below ~560px, with a hint shown
only on small screens and hidden from print.

**Print** was again verified against the stylesheet rather than a rendered
preview, which this environment cannot produce. The specimen notice prints (it
must); the figure scroll hint and legend do not; `figure` carries
`break-inside: avoid`. The missing-field treatment survives without printed
background colour because the wording carries it, not the tint.

---

## 14. Remaining gaps and owner decisions

1. **USP chapters remain unobtainable without a subscription.** This is now the
   binding constraint on sterility, endotoxin, residual solvents, water, and on
   saying what any chromatographic result ought to meet. **This needs an owner
   decision**: buy a USP-NF subscription, or accept that these five topics stay
   unwritten indefinitely.
2. **No source for finished-product or third-party report documentation.** Q7
   covers one document family. Most certificates a reader actually holds are
   outside it.
3. **`npm run db:verify-production` is still not written.** The function it would
   call exists and is tested; the script does not. Carried from Phase B.
4. **Print not visually rendered**; stylesheet analysis only.
5. **Admin surfaces still not visually inspected** — Supabase is not provisioned.
6. **Authenticity verification is architecture only**, as specified.
7. **Screenshot capture remains intermittent**; layout verified by DOM
   measurement.

---

## 15. Recommendation for C.6

C.6 is `docs/EVIDENCE_EXTRACTION_WORKFLOW.md` — the documented, repeatable
procedure. It should now be written from what actually happened across C.1–C.5
rather than as a proposal, because the process has been exercised four times and
its failure modes are known ones:

1. **Acquisition and audit.** `sources:audit`, `sources:coverage`,
   `sources:apply-audit` — plus the new step C.5 added: attempt acquisition,
   record `access_status`, and refuse aggregator copies of paywalled standards on
   V-014 grounds.
2. **Locator discipline.** Establish the printed-page offset, record it on the
   source, and re-open every locator before the packet is submitted — the step
   that caught the Table 4-1 misattribution in C.2.
3. **Scope discipline.** New in C.5 and the most transferable lesson: every
   requirement carries the thing it governs. Document how a new
   scope-constrained claim family gets a database constraint rather than a
   convention.
4. **Gap discipline.** What the packet could not support is written at the same
   time as what it could, worded as a statement about this library.
5. **Submission.** `evidence:submit` under a named editor, reaching
   `ready_for_scientific_review` and stopping.
6. **Rendering review.** C.4 and C.5 each found real defects only by reading the
   rendered page — the "none of these are stated" bug and the smuggled
   water-content assertion. Make this a required step, not a courtesy.

After C.6, the highest-value work is **not another topic**. It is resolving the
owner decision at §14.1, because five quality topics and the acceptance-criteria
half of the certificate reader are all waiting on the same purchase.
