/**
 * Registers the Jean-Francois Tremblay / CanLab collection in SOURCE_MANIFEST.json.
 *
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/sources/register-tremblay-collection.ts
 *
 * Idempotent: re-running updates the records in place rather than appending
 * duplicates, so the manifest can be regenerated after an edit.
 *
 * WHAT THIS DOES NOT DO
 *
 * It registers no evidence. Every record it writes carries
 * `access_status: 'public_not_yet_retrieved'`, because that is what these are:
 * publicly published podcast and video appearances that this index has not
 * obtained. The manifest schema states the rule they fall under — nothing may
 * rest on a source this index cannot open — and nothing does. No claim, no
 * protocol and no locator cites any of them.
 *
 * What the registration buys is precision. SRC-016 was one placeholder reading
 * "Tremblay / CanLab Source Dossier", which named nothing anybody could go and
 * find. These are twenty-three individually identified artifacts with dates,
 * durations, hosts and URLs, three of which have full public transcripts — so
 * the next person can acquire one and start citing it the same day.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

interface ManifestSource {
  source_key: string;
  [field: string]: unknown;
}

const manifestPath = fileURLToPath(new URL('../../SOURCE_MANIFEST.json', import.meta.url));
const dataPath = fileURLToPath(new URL('./tremblay-collection.json', import.meta.url));

/** Carried on every record. The speaker sells what he is describing. */
const CONFLICT_NOTE =
  'Commercial conflict of interest, and a regulatory history, on every record in this collection: ' +
  'the speaker is the founder and owner of CanLab (also CanLab Sciences, Canlab Research), a peptide ' +
  'vendor. Health Canada issued a public advisory against Canlab Research on 13 December 2023, and ' +
  'the Superior Court of Quebec granted a permanent injunction on 11 June 2026, announced 29 July ' +
  '2026, under which the company cannot manufacture, test, distribute or sell unauthorised injectable ' +
  'peptides. No public document located names the speaker personally, so he is not described as ' +
  'personally enjoined. None of this decides whether any individual statement is right; it is context ' +
  'a reader is entitled to have.';

const LIMITATIONS =
  'Expert commentary by a practitioner who is also a vendor. Not a clinical trial, not primary ' +
  'evidence, not a regulatory authority and not a Tides position. Credentials are unverified and ' +
  'inconsistent across appearances; the speaker disclaims holding a doctorate on air in the Greenfield ' +
  'episode, so the title "Dr." must never be displayed. Nothing from this source may be cited until a ' +
  'recording or transcript is held and the exact timestamp can be resolved against it.';

type Row = [
  title: string,
  program: string,
  host: string,
  date: string | null,
  year: number | null,
  duration: string | null,
  url: string,
  notes: string,
];

const rows = JSON.parse(readFileSync(dataPath, 'utf8')) as Row[];
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
  sources: ManifestSource[];
  [field: string]: unknown;
};

/** Keys are allocated from 201 upwards; 001-200 are already in use. */
const FIRST_KEY = 201;

