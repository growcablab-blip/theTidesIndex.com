import { randomUUID } from 'node:crypto';
import { query, type TestDb } from './test-db';

/**
 * Fixture builders for the editorial workflow.
 *
 * Deliberately low-level: tests exercise the database's own rules, so records
 * are created with direct SQL rather than through a service layer that could
 * mask what the database is or is not enforcing.
 */

export interface Staff {
  admin: string;
  editor: string;
  scientific: string;
  clinical: string;
  compliance: string;
}

export async function createStaff(db: TestDb): Promise<Staff> {
  const staff: Staff = {
    admin: randomUUID(),
    editor: randomUUID(),
    scientific: randomUUID(),
    clinical: randomUUID(),
    compliance: randomUUID(),
  };

  const rows: [string, string, string][] = [
    [staff.admin, 'Test Admin', 'admin'],
    [staff.editor, 'Test Editor', 'editor'],
    [staff.scientific, 'Test Scientific Reviewer', 'scientific_reviewer'],
    [staff.clinical, 'Test Clinical Reviewer', 'clinical_reviewer'],
    [staff.compliance, 'Test Compliance Reviewer', 'compliance_reviewer'],
  ];

  for (const [id, name, role] of rows) {
    await query(
      db,
      `insert into profiles (user_id, display_name, role) values ($1, $2, $3::staff_role)`,
      [id, name, role],
    );
  }

  return staff;
}

export async function createSource(
  db: TestDb,
  options: { key: string; title: string; sourceType: string; qcStatus?: string },
): Promise<string> {
  const [row] = await query<{ id: string }>(
    db,
    `insert into sources (source_key, title, source_type_key, qc_status)
     values ($1, $2, $3, $4::source_qc_status) returning id`,
    [options.key, options.title, options.sourceType, options.qcStatus ?? 'usable'],
  );
  return row!.id;
}

export async function createSourceLocation(
  db: TestDb,
  sourceId: string,
  locatorText: string,
): Promise<string> {
  const [row] = await query<{ id: string }>(
    db,
    `insert into source_locations (source_id, locator_text) values ($1, $2) returning id`,
    [sourceId, locatorText],
  );
  return row!.id;
}

export async function createPeptide(
  db: TestDb,
  options: { key: string; name: string; slug: string },
): Promise<string> {
  const [row] = await query<{ id: string }>(
    db,
    `insert into peptides (peptide_key, canonical_name, slug, compound_type_key, primary_category_key)
     values ($1, $2, $3, 'peptide', 'repair-recovery') returning id`,
    [options.key, options.name, options.slug],
  );
  return row!.id;
}

export async function createClaim(
  db: TestDb,
  options: {
    key: string;
    peptideId: string;
    text: string;
    importance?: string;
    interpretationNotes?: string | null;
    uncertaintyText?: string | null;
  },
): Promise<string> {
  const [row] = await query<{ id: string }>(
    db,
    `insert into claims (claim_key, peptide_id, claim_text, importance, interpretation_notes, uncertainty_text)
     values ($1, $2, $3, $4::claim_importance, $5, $6) returning id`,
    [
      options.key,
      options.peptideId,
      options.text,
      options.importance ?? 'medium',
      options.interpretationNotes === undefined
        ? 'Reviewed reading of the cited passage.'
        : options.interpretationNotes,
      options.uncertaintyText ?? null,
    ],
  );
  return row!.id;
}

export async function attachClaimEvidence(
  db: TestDb,
  options: {
    claimId: string;
    sourceId: string;
    sourceLocationId: string | null;
    evidenceType: string;
  },
): Promise<string> {
  const [row] = await query<{ id: string }>(
    db,
    `insert into claim_evidence (claim_id, source_id, source_location_id, evidence_type_key)
     values ($1, $2, $3, $4) returning id`,
    [options.claimId, options.sourceId, options.sourceLocationId, options.evidenceType],
  );
  return row!.id;
}

