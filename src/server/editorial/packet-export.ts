import { sql } from 'drizzle-orm';
import type { Database } from '../db/types';
import { readQualityTopicReviewPacket, type ReviewPacket } from './review-packet';

/**
 * The review packet as a document a reviewer can be sent.
 *
 * A reviewer with standing in this field is a person with a calendar, not an
 * account. The screen version assumes they will work inside the application;
 * the realistic first review is somebody reading a document, marking it up, and
 * sending back prose. That is worth supporting properly rather than badly.
 *
 * Three constraints shape everything here.
 *
 * **It cannot carry the sources.** The held files are third-party copyrighted
 * works and this index does not redistribute them. So the export carries
 * locators — the work's own printed pages — and a list of what the reviewer
 * needs in front of them. That is a genuine limitation of the document and it
 * is stated on the document rather than hidden by it.
 *
 * **It cannot carry private file identity.** `local_private_filename` and
 * `local_file_sha256` describe this index's copy, are of no use to a reviewer,
 * and would be a standing invitation to ask for the file. Source fields are
 * selected by an allowlist below rather than filtered out afterwards, so a
 * column added later is absent by default rather than leaked by default.
 *
 * **It cannot be an approval.** A signed PDF is not a review record. An
 * approval is a row bound to a version, written by an identified person through
 * the application; a document coming back by email is *input to* that, and the
 * export says so in the one place a reviewer will certainly read.
 */

/** Stated on the document, and asserted in `tests/integration/packet-export.test.ts`. */
export const EXPORT_IS_NOT_AN_APPROVAL =
  'This document cannot record a review. Returning it — signed, annotated or ' +
  'approved in any form — does not approve anything and does not change the ' +
  'state of any record. A review exists only as an entry made through the ' +
  'application against the version named above, by the reviewer themselves.';

/**
 * The source fields a reviewer may be shown.
 *
 * Bibliographic identity, the state of the copy this index holds, and how to
 * reach it. Nothing about where the file sits or what it hashes to.
 */
const SOURCE_FIELDS = [
  'source_key',
  'title',
  'authors',
  'publisher',
  'publication_name',
  'year',
  'edition',
  'doi',
  'pmid',
  'isbn',
  'canonical_url',
  'qc_status',
  'is_citable',
  'access_status',
  /*
   * `access_notes` is deliberately absent. It is an internal register
   * annotation — the copy held for SRC-006 carries "acquired before the C.5
   * access-status field existed; provenance recorded in integrity_notes",
   * which names a build phase and a database column. Found by reading the
   * rendered document. The reviewer gets `accessSentence()` instead, which is
   * derived from the status and written for them.
   */
  'printed_page_offset',
] as const;

export interface ExportedSource {
  readonly sourceKey: string;
  readonly title: string;
  readonly authors: readonly string[];
  readonly publisher: string | null;
  readonly publicationName: string | null;
  readonly year: number | null;
  readonly edition: string | null;
  readonly doi: string | null;
  readonly pmid: string | null;
  readonly isbn: string | null;
  readonly canonicalUrl: string | null;
  readonly sourceTypeLabel: string;
  readonly qcStatus: string;
  readonly isCitable: boolean;
  readonly accessStatus: string;
  /** Printed page + offset = page of the copy this index holds. */
  readonly printedPageOffset: number | null;
  /** Every locator in this packet that lands in this source, in page order. */
  readonly locatorsUsed: readonly string[];
  /** The claims resting on it, so a reviewer can plan which sources to obtain. */
  readonly claimKeys: readonly string[];
}

export interface ExportedPacket {
  /** Identifies this document, and the exact version it describes. */
  readonly documentId: string;
  readonly topicName: string;
  readonly qualityKey: string;
  readonly slug: string;
  readonly version: number;
  readonly reviewState: string;
  readonly publicationState: string;
  /** ISO instant the document was produced. A packet is a snapshot, not a page. */
  readonly issuedAt: string;
  readonly packet: ReviewPacket;
  readonly sources: readonly ExportedSource[];
  /** What this document deliberately does not contain, and why. */
  readonly omissions: readonly string[];
}

/** Deterministic given the topic, its version, and the day it was issued. */
export function exportDocumentId(qualityKey: string, version: number, issuedAt: string): string {
  const day = issuedAt.slice(0, 10).replaceAll('-', '');
  return `RP-${qualityKey.toUpperCase()}-v${String(version)}-${day}`;
}

