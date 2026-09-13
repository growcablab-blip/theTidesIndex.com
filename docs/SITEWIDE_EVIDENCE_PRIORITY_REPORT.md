# SITE-WIDE EVIDENCE PRIORITY RESET

The Tides Index is not a regulatory reference. This sprint changed the site so
that it stops looking like one.

---

## 1 · What was wrong

Nothing on the site was inaccurate about regulation. The problem was prominence.

- The compound page's **Evidence at a glance** panel listed *Regulatory status*
  as its third item, in the same visual weight as human and preclinical evidence.
- The **contents rail** placed *Regulatory status* fourth, above protocols and
  disagreements.
- The **Regulatory** section sat in the middle of the page, between routes and
  protocols.
- Section routing in **search** had no rules for identity, replication or
  research questions, so a research query and a regulatory query were treated
  alike.

The panel's own code comment recorded why it had drifted that way: regulatory
status is the cleanest data on the page — one field, one date, one authority.
Clean data is not the same as important data.

## 2 · Why it matters, with an example from the record

**Thymosin beta-4** has no approval anywhere, and two independent phase I human
safety studies — United States 2010 and China 2021 — reporting no dose-limiting
toxicity.

**Tesamorelin** has an FDA approval covering one indication in one population,
and is widely discussed for uses outside it.

A page that leads with the approval badge ranks these the wrong way round. A page
that leads with the evidence shows both accurately.

## 3 · What changed

### Compound page hierarchy

| Before | After |
|---|---|
| What it is | What it is |
| Evidence | **What the names refer to** (where identity is contested) |
| Literature | Evidence |
| Pharmacokinetics | Literature search |
| Products | **What has been repeated** |
| Routes | Pharmacokinetics |
| **Regulatory** | Routes |
| Protocols | Protocols |
| Disagreements | Disagreements |
| References | **What would be useful to study** |
| | Products and chemical form |
| | **Regulatory context** — renamed, with a lede saying it is secondary |
| | References |

### Evidence at a glance

Items are now: human evidence, preclinical evidence, **replication at best**,
routes, protocol sources, recorded gaps. Regulatory context is a single line of
small type at the foot of the panel, phrased as context:

> Regulatory context: no approval recorded in any source held here. That is a
> fact about its regulatory position, not a measure of the evidence above.

For a compound with human studies and no approval it adds: *Regulators have not
assessed it; researchers have studied it.*

### Homepage

- Headline changed from a provenance statement to the platform's purpose:
  *What has actually been studied, what was found, and what nobody knows yet.*
- The task grid is now six research journeys: explore a compound, compare the
  evidence, see what named sources report, explore routes, understand quality and
  production, see what is still unknown. None is a regulatory lookup.
- Search placeholder: *compound, mechanism, route, protocol or research question*.

### Peptides index

Checked and **left unchanged**: its cards already lead with evidence-class counts
(human / preclinical / reference) and carry no regulatory badge.

### Search routing

New rules for *identity*, *replication* and *research questions*. Regulatory is
ordered after the scientific rules, so a query naming both — *Tesamorelin FDA
human trials* — offers the evidence first. A bare compound name offers no hint at
all. A matcher bug was found and fixed along the way: stem terms (`replicat`,
`opportunit`) could never match under word boundaries, so two rules silently
never fired.

## 4 · What was added so evidence could lead

Leading with evidence needs evidence structures to lead with. Migration 0023:

- **`compound_identity_claims`** — what each source says a name refers to, with
  form (full-length / fragment / analogue / preparation / unspecified) and
  verification (analytically characterised → contradicted). A constraint requires
  a residue count and a sequence to agree.
- **`replication_assessments`** — a state, not a paper count, from single study to
  confirmed in people. A constraint refuses *independent* replication with fewer
  than two groups.
- **`evidence_gaps.research_question` / `opportunity_type`** — a research question
  can only exist on a recorded gap. A constraint requires both fields or neither.
- **Stratified literature screens** — `screened_count` and `stratum`, so a
  1,112-record corpus classified in part says which part.
- **Country, language and research group** on every screened record — not to rank
  by geography, but so the register can show that it does not.

## 5 · Tests

`tests/integration/evidence-priority.test.ts`, 17 tests, including:

- regulatory status is not used as evidence strength
- non-approval is never phrased as absence of evidence
- one jurisdiction cannot become global status
- non-US evidence carries the same evidence type as US evidence
- regulatory context comes after every science section in the page source
- the at-a-glance panel's first item is human evidence and has no regulatory item
- protocols remain attached to one source each
- research questions derive from recorded gaps and never say "you should"
- independent replication cannot be claimed on one group
- a stratified screen names its stratum
- search routes research intent ahead of regulatory status

## 6 · Regulatory information that was kept

All of it. Nothing accurate was removed. Tesamorelin's approval, BLA number,
products and label-derived safety presentation are unchanged and remain
authoritative *for the approved product*. What changed is where they sit.