export async function createProtocol(
  db: TestDb,
  options: {
    key: string;
    peptideId: string;
    objectiveContext: string;
    populationModel?: string | null;
    routeKey?: string | null;
    regulatoryContext?: string | null;
    evidenceType?: string;
    amountReported?: string | null;
    frequencyText?: string | null;
    patientVisibility?: boolean;
  },
): Promise<string> {
  const [row] = await query<{ id: string }>(
    db,
    `insert into protocols (
       protocol_key, peptide_id, objective_context, population_model, route_key,
       regulatory_context, evidence_type_key, amount_reported, frequency_text, patient_visibility
     ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) returning id`,
    [
      options.key,
      options.peptideId,
      options.objectiveContext,
      options.populationModel === undefined
        ? 'Adult human, as described by the source'
        : options.populationModel,
      options.routeKey === undefined ? 'subcutaneous' : options.routeKey,
      options.regulatoryContext === undefined
        ? 'Practitioner-described regimen. Not approved labelling.'
        : options.regulatoryContext,
      options.evidenceType ?? 'practitioner_reference',
      options.amountReported ?? null,
      options.frequencyText ?? null,
      options.patientVisibility ?? false,
    ],
  );
  return row!.id;
}

export async function attachProtocolSource(
  db: TestDb,
  options: {
    protocolId: string;
    sourceId: string;
    sourceLocationId: string | null;
    role?: string;
  },
): Promise<string> {
  const [row] = await query<{ id: string }>(
    db,
    `insert into protocol_sources (protocol_id, source_id, source_location_id, source_role)
     values ($1, $2, $3, $4::protocol_source_role) returning id`,
    [
      options.protocolId,
      options.sourceId,
      options.sourceLocationId,
      options.role ?? 'original',
    ],
  );
  return row!.id;
}

/** Records an approved review at the record's current version. */
export async function approve(
  db: TestDb,
  options: {
    entityType: string;
    entityId: string;
    reviewType: string;
    reviewerId: string;
    table: string;
    /** Defaults to an approval; a change request is recorded the same way. */
    outcome?: 'approved' | 'changes_requested' | 'rejected';
    comments?: string;
  },
): Promise<void> {
  const [row] = await query<{ version: number }>(
    db,
    `select version from ${options.table} where id = $1`,
    [options.entityId],
  );

  await query(
    db,
    `insert into reviews (entity_type, entity_id, entity_version, review_type,
                          performed_by, reviewer_user_id, outcome, comments)
     values ($1::reviewable_entity_type, $2, $3, $4::review_type, 'human', $5,
             $6::review_outcome, $7)`,
    [
      options.entityType,
      options.entityId,
      row!.version,
      options.reviewType,
      options.reviewerId,
      options.outcome ?? 'approved',
      options.comments ?? null,
    ],
  );
}

/** Publishes directly, exercising the coherence trigger and the publish gate. */
export async function setPublicationState(
  db: TestDb,
  table: string,
  id: string,
  state: 'unpublished' | 'published' | 'withdrawn' | 'superseded',
): Promise<void> {
  await query(
    db,
    `update ${table} set publication_state = $1::publication_state_value where id = $2`,
    [state, id],
  );
}

export async function setReviewState(
  db: TestDb,
  table: string,
  id: string,
  state: string,
): Promise<void> {
  await query(db, `update ${table} set review_state = $1::review_state where id = $2`, [state, id]);
}

/**
 * Reads the verification state, which is maintained by trigger from the reviews
 * that exist rather than written by hand.
 */
export async function getReviewState(db: TestDb, table: string, id: string): Promise<string> {
  const [row] = await query<{ review_state: string }>(
    db,
    `select review_state from ${table} where id = $1`,
    [id],
  );
  return row?.review_state ?? 'unknown';
}

/** Approves every review type a claim needs, then publishes it. */
export async function publishClaim(db: TestDb, claimId: string, staff: Staff): Promise<void> {
  await approve(db, {
    entityType: 'claim',
    entityId: claimId,
    reviewType: 'source_check',
    reviewerId: staff.editor,
    table: 'claims',
  });
  await approve(db, {
    entityType: 'claim',
    entityId: claimId,
    reviewType: 'scientific',
    reviewerId: staff.scientific,
    table: 'claims',
  });
  await approve(db, {
    entityType: 'claim',
    entityId: claimId,
    reviewType: 'compliance',
    reviewerId: staff.compliance,
    table: 'claims',
  });
  await setPublicationState(db, 'claims', claimId, 'published');
}

/** Approves every review type a protocol needs, then publishes it. */
export async function publishProtocol(
  db: TestDb,
  protocolId: string,
  staff: Staff,
): Promise<void> {
  for (const [reviewType, reviewerId] of [
    ['source_check', staff.editor],
    ['scientific', staff.scientific],
    ['clinical', staff.clinical],
    ['compliance', staff.compliance],
  ] as const) {
    await approve(db, {
      entityType: 'protocol',
      entityId: protocolId,
      reviewType,
      reviewerId,
      table: 'protocols',
    });
  }
  await setPublicationState(db, 'protocols', protocolId, 'published');
}
