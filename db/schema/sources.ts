import { sql } from 'drizzle-orm';
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { sourceQcStatus } from './enums';
import { sourceTypes } from './taxonomy';

/**
 * A source is any external authority or input: a regulatory label, a journal
 * article, a textbook, a practitioner handbook, an interview, a quality
 * document. Source files themselves stay private (INGESTION_RULES.md); this
 * table holds bibliographic metadata, which is what the public sources index
 * exposes.
 */
export const sources = pgTable(
  'sources',
  {
    id: uuid().primaryKey().defaultRandom(),
    /** Stable human-readable key, e.g. SRC-001. */
    sourceKey: text().notNull().unique(),
    title: text().notNull(),
    sourceTypeKey: text()
      .notNull()
      .references(() => sourceTypes.key, { onUpdate: 'cascade' }),

    /** Ordered author/editor list. Free-form by necessity across source kinds. */
    authors: jsonb().notNull().default(sql`'[]'::jsonb`),
    publisher: text(),
    /** Journal, channel, conference or series name. */
    publicationName: text(),
    publicationDate: date(),
    year: integer(),
    edition: text(),

    doi: text(),
    pmid: text(),
    trialRegistryId: text(),
    isbn: text(),
    canonicalUrl: text(),

    /**
     * Quality-control state of the copy actually held. Sources marked `replace`
     * or `exclude` are not authoritative and the publish gates refuse to accept
     * them as provenance (ACCEPTANCE_TESTS.md A.4).
     */
    qcStatus: sourceQcStatus().notNull().default('pending'),
    /**
     * Generated, not writable: citability follows directly from QC state so it
     * cannot drift. Referenced by the publish-gate triggers.
     */
    isCitable: boolean()
      .notNull()
      .generatedAlwaysAs(sql`qc_status not in ('replace', 'exclude')`),

    // --- File identity ---------------------------------------------------
    // The chain this section exists to establish:
    //   file identity -> bibliographic identity -> QC status -> citability
    // Third-party filenames are not bibliographic authority. SRC-011 nearly
    // entered the register under the wrong editor because an aggregator's
    // filename named a chapter author (verification issue V-014).
    /**
     * Filename of the private local copy. Never served, never rewritten, never
     * placed under a public directory.
     */
    localPrivateFilename: text(),
    /** The name this copy should be filed under once verified. */
    canonicalFilename: text(),
    /** SHA-256 of the private copy, so a silently swapped file is detectable. */
    localFileSha256: text(),
    localFileBytes: integer(),
    pageCount: integer(),

    // --- Verification ----------------------------------------------------
    /** Someone opened the copy and read its title page. */
    titlePageVerified: boolean().notNull().default(false),
    /** The registry's bibliographic fields were confirmed against the work. */
    bibliographicVerified: boolean().notNull().default(false),
    /** What the title page actually says, where it differs from the registry. */
    titlePageTitle: text(),
    titlePageAuthors: text(),
    verifiedAt: date(),
    /** Who or what performed the verification. A tool name, or a person. */
    verifiedBy: text(),

    /** Wrapper pages, contaminated ranges, truncation — what is wrong with it. */
    integrityNotes: text(),

    /** What this source can legitimately support, and what it cannot. */
    primaryRole: text(),
    coverageNotes: text(),
    authorityNotes: text(),
    limitationsNotes: text(),

    copyrightAccessNotes: text(),
    /**
     * Whether the full text may be published. False for every copyrighted book
     * in the current archive. Guarded by a check constraint in hand-written SQL.
     */
    publicFulltextAllowed: boolean().notNull().default(false),

    sourceSummary: text(),
    /** Marks a record created by the local demonstration fixture. See profiles. */
    isDemonstration: boolean().notNull().default(false),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('sources_source_type_idx').on(t.sourceTypeKey),
    index('sources_qc_status_idx').on(t.qcStatus),
    index('sources_title_trgm_idx').using('gin', sql`${t.title} gin_trgm_ops`),
  ],
);

/**
 * A precise position inside a source: page range, chapter, section, figure,
 * table, or media timestamp. First-class because "cite the source" is not good
 * enough — a published claim must resolve to a location a reviewer can open.
 */
export const sourceLocations = pgTable(
  'source_locations',
  {
    id: uuid().primaryKey().defaultRandom(),
    sourceId: uuid()
      .notNull()
      .references(() => sources.id, { onDelete: 'cascade' }),

    pageStart: integer(),
    pageEnd: integer(),
    chapter: text(),
    section: text(),
    figure: text(),
    tableNumber: text(),
    /** For interviews, podcasts and video sources. */
    timestampStartSeconds: integer(),
    timestampEndSeconds: integer(),
    /** URL fragment or anchor for web sources. */
    urlFragment: text(),

    /** Human-readable locator as it should be rendered, e.g. "pp. 19–24". */
    locatorText: text(),
    notes: text(),

    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('source_locations_source_idx').on(t.sourceId)],
);
