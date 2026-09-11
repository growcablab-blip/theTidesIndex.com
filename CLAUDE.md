# CLAUDE.md — Project Operating Instructions

You are building **The Tides Index** at **thetidesindex.com**.

Read the project specification and policy files before editing application code.

## Primary objective

Build a durable, structured evidence platform first and a beautiful publishing experience second.

## Required implementation order

1. Data model and migrations
2. Admin/editorial workflow
3. Source + citation/provenance infrastructure
4. Public reference/search experience
5. Patient/practitioner presentation modes
6. Publishing/PDF/print system
7. Design refinement and performance work

Do not reverse this order by building a polished marketing homepage before the knowledge architecture is functional.

## Technology direction

Use stable, current versions available at build time.

Preferred architecture:
- Next.js App Router + TypeScript
- PostgreSQL via Supabase
- Supabase Auth for internal staff only
- Supabase Storage for permitted assets only
- Railway for application deployment
- Cloudflare may be used for DNS/CDN/security
- Public content is readable without an account
- Admin/editor/reviewer surfaces require authentication
- Postgres full-text/trigram search for deterministic search first
- Embeddings/vector search may be added later as a secondary discovery layer, never as the provenance authority

If an equivalent current technology is materially better, document the reason before changing the architecture.

## Source-file rules

- `sources/` is read-only research input.
- Never expose full copyrighted source PDFs publicly by default.
- Never overwrite or “clean” original source files.
- Derived structured records belong in `data/` / database tables.
- Publication copy belongs in `content/` or database publication records.
- Corrupt or incomplete sources marked in `SOURCE_MANIFEST.json` must not be used as authoritative evidence.

## Medical/editorial rules

- Never invent missing dosing, routes, safety, monitoring, or protocol details.
- Never average multiple practitioner regimens into one synthetic regimen.
- Never infer human efficacy from animal evidence without explicit labeling.
- Never label a practitioner statement as a clinical-trial conclusion.
- Every protocol must carry provenance and evidence context.
- Patient/simple view must suppress dosing-centric protocol details by default.
- Regulatory status must be date-stamped and treated as time-sensitive.
- “Unknown,” “not established,” and “conflicting sources” are valid outputs.

## Content workflow statuses

Use:
`draft -> extracted -> source_checked -> primary_verified -> clinical_review -> compliance_review -> published`

Also support:
`needs_update`, `superseded`, `rejected`

No content becomes public automatically after ingestion.

## Roles

Implement internal roles:
- admin
- editor
- scientific_reviewer
- clinical_reviewer
- compliance_reviewer

The public does not require an account for the initial launch.

## Build discipline

- Keep migrations versioned.
- Keep TypeScript strict.
- Add automated tests for provenance relationships, publish gates, patient-mode suppression, and core search.
- Never hard-code medical claims into React components.
- Public pages must render from structured records.
- Keep all domain-specific business logic in testable services/modules.
- Run lint, typecheck, tests, and production build before release.
- Do not deploy until acceptance criteria in `ACCEPTANCE_TESTS.md` pass.

## Brand

Brand: **The Tides Index**  
Domain: **thetidesindex.com**  
Working descriptor: **Independent peptide science & clinical reference.**

“Tides” should be expressed subtly in motion/structure and not as a beach/ocean-themed wellness brand.
