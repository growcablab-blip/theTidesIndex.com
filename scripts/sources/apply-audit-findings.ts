/**
 * Writes the source-integrity findings into SOURCE_MANIFEST.json (V-014).
 *
 * File measurements — hash, size, page count — come from
 * `data/private/source-audit.json`, produced by `npm run sources:audit`.
 *
 * Bibliographic conclusions are recorded below, one per source, each stating
 * what the title page actually said. They were reached by opening each file and
 * reading its front matter, then comparing that against the registry. That is
 * the verification work; recording it here makes it re-checkable rather than
 * remembered.
 *
 * The distinction the audit forced:
 *
 *   partial      the registered work, missing pages. Citable for what it has,
 *                once a human confirms the range.
 *   decoy        not the registered work at all. A wrapper cover page carrying
 *                the right title, then unrelated text. Citable for nothing.
 *
 * The registry previously described three decoys as "genuine content after
 * promotional pages". They contain no genuine content.
 *
 *   npm run sources:apply-audit
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

type QcStatus = 'usable' | 'incomplete' | 'replace' | 'pending' | 'exclude';

interface Finding {
  readonly qcStatus: QcStatus;
  readonly titlePageTitle?: string;
  readonly titlePageAuthors?: string;
  readonly publisher?: string | null;
  readonly publicationName?: string | null;
  readonly year?: number | null;
  readonly isbn?: string | null;
  readonly edition?: string | null;
  readonly titlePageVerified: boolean;
  readonly bibliographicVerified: boolean;
  readonly integrityNotes: string;
  readonly limitations: string | null;
}

const AUTOMATED_VERIFIER =
  'Automated front-matter inspection (unpdf text extraction), compared field by field against the registry.';

const FINDINGS: Record<string, Finding> = {
  'SRC-001': {
    qcStatus: 'usable',
    titlePageTitle: 'The Peptide Protocols, Volume 1: A Handbook for Practitioners',
    titlePageAuthors: 'William A. Seeds, MD',
    publisher: 'Spire Institute',
    year: 2020,
    isbn: '9780578624358',
    titlePageVerified: true,
    bibliographicVerified: true,
    integrityNotes:
      'Complete. Title page, copyright page and full contents present; 322 pages. Registry matched the work exactly.',
    limitations:
      'A practitioner handbook. Authoritative for what its author describes; not a source of trial evidence.',
  },
  'SRC-002': {
    qcStatus: 'usable',
    titlePageTitle: "Peptide Handbook: A Professional's Guide to Peptide Therapeutics",
    titlePageAuthors: 'James B. LaValle, Gordon Crozier, Joseph P. Cleaver, Andrew Heyman',
    publisher: 'Integrative Health Resources, LLC',
    year: 2022,
    titlePageVerified: true,
    bibliographicVerified: true,
    integrityNotes:
      'Complete. 281 pages, contents and monograph structure intact. Scanned rather than born-digital; text extraction is imperfect in places, so page locators should be confirmed visually.',
    limitations:
      'A practitioner handbook. Monograph statements are the authors’ practice, not study findings.',
  },
  'SRC-003': {
    qcStatus: 'usable',
    titlePageTitle:
      'Optimize Your Health with Therapeutic Peptides: Extend Your Life by Becoming More Muscular, Leaner, Smarter, Injury-Free and Younger',
    titlePageAuthors: 'Jay Campbell',
    year: 2023,
    titlePageVerified: true,
    bibliographicVerified: true,
    integrityNotes: 'Complete. 264 pages.',
    limitations:
      'Practitioner and personal-experience framing throughout. Usable as a record of what the author advocates; not evidence of effect.',
  },
  'SRC-004': {
    qcStatus: 'usable',
    titlePageTitle: 'Peptide Cheat Sheet',
    titlePageAuthors: 'Jay Campbell',
    year: 2025,
    titlePageVerified: true,
    bibliographicVerified: true,
    integrityNotes:
      'Complete. 10 pages of tabulated regimens with no cited sources and no stated derivation.',
    limitations:
      'A quick-reference table with no provenance of its own. Every figure in it requires independent verification before it could support anything.',
  },
  'SRC-005': {
    qcStatus: 'usable',
    titlePageTitle:
      'The Complete Guide to Peptides: Unlocking the Secrets to Health, Healing, and Longevity',
    titlePageAuthors: 'Hack Smith',
    year: 2025,
    titlePageVerified: true,
    bibliographicVerified: true,
    integrityNotes: 'Complete. 208 pages.',
    limitations:
      'Self-published secondary compilation. Useful for discovering which compounds are discussed in practice; not an authority on any of them.',
  },
  'SRC-006': {
    qcStatus: 'usable',
    titlePageTitle: "Synthetic Peptides: A User's Guide, Second Edition",
    titlePageAuthors: 'Edited by Gregory A. Grant',
    publisher: 'Oxford University Press',
    publicationName: 'Advances in Molecular Biology',
    year: 2002,
    isbn: '0-19-513261-0',
    edition: '2nd',
    titlePageVerified: true,
    bibliographicVerified: true,
    integrityNotes:
      'Complete and clean. 401 pages, 93% carrying domain vocabulary. Title page confirms Gregory A. Grant (ed.), Oxford University Press, 2002, ISBN 0-19-513261-0. Embedded PDF metadata agrees. The strongest analytical source currently held.',
    limitations:
      'Published 2002. Authoritative for chromatographic and analytical principles, which have not changed; not current on instrumentation, regulatory expectations or compendial method requirements.',
  },
  'SRC-007': {
    qcStatus: 'usable',
    titlePageTitle: 'Advances in the Discovery and Development of Peptide Therapeutics',
    titlePageAuthors: 'Editors: Gert Kruger, Fernando Albericio',
    publisher: 'Future Science Ltd',
    year: 2015,
    isbn: '978-1-910419-02-1',
    titlePageVerified: true,
    bibliographicVerified: true,
    integrityNotes:
      'Complete. 201 pages, 94% carrying domain vocabulary. Publisher corrected: the registry did not record one, and the title page states Future Science Ltd (ISSN 2047-332X), not the Royal Society of Chemistry as an incidental reference in the text might suggest.',
    limitations:
      'An edited volume of review chapters. Chapters report other work; trace to the primary study before relying on a specific finding.',
  },
  'SRC-008': {
    qcStatus: 'replace',
    titlePageVerified: true,
    bibliographicVerified: false,
    integrityNotes:
      'NOT THE REGISTERED WORK. The first three pages are an aggregator listing carrying the correct title, ISBN and price. The remaining 201 pages are unrelated text — climate policy, human trafficking, family systems, fiction. Only 4% of pages contain any peptide-domain vocabulary, and those are the wrapper pages. The registry previously described this as "real book begins after promotional pages"; that is wrong. A replacement copy is required.',
    limitations: 'Not the registered work. Cannot support any statement.',
  },
  'SRC-009': {
    qcStatus: 'replace',
    isbn: '978-3-031-30022-6',
    titlePageVerified: true,
    bibliographicVerified: false,
    integrityNotes:
      'NOT THE REGISTERED WORK. Two aggregator pages carrying the correct title and the genuine Springer ISBN, then 199 pages of unrelated text — Hume scholarship, parliamentary debate, island snake biogeography. 6% domain vocabulary. A replacement copy is required.',
    limitations: 'Not the registered work. Cannot support any statement.',
  },
  'SRC-010': {
    qcStatus: 'replace',
    titlePageVerified: true,
    bibliographicVerified: false,
    integrityNotes:
      'NOT THE REGISTERED WORK. Three aggregator pages carrying the correct title, then unrelated text in several languages — barometric measurement, fiction in English, Spanish and German. The strongest title-like heading in the front matter belongs to a different book entirely ("Herbal Bioactive-Based Drug Delivery Systems"). 6% domain vocabulary. A replacement copy is required.',
    limitations: 'Not the registered work. Cannot support any statement.',
  },
  'SRC-011': {
    qcStatus: 'replace',
    titlePageTitle: 'Peptide Characterization and Application Protocols',
    titlePageAuthors: 'Edited by Gregg B. Fields',
    publisher: 'Humana Press',
    publicationName: 'Methods in Molecular Biology, Volume 386',
    year: 2007,
    isbn: '978-1-58829-550-7',
    titlePageVerified: true,
    bibliographicVerified: true,
    integrityNotes:
      'Bibliographic identity CONFIRMED and corrected. Page 1 is a Scribd wrapper naming Colin T. Mant — he is lead author of Chapter 1, not the editor. Pages 3–4 carry the authentic Humana front matter: Methods in Molecular Biology series, John M. Walker series editor, ISBN 10 1-58829-550-8 / ISBN 13 978-1-58829-550-7, which are the real MiMB 386 identifiers. The copy itself is unusable: only 96 of roughly 500 pages, and the body after the opening of Chapter 1 is unrelated filler. 14% domain vocabulary, concentrated in the front matter. Replacement required (V-013).',
    limitations:
      'Authentic front matter and the opening of Chapter 1 only; the remainder is filler. Cannot support any statement, including from the authentic pages, until a complete copy is verified.',
  },
  'SRC-012': {
    qcStatus: 'usable',
    titlePageTitle:
      'Peptides: Biology and Chemistry — Proceedings of the 1996 Chinese Peptide Symposium',
    titlePageAuthors: 'Edited by Xiao-Jie Xu, Yun-Hua Ye, James P. Tam',
    publisher: 'Kluwer Academic Publishers',
    year: 2002,
    isbn: '0-306-46859-X',
    titlePageVerified: true,
    bibliographicVerified: true,
    integrityNotes:
      'Complete. 283 pages, 83% domain vocabulary. Confirmed as the 1996 Chinese Peptide Symposium proceedings, Kluwer, ISBN 0-306-46859-X — not the Sewald/Jakubke textbook it is sometimes confused with.',
    limitations:
      'Conference proceedings from 1996. Historical and supporting value; not a current authority on anything.',
  },
  'SRC-013': {
    qcStatus: 'replace',
    titlePageTitle: 'Lyophilization of Biopharmaceuticals',
    titlePageAuthors: 'Henry R. Costantino, Michael J. Pikal',
    titlePageVerified: true,
    bibliographicVerified: true,
    integrityNotes:
      'Table of contents only — two pages, generated from a Word document. The contents confirm the work’s identity and chapter structure but no body text is present. Replacement required.',
    limitations:
      'Contents listing only. Can establish that a chapter exists; cannot support anything it says.',
  },
  'SRC-014': {
    qcStatus: 'replace',
    titlePageVerified: true,
    bibliographicVerified: false,
    integrityNotes:
      'NOT THE REGISTERED WORK. Three aggregator pages carrying the correct title, then 154 pages of unrelated text — African Union politics, psychoanalysis, portfolio management. 3% domain vocabulary, the lowest of any file held. A replacement copy is required.',
    limitations: 'Not the registered work. Cannot support any statement.',
  },
  'SRC-015': {
    qcStatus: 'replace',
    titlePageVerified: true,
    bibliographicVerified: false,
    integrityNotes:
      'NOT THE REGISTERED WORK. Three aggregator pages carrying the correct title, then 160 pages of unrelated text — project management, educational psychology, marketing. 5% domain vocabulary. A replacement copy is required.',
    limitations: 'Not the registered work. Cannot support any statement.',
  },
  'SRC-016': {
    qcStatus: 'pending',
    titlePageVerified: false,
    bibliographicVerified: false,
    integrityNotes: 'Not yet captured. No file held.',
    limitations: 'Expert commentary. Requires exact source, date and timestamp before any use.',
  },
};

interface AuditRecord {
  sourceKey: string | null;
  filename: string;
  sha256: string;
  bytes: number;
  pageCount: number | null;
}

const manifestPath = fileURLToPath(new URL('../../SOURCE_MANIFEST.json', import.meta.url));
const auditPath = fileURLToPath(new URL('../../data/private/source-audit.json', import.meta.url));

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
  project: string;
  version: string;
  sources: Record<string, unknown>[];
};

let audits: AuditRecord[] = [];
try {
  audits = (JSON.parse(readFileSync(auditPath, 'utf8')) as { audits: AuditRecord[] }).audits;
} catch {
  console.error('No audit output found. Run `npm run sources:audit` first.');
  process.exit(1);
}

const today = new Date().toISOString().slice(0, 10);
let changed = 0;

for (const source of manifest.sources) {
  const key = String(source.source_key);
  const finding = FINDINGS[key];
  if (!finding) continue;

  const audit = audits.find((a) => a.sourceKey === key);

  source.qc_status = finding.qcStatus;
  source.title_page_verified = finding.titlePageVerified;
  source.bibliographic_verified = finding.bibliographicVerified;
  source.integrity_notes = finding.integrityNotes;
  source.verified_at = today;
  source.verified_by = AUTOMATED_VERIFIER;

  if (finding.limitations !== null) source.limitations_notes = finding.limitations;
  if (finding.titlePageTitle) source.title_page_title = finding.titlePageTitle;
  if (finding.titlePageAuthors) source.title_page_authors = finding.titlePageAuthors;
  if (finding.publisher !== undefined) source.publisher = finding.publisher;
  if (finding.publicationName !== undefined) source.publication_name = finding.publicationName;
  if (finding.year !== undefined) source.year = finding.year;
  if (finding.isbn !== undefined) source.isbn = finding.isbn;
  if (finding.edition !== undefined) source.edition = finding.edition;

  if (audit) {
    source.local_file_sha256 = audit.sha256;
    source.local_file_bytes = audit.bytes;
    source.page_count = audit.pageCount;
  }

  changed += 1;
}

writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

console.log(`Updated ${String(changed)} source records in SOURCE_MANIFEST.json.\n`);
for (const [key, finding] of Object.entries(FINDINGS)) {
  console.log(`  ${key}  ${finding.qcStatus.padEnd(10)} ${finding.integrityNotes.slice(0, 68)}`);
}
