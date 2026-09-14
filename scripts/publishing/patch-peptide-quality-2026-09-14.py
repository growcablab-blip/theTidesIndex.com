#!/usr/bin/env python3
"""
One-off edit to src/publishing/books/peptide-quality.tsx, 14 September 2026.

Fill and finish, lyophilisation and finished-product release move from
"source needed" to sourced, from the claims in the sterility, bacterial-endotoxin
and lyophilization packets (EU GMP Annex 1, FDA ORA.007, USP <71>/<85> held
research copies, Pardeshi et al. 2023). Formulation, residual solvents, water
content and heavy metals stay unwritten. A new page states what a sterility and
an endotoxin result mean, and that these are expectations for licensed sterile
medicines, not descriptions of any product.

Each replacement asserts its anchor occurs exactly once.
"""
from pathlib import Path

PATH = Path(__file__).resolve().parents[2] / "src" / "publishing" / "books" / "peptide-quality.tsx"
text = PATH.read_text(encoding="utf-8")


def swap(old: str, new: str) -> None:
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"anchor found {count} times: {old[:80]!r}")
    text = text.replace(old, new)


swap("            ['Fill and finish', 'Source needed'],",
     "            ['Fill and finish', 'EU GMP Annex 1 §§8.21–8.25, 8.79, 8.87, 9.1–9.32'],")
swap("            ['Lyophilisation as a process', 'Source needed'],",
     "            ['Lyophilisation as a process', 'Pardeshi et al. 2023; EU GMP Annex 1 §8.121'],")
swap("            ['Finished-product release testing', 'Source needed'],",
     "            ['Finished-product release testing', 'EU GMP Annex 1 §§10.3–10.6; USP <71>, <85> (research copies); FDA ORA.007'],")

swap(
    """          No source held by this index describes formulation, fill and finish, sterile processing,
          lyophilisation as a manufacturing process, or release testing of a finished peptide
          product. Nor does any held source quantify what a temperature excursion does to any
          peptide, or how long material remains suitable after it is mixed. These stages are named
          and left unwritten.""",
    """          No source held by this index describes how a peptide product is formulated, and none
          quantifies what a temperature excursion does to any peptide or how long material remains
          suitable after it is mixed. Fill and finish, freeze-drying and release testing are now
          described on the next page, from regulatory, compendial and review sources — as
          expectations for licensed sterile medicines, not as a description of any product.
          Formulation is named and left unwritten.""",
)

swap("              { label: 'Sterility', written: false },", "              { label: 'Sterility', written: true },")
swap("              { label: 'Endotoxin', written: false },", "              { label: 'Endotoxin', written: true },")

swap(
    """          Sterility, bacterial endotoxin, residual solvents and water content cannot be written
          until this index holds the compendial chapters they depend on. Obtaining lawful access is
          in progress. Until then these subjects are named and left unwritten rather than filled in
          from general knowledge — an index that wrote them from memory would be exactly the kind of
          source it exists to be an alternative to.""",
    """          Residual solvents, water content and heavy metals cannot be written until this index
          holds the chapters they depend on, and are named and left unwritten rather than filled in
          from general knowledge. Sterility and bacterial endotoxin are now written from EU GMP
          Annex 1, FDA’s laboratory manual and copies of the USP chapters held for research whose
          distribution provenance is unverified; licensed USP–NF copies would replace those.""",
)
swap(
    "          transport are now written as far as the held sources reach, which stops short of the\n          finished vial.",
    "          transport are now written as far as the held sources reach, which now includes the\n          finished vial as regulatory expectation — though never as a description of any product.",
)

NEW_PAGE = """      {/* ============ 10b. THE FINISHED VIAL: STERILITY, ENDOTOXIN ============ */}
      <PublicationPage publication={PUBLICATION} section="Sequence to vial">
        <SectionHeading>The finished vial: filling, sealing and freeze-drying</SectionHeading>
        <Body>
          European manufacturing guidance for sterile medicines expects a product that cannot be
          sterilised in its final container to be passed through a sterilising-grade filter and
          filled into sterilised containers under aseptic conditions, with the filter’s integrity
          tested. Containers are to be closed by validated methods and checked for integrity — and
          the same guidance states that looking at a vial is not an acceptable integrity test.
          Storage and shipping are expected not to compromise the sealed product.
        </Body>
        <Body>
          Freeze-drying removes water from a frozen product under low pressure. A 2023 review
          describes how much depends on doing it well: temperatures, pressures and drying times
          affect the finished product, and uncontrolled drying can damage it or collapse the dried
          cake. For sterile medicines, the guidance treats everything during freeze-drying that could
          affect sterility as part of aseptic processing.
        </Body>

        <SectionHeading>What a sterility result means</SectionHeading>
        <Body>
          The guidance states that monitoring or testing alone does not give assurance of sterility,
          and that the finished-product test is only the last in a series of control measures. The
          compendial sterility chapter says the same from its side: its procedures are not by
          themselves designed to ensure that a batch is sterile, and a satisfactory result only
          indicates that no contaminating microorganism was found in the sample examined. A result
          means something only if the method was shown to work in the presence of that product.
        </Body>

        <SectionHeading>What an endotoxin result means</SectionHeading>
        <Body>
          Endotoxin, from the outer wall of certain bacteria, can remain when no living organism
          does, and in an injection can cause reactions ranging from fever to death. The compendial
          test detects it with a reagent from horseshoe-crab blood cells, and its result is
          meaningful only against a limit set for each product according to its dose — and only
          where the laboratory has shown the product does not interfere with the test.
        </Body>

        <Callout title="Expectations, not descriptions">
          Everything on this page is what regulators and compendia expect of licensed sterile
          medicines. None of it shows how any peptide product was made or tested, and the existence
          of an expectation is not evidence that anybody met it.
        </Callout>

        <EvidenceNote
          supports="Claims STER-001 to STER-011, ENDO-001 to ENDO-005 and LYO-001 to LYO-005, extracted from EU GMP Annex 1 (2022), FDA ORA.007 (Revision 02), USP <71> and <85>, and Pardeshi et al. 2023."
          doesNotSettle="Whether any product was made or tested this way, what endotoxin limit applies to any peptide without a monograph, or how any peptide should be formulated or freeze-dried."
          status="Extracted and awaiting scientific review. The USP chapters are held research copies whose distribution provenance is unverified."
        />

        <SourceNote
          items={[
            'European Commission. EudraLex Volume 4, GMP Annex 1: Manufacture of Sterile Medicinal Products, C(2022) 5938 final — §§2.2, 2.7, 3.1, 8.21–8.25, 8.79, 8.87, 8.121, 9.1–9.32, 10.3–10.6, glossary.',
            'USP <71> Sterility Tests — held research copy printed 15 October 2020; distribution provenance unverified; not obtained from USP.',
            'USP <85> Bacterial Endotoxins Test — held research copy printed 21 November 2024; distribution provenance unverified; not obtained from USP.',
            'U.S. FDA. ORA.007 Pharmaceutical Microbiology Manual, Revision 02, 2020 — chapters 3–5.',
            'Pardeshi SR et al. Future J Pharm Sci 2023;9:99 — pp. 2–3, 6, 8, 20.',
          ]}
        />
      </PublicationPage>

      {/* ================= 11. MULTI-DIMENSIONAL ====================== */}"""

swap("      {/* ================= 11. MULTI-DIMENSIONAL ====================== */}", NEW_PAGE)

PATH.write_text(text, encoding="utf-8")
print("patched", PATH)
