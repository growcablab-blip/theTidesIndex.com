# QUALITY INDEX ARCHITECTURE

How `/quality` is built, and why it shows unwritten topics.

---

## 1. The problem it fixes

The index listed **published topics only**. Nothing is published, so it rendered
an empty state — a section with four written topics and fifteen registered ones
looked like a section with nothing in it.

This is the same failure the compound register solved in migration 0006, and it
has the same answer: *"nothing is published here yet"* and *"this subject is not
in the index"* are different statements, and a reader deserves to tell them
apart.

---

## 2. The register

`public_v_quality_register` exposes every topic with how far it has got:

| Field | Purpose |
|---|---|
| `name`, `slug`, `family` | Identity and grouping |
| `review_state`, `is_published` | How far it has been checked |
| `claim_count`, `gap_count`, `relationship_count` | How much is attached |
| `open_issue_key` | The lowest-numbered open verification issue naming it, if any |

**It carries no prose.** A short description is unreviewed content until the
topic publishes, and published topics already have a view that serves it.

---

## 3. State is content

Five states, in words:

| State | Meaning |
|---|---|
| **Published** | Reviewed and live |
| **Written — awaiting scientific review** | Complete, prepared, waiting on a person |
| **Evidence captured** | Claims exist, not yet submitted |
| **Open question recorded** | Unwritten, and the queue records a question about it |
| **In preparation** | Registered; nobody has started |

The fourth is the one worth having. *"Nobody has written this yet"* and *"this
index has recorded a specific open question about this"* are different facts, and
the second is more useful to a reader — it explains the absence instead of
leaving it.

It is **derived from the verification queue**, not inferred from an absence of
claims: the register exposes `open_issue_key`, the lowest-numbered open issue
whose `related_keys` name the topic, and the page reads it only for a topic with
no claims.

### Why it does not say *what* the question is

Until C.10 this state read **"source access pending"**, and the field behind it
was called `blocking_issue_key`. Both overstated what the data supports.

`related_keys` links an issue to a topic. It does not record whether that issue
is what is holding the topic up, and several of the issues are not: V-008 is
about the conflation of purity, identity and content, and it names hplc-purity,
which is written and blocked by nothing. For sterility and bacterial endotoxin
the label was accurate — V-017 and V-018 say the compendial chapter cannot
lawfully be obtained. For the manufacturing-geography and GMP topics it was not.

Whether an issue blocks a *particular* topic is a property of the pair, and the
queue has no place to record it. So the field was renamed to what it measures
and the label now says less. Adding the classification would be an editorial
decision, not a derivation, and it is not one this index has made.

---

## 4. Families are editorial, not scientific

Grouping comes from `quality_topics.family`, a canonical column seeded from
`data/seed/quality_topics.json`. Six families: analytical, microbiological,
chemical and physical, manufacturing, handling, documents.

**Deliberately not derived from the relationship map.** A map edge is a claim
about how two topics relate and must cite its basis; a family is a shelf somebody
put a topic on. Using evidence-backed edges as navigation categories would make
the two indistinguishable, and the weaker one would end up carrying the authority
of the stronger.

The grouping is in the database rather than in React so it is queryable and
reviewable as data, but it is not evidence and does not pretend to be.

---

## 5. The pathway

Four cards, in order, following the questions a **test report** raises rather
than the order a laboratory would teach them:

1. **Purity** — what does a purity figure describe?
2. **Identity** — is this the substance it claims to be?
3. **Content** — how much is present?
4. **Certificate** — does this document describe what I am holding?

The pathway is defined in the page rather than in data: it is an editorial
argument about reading order, it applies to exactly these four pages, and putting
it in the database would invite it to be treated as structure.

Each card shows its real state. None is published, and all four say so.

---

## 6. Unwritten topics

Named, grouped, **not linked**, with their state. A dashed border and no link,
because there is nothing to read.

Hiding them would make the section look smaller and more finished than it is,
which is the opposite of what this index is for. It would also hide the topics
waiting on the USP-NF subscription — currently the most important fact about the
section.

---

## 7. Reading modes

| | |
|---|---|
| **Simple** | Name and state |
| **Practitioner** | Adds claim and gap counts |

Counts are orientation for somebody assessing the section's depth. To everyone
else they read like a score, which is why they are not in simple mode.

---

## 8. What it is not

- **Not a dashboard.** No totals, no progress bars, no completion percentage.
- **Not a checklist.** Nothing implies a product must be tested for all of this.
- **Not a score.** No topic is rated and no section total is computed.
- **Not indexed.** Site-wide `noindex` is unchanged.
