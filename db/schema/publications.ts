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
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { audience, documentStatus, publicationType, readingMode } from './enums';
import { claims } from './claims';
import { peptides } from './peptides';
import { qualityTopics } from './quality';

/**
 * A public-facing document assembled from reviewed records.
 *
 * A publication is a presentation layer, not the primary evidence store
 * (docs/DATABASE_ERD.md). Body text may orient and explain; every evidentiary
 * assertion inside it should resolve through `publication_claims` back to a
 * claim with provenance.
 */
export const publications = pgTable(
  'publications',
  {
    id: uuid().primaryKey().defaultRandom(),
    publicationKey: text().notNull().unique(),
    publicationType: publicationType().notNull(),
    title: text().notNull(),
    slug: text().notNull().unique(),
    subtitle: text(),

    audience: audience().notNull().default('both'),
    /** Null where the document serves both reading depths. */
    readingMode: readingMode(),

    /** Subject, where the publication is about one record. */
    peptideId: uuid().references(() => peptides.id, { onDelete: 'restrict' }),
    qualityTopicId: uuid().references(() => qualityTopics.id, { onDelete: 'restrict' }),

    version: integer().notNull().default(1),
    status: documentStatus().notNull().default('draft'),
    publishedAt: timestamp({ withTimezone: true }),
    lastReviewedAt: timestamp({ withTimezone: true }),
    evidenceCutoffAt: date(),
    /** Set when a newer edition replaces this one; the old version stays readable. */
    supersededByPublicationId: uuid(),

    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('publications_status_idx').on(t.status),
    index('publications_type_idx').on(t.publicationType),
    index('publications_peptide_idx').on(t.peptideId),
  ],
);

export const publicationSections = pgTable(
  'publication_sections',
  {
    id: uuid().primaryKey().defaultRandom(),
    publicationId: uuid()
      .notNull()
      .references(() => publications.id, { onDelete: 'cascade' }),
    sortOrder: integer().notNull(),
    heading: text(),
    /** Structured document body. Never raw HTML. */
    bodyStructured: jsonb().notNull().default(sql`'{}'::jsonb`),
    /** Restricts a section to one audience, e.g. a practitioner-only appendix. */
    audience: audience(),
    /** True when the section is rendered from claims rather than hand-written. */
    generatedFromClaims: boolean().notNull().default(false),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique('publication_sections_order_key').on(t.publicationId, t.sortOrder)],
);

/**
 * The join that makes "derived outputs are generated from reviewed structured
 * data, not independently rewritten copies" (MASTER_BUILD_SPEC.md §2) auditable:
 * every claim a publication rests on is recorded, so a correction to a claim can
 * flag every dependent publication for re-review.
 */
export const publicationClaims = pgTable(
  'publication_claims',
  {
    id: uuid().primaryKey().defaultRandom(),
    publicationId: uuid()
      .notNull()
      .references(() => publications.id, { onDelete: 'cascade' }),
    claimId: uuid()
      .notNull()
      .references(() => claims.id, { onDelete: 'restrict' }),
    publicationSectionId: uuid().references(() => publicationSections.id, { onDelete: 'set null' }),
    sortOrder: integer().notNull().default(0),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('publication_claims_unique').on(t.publicationId, t.claimId),
    index('publication_claims_claim_idx').on(t.claimId),
  ],
);