export async function buildPacketExport(
  tx: Database,
  topicId: string,
  options: { readonly issuedAt?: string } = {},
): Promise<ExportedPacket | null> {
  const topicRows = rows<Record<string, unknown>>(
    await tx.execute(sql`
      select name, slug, quality_key, version, review_state, publication_state
      from quality_topics where id = ${topicId}
    `),
  );
  const topic = topicRows[0];
  if (topic === undefined) return null;

  const packet = await readQualityTopicReviewPacket(tx, topicId);
  const issuedAt = options.issuedAt ?? new Date().toISOString();
  const version = Number(topic.version);
  const qualityKey = String(topic.quality_key);

  return {
    documentId: exportDocumentId(qualityKey, version, issuedAt),
    topicName: String(topic.name),
    qualityKey,
    slug: String(topic.slug),
    version,
    reviewState: String(topic.review_state),
    publicationState: String(topic.publication_state),
    issuedAt,
    packet,
    sources: await sourcesFor(tx, topicId),
    omissions: OMISSIONS,
  };
}

/**
 * What is absent, named.
 *
 * A reviewer who does not know a document is incomplete will read it as
 * complete. Each line is something a reader might otherwise assume is here.
 */
const OMISSIONS: readonly string[] = [
  'The source documents themselves. They are third-party copyrighted works and ' +
    'this index does not redistribute them. Locators below cite each work’s own ' +
    'printed pages so they can be checked against any copy.',
  'Quoted passages beyond the locator. The index records where a statement was ' +
    'read, not a transcription of it, so the reading below has to be checked ' +
    'against the source rather than against this document.',
  'Any way to record a decision. See the notice at the head of this document.',
  'Anything about the private copies this index holds — filenames, checksums, ' +
    'storage. Not useful to a reviewer, and not a reviewer’s to hold.',
];

async function sourcesFor(tx: Database, topicId: string): Promise<ExportedSource[]> {
  const selected = SOURCE_FIELDS.map((f) => `s.${f}`).join(', ');
  const result = await tx.execute(sql`
    select ${sql.raw(selected)}, st.public_label as source_type_label,
           l.locator_text, l.page_start, c.claim_key
    from claim_evidence e
    join claims c on c.id = e.claim_id
    join sources s on s.id = e.source_id
    join source_types st on st.key = s.source_type_key
    left join source_locations l on l.id = e.source_location_id
    where c.quality_topic_id = ${topicId}
    order by s.source_key, l.page_start nulls last, c.claim_key
  `);

  const bySource = new Map<string, ExportedSource>();
  for (const r of rows<Record<string, unknown>>(result)) {
    const key = String(r.source_key);
    const existing = bySource.get(key);
    const locator = str(r.locator_text);
    const claimKey = String(r.claim_key);

    if (existing === undefined) {
      bySource.set(key, {
        sourceKey: key,
        title: String(r.title),
        authors: Array.isArray(r.authors) ? r.authors.map(String) : [],
        publisher: str(r.publisher),
        publicationName: str(r.publication_name),
        year: r.year === null ? null : Number(r.year),
        edition: str(r.edition),
        doi: str(r.doi),
        pmid: str(r.pmid),
        isbn: str(r.isbn),
        canonicalUrl: str(r.canonical_url),
        sourceTypeLabel: String(r.source_type_label),
        qcStatus: String(r.qc_status),
        isCitable: Boolean(r.is_citable),
        accessStatus: String(r.access_status),
        printedPageOffset: r.printed_page_offset === null ? null : Number(r.printed_page_offset),
        locatorsUsed: locator === null ? [] : [locator],
        claimKeys: [claimKey],
      });
      continue;
    }

    bySource.set(key, {
      ...existing,
      locatorsUsed:
        locator === null || existing.locatorsUsed.includes(locator)
          ? existing.locatorsUsed
          : [...existing.locatorsUsed, locator],
      claimKeys: existing.claimKeys.includes(claimKey)
        ? existing.claimKeys
        : [...existing.claimKeys, claimKey],
    });
  }

  // Locators stay in page order — that is a reading order. Claim keys are an
  // index and are sorted, because page order scatters them (001, 002, 005, 006,
  // 007, 003, 004) and a reviewer reads that as noise rather than as an order.
  return [...bySource.values()].map((source) => ({
    ...source,
    claimKeys: [...source.claimKeys].sort(),
  }));
}

function rows<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (result && typeof result === 'object' && Array.isArray((result as { rows?: unknown }).rows)) {
    return (result as { rows: T[] }).rows;
  }
  return [];
}

function str(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}
