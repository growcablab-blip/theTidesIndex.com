import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { protocolSourceRole, workflowStatus } from './enums';
import { peptides } from './peptides';
import { sourceLocations, sources } from './sources';
import { evidenceTypes, routes } from './taxonomy';

/**
 * A regimen exactly as one named source reported it.
 *
 * The single most important rule in the product: protocols are never merged,
 * averaged, normalised or de-duplicated across sources. Seeds' regimen,
 * LaValle's regimen and a trial schedule are three rows that sit side by side,
 * attributed, permanently. There is no synthesised "standard protocol" and
 * there will never be a table for one.
 */
export const protocols = pgTable(
  'protocols',
  {
    id: uuid().primaryKey().defaultRandom(),
    protocolKey: text().notNull().unique(),

    peptideId: uuid().references(() => peptides.id, { onDelete: 'restrict' }),
    /** For multi-compound regimens reported as a unit by the source. */
    combinationName: text(),

    /** Why the source reports this regimen: indication, goal, study endpoint. */
    objectiveContext: text().notNull(),
    /**
     * Species, model or human population. Required before publication: a rodent
     * schedule must never render as a human instruction.
     */
    populationModel: text(),
    routeKey: text().references(() => routes.key, { onUpdate: 'cascade' }),
    formulation: text(),

    // --- Dosing fields as reported --------------------------------------
    // These are the fields that simple/patient mode must never receive. They
    // are physically absent from the patient-facing view rather than hidden by
    // a conditional in a component.
    /** Verbatim as reported, e.g. "250–500 mcg". Never recalculated. */
    amountReported: text(),
    amountUnit: text(),
    frequencyText: text(),
    timingText: text(),
    durationText: text(),
    cycleText: text(),
    titrationText: text(),

    /**
     * Parsed numeric bounds, for practitioner-mode filtering and comparison
     * only. Never rendered in place of `amountReported`: the source's own
     * wording is canonical, and a null here means "not parseable", not "none".
     */
    amountMinNumeric: numeric({ precision: 14, scale: 4 }),
    amountMaxNumeric: numeric({ precision: 14, scale: 4 }),

    combinationsText: text(),
    monitoringText: text(),
    contraindicationsText: text(),
    safetyNotes: text(),
    adverseEventsText: text(),
    outcomeContext: text(),

    /**
     * Approved-label instruction, trial schedule, or practitioner practice —
     * stated explicitly so the three are never visually equivalent.
     */
    regulatoryContext: text(),

    evidenceTypeKey: text()
      .notNull()
      .references(() => evidenceTypes.key, { onUpdate: 'cascade' }),

    /**
     * Whether this protocol record may be *referenced* in patient-facing
     * context at all. Even when true, patient mode receives no dose, frequency,
     * timing, duration, cycle or titration values: that suppression is
     * structural, not a function of this flag.
     */
    patientVisibility: boolean().notNull().default(false),

    workflowStatus: workflowStatus().notNull().default('unreviewed'),
    version: integer().notNull().default(1),
    publishedAt: timestamp({ withTimezone: true }),
    lastReviewedAt: timestamp({ withTimezone: true }),

    reviewerNotes: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      'protocols_subject_present',
      sql`${t.peptideId} is not null or ${t.combinationName} is not null`,
    ),
    check(
      'protocols_amount_range_ordered',
      sql`${t.amountMinNumeric} is null or ${t.amountMaxNumeric} is null or ${t.amountMinNumeric} <= ${t.amountMaxNumeric}`,
    ),
    index('protocols_peptide_idx').on(t.peptideId),
    index('protocols_route_idx').on(t.routeKey),
    index('protocols_workflow_status_idx').on(t.workflowStatus),
    index('protocols_evidence_type_idx').on(t.evidenceTypeKey),
  ],
);

/**
 * Provenance for a protocol.
 *
 * `sourceRole` distinguishes the source that originated the regimen from one
 * repeating it and from one commenting on it, so a practitioner quoting a trial
 * is never displayed as the trial.
 */
export const protocolSources = pgTable(
  'protocol_sources',
  {
    id: uuid().primaryKey().defaultRandom(),
    protocolId: uuid()
      .notNull()
      .references(() => protocols.id, { onDelete: 'cascade' }),
    sourceId: uuid()
      .notNull()
      .references(() => sources.id, { onDelete: 'restrict' }),
    sourceLocationId: uuid().references(() => sourceLocations.id, { onDelete: 'restrict' }),
    sourceRole: protocolSourceRole().notNull().default('original'),
    notes: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('protocol_sources_protocol_idx').on(t.protocolId),
    index('protocol_sources_source_idx').on(t.sourceId),
  ],
);
