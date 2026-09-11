import { boolean, integer, pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core';
import { evidenceClass } from './enums';

/**
 * Reference tables for the controlled vocabularies that need display labels and
 * queryable attributes. Rows are seeded from data/seed/evidence_taxonomy.json
 * and EVIDENCE_MODEL.md; adding a vocabulary term is a data change, not a
 * migration, but every referencing row is still foreign-key constrained so a
 * typo cannot invent a new evidence class.
 */

/** What kind of document, person, or body produced the source. */
export const sourceTypes = pgTable('source_types', {
  key: text().primaryKey(),
  publicLabel: text().notNull(),
  description: text(),
  /**
   * The evidence class a source of this kind *typically* yields. Advisory only:
   * the evidence class of a specific claim always comes from its own
   * evidence_type, never from the source type. A textbook can report an RCT.
   */
  typicalEvidenceClass: evidenceClass(),
  sortOrder: integer().notNull().default(0),
  isActive: boolean().notNull().default(true),
});

/**
 * What kind of evidence a specific claim or protocol rests on.
 *
 * `evidenceClass` and `isHumanEvidence` are what make ACCEPTANCE_TESTS.md C
 * ("filter human vs preclinical vs practitioner") a database query rather than
 * a hand-maintained list in application code.
 */
export const evidenceTypes = pgTable(
  'evidence_types',
  {
    key: text().primaryKey(),
    publicLabel: text().notNull(),
    description: text(),
    evidenceClass: evidenceClass().notNull(),
    /** True only for evidence generated in humans. Never inferred. */
    isHumanEvidence: boolean().notNull(),
    /**
     * True where the evidence is a person's interpretation or practice rather
     * than a study result. Drives "LaValle describes…" style attribution.
     */
    isInterpretive: boolean().notNull().default(false),
    sortOrder: integer().notNull().default(0),
    isActive: boolean().notNull().default(true),
  },
  (t) => [uniqueIndex('evidence_types_public_label_key').on(t.publicLabel)],
);

/** Administration route ontology (MASTER_BUILD_SPEC.md §9). */
export const routes = pgTable('routes', {
  key: text().primaryKey(),
  name: text().notNull(),
  slug: text().notNull().unique(),
  descriptionSimple: text(),
  descriptionPractitioner: text(),
  /**
   * Route-level caveats. Deliberately separate from peptide_routes: a general
   * statement about a route must never be read as a claim about a molecule.
   */
  generalLimitations: text(),
  sortOrder: integer().notNull().default(0),
  isActive: boolean().notNull().default(true),
});

/**
 * Compound class. `isPeptide` matters editorially: the master index contains
 * MK-677 and 5-Amino-1MQ, which are small molecules, and the platform must not
 * present them as peptides.
 */
export const compoundTypes = pgTable('compound_types', {
  key: text().primaryKey(),
  label: text().notNull(),
  description: text(),
  isPeptide: boolean().notNull(),
  sortOrder: integer().notNull().default(0),
});

/** Broad functional grouping used for browsing, not for clinical inference. */
export const compoundCategories = pgTable('compound_categories', {
  key: text().primaryKey(),
  label: text().notNull(),
  description: text(),
  sortOrder: integer().notNull().default(0),
});
