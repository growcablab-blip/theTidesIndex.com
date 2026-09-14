#!/usr/bin/env python3
"""
One-off edit to src/publishing/books/understanding-peptides.tsx, 14 September 2026.

Chapter Five (Receptors) becomes written, resting only on claims RECEPT-001 to
RECEPT-016 extracted from the Spanish-language Rang and Dale sample (SRC-121).
Chapters One to Three, Four and Seven stay briefs, and their "before it can be
written" text now names the exact source still missing. Cover and skeleton
counts move from five written chapters to six.

Every replacement asserts that its anchor exists exactly once, so a drifted
file fails loudly instead of being half-patched.
"""
from pathlib import Path

PATH = Path(__file__).resolve().parents[2] / "src" / "publishing" / "books" / "understanding-peptides.tsx"
text = PATH.read_text(encoding="utf-8")


def swap(old: str, new: str) -> None:
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"anchor found {count} times: {old[:80]!r}")
    text = text.replace(old, new)


swap(
    "    needs:\n      'A biochemistry reference held and verified by this index. Nothing in the current register defines a peptide.',",
    "    needs:\n      'A biochemistry reference held and verified by this index. Lehninger Principles of Biochemistry (SRC-120) is registered and not held: the only file received under that title was a download-site advertisement. Nothing in the current register defines a peptide.',",
)
swap(
    "    needs: 'A physiology or pharmacology source held and verified.',",
    "    needs:\n      'The cell-signalling chapter of a pharmacology textbook. The Rang and Dale sample held (SRC-121) stops at chapter 2; its chapter 3, on how receptors pass on a signal, is in the complete edition (SRC-122), which is not held.',",
)
swap(
    "    needs: 'A pharmacology source.',\n    illustration: 'Binding and selectivity',\n  },",
    "    needs:\n      'Written from sixteen claims extracted from chapter 2 of Rang and Dale’s Pharmacology, 10th edition, held only as a Spanish-language publisher sample (SRC-121). Each is a paraphrase of the Spanish text, to be re-checked against the English edition, and none is yet scientifically reviewed.',\n    illustration: 'Binding and selectivity',\n    written: 'receptors',\n  },",
)
swap(
    "    needs:\n      'A pharmaceutics source. The existing route taxonomy in the database carries the structure; none of it is yet backed by a located source.',",
    "    needs:\n      'A pharmacokinetics and pharmaceutics source. The pharmacokinetics chapters of Rang and Dale (9 to 11) are absent from the sample held and are in the complete edition (SRC-122). The route taxonomy in the database carries the structure; none of it is yet backed by a located source.',",
)
swap(
    "  readonly written?: 'evidence' | 'safety' | 'quality' | 'clinician' | 'using';",
    "  readonly written?: 'evidence' | 'safety' | 'quality' | 'clinician' | 'using' | 'receptors';",
)
swap(
    "    case 'using':\n      return <HowToUseTheIndex chapter={chapter} />;",
    "    case 'using':\n      return <HowToUseTheIndex chapter={chapter} />;\n    case 'receptors':\n      return <Receptors chapter={chapter} />;",
)

