import { sql } from 'drizzle-orm';
import {
  check,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { sources } from './sources';

export const artifactKind = pgEnum('artifact_kind', [
  'publisher_version',
  'issuer_download',
  'registry_document',
  'registry_snapshot',
  'research_copy_unverified_distribution',
  'owner_transcription',
  'partial_translated_copy',
  'machine_translated_derivative',
  'index_only',
  'advertisement',
  'mislabelled_file',
  'duplicate',
  'supplementary_material',
]);

export const artifactDisposition = pgEnum('artifact_disposition', [
  'working_copy',
  'retained_reference',
  'not_retained',
  'rejected',
]);

export const artifactVerification = pgEnum('artifact_verification', [
  'matched_to_issuer',
  'title_page_verified',
  'abstract_verified_body_unverified',
  'transcription_unverified',
  'not_verified',
  'identity_refuted',
]);

/**
 * A file somebody holds, as distinct from the work it is a copy of.
 *
 * The 14 September 2026 intake is why this exists: an owner's Word transcription
 * of an article is not the article, two downloads of a USP chapter are one set
 * of bytes, and a file named for a textbook can be an advertisement. A source
 * row could say none of that. Filenames and hashes are private; the public view
 * carries only the kind of copy and how far it was verified.
 */
export const sourceArtifacts = pgTable(
  'source_artifacts',
  {
    id: uuid().primaryKey().defaultRandom(),
    artifactKey: text().notNull().unique(),
    sourceId: uuid()
      .notNull()
      .references(() => sources.id, { onDelete: 'cascade' }),

    artifactKind: artifactKind().notNull(),
    disposition: artifactDisposition().notNull(),
    verification: artifactVerification().notNull(),

    filename: text().notNull(),
    sha256: text().notNull(),
    bytes: integer(),
    pageCount: integer(),
    language: text(),

    acquiredFrom: text().notNull(),
    acquiredAt: date(),
    duplicateOfArtifactKey: text(),
    distributionProvenance: text(),
    notes: text(),
    publicNote: text(),

    version: integer().notNull().default(1),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('source_artifacts_sha256_shape', sql`${t.sha256} ~ '^[0-9a-f]{64}$'`),
    check(
      'source_artifacts_working_copy_verified',
      sql`${t.disposition} <> 'working_copy' or ${t.verification} in ('matched_to_issuer', 'title_page_verified')`,
    ),
    check(
      'source_artifacts_transcription_not_verified',
      sql`${t.artifactKind} <> 'owner_transcription' or ${t.verification} in ('transcription_unverified', 'abstract_verified_body_unverified')`,
    ),
    check(
      'source_artifacts_duplicate_names_original',
      sql`${t.artifactKind} <> 'duplicate' or ${t.duplicateOfArtifactKey} is not null or ${t.notes} is not null`,
    ),
    uniqueIndex('source_artifacts_one_working_copy')
      .on(t.sourceId)
      .where(sql`${t.disposition} = 'working_copy'`),
    index('source_artifacts_source_idx').on(t.sourceId),
  ],
);
