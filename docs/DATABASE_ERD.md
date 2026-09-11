# DATABASE RELATIONSHIP MAP

```mermaid
erDiagram
    SOURCES ||--o{ SOURCE_LOCATIONS : contains
    SOURCES ||--o{ CLAIM_EVIDENCE : supports
    SOURCES ||--o{ PROTOCOL_SOURCES : documents
    SOURCES ||--o{ PEPTIDE_ROUTES : documents

    PEPTIDES ||--o{ PEPTIDE_ALIASES : has
    PEPTIDES ||--o{ CLAIMS : subject_of
    PEPTIDES ||--o{ PROTOCOLS : subject_of
    PEPTIDES ||--o{ PEPTIDE_ROUTES : has

    CLAIMS ||--o{ CLAIM_EVIDENCE : supported_by
    SOURCE_LOCATIONS ||--o{ CLAIM_EVIDENCE : locates
    SOURCE_LOCATIONS ||--o{ PROTOCOL_SOURCES : locates

    ROUTES ||--o{ PEPTIDE_ROUTES : classifies
    ROUTES ||--o{ PROTOCOLS : used_by

    PROTOCOLS ||--o{ PROTOCOL_SOURCES : sourced_by

    QUALITY_TOPICS ||--o{ CLAIMS : subject_of

    PUBLICATIONS ||--o{ PUBLICATION_SECTIONS : contains
    PUBLICATIONS ||--o{ REVIEWS : reviewed_by

    PEPTIDES ||--o{ REGULATORY_STATUSES : has
```

## Key rule

A public article/reference page is a **presentation layer**, not the primary evidence store.

The canonical path is:

`Source -> Source Location -> Evidence Link -> Claim/Protocol/Route -> Publication`
