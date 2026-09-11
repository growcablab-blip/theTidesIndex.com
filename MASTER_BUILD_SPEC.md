# MASTER BUILD SPECIFICATION — The Tides Index

## 1. Executive mandate

The Tides Index is to become a trusted, independent reference system for peptide science, evidence, source-specific protocols, administration routes, manufacturing quality, testing, storage, and patient education.

The product must work for a clinic in real life.

A practitioner should be able to answer:
- What is this compound?
- What biological target/mechanism is proposed?
- What human evidence exists?
- What is only preclinical?
- Which administration routes have actually been studied or reported?
- What protocols have named sources reported?
- Where do sources disagree?
- What safety findings and uncertainties exist?
- What regulatory/development status applies?
- What quality tests matter?
- What does a COA prove and not prove?

A patient should be able to answer:
- What is a peptide?
- Why might a clinician discuss this compound?
- How strong is the evidence?
- What remains uncertain?
- What questions should I ask?
- Why do sourcing, testing, handling, and storage matter?

The platform must not require either audience to read whole textbooks to answer those questions.

---

## 2. Strategic product model

The Tides Index is **one evidence system with multiple outputs**.

### Five flagship publication tracks

1. **Understanding Peptides**
   - Patient + new clinic staff
   - Visual, plain-language introduction
   - Target ~10–16 pages for first edition

2. **Peptide Science & Applications**
   - Practitioner-focused
   - Mechanisms, receptors, signaling, pharmacokinetics, routes, evidence interpretation

3. **Peptide Quality: From Manufacturing to the Final Vial**
   - Manufacturing, synthesis, purification, analytical testing, fill/finish, lyophilization, storage, transport, traceability, COA literacy

4. **The Peptide Reference Guide**
   - Standardized compound pages
   - Expandable encyclopedia

5. **Peptide Protocols & Clinical Quick Reference**
   - Source-specific protocol records
   - Administration, monitoring, evidence context, disagreement display

### Derived outputs

- Patient handouts
- Individual peptide PDFs
- Clinic cheat sheets
- Administration-route guides
- Quality/COA explainers
- Printable protocol reference cards
- Slides/teaching assets
- Future API/export feeds

The derived outputs should be generated from reviewed structured data, not independently rewritten copies.

---

## 3. User personas

### A. Busy clinician
Needs a reliable answer in 30–90 seconds and the ability to drill deeper.

### B. Peptide-experienced clinician
Needs source comparison, protocol provenance, PK/routes, original references, and disagreements.

### C. Clinic nurse / coordinator
Needs simple operational and patient-education answers without overstepping clinical decision-making.

### D. Patient / informed consumer
Needs understandable education and uncertainty without self-prescribing instructions.

### E. Scientific/quality reviewer
Needs to see exact source locations, claim extraction, verification status, and publication history.

### F. Editorial/compliance staff
Needs review queues, stale-content alerts, status changes, corrections, and audit history.

---

## 4. Public information architecture

Primary navigation:

- **Learn**
- **Science**
- **Peptides**
- **Evidence**
- **Protocols**
- **Quality**
- **Sources**

Secondary:
- Methodology
- About
- Corrections
- Editorial policy
- Updates / changelog

### Global search

Placeholder:
`Search a peptide, pathway, protocol, route, test, or topic…`

Search result types:
- peptide
- evidence claim
- protocol
- quality topic
- source
- publication/article

Filters:
- human / preclinical / practitioner
- route
- category
- regulatory status
- source type
- evidence type
- review status for internal admin search

---

## 5. Simple vs Practitioner presentation

Use a persistent reading-level switch:

`Simple | Practitioner`

### Simple mode
- Plain-language summary
- Why researchers/clinicians discuss it
- Evidence-strength summary
- Major uncertainties
- Safety discussion
- General administration-route context
- Questions for a treating clinician
- Quality/source considerations
- References available but not overwhelming
- No dose-first protocol cards

### Practitioner mode
Adds:
- sequence/molecular description where relevant
- targets/receptors
- mechanistic pathways
- human/preclinical evidence tables
- pharmacokinetics
- route-specific evidence
- source-specific protocol records
- monitoring/labs as reported by sources
- contraindications/cautions
- regulatory/development state
- disagreements
- full source provenance

Mode changes presentation, not the underlying evidence record.

---

## 6. Core database entities

### Source
Any external authority/input:
- regulatory label/guidance
- journal article
- clinical trial registry record
- systematic review
- academic textbook
- practitioner handbook
- expert interview/podcast
- manufacturer/quality document
- compendial standard
- conference presentation
- community/experiential source

### Source location
Page, chapter, section, table, figure, URL fragment, or timestamp within a source.

### Peptide / compound
Canonical compound record with aliases and compound class.

### Claim
A discrete factual proposition attributed to one or more sources.

### Evidence link
Relationship connecting claim to source location with evidence type and interpretation.

### Protocol
A source-reported regimen or study schedule; never an anonymous composite.

### Route
Administration route ontology.

