# EVIDENCE GAP STANDARD

## 1. The distinction this document exists for

There are two statements that look identical in prose and are not the same fact:

**A — a source-supported negative claim.**
A reliable source establishes the limitation. *"Reversed-phase HPLC does not
yield structural information"* — Grant, Table 4-1. This is a **claim**. It has
provenance, a locator, and a reviewer's approval to gain before publication.

**B — an absence in this library.**
Nothing this index holds settles the point. *"The sources currently in The Tides
Index do not establish whether chromatographic purity bears on sterility."* This
is a **gap**. It asserts nothing about the world.

> **Do not silently turn absence in our library into absence in science.**

Sterility is the worked example. This index does not know that purity says
nothing about sterility because a source said so. It knows that **no source it
holds addresses sterility at all**. Those are different facts, and the map points
at the right one: the sterility edge cites `hplc-purity-gap-01`, not a claim.

---

## 2. Wording

For a gap, always a statement about this index:

> "The current reviewed evidence base in The Tides Index does not establish…"
> "The sources currently held here do not settle…"
> "No source in this register addresses…"

Never:

> ~~"HPLC cannot tell you this"~~
> ~~"There is no evidence that…"~~
> ~~"X has no effect on Y"~~

The second column is a claim about the world and needs a source. A test asserts
that no gap text matches `/HPLC (cannot|can never|does not)/i`, and the reasons
must locate the absence here — matching `/no (compendial|source)|does not
address|holds no/i`.

---

## 3. Structure

A gap is not a weakly-held claim and never enters the claim layer. It carries:

| Field | Content |
|---|---|
| `gap_type` | From the taxonomy below. Makes gaps workable, not just readable |
| `statement` | The statement that is **not** being made, phrased as the claim it would be |
| `why_not_supported` | The absence, located here. Not a hedge |
| `what_would_resolve_it` | A **kind of source**, not a wish |
| `verification_issue_key` | The issue tracking the acquisition |
| `quality_topic_id` / `peptide_id` | Its subject |

Gaps carry **no publication state of their own**. They are visible exactly when
their subject is, so there is no state in which a topic is live and its stated
limits have been quietly stripped out.

---

## 4. Gap types

| Type | Use when |
|---|---|
| `source_missing` | A source exists in the world and this index has no copy |
| `source_inaccessible` | Identified, and cannot be obtained lawfully — paywall, subscription |
| `source_corrupted` | Held copy is unusable; replacement required |
| `primary_source_missing` | A secondary source cites a study this index has not obtained |
| `no_current_reviewed_evidence` | Nothing held settles it. The default, and the commonest |
| `scope_not_established` | A source covers a neighbouring case but not this one |
| `numerical_threshold_not_established` | A limit or acceptance criterion is not supported |
| `human_evidence_not_established` | Preclinical evidence exists; human evidence does not |
| `route_not_established` | A route is described in practice with no evidence held for it |
| `safety_not_established` | Safety is not addressed by anything held |
| `regulatory_status_unverified` | Status believed but not confirmed against a primary register |
| `terminology_unresolved` | Sources use a name inconsistently and the referent is unsettled |
| `conflicting_sources` | Sources disagree and the disagreement is unresolved |
| `formulation_unspecified` | The source does not say what was actually administered |
| `chain_of_custody_unknown` | A document's link to material cannot be established |

`scope_not_established` is the type C.5 needed most: Q7 covers API certificates,
so what a finished-product certificate should contain is not unknown to the
world — it is outside the scope of what this index holds.

---

## 5. When to record one

**Record a gap at the moment of extraction, not afterwards.** The question is
always: *what would a reader reasonably expect this page to settle?* Anything on
that list not supported by a source becomes a gap in the same pass that writes
the claims.

Written later, gaps get written to explain criticism. Written during extraction,
they are an honest inventory — which is why both packets so far recorded theirs
alongside the claims, and why the certificate topic produced more gaps than
claims for three of five document types. **That is the correct output, not a
shortfall.**

---

## 6. What gaps must never become

- **A hedge on a claim.** If a claim needs qualifying, qualify it in
  `uncertainty_text`. A gap is a separate statement, not a disclaimer.
- **A bare navigational edge.** A `not_addressed_by` relationship must cite the
  gap that establishes it; the database refuses it otherwise.
- **Reassurance.** "We have not looked into it" is not "it is fine".
- **Permanent.** Every gap names what would settle it, and that is a work item.

---

## 7. Closing a gap

A gap closes when a source establishing the point is **registered, accessible,
locator-verified and extracted from** — all four. Holding a file is not the same
as having read it.

When it closes:

1. The claim replaces the gap; the gap row is removed.
2. Every relationship citing the gap is re-pointed at the claim.
3. The verification issue is updated, and closed only if nothing else depends
   on it.

Q7 is the worked example. It closed the certificate-content gap for **one**
document family and closed nothing else — which is why V-015 was broken into
V-016 to V-021 rather than marked resolved.
