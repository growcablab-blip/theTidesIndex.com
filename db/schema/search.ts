import { sql } from 'drizzle-orm';
import {
  boolean,
  customType,
  index,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { evidenceClass, searchEntityType } from './enums';

const tsvector = customType<{ data: string; driverData: string }>({
  dataType: () => 'tsvector',
});

/**
 * Deterministic search index.
 *
 * Postgres full-text plus trigram fuzzy matching is the phase-one search, and
 * it stays the authority for provenance: a result always points at a real
 * record. Vector/semantic search may be layered on later as a discovery aid and
 * must never become the thing that decides what is true (CLAUDE.md).
 *
 * Rows are maintained by triggers on the underlying tables. Only records that
 * have reached `published` are indexed, so the search index cannot leak draft
 * medical content.
 */
export const searchDocuments = pgTable(
  'search_documents',
  {
    id: uuid().primaryKey().defaultRandom(),
    entityType: searchEntityType().notNull(),
    entityId: uuid().notNull(),

    /** Where the result links to. */
    slug: text().notNull(),
    title: text().notNull(),
    subtitle: text(),
    /** Aliases and alternative names, weighted as highly as the title. */
    aliasText: text(),
    /** Summary/plain-language text. Never private extracted source text. */
    bodyText: text(),

    // --- Filter facets (ACCEPTANCE_TESTS.md C) ---------------------------
    peptideId: uuid(),
    peptideSlug: text(),
    /** Evidence classes present on this record: human / preclinical / opinion. */
    evidenceClasses: evidenceClass().array(),
    routeKeys: text().array(),
    sourceTypeKeys: text().array(),
    categoryKey: text(),
    isHumanEvidence: boolean().notNull().default(false),

    searchVector: tsvector().generatedAlwaysAs(
      sql`setweight(to_tsvector('english', coalesce(title, '')), 'A')
        || setweight(to_tsvector('english', coalesce(alias_text, '')), 'A')
        || setweight(to_tsvector('english', coalesce(subtitle, '')), 'B')
        || setweight(to_tsvector('english', coalesce(body_text, '')), 'C')`,
    ),

    indexedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('search_documents_entity_key').on(t.entityType, t.entityId),
    index('search_documents_vector_idx').using('gin', t.searchVector),
    index('search_documents_title_trgm_idx').using('gin', sql`${t.title} gin_trgm_ops`),
    index('search_documents_alias_trgm_idx').using('gin', sql`${t.aliasText} gin_trgm_ops`),
    index('search_documents_entity_type_idx').on(t.entityType),
    index('search_documents_peptide_idx').on(t.peptideId),
  ],
);