RECEPTORS = r"""
/**
 * The claims chapter five rests on. Exported so a test can hold the chapter to
 * the learning-topic packet: a renamed or removed claim fails the build rather
 * than leaving a paragraph with nothing under it.
 */
export const CHAPTER_FIVE_CLAIMS = [
  'RECEPT-001',
  'RECEPT-002',
  'RECEPT-003',
  'RECEPT-004',
  'RECEPT-005',
  'RECEPT-006',
  'RECEPT-007',
  'RECEPT-014',
  'RECEPT-016',
] as const;

/**
 * Chapter five, written.
 *
 * The first chapter in this volume that states anything about how molecules
 * act, so the sourcing is stated on the page as plainly as the content: a
 * pharmacology textbook, held only as a partial Spanish-language sample, read
 * and paraphrased. Every paragraph corresponds to a claim listed above. Nothing
 * here says which receptor any peptide acts on — that is a claim about a
 * compound and belongs to its record.
 */
function Receptors({ chapter }: { chapter: ChapterPlan }) {
  return (
    <>
      <PublicationPage publication={PUBLICATION} section={chapter.title}>
        <ChapterOpener
          eyebrow={chapter.number}
          title={chapter.title}
          standfirst={chapter.standfirst}
        />

        <Lede>
          For most medicines, a molecule has to attach to something specific in the body before it
          can do anything at all. That something is usually a protein, and one kind of protein — a
          receptor — exists to pick up the body’s own chemical messages.
        </Lede>

        <IllustrationSlot
          label="A molecule, a receptor, and the difference between attaching and switching on"
          height={150}
          note="Vector diagram, to be drawn from the located source"
        />

        <SectionHeading>Something has to be listening</SectionHeading>
        <Body>
          A standard pharmacology textbook describes four main kinds of protein that medicines act
          on: receptors, enzymes, transporters and ion channels. In its strict sense, a receptor is
          the kind that recognises one of the body’s own signals and responds to it. The word is
          sometimes used loosely for anything a molecule sticks to; this index uses the narrower
          meaning.
        </Body>

        <SectionHeading>Switching on, and getting in the way</SectionHeading>
        <Body>
          A molecule that switches a receptor on is called an agonist. A molecule that sits in the
          same place without switching it on — and so stops the switching-on molecule from working —
          is called an antagonist. Those two words properly describe receptors, not the other kinds
          of target.
        </Body>
        <Body>
          Attaching and switching on are two different properties. How readily a molecule sticks to
          a receptor is its affinity; how well it switches the receptor on once it is there is its
          efficacy. A partial agonist switches a receptor only part of the way on, so even when it
          fills every receptor the response stays below the maximum — and how strong a molecule
          looks can depend on the tissue it is tested in.
        </Body>
      </PublicationPage>

      <PublicationPage publication={PUBLICATION} section={chapter.title}>
        <SectionHeading>Choosy, but never perfectly</SectionHeading>
        <Body>
          Molecules and their targets are choosy about each other, but the same textbook states that
          no medicine is perfectly choosy, and that at higher amounts many begin to act on targets
          other than the main one — which is one way side effects arise. Recognition can also be
          very precise: the book’s own example is a natural peptide whose activity can be lost when a
          single one of its building blocks is changed.
        </Body>

        <SectionHeading>Why an effect can fade</SectionHeading>
        <Body>
          The body’s response to a substance can weaken with repeated exposure, sometimes within
          minutes and sometimes over weeks, and there are several different reasons it can happen.
          What a molecule does in the first minutes can also differ from what long exposure does
          over days or weeks, and the longer-term changes are often not well understood.
        </Body>

        <Callout title="What this chapter does not tell you">
          <Text>
            It does not say which receptor any particular peptide acts on, how strongly, or with what
            result. Those are statements about a compound, and each has to be sourced on that
            compound’s own record. How a receptor passes its message into the cell, and how a
            molecule moves through the body, belong to chapters this index cannot yet write.
          </Text>
        </Callout>

        <EvidenceNote
          supports="Claims extracted into this index from chapter 2 of Rang and Dale’s Pharmacology, 10th edition, held as a Spanish-language publisher sample (SRC-121). Each statement is a paraphrase of the Spanish text."
          doesNotSettle="Anything about a specific peptide, and anything about signalling inside the cell or pharmacokinetics, whose chapters are not in the sample held."
          status="Extracted from a partial translated source; awaiting scientific review and re-checking against the English edition"
        />

        <SourceNote
          items={[
            'SRC-121 — Rang y Dale. Farmacología, décima edición (Spanish translation of Rang and Dale’s Pharmacology, 10th edition), chapter 2, printed pp. 6–22. Claims RECEPT-001 to RECEPT-007, RECEPT-014 and RECEPT-016.',
            'SRC-122 — Rang and Dale’s Pharmacology, 10th edition (English). Requested; not held. Every statement above will be re-checked against it.',
          ]}
        />
      </PublicationPage>
    </>
  );
}
"""

swap("\n/**\n * Chapter eleven, written.", RECEPTORS + "\n/**\n * Chapter eleven, written.")

swap(
    'subject="Patient-facing first draft. Five written chapters, seven briefs. No dosing and no reviewed content."',
    'subject="Patient-facing first draft. Six written chapters, six briefs. No dosing and no reviewed content."',
)
swap("First draft · five chapters written · issued", "First draft · six chapters written · issued")
swap(
    'statusLine="Five written chapters and seven briefs, all awaiting review. No dosing, no administration instructions, no treatment advice."',
    'statusLine="PARTIAL DRAFT. Six written chapters and six briefs, all awaiting review. No dosing, no administration instructions, no treatment advice."',
)
swap(
    'standfirst="Five chapters written, seven still briefs — and the difference is where the sources run out."',
    'standfirst="Six chapters written, six still briefs — and the difference is where the sources run out."',
)
swap(
    "          Five chapters are written. Four of them — understanding evidence, safety and uncertainty,\n          questions to ask your clinician, and how to use this index — rest on the editorial method\n          and on the product rather than on peptide science, so they could be written without a\n          peptide source. The fifth, on quality and testing, rests on claims extracted into this\n          index from a peptide chemistry textbook and from a manufacturing standard, both held in\n          full.",
    "          Six chapters are written. Four of them — understanding evidence, safety and uncertainty,\n          questions to ask your clinician, and how to use this index — rest on the editorial method\n          and on the product rather than on peptide science, so they could be written without a\n          peptide source. The chapter on quality and testing rests on claims extracted from a\n          peptide chemistry textbook and a manufacturing standard, both held in full. The chapter on\n          receptors rests on claims extracted from a pharmacology textbook held only as a partial\n          Spanish-language sample, and says so on its own pages.",
)
swap(
    "          The remaining seven need sources this index does not hold: a biochemistry reference, a\n          physiology source, a pharmacology source.",
    "          The remaining six need sources this index does not hold: a biochemistry reference, a\n          physiology source, and the complete pharmacology textbook whose signalling and\n          pharmacokinetics chapters are missing from the sample.",
)

PATH.write_text(text, encoding="utf-8")
print("patched", PATH)