### Peptide-route record
Compound-specific route evidence with population/model and provenance.

### Quality topic
Manufacturing, testing, stability, storage, transport, traceability topics.

### Publication
Public-facing article/book/handout/reference page assembled from reviewed records.

### Review
Scientific/clinical/compliance review action with reviewer, timestamp, outcome, comments.

### Revision
Versioned change record.

---

## 7. Provenance standard

Every meaningful public claim should be able to resolve to:

`publication -> claim -> evidence link -> source location -> source`

Where the source itself cites a primary paper, optionally resolve:

`practitioner/textbook source -> cited primary source`

The UI should make it obvious when:
- the current source is the primary study
- the current source is a secondary reference
- a practitioner is interpreting another source
- the claim has not yet been primary-verified

---

## 8. Protocol model

A protocol record must support:

- protocol ID
- peptide / combination
- objective/context
- source
- source location
- source type
- population/model
- regulatory context
- route
- formulation if reported
- amount/dose as reported
- units
- frequency
- timing
- duration
- cycle/off-period
- titration/escalation if reported
- combination/stack
- monitoring/labs
- contraindications/cautions
- adverse events/safety notes
- outcome/context
- evidence type
- verification status
- reviewer notes
- published visibility

### Protocol rules

- Never silently combine authors.
- Preserve disagreements.
- Study regimens are labeled as study regimens.
- Approved-label instructions are labeled separately from trial or practitioner protocols.
- Preclinical regimens are never rendered as human instructions.
- Patient mode suppresses dose/frequency tables by default.

---

## 9. Administration-route model

Formal ontology should include at minimum:

- subcutaneous
- intramuscular
- intravenous
- intranasal
- oral
- sublingual/buccal
- topical
- intradermal
- intra-articular
- other/specialized

Every peptide-route relationship should carry:
- evidence type
- human/preclinical/practitioner context
- formulation
- population/model
- PK/bioavailability notes
- source location
- verification status

Avoid generic claims such as “peptides can be taken orally” without molecule/formulation context.

---

## 10. Evidence + source semantics

Keep these dimensions separate:

### Source type
What kind of document/person/source is it?

### Evidence type
What kind of evidence is the claim based on?

### Verification status
How far has the editorial team checked it?

### Regulatory/development status
Approved, investigational, discontinued, preclinical, jurisdiction-specific, etc.

### Publication confidence language
Editorial wording derived from evidence, not a single magic score.

---

## 11. Quality intelligence

Book/section 3 should cover:

1. peptide/API design
2. solid-phase peptide synthesis
3. cleavage/deprotection
4. purification
5. identity/characterization
6. formulation
7. fill/finish
8. lyophilization where relevant
9. release testing
10. packaging
11. shipping/transport
12. clinic receiving
13. storage
14. traceability

### Testing modules

- HPLC / chromatographic purity
- LC-MS / mass spectrometry
- identity
- assay / peptide content
- sterility
- bacterial endotoxin
- residual solvents
- water/moisture
- heavy metals where relevant
- pH where relevant
- other product-specific testing

Every test explainer should include:
- what it measures
- what a normal report looks like conceptually
- what it can establish
- what it cannot establish
- common misinterpretations

Anchor message:
**A high HPLC purity result does not by itself prove identity, vial content, sterility, or endotoxin status.**

### Quality philosophy

Country of origin alone is not a proxy for quality. Evaluate:
- manufacturing system
- supplier qualification
- facility/process controls
- analytical methods
- batch-specific results
- chain of custody
- transport/storage
- traceability

---

## 12. Editorial workflow

Statuses:
1. Draft
2. Extracted
3. Source checked
4. Primary verified
5. Scientific review
6. Clinical review
7. Compliance review
8. Published

Alternate:
- Needs update
- Superseded
- Rejected

### Publish gates

A high-impact medical claim should not publish unless:
- exact source/location exists
- evidence type is assigned
- source type is assigned
- interpretation text is reviewed
- uncertainty is captured
- regulatory status is date-stamped if relevant

Protocols require stricter gates.

---

## 13. Initial seed compounds

Build the system around a focused first cohort rather than 100 shallow pages:

1. BPC-157
2. Thymosin beta-4 / TB-500 nomenclature record
3. GHK-Cu
4. CJC-1295
5. Ipamorelin
6. Tesamorelin
7. MOTS-c
8. Semax
9. Selank
10. Retatrutide

After the architecture works, expand to:
- Semaglutide
- Tirzepatide
- Thymosin alpha-1
- KPV
- LL-37
- DSIP
- Epitalon
- PT-141
- Kisspeptin
- VIP
- SS-31
- others in the master index

Seed records may be skeletal until extraction/review is complete. Do not fabricate missing content to make pages look full.

---

## 14. Initial public launch scope

### Required public pages
- Home
- Search
- Methodology
- Evidence taxonomy
- About
- Corrections policy
- Learn: Understanding Peptides intro
- Quality: COA/testing intro
- Administration routes intro
- 10 seed peptide pages
- Sources index (metadata, not copyrighted book downloads)

