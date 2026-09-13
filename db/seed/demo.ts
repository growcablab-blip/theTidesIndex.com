import { sql } from 'drizzle-orm';
import type { SeedDb } from './index';

/**
 * A demonstration dataset.
 *
 * Purpose: exercise every component of the reference experience — evidence
 * cards, contradicting evidence, route records, regulatory status, two
 * unmerged protocols, a recorded disagreement, citations, review state — with
 * data flowing through the real publish gates.
 *
 * It does **not** touch any real compound. Every record here belongs to a
 * compound and sources that announce themselves as demonstrations in their own
 * names, and none of it makes a claim about any actual molecule.
 *
 * That separation is the point. The instruction was to prove the system, not to
 * publish clinical content, and the surest way to honour both halves is to put
 * the demonstration somewhere no reader could mistake for a finding. BPC-157
 * and the rest of the cohort stay exactly as they are: registered, in
 * preparation, with nothing asserted about them.
 *
 * Guarded by `TIDES_ALLOW_DEMO_DATA=1` and refused against a non-local
 * database. Never run in production.
 */

const DEMO_PEPTIDE_KEY = 'demo-compound';
const DEMO_SOURCE_A = 'SRC-DEMO-A';
const DEMO_SOURCE_B = 'SRC-DEMO-B';

export interface DemoResult {
  readonly peptideSlug: string;
  readonly qualityTopicSlug: string;
}

/**
 * Publishing requires reviews attributable to real staff rows, and the review
 * roles are separated so that no single account can sign every gate. The
 * demonstration therefore creates a small editorial team rather than
 * side-stepping the rule — which also proves the rule holds.
 */
async function ensureDemoStaff(db: SeedDb, demo: boolean): Promise<Record<string, string>> {
  const people: [string, string, string][] = [
    ['11111111-1111-4111-8111-111111111101', 'Demo Editor', 'editor'],
    ['11111111-1111-4111-8111-111111111102', 'Demo Scientific Reviewer', 'scientific_reviewer'],
    ['11111111-1111-4111-8111-111111111103', 'Demo Clinical Reviewer', 'clinical_reviewer'],
    ['11111111-1111-4111-8111-111111111104', 'Demo Compliance Reviewer', 'compliance_reviewer'],
  ];

  for (const [id, name, role] of people) {
    await db.execute(sql`
      insert into profiles (user_id, display_name, role, is_demonstration)
      values (${id}, ${name}, ${role}::staff_role, ${demo})
      on conflict (user_id) do update set display_name = excluded.display_name,
                                          is_demonstration = ${demo}
    `);
  }

  return {
    editor: people[0]![0],
    scientific: people[1]![0],
    clinical: people[2]![0],
    compliance: people[3]![0],
  };
}

async function approve(
  db: SeedDb,
  entityType: string,
  entityId: string,
  reviewType: string,
  reviewerId: string,
  table: string,
): Promise<void> {
  const result = await db.execute(
    sql`select version from ${sql.raw(table)} where id = ${entityId}`,
  );
  const rows = Array.isArray(result) ? result : ((result as { rows?: unknown[] }).rows ?? []);
  const version = (rows[0] as { version?: number } | undefined)?.version ?? 1;

  await db.execute(sql`
    insert into reviews (entity_type, entity_id, entity_version, review_type,
                         performed_by, reviewer_user_id, outcome, comments)
    values (${entityType}::reviewable_entity_type, ${entityId}, ${version},
            ${reviewType}::review_type, 'human', ${reviewerId}, 'approved',
            'Demonstration approval. Not a real review of real content.')
  `);
}

async function scalar<T>(db: SeedDb, query: ReturnType<typeof sql>): Promise<T | undefined> {
  const result = await db.execute(query);
  const rows = Array.isArray(result) ? result : ((result as { rows?: unknown[] }).rows ?? []);
  return rows[0] as T | undefined;
}

export interface DemoOptions {
  /**
   * Whether the records are flagged as demonstration fixtures. Default true.
   *
   * The flag is what keeps these out of production and out of every public
   * view, and it should almost never be turned off. The exception is the
   * reading-mode suite, which needs a *published* record to prove that a dose
   * cannot reach a patient payload — a property about publication, not about
   * fixtures. With the flag set the record is correctly invisible to the public
   * reader it is testing, and clearing it afterwards is not an option: that is
   * a column change, so the touch trigger bumps the version, the approvals are
   * stranded, and the gate withdraws the record. Which is the machinery working.
   *
   * So the choice is made at creation, explicitly, by the one caller that needs
   * it. `npm run db:demo` and `npm run tides` never pass it.
   */
  readonly markAsDemonstration?: boolean;
}

