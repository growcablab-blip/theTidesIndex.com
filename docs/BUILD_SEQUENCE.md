# BUILD SEQUENCE

## Phase A — Foundation
1. Initialize git/repo.
2. Create Next.js/TypeScript application.
3. Configure environment strategy.
4. Create Supabase project/config.
5. Implement normalized migrations.
6. Seed taxonomies/routes/source manifest.
7. Implement auth + internal roles.
8. Implement admin CRUD for sources, source locations, peptides, claims, evidence links, protocols, routes.
9. Add review/publish workflow.
10. Add revision/audit logging.
11. Test publish gates.

**Do not spend meaningful time on a marketing homepage until Phase A works.**

## Phase B — Reference experience
1. Public layout/navigation.
2. Global search.
3. Peptide page template.
4. Simple/practitioner mode.
5. Evidence cards/tables.
6. Administration-route components.
7. Protocol source cards.
8. Disagreement/unknowns module.
9. Source metadata pages.
10. Quality topic template.
11. Methodology/editorial pages.

## Phase C — Seed content
1. Import clean source registry.
2. Create 10 seed peptides.
3. Populate source coverage.
4. Add first reviewed claims.
5. Add route records.
6. Add source-specific protocol shells.
7. Do not fabricate unextracted clinical content.

## Phase D — Publishing
1. Book/article content model.
2. Print CSS.
3. PDF generation.
4. Patient handout template.
5. Practitioner guide template.
6. QR/current-version links.

## Phase E — Visual system
1. Scientific SVG components.
2. Evidence ladder.
3. Administration routes illustration.
4. Manufacturing flow.
5. Quality testing diagram.
6. Refine homepage after the real content system is visible.

## Phase F — Production
1. Railway environment.
2. Supabase production.
3. Domain/DNS.
4. HTTPS.
5. observability/error monitoring.
6. backups.
7. security review.
8. acceptance suite.
9. release.

## Phase G — Expansion
- deeper source extraction
- primary literature verification
- protocol comparison
- route matrix
- first flagship publication
- additional peptides
- semantic search/evidence assistant
