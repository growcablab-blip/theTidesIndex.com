# Fonts

Two families, vendored rather than fetched at build time.

| Family | Faces | Licence |
|---|---|---|
| Source Serif 4 | Regular, Italic, Semibold, Bold | SIL Open Font License 1.1 — `OFL-SourceSerif4.txt` |
| Inter | Regular, Medium, SemiBold | SIL Open Font License 1.1 — `OFL-Inter.txt` |

## Why these two

They are the families the website uses. A publication set in different type would
read as a different organisation, which is the opposite of what a reference
programme wants.

## Why vendored

Two reasons, and both matter.

**A build must not depend on a network fetch.** A PDF that renders differently —
or not at all — because a CDN was unreachable is not reproducible, and
reproducibility is the whole argument for rendering these documents from data
rather than from a design tool.

**These faces may lawfully be embedded.** Both are under the SIL Open Font
License, which permits embedding in a document. The fonts installed on a
developer's machine are licensed to that machine and generally are not; taking
the convenient route here would put a licensing problem inside every PDF this
project distributes.

The licence text for each is included above, unmodified, as the OFL requires.
