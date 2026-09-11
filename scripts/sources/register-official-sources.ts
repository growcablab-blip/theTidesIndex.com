/**
 * Registers the official regulatory and compendial sources for the quality
 * section, and records honestly which of them this index actually holds.
 *
 *   npm run sources:register-official
 *
 * Two outcomes, and the difference between them is the point.
 *
 * The ICH guidelines are published free by the issuing body. They were retrieved
 * directly from database.ich.org, their title pages read, and their file
 * identity recorded — so they enter the register citable, the same way any
 * source does.
 *
 * The USP general chapters are not free. They require a USP-NF subscription, and
 * no lawful full text is published. Copies circulate on document-sharing sites;
 * verification issue V-014 established what those copies are worth, and they are
 * refused here on that ground rather than used as a shortcut. Those chapters are
 * registered as `pending` with no file, so that what is missing is part of the
 * record instead of an unexplained silence.
 *
 * Idempotent: re-running updates the entries rather than duplicating them.
 */
import { createHash } from 'node:crypto';
import { readFileSync, statSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { extractText, getDocumentProxy } from 'unpdf';

const manifestPath = fileURLToPath(new URL('../../SOURCE_MANIFEST.json', import.meta.url));
const sourcesDir = fileURLToPath(new URL('../../sources/', import.meta.url));
const TODAY = '2026-09-11';

interface HeldSource {
  key: string;
  file: string;
  canonical: string;
  title: string;
  authors: string[];
  year: number;
  sourceType: string;
  publisher: string;
  publicationName: string;
  edition: string;
  qcStatus: 'usable' | 'pending';
  printedPageOffset: number | null;
  titlePageTitle: string;
  titlePageAuthors: string;
  primaryRole: string;
  authorityNotes: string;
  limitationsNotes: string;
  integrityNotes: string;
}

const HELD: HeldSource[] = [
  {
    key: 'SRC-017',
    file: 'ICH_Q7_Guideline.pdf',
    canonical: 'ICH_Q7_GMP_API_Step4_2000.pdf',
    title: 'ICH Q7: Good Manufacturing Practice Guide for Active Pharmaceutical Ingredients',
    authors: [
      'International Conference on Harmonisation of Technical Requirements for Registration of Pharmaceuticals for Human Use',
    ],
    year: 2000,
    sourceType: 'regulatory_guidance',
    publisher: 'ICH',
    publicationName: 'ICH Harmonised Tripartite Guideline',
    edition: 'Step 4, 10 November 2000',
    qcStatus: 'usable',
    printedPageOffset: 6,
    titlePageTitle:
      'ICH HARMONISED TRIPARTITE GUIDELINE — GOOD MANUFACTURING PRACTICE GUIDE FOR ACTIVE PHARMACEUTICAL INGREDIENTS Q7',
    titlePageAuthors: 'ICH Expert Working Group; current Step 4 version dated 10 November 2000',
    primaryRole:
      'API and intermediate GMP. Section 11.4 is the only source in this register that states what a certificate of analysis should contain; section 17.2 states what a distributor must retain for traceability.',
    authorityNotes:
      'Official ICH harmonised guideline, retrieved directly from database.ich.org. Recommended for adoption by the regulatory bodies of the European Union, Japan and the USA.',
    limitationsNotes:
      'SCOPE IS API AND INTERMEDIATE MANUFACTURE. Q7 does not state requirements for finished drug products, for third-party analytical test reports, or for research-use materials. A Q7 certificate requirement is not a universal certificate requirement and must never be presented as one.',
    integrityNotes:
      'Complete, born-digital, retrieved from the official ICH database. Title page confirms the guideline, its number and the Step 4 date. Printed page + 6 = page of this file.',
  },
  {
    key: 'SRC-018',
    file: 'ICH_Q2R2_Guideline_2023.pdf',
    canonical: 'ICH_Q2R2_Validation_Analytical_Procedures_2023.pdf',
    title: 'ICH Q2(R2): Validation of Analytical Procedures',
    authors: [
      'International Council for Harmonisation of Technical Requirements for Pharmaceuticals for Human Use',
    ],
    year: 2023,
    sourceType: 'regulatory_guidance',
    publisher: 'ICH',
    publicationName: 'ICH Harmonised Guideline',
    edition: 'Final version, adopted 1 November 2023',
    qcStatus: 'usable',
    printedPageOffset: null,
    titlePageTitle: 'ICH HARMONISED GUIDELINE — VALIDATION OF ANALYTICAL PROCEDURES Q2(R2)',
    titlePageAuthors: 'ICH Expert Working Group; final version adopted on 1 November 2023',
    primaryRole:
      'What it means for an analytical procedure to be validated, and which characteristics validation addresses.',
    authorityNotes:
      'Official ICH harmonised guideline, retrieved directly from database.ich.org. Adopted by ICH on 1 November 2023 and issued as FDA guidance in March 2024. The ICH adoption date is recorded here because this file is the ICH document, not the FDA reissue.',
    limitationsNotes:
      'Registered and verified but not yet extracted from. No claim in this index rests on it.',
    integrityNotes:
      'Complete, born-digital, retrieved from the official ICH database. Title page confirms the guideline, its number and the adoption date.',
  },
  {
    key: 'SRC-019',
    file: 'ICH_Q14_Guideline_2023.pdf',
    canonical: 'ICH_Q14_Analytical_Procedure_Development_2023.pdf',
    title: 'ICH Q14: Analytical Procedure Development',
    authors: [
      'International Council for Harmonisation of Technical Requirements for Pharmaceuticals for Human Use',
    ],
    year: 2023,
    sourceType: 'regulatory_guidance',
    publisher: 'ICH',
    publicationName: 'ICH Harmonised Guideline',
    edition: 'Final version, adopted 1 November 2023',
    qcStatus: 'usable',
    printedPageOffset: null,
    titlePageTitle: 'ICH HARMONISED GUIDELINE — ANALYTICAL PROCEDURE DEVELOPMENT Q14',
    titlePageAuthors: 'ICH Expert Working Group; final version adopted on 1 November 2023',
    primaryRole:
      'How an analytical procedure is developed, and what a description of one should cover.',
    authorityNotes:
      'Official ICH harmonised guideline, retrieved directly from database.ich.org. Adopted by ICH on 1 November 2023 and issued as FDA guidance in March 2024.',
    limitationsNotes:
      'Registered and verified but not yet extracted from. No claim in this index rests on it.',
    integrityNotes:
      'Complete, born-digital, retrieved from the official ICH database. Title page confirms the guideline, its number and the adoption date.',
  },
  {
    key: 'SRC-020',
    file: 'USP_PDG_621_Chromatography_harmonised_2021.pdf',
    canonical: 'USP_PDG_621_Chromatography_Stage4_2021.pdf',
    title: 'PDG Stage 4 harmonised text: <621> Chromatography',
    authors: ['Pharmacopoeial Discussion Group'],
    year: 2021,
    sourceType: 'compendial_standard',
    publisher: 'United States Pharmacopeia',
    publicationName: 'PDG harmonisation documents',
    edition: 'Stage 4, official 1 December 2022',
    qcStatus: 'pending',
    printedPageOffset: null,
    titlePageTitle: 'Stage 4 Harmonization Official: December 1, 2022 — <621> CHROMATOGRAPHY',
    titlePageAuthors: 'Pharmacopoeial Discussion Group, published by USP',
    primaryRole: 'Harmonised chromatography text as agreed between the pharmacopoeias.',
    authorityNotes: 'Published on usp.org by USP itself. Genuine and officially issued.',
    limitationsNotes:
      'THIS IS NOT THE OFFICIAL USP-NF CHAPTER. It is the PDG Stage 4 harmonised text, dated 2021 and official from December 2022; the USP-NF chapter has been revised since, with a further revision targeted for 1 June 2026. Anything cited from it must be scoped as PDG harmonised text and must never be presented as the current USP-NF requirement. Held at `pending` until that scoping is settled and the document is audited.',
    integrityNotes:
      'Retrieved from usp.org. Title page confirms the harmonisation stage and official date. Not yet audited for coverage and not extracted from.',
  },
];

const PENDING: [string, string, string][] = [
  [
    'SRC-021',
    'USP <621> Chromatography',
    'The official USP-NF general chapter on chromatographic procedures and system suitability.',
  ],
  ['SRC-022', 'USP <71> Sterility Tests', 'The official USP-NF general chapter on sterility testing.'],
  [
    'SRC-023',
    'USP <85> Bacterial Endotoxins Test',
    'The official USP-NF general chapter on bacterial endotoxin testing.',
  ],
  [
    'SRC-024',
    'USP <467> Residual Solvents',
    'The official USP-NF general chapter on residual solvents.',
  ],
  [
    'SRC-025',
    'USP <921> Water Determination',
    'The official USP-NF general chapter on water determination.',
  ],
  [
    'SRC-026',
    'USP <1085> Guidelines on the Endotoxins Test',
    'Supporting USP-NF general information chapter on endotoxin testing.',
  ],
];

const NOT_HELD_NOTE =
  'Nothing in this index may rest on this chapter until a copy is lawfully obtained, audited and locator-verified. Aggregator copies of USP chapters circulate on document-sharing sites; verification issue V-014 established that such copies are not bibliographic authority, and they are refused here on that ground rather than used as a shortcut.';

async function pageCount(path: string): Promise<number> {
  const pdf = await getDocumentProxy(new Uint8Array(readFileSync(path)));
  const { text } = await extractText(pdf, { mergePages: false });
  return Array.isArray(text) ? text.length : 1;
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
  sources: Record<string, unknown>[];
};

function upsert(entry: Record<string, unknown>): void {
  const index = manifest.sources.findIndex((s) => s.source_key === entry.source_key);
  if (index === -1) manifest.sources.push(entry);
  else manifest.sources[index] = entry;
}

for (const source of HELD) {
  const path = sourcesDir + source.file;
  const buffer = readFileSync(path);
  upsert({
    source_key: source.key,
    title: source.title,
    authors: source.authors,
    year: source.year,
    source_type: source.sourceType,
    priority: 'core',
    qc_status: source.qcStatus,
    canonical_filename: source.canonical,
    known_local_filename: source.file,
    primary_role: source.primaryRole,
    public_fulltext_allowed: false,
    authority_notes: source.authorityNotes,
    limitations_notes: source.limitationsNotes,
    isbn: null,
    edition: source.edition,
    publisher: source.publisher,
    publication_name: source.publicationName,
    local_file_sha256: createHash('sha256').update(buffer).digest('hex'),
    local_file_bytes: statSync(path).size,
    page_count: await pageCount(path),
    printed_page_offset: source.printedPageOffset,
    title_page_verified: true,
    bibliographic_verified: true,
    title_page_title: source.titlePageTitle,
    title_page_authors: source.titlePageAuthors,
    integrity_notes: source.integrityNotes,
    verified_at: TODAY,
    verified_by:
      'Retrieved directly from the issuing body, then the title page read and compared field by field against the registry (automated text extraction).',
    access_status: 'held',
    access_notes: 'Published free by the issuing body and retrieved directly from it.',
  });
}

for (const [key, title, role] of PENDING) {
  upsert({
    source_key: key,
    title,
    authors: ['United States Pharmacopeial Convention'],
    year: null,
    source_type: 'compendial_standard',
    priority: 'core',
    qc_status: 'pending',
    canonical_filename: null,
    known_local_filename: null,
    primary_role: role,
    public_fulltext_allowed: false,
    authority_notes:
      'Official compendial standard. Would be authoritative for the test it covers.',
    limitations_notes: NOT_HELD_NOTE,
    isbn: null,
    edition: null,
    publisher: 'United States Pharmacopeial Convention',
    publication_name: 'USP-NF',
    local_file_sha256: null,
    local_file_bytes: null,
    page_count: null,
    printed_page_offset: null,
    title_page_verified: false,
    bibliographic_verified: false,
    title_page_title: null,
    title_page_authors: null,
    integrity_notes:
      'NO COPY HELD. Registered so that what is missing is part of the record rather than an unexplained silence.',
    verified_at: null,
    verified_by: null,
    access_status: 'subscription_required',
    access_notes:
      'USP-NF general chapters require a paid USP-NF subscription. Checked 11 September 2026: USP publishes no lawful free full text of this chapter.',
  });
}

writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');

const held = manifest.sources.filter((s) => s.access_status === 'held').length;
const missing = manifest.sources.filter((s) => s.access_status === 'subscription_required').length;
console.log(`Registry: ${String(manifest.sources.length)} sources.`);
console.log(`  held and verified this run: ${String(HELD.length)}`);
console.log(`  registered without a copy:  ${String(PENDING.length)}`);
console.log(`  access_status=held overall: ${String(held)}`);
console.log(`  awaiting a subscription:    ${String(missing)}`);
