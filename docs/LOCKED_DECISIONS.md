# LOCKED PRODUCT DECISIONS

These decisions are considered settled for the foundation build unless the owner explicitly changes them.

1. **Brand:** The Tides Index
2. **Domain:** thetidesindex.com
3. **Local project path:** `C:\The Tides Index`
4. **Independent identity:** no Velara branding or commerce
5. **Product model:** one evidence system feeding multiple publications
6. **Five flagship books:** Learn / Science & Applications / Quality / Reference / Protocols
7. **Two presentation depths:** Simple and Practitioner
8. **Patient pages are educational, not self-dosing guides**
9. **Protocols remain source-specific and are never silently averaged**
10. **Source type, evidence type, verification status, and regulatory status remain separate**
11. **Source PDFs are private research inputs**
12. **Web-first, PDF-supported publishing**
13. **Initial public cohort:** 10 seed compounds
14. **Admin/editorial workflow is part of MVP**
15. **Data/provenance architecture is built before visual polish**
16. **Preferred stack:** Next.js + TypeScript + Supabase/Postgres + Railway
17. **Public reading requires no account**
18. **Internal editorial users require authentication and roles**
19. **No ecommerce, vendor ranking, affiliate links, or peptide sales in MVP**
20. **No autonomous AI publishing**

---

## Amendments — 24 September 2026

History is not rewritten above. These entries record what the owner changed on
24 September 2026 and what remains in force.

**Item 13 — "Initial public cohort: 10 seed compounds" — SUPERSEDED.**
V1 is no longer capped at ten, or at the twelve compounds built since. The
library expands to every compound that can legitimately be built from material
already held. Expansion is a separate piece of work and no compound is invented
to reach a number.

**New: publication and human review are separate states.**
`publication_state` records whether content is publicly visible.
`review_state` records how far a person has actually checked it. A record may
be public and not yet human reviewed. It may never imply a review that did not
happen. Provenance still gates publication: a statement without a citable source
at an exact location is not publishable at any status. Implemented in migration
`0029_publication_separate_from_review.sql`.

**Item 20 — "No autonomous AI publishing" — IN FORCE, unchanged.**
This was not weakened on 24 September and should not be read as weakened by the
change above. The owner decided that source-linked content may be public while
labelled unreviewed, and the owner authorised the one bulk publication that
followed. That is owner-authorised publication. It is not automated publishing,
and nothing in the system publishes on its own initiative or on its own
authority.

**Also unchanged:** items 8 and 9. Patient/simple mode still receives no dosing
field, enforced at the data boundary rather than in a component; protocols are
still source-specific, attributed, and never averaged.
