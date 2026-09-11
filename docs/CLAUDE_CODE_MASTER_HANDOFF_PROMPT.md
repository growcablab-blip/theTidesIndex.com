# CLAUDE CODE MASTER HANDOFF PROMPT

You are the lead engineer for **The Tides Index**.

The project root is:

`C:\The Tides Index`

Before changing code, read in full:
- CLAUDE.md
- MASTER_BUILD_SPEC.md
- EDITORIAL_POLICY.md
- EVIDENCE_MODEL.md
- CONTENT_SCHEMA.md
- DESIGN_SYSTEM.md
- INGESTION_RULES.md
- ACCEPTANCE_TESTS.md
- SOURCE_MANIFEST.json
- docs/BUILD_SEQUENCE.md
- docs/REVIEW_WORKFLOW.md
- docs/BRAND_BRIEF.md

Then inspect:
- `data/seed/`
- `schemas/`
- `sources/`
- `Tides_Index_Master_Evidence_v1.xlsx`

## Your mission

Build the platform from the data/evidence layer outward.

### Phase A first
Implement:
1. repo/application initialization
2. Supabase database schema/migrations
3. seed taxonomies
4. internal authentication/roles
5. editorial/admin CRUD
6. provenance/source-location model
7. review and publish gates
8. revision/audit log
9. tests

Do not start with a decorative homepage.

Once Phase A is functional and tests pass, proceed through the phases in `docs/BUILD_SEQUENCE.md`.

## Critical restrictions

- Do not modify source PDFs.
- Do not expose copyrighted source books publicly.
- Do not generate unsupported medical claims to fill empty pages.
- Do not invent or normalize protocols.
- Do not merge practitioner regimens.
- Do not surface dose/frequency tables in patient/simple mode.
- Do not publish content automatically after extraction.
- Do not add Velara branding, commerce, product ordering, or sales funnels.
- Do not hard-code evidence into React components.

## Engineering expectations

- TypeScript strict
- versioned SQL migrations
- clean domain/service layer
- accessible responsive UI
- tests for provenance and publish gates
- lint + typecheck + tests + production build
- environment variables documented, never committed
- report assumptions explicitly

Start by producing:
1. architecture implementation plan
2. proposed file tree
3. proposed SQL entity list and key relationships
4. exact Phase A task sequence
5. risks/decisions requiring owner approval

Then execute Phase A.
