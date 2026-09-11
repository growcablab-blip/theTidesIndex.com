# ACCEPTANCE TESTS

Claude Code should treat these as product acceptance criteria.

## A. Data/provenance

- [ ] A claim cannot be published without at least one source and locator unless explicitly marked as editorial/non-evidentiary copy.
- [ ] A protocol cannot be published without source provenance.
- [ ] Multiple protocols for the same peptide can coexist without being merged.
- [ ] A source marked `replace` cannot become an authoritative citation.
- [ ] Source records can point to a secondary source and a traced primary source separately.
- [ ] Revision history is preserved.

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