### Required practitioner capability
- Practitioner mode
- Evidence tables
- Protocol-record framework
- route evidence
- source provenance
- source disagreement display

### Required admin capability
- source CRUD
- peptide CRUD
- aliases
- claim CRUD
- source-location citation
- protocol CRUD
- route CRUD
- review workflow
- publish gate
- version history/changelog
- stale-content flag
- search

---

## 15. Technical architecture

### Front end
- Next.js + TypeScript
- Server-rendered/SEO-friendly public pages
- Accessible semantic HTML
- Responsive design
- Print styles for reference pages

### Data
- Supabase/PostgreSQL
- normalized core entities
- JSONB only for genuinely variable metadata, not as a substitute for relational design
- UUID primary keys internally
- stable human-readable slugs externally
- soft deletion where audit history matters
- revision/change log

### Authentication
Only internal editorial users initially.

Roles:
- admin
- editor
- scientific reviewer
- clinical reviewer
- compliance reviewer

### Storage
Public:
- generated diagrams
- licensed/owned illustrations
- generated PDF publications

Private:
- source PDFs
- review attachments
- copyrighted research books

### Search
Phase 1:
- PostgreSQL full-text search
- trigram/fuzzy alias matching
- filters

Phase 2:
- embeddings for semantic discovery
- always return structured source-backed results
- no free-form AI answer becomes evidence by itself

### Deployment
- Railway application
- Supabase database/auth/storage
- Cloudflare optional for DNS/CDN/security
- domain: thetidesindex.com

---

## 16. Design mandate

The product should feel:
- credible
- calm
- modern
- scientific
- highly legible
- visual without being decorative
- independent, not commercial

Avoid:
- ecommerce visual language
- bodybuilding aesthetic
- luxury wellness aesthetic
- syringe-heavy imagery
- beach/ocean clichés
- neon biohacker design
- faux-medical claims

Use the “tide” idea abstractly through rhythm, curves, layers, and information flow.

---

## 17. Visual figure families

Create reusable components/templates for:

1. amino acid -> peptide -> protein
2. receptor/signaling mechanism
3. biological pathway
4. body-system map
5. administration routes
6. manufacturing process
7. quality/testing explainer
8. evidence hierarchy
9. protocol comparison
10. source/provenance trail

AI imagery can support conceptual/anatomical illustrations.
Exact scientific labels, pathways, spectra, chromatograms, COA callouts, arrows, and tables should be deterministic SVG/vector graphics.

---

## 18. Copyright + source handling

The owner may possess legitimate personal copies of books. Those files are inputs for private research.

The public product should:
- cite bibliographic metadata
- paraphrase appropriately
- use only short quotations where legally appropriate
- link to legitimate publisher/DOI/PubMed sources where possible
- never offer full copyrighted textbooks for download without permission

Do not build a public PDF reader for copyrighted source books.

---

## 19. Corrections and transparency

Every publication/reference page should eventually support:

- version
- publication date
- last reviewed date
- evidence cutoff date
- reviewers
- references
- change log
- “report a correction”
- superseded content marker

A corrections page should show material changes publicly.

---

## 20. Long-term roadmap

### Stage A — Evidence infrastructure
Current priority.

### Stage B — Public searchable reference
10 seed compounds + methodology + quality.

### Stage C — Five flagship publications
Web-first, PDF-supported.

### Stage D — Advanced comparison
Compare peptides, evidence, routes, sources, and protocols.

### Stage E — Clinical workspace
Saved references, clinic teaching packs, optional professional accounts.

### Stage F — Evidence assistant
Natural-language query layer constrained to the reviewed database with inline provenance.

Example:
“Show me human evidence for intranasal Semax.”
The answer must be generated from reviewed records, not uncontrolled internet synthesis.

---

## 21. Success metrics

- repeat practitioner use
- median search-to-answer time
- patient handout usage
- source/citation engagement
- percentage of claims primary-verified
- percentage of protocols reviewed
- stale content count
- correction turnaround time
- coverage depth per peptide
- reviewer sign-off rate

North-star product question:
**Would a clinic use The Tides Index every week?**

---

## 22. Explicit non-goals for MVP

Do not build:
- ecommerce
- peptide ordering
- clinic lead generation
- vendor rankings
- vendor affiliate links
- patient diagnosis
- personalized prescribing
- automated protocol recommendations
- treatment plan generation
- public source-PDF downloads
- social/community forums

Those can distract from trust and evidence quality.

---

## 23. Definition of done for foundation release

The architecture is acceptable when a user can:

1. Search “BPC-157.”
2. Open its canonical record.
3. Read a simple summary.
4. Switch to practitioner mode.
5. See evidence separated by human/preclinical/practitioner source.
6. See routes with evidence context.
7. View protocol records separated by source rather than blended.
8. Open a citation and identify the exact source and location.
9. See unresolved questions/disagreements.
10. Print a patient-safe page that does not expose dosing instructions.

Internally, an editor must be able to revise the source record, send it through review, and publish a new version without changing application code.