export async function seedDemoData(
  db: SeedDb,
  options: DemoOptions = {},
): Promise<DemoResult> {
  const demo = options.markAsDemonstration ?? true;
  const staff = await ensureDemoStaff(db, demo);

  // --- Sources ------------------------------------------------------------
  const sourceA = await scalar<{ id: string }>(
    db,
    sql`
      insert into sources (
        source_key, title, source_type_key, qc_status, authors, year, publisher,
        primary_role, limitations_notes, is_demonstration
      ) values (
        ${DEMO_SOURCE_A},
        'Demonstration Source A — not a real publication',
        'primary_journal_article', 'usable',
        '["Demonstration Author"]'::jsonb, 2024, 'Not a real publisher',
        'Exists only to exercise this interface. Nothing attributed to it is a real finding.',
        'Not a real work. Never cite it.', ${demo}
      )
      on conflict (source_key) do update set title = excluded.title, is_demonstration = ${demo}
      returning id
    `,
  );

  const sourceB = await scalar<{ id: string }>(
    db,
    sql`
      insert into sources (
        source_key, title, source_type_key, qc_status, authors, year,
        primary_role, limitations_notes, is_demonstration
      ) values (
        ${DEMO_SOURCE_B},
        'Demonstration Source B — not a real publication',
        'practitioner_handbook', 'usable',
        '["Second Demonstration Author"]'::jsonb, 2023,
        'Exists only to exercise this interface. Nothing attributed to it is a real finding.',
        'Not a real work. Never cite it.', ${demo}
      )
      on conflict (source_key) do update set title = excluded.title, is_demonstration = ${demo}
      returning id
    `,
  );

  const locationA = await scalar<{ id: string }>(
    db,
    sql`
      insert into source_locations (source_id, locator_text, page_start, page_end)
      values (${sourceA!.id}, 'pp. 101–108 (demonstration locator)', 101, 108)
      returning id
    `,
  );

  const locationB = await scalar<{ id: string }>(
    db,
    sql`
      insert into source_locations (source_id, locator_text, page_start)
      values (${sourceB!.id}, 'p. 42 (demonstration locator)', 42)
      returning id
    `,
  );

  // --- Compound -----------------------------------------------------------
  const peptide = await scalar<{ id: string }>(
    db,
    sql`
      insert into peptides (
        peptide_key, canonical_name, slug, compound_type_key, primary_category_key,
        short_description, simple_summary, practitioner_summary, unknowns_summary,
        sequence, molecular_description, natural_or_synthetic, evidence_cutoff_at,
        is_demonstration
      ) values (
        ${DEMO_PEPTIDE_KEY},
        'Demonstration Compound',
        'demonstration-compound',
        'peptide', 'repair-recovery',
        'A fictional compound that exists to show how a record in this index is laid out.',
        'This compound is not real. It exists so that the layout of a compound record can be shown with every section populated: evidence grouped by kind, administration routes, regulatory status, protocols reported by different sources, and a recorded disagreement. Nothing on this page is a statement about any actual substance.',
        'A fictional compound used to exercise the practitioner view. Every field below is filled with demonstration content so that the structure of a record — provenance, evidence class, population, route, and the separation of source-reported regimens — can be inspected without publishing clinical content about a real molecule.',
        'Everything. This compound does not exist. This field is where a real record states what has not been established, and it is required before any compound record can be published.',
        'Xaa-Xaa-Xaa (not a real sequence)',
        'Not a real molecule.',
        'Synthetic (fictional)',
        '2026-01-01', ${demo}
      )
      on conflict (peptide_key) do update set canonical_name = excluded.canonical_name,
                                              is_demonstration = ${demo}
      returning id
    `,
  );

  const peptideId = peptide!.id;

  await db.execute(sql`
    insert into peptide_aliases (peptide_id, alias, alias_type, notes) values
      (${peptideId}, 'DEMO-1', 'research_code', null),
      (${peptideId}, 'Demo Compound', 'synonym', null),
      (${peptideId}, 'Demonstration Fragment', 'related_but_distinct',
       'Shown here to demonstrate how this index records a name that is used alongside a compound without having been established as the same molecule. Searching it reaches this record; it is never folded into the canonical name.')
    on conflict (peptide_id, alias) do nothing
  `);

  // --- Claims: one per evidence class, plus contradicting evidence --------
  const humanClaim = await scalar<{ id: string }>(
    db,
    sql`
      insert into claims (
        claim_key, peptide_id, claim_text, plain_language_text, importance,
        interpretation_notes, uncertainty_text
      ) values (
        'DEMO-C-001', ${peptideId},
        'In a demonstration trial, the compound was associated with a change on the study''s primary endpoint.',
        'A study in people found a difference in the main thing it set out to measure.',
        'high',
        'Read as reported. The endpoint was pre-specified, and the effect size is not restated here because the demonstration source does not contain one.',
        'A single demonstration study, in a narrow population, not replicated. This field is required before a high-importance statement can be published.'
      )
      on conflict (claim_key) do update set claim_text = excluded.claim_text
      returning id
    `,
  );

  await db.execute(sql`
    insert into claim_evidence (
      claim_id, source_id, source_location_id, evidence_type_key, relationship,
      population_model, route_key, formulation, interpretation, primary_source_verified
    ) values (
      ${humanClaim!.id}, ${sourceA!.id}, ${locationA!.id}, 'human_rct', 'supports',
      'Adults aged 18–65 (demonstration population)', 'subcutaneous', 'Lyophilised powder',
      'The passage reports the primary endpoint result directly.', true
    ), (
      ${humanClaim!.id}, ${sourceB!.id}, ${locationB!.id}, 'practitioner_reference', 'contradicts',
      'Clinic practice, unspecified population', null, null,
      'This source describes the opposite impression from practice. It is shown because a disagreement is information; it is not evidence of the same kind and is labelled accordingly.', false
    )
  `);

  const preclinicalClaim = await scalar<{ id: string }>(
    db,
    sql`
      insert into claims (
        claim_key, peptide_id, claim_text, plain_language_text, importance, interpretation_notes
      ) values (
        'DEMO-C-002', ${peptideId},
        'In a demonstration rodent model, tissue repair markers differed from control.',
        'In animals, a difference was seen in markers of tissue repair.',
        'medium',
        'An animal result. It is not evidence about people, and the regimen used in it is not a human instruction.'
      )
      on conflict (claim_key) do update set claim_text = excluded.claim_text
      returning id
    `,
  );

  await db.execute(sql`
    insert into claim_evidence (
      claim_id, source_id, source_location_id, evidence_type_key, relationship,
      population_model, interpretation
    ) values (
      ${preclinicalClaim!.id}, ${sourceA!.id}, ${locationA!.id}, 'animal_in_vivo', 'supports',
      'Rat (demonstration model)',
      'Reported in animals. Nothing follows from it about humans.'
    )
  `);

  const referenceClaim = await scalar<{ id: string }>(
    db,
    sql`
      insert into claims (
        claim_key, peptide_id, claim_text, plain_language_text, importance, interpretation_notes
      ) values (
        'DEMO-C-003', ${peptideId},
        'A demonstration practitioner reference describes using the compound in a recovery setting.',
        'A clinician has written about using this in a recovery setting.',
        'low',
        'Attributed to the author who wrote it. This is a description of practice, not a study result.'
      )
      on conflict (claim_key) do update set claim_text = excluded.claim_text
      returning id
    `,
  );

  await db.execute(sql`
    insert into claim_evidence (
      claim_id, source_id, source_location_id, evidence_type_key, relationship,
      population_model, interpretation
    ) values (
      ${referenceClaim!.id}, ${sourceB!.id}, ${locationB!.id}, 'practitioner_reference', 'supports',
      'Described from clinic practice',
      'The author describes their own practice. No study is cited.'
    )
  `);

  // --- Route evidence -----------------------------------------------------
  const routeRecords = await db.execute(sql`
    insert into peptide_routes (
      peptide_id, route_key, evidence_type_key, source_id, source_location_id,
      population_model, formulation, pk_notes, limitations_notes
    ) values (
      ${peptideId}, 'subcutaneous', 'human_pk_pd', ${sourceA!.id}, ${locationA!.id},
      'Healthy adults (demonstration)', 'Aqueous solution',
      'Demonstration pharmacokinetic note.',
      'Applies to this formulation only.'
    ), (
      ${peptideId}, 'oral', 'animal_in_vivo', ${sourceA!.id}, ${locationA!.id},
      'Rat (demonstration model)', 'Gavage',
      'Demonstration note. An animal result by this route says nothing about oral use in people.',
      'Preclinical only.'
    )
    returning id
  `);

  // --- Regulatory status --------------------------------------------------
  const regulatory = await scalar<{ id: string }>(
    db,
    sql`
      insert into regulatory_statuses (
        peptide_id, jurisdiction, indication_context, status, authority,
        source_id, source_location_id, checked_at, notes
      ) values (
        ${peptideId}, 'Demonstration jurisdiction', 'No approved indication',
        'not_approved', 'Demonstration authority',
        ${sourceA!.id}, ${locationA!.id}, current_date - 20,
        'A demonstration entry. Real entries name the authority and the date the status was confirmed.'
      )
      returning id
    `,
  );

  // --- Two protocols from two sources, deliberately not merged ------------
  const protocolA = await scalar<{ id: string }>(
    db,
    sql`
      insert into protocols (
        protocol_key, peptide_id, objective_context, population_model, route_key,
        formulation, regulatory_context, evidence_type_key,
        amount_reported, amount_unit, frequency_text, duration_text,
        monitoring_text, contraindications_text, safety_notes, patient_visibility
      ) values (
        'DEMO-PR-A', ${peptideId},
        'Post-operative recovery, as framed by Demonstration Source A.',
        'Adults enrolled in the demonstration study', 'subcutaneous',
        'Aqueous solution',
        'Study regimen from a demonstration trial. Not approved labelling and not a recommendation.',
        'human_rct',
        '250', 'mcg', 'twice daily', '4 weeks',
        'Demonstration monitoring note.',
        'Demonstration caution note.',
        'Demonstration safety note.',
        true
      )
      on conflict (protocol_key) do update set objective_context = excluded.objective_context
      returning id
    `,
  );

  const protocolB = await scalar<{ id: string }>(
    db,
    sql`
      insert into protocols (
        protocol_key, peptide_id, objective_context, population_model, route_key,
        regulatory_context, evidence_type_key,
        amount_reported, amount_unit, frequency_text, duration_text, patient_visibility
      ) values (
        'DEMO-PR-B', ${peptideId},
        'General recovery support, as framed by Demonstration Source B.',
        'Clinic practice, population unspecified', 'subcutaneous',
        'Practitioner-described practice. Not approved labelling, not a study regimen, and not a recommendation.',
        'practitioner_reference',
        '500', 'mcg', 'once daily', '6 weeks',
        true
      )
      on conflict (protocol_key) do update set objective_context = excluded.objective_context
      returning id
    `,
  );

  await db.execute(sql`
    insert into protocol_sources (protocol_id, source_id, source_location_id, source_role) values
      (${protocolA!.id}, ${sourceA!.id}, ${locationA!.id}, 'original'),
      (${protocolB!.id}, ${sourceB!.id}, ${locationB!.id}, 'original')
  `);

  // --- A recorded disagreement -------------------------------------------
  const disagreement = await scalar<{ id: string }>(
    db,
    sql`
      insert into disagreements (
        disagreement_key, peptide_id, topic, plain_language_text,
        candidate_explanation, explanation_notes, resolution_requirement
      ) values (
        'DEMO-D-001', ${peptideId},
        'The two demonstration sources describe different amounts for the same purpose.',
        'Two sources disagree about how much was used.',
        'population',
        'The study population and the clinic population are not the same, which is one ordinary reason two sources can both be reported accurately and still differ.',
        'A study that compared the two directly in the same population.'
      )
      on conflict (disagreement_key) do update set topic = excluded.topic
      returning id
    `,
  );

  await db.execute(sql`
    insert into disagreement_positions (
      disagreement_id, source_id, source_location_id, evidence_type_key, position_text, sort_order
    ) values (
      ${disagreement!.id}, ${sourceA!.id}, ${locationA!.id}, 'human_rct',
      'Demonstration Source A reports the lower amount, in a defined trial population.', 0
    ), (
      ${disagreement!.id}, ${sourceB!.id}, ${locationB!.id}, 'practitioner_reference',
      'Demonstration Source B describes the higher amount, from clinic practice, without a defined population.', 1
    )
    on conflict do nothing
  `);

  // --- A quality topic, showing both halves -------------------------------
  const topic = await scalar<{ id: string }>(
    db,
    sql`
      insert into quality_topics (
        quality_key, name, slug, short_description, simple_summary, practitioner_summary,
        what_it_proves, what_it_does_not_prove, common_misinterpretations, sort_order,
        is_demonstration
      ) values (
        'demo-analytical-test', 'Demonstration analytical test',
        'demonstration-analytical-test',
        'A fictional test, used to show how a quality topic is laid out.',
        'This is not a real test. It exists to show the shape of a quality page: what a result of this kind would establish, and — given equal weight — what it would not.',
        'A fictional analytical method. The structure below is what every real topic in this section follows.',
        'It would establish a property of the specific sample that was analysed, at the time it was analysed.',
        'It would not establish the identity of the material, how much of it is in a given vial, whether that vial is sterile, or its endotoxin content. Those are four further questions, each answered by a different test. This half is required before a topic can be published.',
        'The common error is to read a single favourable number as proof of overall quality. A certificate of analysis is a set of separate answers, not one verdict.',
        999, ${demo}
      )
      on conflict (quality_key) do update set name = excluded.name, is_demonstration = ${demo}
      returning id
    `,
  );

  const topicClaim = await scalar<{ id: string }>(
    db,
    sql`
      insert into claims (
        claim_key, quality_topic_id, claim_text, plain_language_text, importance,
        interpretation_notes
      ) values (
        'DEMO-Q-001', ${topic!.id},
        'A result from this demonstration method describes only the aliquot that was tested.',
        'The result describes the small sample that was tested, not everything in the batch.',
        'medium',
        'Stated as the demonstration method describes it.'
      )
      on conflict (claim_key) do update set claim_text = excluded.claim_text
      returning id
    `,
  );

  await db.execute(sql`
    insert into claim_evidence (
      claim_id, source_id, source_location_id, evidence_type_key, relationship, interpretation
    ) values (
      ${topicClaim!.id}, ${sourceA!.id}, ${locationA!.id}, 'academic_reference', 'supports',
      'Demonstration methods description.'
    )
  `);

  // --- Review and publish, through the real gates -------------------------
  const claimIds = [humanClaim!.id, preclinicalClaim!.id, referenceClaim!.id, topicClaim!.id];
  for (const claimId of claimIds) {
    await approve(db, 'claim', claimId, 'source_check', staff.editor!, 'claims');
    await approve(db, 'claim', claimId, 'scientific', staff.scientific!, 'claims');
    await approve(db, 'claim', claimId, 'compliance', staff.compliance!, 'claims');
    await db.execute(
      sql`update claims set publication_state = 'published' where id = ${claimId}`,
    );
  }

  for (const protocolId of [protocolA!.id, protocolB!.id]) {
    await approve(db, 'protocol', protocolId, 'source_check', staff.editor!, 'protocols');
    await approve(db, 'protocol', protocolId, 'scientific', staff.scientific!, 'protocols');
    await approve(db, 'protocol', protocolId, 'clinical', staff.clinical!, 'protocols');
    await approve(db, 'protocol', protocolId, 'compliance', staff.compliance!, 'protocols');
    await db.execute(
      sql`update protocols set publication_state = 'published' where id = ${protocolId}`,
    );
  }

  const routeIds = (
    Array.isArray(routeRecords) ? routeRecords : ((routeRecords as { rows?: unknown[] }).rows ?? [])
  ) as { id: string }[];
  for (const route of routeIds) {
    await approve(db, 'peptide_route', route.id, 'scientific', staff.scientific!, 'peptide_routes');
    await db.execute(
      sql`update peptide_routes set publication_state = 'published' where id = ${route.id}`,
    );
  }

  await approve(
    db,
    'regulatory_status',
    regulatory!.id,
    'compliance',
    staff.compliance!,
    'regulatory_statuses',
  );
  await db.execute(
    sql`update regulatory_statuses set publication_state = 'published' where id = ${regulatory!.id}`,
  );

  await db.execute(
    sql`update disagreements set review_state = 'scientific_reviewed', publication_state = 'published' where id = ${disagreement!.id}`,
  );

  await approve(db, 'quality_topic', topic!.id, 'scientific', staff.scientific!, 'quality_topics');
  await db.execute(
    sql`update quality_topics set publication_state = 'published' where id = ${topic!.id}`,
  );

  await approve(db, 'peptide', peptideId, 'scientific', staff.scientific!, 'peptides');
  await approve(db, 'peptide', peptideId, 'compliance', staff.compliance!, 'peptides');
  await db.execute(
    sql`update peptides set publication_state = 'published' where id = ${peptideId}`,
  );

  return {
    peptideSlug: 'demonstration-compound',
    qualityTopicSlug: 'demonstration-analytical-test',
  };
}