function buildRecord(row: Row, index: number): ManifestSource {
  const [title, program, host, date, year, duration, url, notes] = row;
  const isVideo = url.includes('youtube.com');
  return {
    source_key: `SRC-${String(FIRST_KEY + index).padStart(3, '0')}`,
    title,
    authors: ['Jean-Francois Tremblay (speaker)', `${host} (host)`],
    year,
    source_type: 'expert_interview',
    publisher: program,
    publication_name: program,
    priority: 'supporting',
    qc_status: 'pending',
    canonical_filename: null,
    known_local_filename: null,
    primary_role:
      `Practitioner and vendor commentary on peptide use, recorded as ${isVideo ? 'video' : 'audio'}. ` +
      'Identified as part of the Tremblay / CanLab collection (SRC-016); not obtained.',
    public_fulltext_allowed: false,
    authority_notes: CONFLICT_NOTE,
    limitations_notes: LIMITATIONS,
    isbn: null,
    edition: null,
    local_file_sha256: null,
    local_file_bytes: null,
    page_count: null,
    printed_page_offset: null,
    access_status: 'public_not_yet_retrieved',
    access_notes:
      `${date === null ? 'Date not established.' : `Published ${date}.`}` +
      `${duration === null ? ' Duration not established.' : ` Runs ${duration}.`}` +
      ` ${notes}` +
      ' Bibliographic details are taken from the extraction record described in' +
      ' docs/TREMBLAY_ARCHIVE_INVENTORY.md and have not been independently verified against the' +
      ' publisher. Nothing in this index cites this source.',
    replaces_source_key: null,
    title_page_verified: false,
    bibliographic_verified: false,
    title_page_title: null,
    title_page_authors: null,
    integrity_notes:
      'Not held. No recording, transcript or caption file has been obtained, so no locator can be' +
      ' resolved and no claim rests on it.',
    verified_at: '2026-09-26',
    verified_by:
      'Section 5 archive review. Registered from a held extraction record, not from the artifact' +
      ' itself; see docs/TREMBLAY_ARCHIVE_INVENTORY.md.',
    doi: null,
    pmid: null,
    trial_registry_id: null,
    canonical_url: url,
  };
}

const records = rows.map(buildRecord);

// SRC-016 stops being a placeholder and becomes what it should always have
// been: the record of the collection, pointing at the artifacts inside it.
const collection = manifest.sources.find((s) => s.source_key === 'SRC-016');
if (collection === undefined) throw new Error('SRC-016 is missing from the manifest.');

collection.title = 'Jean-Francois Tremblay / CanLab public appearances (collection record)';
collection.authors = ['Jean-Francois Tremblay (speaker)'];
collection.primary_role =
  'The collection record for this speaker. Individual appearances are registered separately as' +
  ` ${records[0]!.source_key}-${records[records.length - 1]!.source_key}; this record exists so that` +
  ' the collection has an identity and so that its conflict-of-interest and regulatory context is' +
  ' stated once, authoritatively.';
collection.authority_notes = CONFLICT_NOTE;
collection.limitations_notes = LIMITATIONS;
collection.access_status = 'unavailable';
collection.access_notes =
  `The collection comprises ${String(records.length)} individually identified appearances — nineteen` +
  ' podcast episodes and four videos, January 2018 to September 2026 — of which none is held.' +
  ' Three have full public transcripts and are the acquisition targets that would unblock citation.' +
  ' No peer-reviewed publication, patent, thesis or registered trial by this speaker on peptides has' +
  ' been identified. See docs/TREMBLAY_ARCHIVE_INVENTORY.md for the inventory and' +
  ' docs/V1_SECTION_5_TREMBLAY_INGESTION_REPORT.md for what the collection would add if obtained.';
collection.integrity_notes =
  'The archive supplied for Section 5 contained no Tremblay artifact: it held a derived extraction' +
  ' record about these appearances and a rendering of part of it, not the appearances themselves.' +
  ' Nothing is cited from this collection.';
collection.verified_at = '2026-09-26';
collection.verified_by = 'Section 5 archive review.';

const existing = new Map(manifest.sources.map((s) => [s.source_key, s]));
let added = 0;
let updated = 0;
for (const record of records) {
  if (existing.has(record.source_key)) {
    Object.assign(existing.get(record.source_key)!, record);
    updated += 1;
  } else {
    manifest.sources.push(record);
    added += 1;
  }
}

manifest.sources.sort((a, b) => a.source_key.localeCompare(b.source_key));
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

console.log(`\n  TREMBLAY COLLECTION REGISTRATION\n`);
console.log(`  SRC-016 rewritten as the collection record.`);
console.log(`  ${String(added)} source(s) added, ${String(updated)} updated.`);
console.log(`  Manifest now holds ${String(manifest.sources.length)} sources.`);
console.log(`\n  None is held. Nothing cites any of them.\n`);
