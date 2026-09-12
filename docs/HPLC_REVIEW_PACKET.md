# HPLC / CHROMATOGRAPHIC PURITY — THE FIRST REVIEW PACKET

The packet prepared for the first human scientific review, and what has to happen
around it.

**Nothing here is reviewed.** No approval exists against any of these records and
none will be created by this document, by the exported PDF, or by anyone reading
either. The packet is prepared; that is all it is.

---

## 1. Why this one first

Four topics are written. This is the right one to send first for three reasons.

**It rests on a single source, read closely.** Every claim comes from Grant,
*Synthetic Peptides: A User's Guide*, 2nd edition, chapter 4. A reviewer needs
one book, not a reading list, and the whole packet is checkable in an afternoon
by somebody who has it.

**Its subject is the section's foundation.** Three of the other topics are
written against the distinction this one draws — purity is not identity, is not
content. If the reading of Grant is wrong, three more topics are wrong, and it
is better to find that out on the first review than the fourth.

**It is the most over-read number in the field.** A certificate saying 99% is
routinely taken to mean the vial contains what it says it contains, in the amount
it says, and that it is safe to inject. The packet exists to say what the figure
does and does not establish, and that is a claim a reviewer with standing should
be willing to put their name to or refuse.

---

## 2. What is in it

**Seven statements**, four of which are the load-bearing ones:

| Key | Weight | In one line |
|---|---|---|
| HPLC-001 | high | Evaluation has two separate goals — homogeneity and correct covalent structure — and no single technique addresses both |
| HPLC-002 | critical | Reversed-phase HPLC assesses heterogeneity; it yields no structural information |
| HPLC-003 | critical | One symmetrical peak does not establish one species |
| HPLC-004 | high | Column condition affects whether heterogeneity is detected at all |
| HPLC-005 | critical | How much peptide is present is a separate measurement from purity |
| HPLC-006 | high | Mass spectrometry gives accurate mass and can indicate heterogeneity, but is not quantitative |
| HPLC-007 | high | The techniques are complementary; a judgement rests on several together |

**Six locations**, all in Grant chapter 4: printed pages 222, 223 (table 4-1),
224, 239 (figure 4-5), 241 and 261. The held copy numbers from its cover, so
printed page + 11 gives the file page — 233, 234, 235, 250, 252 and 272.

**Four statements the packet declines to make:**

| Not stated | Why | Queue |
|---|---|---|
| A purity result says nothing about sterility | The compendial chapter is not held | V-017 |
| A purity result says nothing about endotoxin | The compendial chapter is not held | V-018 |
| How a certificate's purity figure is calculated | No current reviewed source | V-015 |
| A minimum purity for material intended for human administration | No threshold is established anywhere this index holds | V-015 |

The last is the one to ask a reviewer about hardest. Its absence is the packet's
most consequential silence, and a reviewer who thinks a number belongs there
should say so — and say which source establishes it.

---

## 3. What a reviewer is asked, and what they are not

Carried on the packet itself, so it is in front of them while they work. In
short: whether the source says what this index says it says; whether the reading
is fair and not stronger than the passage supports; whether the stated
uncertainty covers what a reader should be warned about; whether the scope is
right; and whether anything is asserted that the cited passage does not carry.

They are **not** asked to write the content, to judge any product or supplier, to
vouch for sources this index does not hold, or to fill a gap from their own
knowledge. A thing a reviewer knows and the sources here do not establish is a
source to acquire, not a claim to approve.

---

## 4. What has to be true before it is sent

1. **The reviewer has the book.** The packet carries locators, not passages.
   Grant is a third-party copyrighted work and this index does not send it. A
   reviewer without access to a copy cannot do the job being asked, and should
   not be asked to.

2. **Their standing is recorded first.** `profiles` carries professional role,
   review domain, organisation and a credential summary. It is recorded before
   the review, not after, because a credential written down afterwards is a
   credential chosen to fit the outcome.

3. **Their conflicts position is recorded, including having none.** The
   `conflicts_disclosed` column is nullable on purpose: null means nobody asked,
   which is a different fact from a reviewer stating they have none. A
   declaration of a conflict with nothing said about it is refused by
   constraint, as is one with no date.

4. **The packet is submitted, which is an act.** Loading a packet is data;
   submitting it is attributed to a named editor. On a fresh database nothing is
   awaiting review until `npm run evidence:submit -- hplc-purity --as <editor>`
   has been run. See §7.

---

## 5. What comes back, and what can be done with it

**Comments** can be transcribed against the record by an editor, attributed to
the reviewer, kept verbatim.

**A decision cannot.** An approval is a row bound to a version, written by an
identified person. No editor records one on a reviewer's behalf, and no reading
of a reviewer's letter is stored as their approval. If the reviewer works on
paper, they still enter the decision themselves.

This is not procedural fussiness. The whole platform's claim is that a published
statement was approved by a person answerable for it, and an approval an editor
typed in on somebody's behalf is not that.

---

## 6. What happens after

An approval binds to the version reviewed. Any later edit bumps the version,
strands the approval, and — if the record was published — withdraws it. The
reviewer is asked again, and shown what changed rather than being handed an
apparently identical record.

Publishing needs more approvals than the pilot supplies, and the count is worth
knowing before it starts. The **topic** needs one human scientific approval. Each
of the seven **claims** needs three — a source check, a scientific review and,
because all seven are high-impact, a compliance review. Twenty-two in total.

The automated source check already recorded against every claim does not count
towards any of them: `tides_has_approved_review` counts human approvals only, so
an automated check advances the review state and opens no gate. And an automated
*scientific* approval is not merely disallowed — the `reviews_automation_scope`
constraint means it cannot be written down at all.

`docs/FIRST_PUBLICATION_READINESS.md` has the full picture.

---

## 7. Standing the environment up

A clean database does not arrive with anything awaiting review.

```bash
npm run db:migrate
npm run db:seed
npm run evidence:submit -- --all --as <staff-user-id>
```

A single packet key in place of `--all` submits just that one.

The acting user must be an active editor or admin. The source check is recorded
as automated and attributed to the tool, but somebody has to have run it —
which is the point.

Then:

```bash
npm run qa:metrics
npm run qa:production
```

`qa:metrics` reports how much is awaiting review and how long it has waited.
`npm run qa:publication -- hplc-purity` reports what stands between this record
and publication. `qa:production` refuses to certify a database that still holds demonstration
records — including the demonstration reviewer profile, whose approvals would
otherwise satisfy a real publish gate.

---

## 8. Where the packet lives

| | |
|---|---|
| On screen | `/admin/quality-topics/<id>` — the review packet panel |
| As a document | `/admin/quality-topics/<id>/export` — printable, PDF-ready |
| As an external bundle | `/admin/quality-topics/<id>/bundle` — cover, guide, evidence, response form |
| In development | `/dev/review-packet/hplc-purity`, `…/export` and `…/bundle` |

The development routes are closed by two independent conditions — not a
production build, and `TIDES_PREVIEW_UNPUBLISHED=1` — and 404 when either fails.

The exported document identifies itself as `RP-HPLC-PURITY-v<version>-<date>`,
names the version it describes, lists what it deliberately does not contain, and
carries no control of any kind that could record a decision.
