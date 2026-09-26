# ACCEPTANCE TESTS

Claude Code should treat these as product acceptance criteria.

## A. Data/provenance

- [ ] A claim cannot be published without at least one source and locator unless explicitly marked as editorial/non-evidentiary copy.
- [ ] A protocol cannot be published without source provenance.
- [ ] Multiple protocols for the same peptide can coexist without being merged.
- [ ] A source marked `replace` cannot become an authoritative citation.
- [ ] Source records can point to a secondary source and a traced primary source separately.
- [ ] Revision history is preserved.
- [ ] A deterministic re-seed does not withdraw, unpublish, replace or delete any published record, and does not publish anything (`npm run qa:publication-integrity`).

## B. Patient/practitioner modes

- [ ] Simple mode gives understandable peptide education.
- [ ] Simple mode suppresses dosing-centric protocol details.
- [ ] Practitioner mode displays detailed evidence/protocol fields.
- [ ] Switching modes does not change the underlying canonical peptide record.
- [ ] Print patient view remains patient-safe.

## C. Search

- [ ] Searching canonical name finds peptide.
- [ ] Searching common alias finds canonical peptide.
- [ ] Search can filter human vs preclinical vs practitioner evidence.
- [ ] Search can find quality topics such as HPLC, sterility, endotoxin, storage.
- [ ] Search result type is visible.

## D. Peptide page

For BPC-157 seed page:
- [ ] canonical name/aliases
- [ ] evidence snapshot
- [ ] human evidence section
- [ ] preclinical section
- [ ] administration routes with context
- [ ] source-specific protocol area
- [ ] disagreements/unknowns
- [ ] references
- [ ] last reviewed/version

Content may be sparse during seed phase; missing data must be labeled, not invented.

## E. Quality

- [ ] HPLC page explains what chromatographic purity does and does not establish.
- [ ] Identity, content, sterility, and endotoxin are distinct concepts.
- [ ] Quality pages support citations and review dates.

## F. Admin

- [ ] Auth required.
- [ ] Role-based access works.
- [ ] Editor can create source.
- [ ] Editor can add exact source location.
- [ ] Editor can create claim and link evidence.
- [ ] Editor can create source-specific protocol.
- [ ] Reviewer can approve/reject.
- [ ] Publish action enforces gates.
- [ ] Stale content can be flagged.

## G. Engineering

- [ ] TypeScript strict passes.
- [ ] Lint passes.
- [ ] Unit/integration tests pass.
- [ ] Publication-surface integrity passes (`npm run qa:publication-integrity`).
- [ ] Production build passes.
- [ ] No secrets committed.
- [ ] Source PDFs are not in public/static directories.
- [ ] Basic accessibility checks pass.
- [ ] Core pages are responsive.
- [ ] Public metadata/SEO is implemented.
- [ ] Sitemap/robots configured.

## H. Launch

- [ ] thetidesindex.com configured
- [ ] HTTPS
- [ ] analytics/privacy decision documented
- [ ] error monitoring configured
- [ ] database backups configured
- [ ] corrections contact/mechanism live
- [ ] editorial methodology page live

## I. Standing release checks

Run every one of these, in this order, against the database the deploy will point at. All must pass
before a release. None of them modifies the database.

| Command | Question it answers |
|---|---|
| `npm run lint` | does the code meet the project's standards |
| `npm run typecheck` | does it typecheck under strict + `exactOptionalPropertyTypes` |
| `npx vitest run tests/unit` | do the pure rules still hold |
| `npx vitest run tests/integration` | do the gates, triggers and views behave against a real Postgres |
| `npm run qa:production` | **is this database fit to serve the public** — no demonstration records, no fabricated approval, no review date nobody earned |
| `npm run qa:publication-integrity` | **is it still everything it was** — would a re-seed cost the public site any record it currently shows |
| `npm run qa:doses` | is there any dose-shaped string in any patient payload |
| `npm run evidence:locators` | does every recorded locator still resolve in the held file |
| `npm run build` | does it build for production |

`qa:production` and `qa:publication-integrity` answer **different questions**, and the second one
exists because the first passed cleanly through two incidents in which a routine `npm run db:seed`
removed 275 published records from the public site. A single snapshot cannot see a loss; only a
comparison across a re-seed can. Neither command replaces the other, and a release needs both.
