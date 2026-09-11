# QUALITY RELATIONSHIP MAP

How quality topics relate, what each relationship type means, and the rule that
keeps the map from becoming a second place where evidence is written.

Schema: `db/schema/quality-map.ts`. Data: `data/seed/quality_map.json`.

---

## 1. The rule

A certificate of analysis is a list of separate answers that gets read as one
verdict. The map holds them apart: for a given test, what else it relates to and
— the useful half — what it does not answer.

That useful half is also the risk. *"A purity figure says nothing about
sterility"* is a statement about evidence, and a map free to assert it would be a
second place medical content gets written: outside the provenance chain, outside
the publish gates, and much easier to edit than a claim.

So `quality_relationships_basis` requires the two types that make such a
statement — `commonly_conflated` and `not_addressed_by` — to cite the claim that
establishes it or the recorded gap explaining why the register cannot. **Marking
an edge navigational buys no exemption**: the constraint reads the relationship
type, not the author's intent.

The distinction shows in one row. The sterility edge cites
`hplc-purity-gap-01`, **not a claim**. This index does not know that purity says
nothing about sterility because a source said so; it knows that no source it
holds addresses sterility at all.

---

## 2. Relationship types

| Type | Meaning | Basis required |
|---|---|---|
| `commonly_conflated` | Readers routinely read one result as answering the other's question | **Claim or gap** |
| `not_addressed_by` | This test carries no information about that attribute | **Claim or gap** |
| `complementary` | A different technique answering a different question about the same material | Claim, or structural |
| `same_process` | Two stages of one production or evaluation cycle | Claim, or structural |
| `other_attribute` | A separate quality attribute, established by its own testing | Structural permitted |
| `scoped_by` | What the result is a statement about: which material, which batch, when | Structural permitted |

A structural edge must not smuggle an assertion into its rationale. This was
caught once in review at the end of C.3 and is now asserted by test.

---

## 3. Current edges

**26 edges across four written topics.** Every other topic is a target only.

The three analytical topics form a closed triangle, and **every edge among them
rests on a claim** — these are the conflations the section exists to prevent, so
none may be asserted as navigation:

```
        PURITY  ←──────────→  IDENTITY
          ↖                      ↗
            ↘                  ↙
              CONTENT / ASSAY
```

### From HPLC / chromatographic purity (11)

| To | Type | Basis |
|---|---|---|
| Identity testing | `commonly_conflated` | HPLC-002 |
| Peptide content / assay | `commonly_conflated` | HPLC-005 |
| Mass spectrometry | `complementary` | HPLC-006 |
| Purification | `same_process` | HPLC-002 |
| Sterility | `not_addressed_by` | gap 01 |
| Bacterial endotoxin | `not_addressed_by` | gap 02 |
| Residual solvents | `other_attribute` | structural |
| Water content | `other_attribute` | structural |
| pH | `other_attribute` | structural |
| Heavy metals | `other_attribute` | structural |
| Batch traceability | `scoped_by` | structural |

### From Identity testing (5)

| To | Type | Basis |
|---|---|---|
| HPLC / chromatographic purity | `commonly_conflated` | ID-001 |
| Mass spectrometry | `same_process` | ID-002 |
| Peptide content / assay | `commonly_conflated` | ID-007 |
| Sterility | `not_addressed_by` | identity gap 05 |
| Reading a certificate | `scoped_by` | structural |

### From Peptide content / assay (4)

| To | Type | Basis |
|---|---|---|
| HPLC / chromatographic purity | `commonly_conflated` | CON-001 |
| Identity testing | `commonly_conflated` | CON-001 |
| Water content | `other_attribute` | structural |
| Reading a certificate | `scoped_by` | structural |

### From Reading a certificate of analysis (6)

Recorded in C.5, connecting document literacy to the attributes a certificate
reports.

---

## 4. One edge per pair, per direction

A pair may appear under one heading only. A `complementary` edge between purity
and identity was drafted in C.7 and removed: both relationships were true, and
rendering them together would have put identity under *Commonly confused with
this* and *Read alongside this* on the same page.

Where two relationships are both true, the map records the one that does the
work — usually the conflation, because that is what a reader gets wrong.

Reciprocity is achieved by an edge in the other direction, not by a second edge
in the same one. Purity → identity and identity → purity are both
`commonly_conflated`, each resting on a claim sourced from its own side.

Asserted by `tests/integration/identity-testing.test.ts`.

---

## 5. What a reader sees

Grouped by relationship type, confusions first. Four visual treatments, and
colour carries none of them:

| Status | Label | Glyph | Container |
|---|---|---|---|
| evidence-backed | Supported by a reviewed source | `§` | solid, teal left rule |
| complementary | Read alongside — supported by a reviewed source | `§` | solid, teal left rule |
| evidence gap | Not established by current sources | `?` | caution border and rule |
| structural | Navigational link — no evidence claimed | `→` | **dashed**, muted |

`evidenceStatus` is computed on the server from the edge's own basis, so a
surface cannot give a structural link the styling of a sourced statement.

**An edge into an unwritten topic is shown, labelled *Reference page in
preparation*, and not linked.** Hiding it would leave the page looking like the
whole story, which is the misreading the section exists to prevent.

---

## 6. Adding an edge

1. Decide the type. If it says what a test does or does not establish, it needs a
   basis and the database will refuse it otherwise.
2. Find the claim or gap. **Do not write the assertion into the rationale** — the
   rationale explains the relationship; the basis carries the evidence.
3. One edge per pair per direction. Check what already exists.
4. Add to `data/seed/quality_map.json`. The loader names the offending edge if it
   is malformed, which a constraint violation would not.
5. The reciprocal, if it earns one, is a separate edge sourced from the other
   side.
