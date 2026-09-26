import { sql } from 'drizzle-orm';
import { eq, inArray } from 'drizzle-orm';
import * as schema from '@db/schema';
import { seedData, type CompoundPacket } from './seed-data';
import type { SeedDb } from './index';

/**
 * Loads a compound evidence packet.
 *
 * The quality packets proved the machinery on a subject where the evidence is
 * thin and the sources agree. A compound is the harder case: several sources
 * describing the same substance differently, routes that are reported without
 * being studied, regimens that exist only as somebody's practice, and a
 * regulatory position that is a fact about a date rather than about a molecule.
 *
 * Everything here is loaded as a *separate relation* rather than as prose on the
 * compound, and that is the whole design. A route, a protocol, a disagreement
 * and a regulatory status each have their own provenance and their own rate of
 * going out of date. Flattened into a paragraph they would be indistinguishable
 * from each other and from the claims — which is how "one handbook reports 250
 * mcg twice daily" turns into "the dose".
 *
 * As with the quality packets, nothing here publishes. The load ends with the
 * records extracted and located, and a human scientific review is what moves
 * them further.
 */

interface PacketLoadResult {
  readonly packetKey: string;
  readonly locations: number;
  readonly claims: number;
  readonly evidence: number;
  readonly gaps: number;
  readonly routes: number;
  readonly protocols: number;
  readonly disagreements: number;
  readonly regulatory: number;
  readonly products: number;
  readonly forms: number;
  readonly pharmacokinetics: number;
  readonly identities: number;
  readonly replication: number;
  readonly funding: number;
}

export async function loadCompoundPackets(db: SeedDb): Promise<PacketLoadResult[]> {
  const results: PacketLoadResult[] = [];
  for (const packet of seedData.compoundPackets) {
    results.push(await loadCompoundPacket(db, packet));
  }
  return results;
}

export async function loadCompoundPacket(
  db: SeedDb,
  packet: CompoundPacket,
): Promise<PacketLoadResult> {
  const peptide = await requirePeptide(db, packet.peptideKey);
  const sourceIds = await requireCitableSources(db, packet);

  // --- The compound's own record ------------------------------------------
  await db
    .update(schema.peptides)
    .set({
      shortDescription: packet.compound.shortDescription,
      simpleSummary: packet.compound.simpleSummary,
      practitionerSummary: packet.compound.practitionerSummary,
      unknownsSummary: packet.compound.unknownsSummary,
      sequence: packet.compound.sequence,
      molecularDescription: packet.compound.molecularDescription,
      naturalOrSynthetic: packet.compound.naturalOrSynthetic,
    })
    .where(eq(schema.peptides.id, peptide.id));

  // --- Aliases -------------------------------------------------------------
  // Upserted on (peptide, alias). The note carries why the alias is recorded,
  // including for the ones no source held here uses — a reader who meets a
  // development code elsewhere should find out here that this index has no
  // source for it, rather than find nothing.
  for (const alias of packet.compound.aliases) {
    await db.execute(sql`
      insert into peptide_aliases (peptide_id, alias, notes)
      values (${peptide.id}, ${alias.alias}, ${alias.note})
      on conflict (peptide_id, alias) do update set notes = excluded.notes
    `);
  }

  // --- Locations -----------------------------------------------------------
  const locationIds = new Map<string, string>();
  for (const location of packet.locations) {
    const sourceId = sourceIds.get(location.sourceKey);
    if (sourceId === undefined) {
      throw new Error(
        `${packet.packetKey}: location ${location.key} cites ${location.sourceKey}, which is not citable.`,
      );
    }
    const [row] = await db
      .insert(schema.sourceLocations)
      .values({
        locationKey: location.key,
        sourceId,
        locatorText: location.locatorText,
        pageStart: location.pageStart,
        pageEnd: location.pageEnd,
        chapter: location.chapter,
        section: location.section,
        tableNumber: location.tableNumber,
        notes: location.notes,
      })
      .onConflictDoUpdate({
        target: schema.sourceLocations.locationKey,
        set: {
          locatorText: sql`excluded.locator_text`,
          pageStart: sql`excluded.page_start`,
          pageEnd: sql`excluded.page_end`,
          chapter: sql`excluded.chapter`,
          section: sql`excluded.section`,
          tableNumber: sql`excluded.table_number`,
          notes: sql`excluded.notes`,
        },
      })
      .returning({ id: schema.sourceLocations.id });
    locationIds.set(location.key, row!.id);
  }

  const locationId = (key: string): string => {
    const id = locationIds.get(key);
    if (id === undefined) {
      throw new Error(`${packet.packetKey}: no location '${key}' in this packet.`);
    }
    return id;
  };

  // --- Claims and their evidence -------------------------------------------
  let evidenceCount = 0;
  for (const claim of packet.claims) {
    const [claimRow] = await db
      .insert(schema.claims)
      .values({
        claimKey: claim.claimKey,
        peptideId: peptide.id,
        claimText: claim.claimText,
        plainLanguageText: claim.plainLanguageText,
        claimCategory: claim.claimCategory,
        importance: claim.importance,
        certificateTypeScope: claim.certificateTypeScope,
        interpretationNotes: claim.interpretationNotes,
        uncertaintyText: claim.uncertaintyText,
      })
      // Every field the packet owns is refreshed. A partial upsert leaves
      // corrected text in the file and stale text in the database, and the
      // failure is silent — the reseed reports success.
      .onConflictDoUpdate({
        target: schema.claims.claimKey,
        set: {
          claimText: sql`excluded.claim_text`,
          plainLanguageText: sql`excluded.plain_language_text`,
          claimCategory: sql`excluded.claim_category`,
          importance: sql`excluded.importance`,
          certificateTypeScope: sql`excluded.certificate_type_scope`,
          interpretationNotes: sql`excluded.interpretation_notes`,
          uncertaintyText: sql`excluded.uncertainty_text`,
        },
      })
      .returning({ id: schema.claims.id });

    // Evidence the packet no longer lists is removed. When a citation is
    // re-pointed from an abstract to the page of a full text, the abstract row
    // must not survive in the database as a second reading nobody asserts.
    const packetLocationIds = claim.evidence.map((evidence) => locationId(evidence.locationKey));
    await db.execute(sql`
      delete from claim_evidence
       where claim_id = ${claimRow!.id}
         and source_location_id <> all(${sql`array[${sql.join(
           packetLocationIds.map((id) => sql`${id}::uuid`),
           sql`, `,
         )}]`})
    `);

    for (const evidence of claim.evidence) {
      await db.execute(sql`
        insert into claim_evidence (
          claim_id, source_id, source_location_id, evidence_type_key, relationship,
          interpretation, population_model, primary_trace, primary_trace_note,
          primary_source_verified
        ) values (
          ${claimRow!.id},
          (select source_id from source_locations where id = ${locationId(evidence.locationKey)}),
          ${locationId(evidence.locationKey)},
          ${evidence.evidenceTypeKey},
          ${evidence.relationship}::evidence_relationship,
          ${evidence.interpretation},
          ${evidence.populationModel},
          ${evidence.primaryTrace}::primary_trace_state,
          ${evidence.primaryTraceNote},
          ${evidence.primaryTrace.startsWith('full_text_')}
        )
        on conflict (claim_id, source_location_id) do update
          set interpretation = excluded.interpretation,
              evidence_type_key = excluded.evidence_type_key,
              relationship = excluded.relationship,
              population_model = excluded.population_model,
              primary_trace = excluded.primary_trace,
              primary_trace_note = excluded.primary_trace_note,
              primary_source_verified = excluded.primary_source_verified
      `);
      evidenceCount += 1;
    }
  }

  // --- Funding and conflicts -----------------------------------------------
  // Attached to the source, because that is what it is a fact about. A packet
  // may record funding for a source it cites without claiming anything else
  // about it.
  for (const funding of packet.funding) {
    await db.execute(sql`
      insert into study_funding (
        funding_key, source_id, source_location_id, funder_kind, sponsor_name,
        manufacturer_involved, institution, grant_reference, disclosure_text, notes
      ) values (
        ${funding.fundingKey},
        (select id from sources where source_key = ${funding.sourceKey}),
        ${funding.locationKey === null ? null : locationId(funding.locationKey)},
        ${funding.funderKind}::funding_kind,
        ${funding.sponsorName},
        ${funding.manufacturerInvolved},
        ${funding.institution},
        ${funding.grantReference},
        ${funding.disclosureText},
        ${funding.notes}
      )
      on conflict (funding_key) do update set
        source_location_id = excluded.source_location_id,
        funder_kind = excluded.funder_kind,
        sponsor_name = excluded.sponsor_name,
        manufacturer_involved = excluded.manufacturer_involved,
        institution = excluded.institution,
        grant_reference = excluded.grant_reference,
        disclosure_text = excluded.disclosure_text,
        notes = excluded.notes
    `);
  }

  // --- Gaps ----------------------------------------------------------------
  for (const [index, gap] of packet.notYetSupported.entries()) {
    await db.execute(sql`
      insert into evidence_gaps (
        gap_key, peptide_id, gap_type, statement, why_not_supported,
        what_would_resolve_it, verification_issue_key, sort_order,
        research_question, opportunity_type,
        resolution_state, resolution_note, resolution_checked_at
      ) values (
        ${`${packet.packetKey}-gap-${String(index + 1).padStart(2, '0')}`},
        ${peptide.id}, ${gap.gapType}::evidence_gap_type, ${gap.statement}, ${gap.why},
        ${gap.whatWouldResolveIt}, ${gap.verificationIssueKey}, ${index},
        ${gap.researchQuestion}, ${gap.opportunityType},
        ${gap.resolution?.state ?? 'open'}::gap_resolution_state,
        ${gap.resolution?.note ?? null}, ${gap.resolution?.checkedAt ?? null}
      )
      on conflict (gap_key) do update set
        gap_type = excluded.gap_type,
        statement = excluded.statement,
        why_not_supported = excluded.why_not_supported,
        what_would_resolve_it = excluded.what_would_resolve_it,
        verification_issue_key = excluded.verification_issue_key,
        sort_order = excluded.sort_order,
        research_question = excluded.research_question,
        opportunity_type = excluded.opportunity_type,
        resolution_state = excluded.resolution_state,
        resolution_note = excluded.resolution_note,
        resolution_checked_at = excluded.resolution_checked_at
    `);
  }

  // --- Routes --------------------------------------------------------------
  // Keyed on (compound, route, source location): the same route reported by
  // two sources is two records, and the same route from the same page is one.
  const routeIds: string[] = [];
  for (const route of packet.routes) {
    const [row] = await db
      .execute(
        sql`
      insert into peptide_routes (
        peptide_id, route_key, evidence_type_key, source_id, source_location_id,
        population_model, formulation, pk_notes, limitations_notes
      ) values (
        ${peptide.id}, ${route.routeKey}, ${route.evidenceTypeKey},
        (select source_id from source_locations where id = ${locationId(route.locationKey)}),
        ${locationId(route.locationKey)},
        ${route.populationModel}, ${route.formulation}, ${route.pkNotes},
        ${route.limitationsNotes}
      )
      on conflict (peptide_id, route_key, source_location_id) do update set
        evidence_type_key = excluded.evidence_type_key,
        source_id = excluded.source_id,
        population_model = excluded.population_model,
        formulation = excluded.formulation,
        pk_notes = excluded.pk_notes,
        limitations_notes = excluded.limitations_notes
      returning id
    `,
      )
      .then(rowsOf<{ id: string }>);
    routeIds.push(row!.id);
  }
  await pruneToKept(db, 'peptide_routes', peptide.id, routeIds);

  // --- Protocols -----------------------------------------------------------
  for (const protocol of packet.protocols) {
    const [row] = await db.execute(sql`
      insert into protocols (
        protocol_key, peptide_id, objective_context, population_model, route_key,
        formulation, regulatory_context, evidence_type_key,
        amount_reported, amount_unit, frequency_text, duration_text,
        monitoring_text, contraindications_text, safety_notes, patient_visibility,
        timing_text, cycle_text, titration_text, combinations_text
      ) values (
        ${protocol.protocolKey}, ${peptide.id}, ${protocol.objectiveContext},
        ${protocol.populationModel}, ${protocol.routeKey}, ${protocol.formulation},
        ${protocol.regulatoryContext}, ${protocol.evidenceTypeKey},
        ${protocol.amountReported}, ${protocol.amountUnit}, ${protocol.frequencyText},
        ${protocol.durationText}, ${protocol.monitoringText},
        ${protocol.contraindicationsText}, ${protocol.safetyNotes}, false,
        ${protocol.timingText}, ${protocol.cycleText}, ${protocol.titrationText},
        ${protocol.combinationsText}
      )
      on conflict (protocol_key) do update set
        objective_context = excluded.objective_context,
        population_model = excluded.population_model,
        route_key = excluded.route_key,
        formulation = excluded.formulation,
        regulatory_context = excluded.regulatory_context,
        evidence_type_key = excluded.evidence_type_key,
        amount_reported = excluded.amount_reported,
        amount_unit = excluded.amount_unit,
        frequency_text = excluded.frequency_text,
        duration_text = excluded.duration_text,
        monitoring_text = excluded.monitoring_text,
        contraindications_text = excluded.contraindications_text,
        safety_notes = excluded.safety_notes,
        timing_text = excluded.timing_text,
        cycle_text = excluded.cycle_text,
        titration_text = excluded.titration_text,
        combinations_text = excluded.combinations_text
      returning id
    `).then(rowsOf<{ id: string }>);

    /*
     * Cleared first. `protocol_sources` has no unique constraint on
     * (protocol, source, location), so `on conflict do nothing` did nothing and
     * every reseed appended another identical row — which showed up as the same
     * locator printed eight times in the comparison table. A packet owns this
     * relation, so it replaces it.
     */
    await db.execute(sql`delete from protocol_sources where protocol_id = ${row!.id}`);
    await db.execute(sql`
      insert into protocol_sources (protocol_id, source_id, source_location_id, source_role)
      values (
        ${row!.id},
        (select source_id from source_locations where id = ${locationId(protocol.locationKey)}),
        ${locationId(protocol.locationKey)},
        'original'
      )
      on conflict do nothing
    `);
  }

  // --- Disagreements -------------------------------------------------------
  for (const disagreement of packet.disagreements) {
    const [row] = await db.execute(sql`
      insert into disagreements (
        disagreement_key, peptide_id, topic, plain_language_text,
        candidate_explanation, explanation_notes, resolution_requirement,
        resolution, resolution_basis, resolved_at
      ) values (
        ${disagreement.disagreementKey}, ${peptide.id}, ${disagreement.topic},
        ${disagreement.plainLanguageText},
        ${disagreement.candidateExplanation}::disagreement_explanation,
        ${disagreement.explanationNotes}, ${disagreement.resolutionRequirement},
        ${disagreement.resolution}::disagreement_resolution,
        ${disagreement.resolutionBasis}, ${disagreement.resolvedAt}::date
      )
      on conflict (disagreement_key) do update set
        topic = excluded.topic,
        plain_language_text = excluded.plain_language_text,
        candidate_explanation = excluded.candidate_explanation,
        explanation_notes = excluded.explanation_notes,
        resolution_requirement = excluded.resolution_requirement,
        resolution = excluded.resolution,
        resolution_basis = excluded.resolution_basis,
        resolved_at = excluded.resolved_at
      returning id
    `).then(rowsOf<{ id: string }>);

    await db.execute(sql`delete from disagreement_positions where disagreement_id = ${row!.id}`);
    for (const [index, position] of disagreement.positions.entries()) {
      await db.execute(sql`
        insert into disagreement_positions (
          disagreement_id, source_id, source_location_id, evidence_type_key,
          position_text, sort_order
        ) values (
          ${row!.id},
          (select source_id from source_locations where id = ${locationId(position.locationKey)}),
          ${locationId(position.locationKey)},
          ${position.evidenceTypeKey}, ${position.positionText}, ${index}
        )
      `);
    }
  }

  // --- Products ------------------------------------------------------------
  /*
   * Loaded before the PK observations, because an observation points at the
   * product it was measured on — which is the second reason to upsert rather
   * than replace: a stable product id means the observation's foreign key is
   * not rewritten on every seed either.
   */
  const productIds = new Map<string, string>();
  for (const product of packet.products) {
    const [row] = await db.execute(sql`
      insert into compound_products (
        product_key, peptide_id, product_name, proprietary_name, manufacturer,
        authority, jurisdiction, application_number, marketing_status,
        presentation, strength_text, reconstitution_text, labelled_dose_text,
        storage_text, excipients_text, substitutability_note, notes,
        source_id, source_location_id
      ) values (
        ${product.productKey}, ${peptide.id}, ${product.productName},
        ${product.proprietaryName}, ${product.manufacturer}, ${product.authority},
        ${product.jurisdiction}, ${product.applicationNumber},
        ${product.marketingStatus}, ${product.presentation}, ${product.strengthText},
        ${product.reconstitutionText}, ${product.labelledDoseText},
        ${product.storageText}, ${product.excipientsText},
        ${product.substitutabilityNote}, ${product.notes},
        (select source_id from source_locations where id = ${locationId(product.locationKey)}),
        ${locationId(product.locationKey)}
      )
      on conflict (product_key) do update set
        peptide_id = excluded.peptide_id,
        product_name = excluded.product_name,
        proprietary_name = excluded.proprietary_name,
        manufacturer = excluded.manufacturer,
        authority = excluded.authority,
        jurisdiction = excluded.jurisdiction,
        application_number = excluded.application_number,
        marketing_status = excluded.marketing_status,
        presentation = excluded.presentation,
        strength_text = excluded.strength_text,
        reconstitution_text = excluded.reconstitution_text,
        labelled_dose_text = excluded.labelled_dose_text,
        storage_text = excluded.storage_text,
        excipients_text = excluded.excipients_text,
        substitutability_note = excluded.substitutability_note,
        notes = excluded.notes,
        source_id = excluded.source_id,
        source_location_id = excluded.source_location_id
      returning id
    `).then(rowsOf<{ id: string }>);
    productIds.set(product.productKey, row!.id);
  }
  await pruneToKept(db, 'compound_products', peptide.id, [...productIds.values()]);

  // --- Chemical forms ------------------------------------------------------
  await db.execute(sql`delete from compound_forms where peptide_id = ${peptide.id}`);
  for (const form of packet.forms) {
    await db.execute(sql`
      insert into compound_forms (
        form_key, peptide_id, chemical_form, molecular_formula, molecular_weight,
        weight_basis, form_stated_by_source, notes, source_id, source_location_id
      ) values (
        ${form.formKey}, ${peptide.id}, ${form.chemicalForm}, ${form.molecularFormula},
        ${form.molecularWeight}, ${form.weightBasis}, ${form.formStatedBySource},
        ${form.notes},
        (select source_id from source_locations where id = ${locationId(form.locationKey)}),
        ${locationId(form.locationKey)}
      )
    `);
  }

  // --- Pharmacokinetic observations ----------------------------------------
  const observationIds: string[] = [];
  for (const observation of packet.pharmacokinetics) {
    const productId = observation.productKey
      ? (productIds.get(observation.productKey) ?? null)
      : null;
    if (observation.productKey && productId === null) {
      throw new Error(
        `${packet.packetKey}: PK observation ${observation.observationKey} names product ` +
          `${observation.productKey}, which the packet does not define.`,
      );
    }
    const [row] = await db.execute(sql`
      insert into pk_observations (
        observation_key, peptide_id, product_id, parameter, value_text,
        dose_context, administration, population, route_key, study_condition,
        evidence_type_key, source_id, source_location_id, notes
      ) values (
        ${observation.observationKey}, ${peptide.id}, ${productId},
        ${observation.parameter}, ${observation.valueText}, ${observation.doseContext},
        ${observation.administration}::pk_administration, ${observation.population},
        ${observation.routeKey}, ${observation.studyCondition},
        ${observation.evidenceTypeKey},
        (select source_id from source_locations where id = ${locationId(observation.locationKey)}),
        ${locationId(observation.locationKey)}, ${observation.notes}
      )
      on conflict (observation_key) do update set
        peptide_id = excluded.peptide_id,
        product_id = excluded.product_id,
        parameter = excluded.parameter,
        value_text = excluded.value_text,
        dose_context = excluded.dose_context,
        administration = excluded.administration,
        population = excluded.population,
        route_key = excluded.route_key,
        study_condition = excluded.study_condition,
        evidence_type_key = excluded.evidence_type_key,
        source_id = excluded.source_id,
        source_location_id = excluded.source_location_id,
        notes = excluded.notes
      returning id
    `).then(rowsOf<{ id: string }>);
    observationIds.push(row!.id);
  }
  await pruneToKept(db, 'pk_observations', peptide.id, observationIds);

  // --- Identity claims -----------------------------------------------------
  /*
   * What each source says the name refers to.
   *
   * Upserted on `identity_key`, then pruned to what the packet still lists: a
   * stale identity claim is the worst kind of stale record here, because it is
   * the one a reader consults to find out whether two names mean the same
   * molecule.
   */
  const identityIds: string[] = [];
  for (const identity of packet.identities) {
    const [row] = await db.execute(sql`
      insert into compound_identity_claims (
        identity_key, peptide_id, name_used, chemical_form, sequence,
        residue_count, molecular_weight, weight_basis, form, verification,
        usage_context, notes, evidence_type_key, source_id, source_location_id
      ) values (
        ${identity.identityKey}, ${peptide.id}, ${identity.nameUsed},
        ${identity.chemicalForm}, ${identity.sequence}, ${identity.residueCount},
        ${identity.molecularWeight}, ${identity.weightBasis},
        ${identity.form}::identity_form,
        ${identity.verification}::identity_verification,
        ${identity.usageContext}, ${identity.notes}, ${identity.evidenceTypeKey},
        (select source_id from source_locations where id = ${locationId(identity.locationKey)}),
        ${locationId(identity.locationKey)}
      )
      on conflict (identity_key) do update set
        peptide_id = excluded.peptide_id,
        name_used = excluded.name_used,
        chemical_form = excluded.chemical_form,
        sequence = excluded.sequence,
        residue_count = excluded.residue_count,
        molecular_weight = excluded.molecular_weight,
        weight_basis = excluded.weight_basis,
        form = excluded.form,
        verification = excluded.verification,
        usage_context = excluded.usage_context,
        notes = excluded.notes,
        evidence_type_key = excluded.evidence_type_key,
        source_id = excluded.source_id,
        source_location_id = excluded.source_location_id
      returning id
    `).then(rowsOf<{ id: string }>);
    identityIds.push(row!.id);
  }
  await pruneToKept(db, 'compound_identity_claims', peptide.id, identityIds);

  // --- Replication ---------------------------------------------------------
  const assessmentIds: string[] = [];
  for (const assessment of packet.replication) {
    const [row] = await db.execute(sql`
      insert into replication_assessments (
        assessment_key, peptide_id, finding, state, study_count, group_count,
        country_count, models, human_confirmed, basis, limitations,
        supporting_records
      ) values (
        ${assessment.assessmentKey}, ${peptide.id}, ${assessment.finding},
        ${assessment.state}::replication_state, ${assessment.studyCount},
        ${assessment.groupCount}, ${assessment.countryCount}, ${assessment.models},
        ${assessment.humanConfirmed}, ${assessment.basis}, ${assessment.limitations},
        ${assessment.supportingRecords}
      )
      on conflict (assessment_key) do update set
        peptide_id = excluded.peptide_id,
        finding = excluded.finding,
        state = excluded.state,
        study_count = excluded.study_count,
        group_count = excluded.group_count,
        country_count = excluded.country_count,
        models = excluded.models,
        human_confirmed = excluded.human_confirmed,
        basis = excluded.basis,
        limitations = excluded.limitations,
        supporting_records = excluded.supporting_records
      returning id
    `).then(rowsOf<{ id: string }>);
    assessmentIds.push(row!.id);
  }
  await pruneToKept(db, 'replication_assessments', peptide.id, assessmentIds);

  // --- Regulatory ----------------------------------------------------------
  // Keyed on (compound, jurisdiction, indication): one position per authority
  // per indication, re-dated rather than re-created when the check is repeated.
  const regulatoryIds: string[] = [];
  for (const entry of packet.regulatory) {
    const [row] = await db.execute(sql`
      insert into regulatory_statuses (
        peptide_id, jurisdiction, indication_context, status, authority,
        source_id, source_location_id, checked_at, notes
      ) values (
        ${peptide.id}, ${entry.jurisdiction}, ${entry.indicationContext},
        ${entry.status}::regulatory_status_value, ${entry.authority},
        (select source_id from source_locations where id = ${locationId(entry.locationKey)}),
        ${locationId(entry.locationKey)}, ${entry.checkedAt}::date, ${entry.notes}
      )
      on conflict (peptide_id, jurisdiction, indication_context) do update set
        status = excluded.status,
        authority = excluded.authority,
        source_id = excluded.source_id,
        source_location_id = excluded.source_location_id,
        checked_at = excluded.checked_at,
        notes = excluded.notes
      returning id
    `).then(rowsOf<{ id: string }>);
    regulatoryIds.push(row!.id);
  }
  await pruneToKept(db, 'regulatory_statuses', peptide.id, regulatoryIds);

  return {
    packetKey: packet.packetKey,
    locations: packet.locations.length,
    claims: packet.claims.length,
    evidence: evidenceCount,
    gaps: packet.notYetSupported.length,
    routes: packet.routes.length,
    protocols: packet.protocols.length,
    disagreements: packet.disagreements.length,
    regulatory: packet.regulatory.length,
    products: packet.products.length,
    forms: packet.forms.length,
    pharmacokinetics: packet.pharmacokinetics.length,
    identities: packet.identities.length,
    replication: packet.replication.length,
    funding: packet.funding.length,
  };
}

// ---------------------------------------------------------------------------

async function requirePeptide(db: SeedDb, peptideKey: string): Promise<{ id: string }> {
  const rows = await db
    .select({ id: schema.peptides.id })
    .from(schema.peptides)
    .where(eq(schema.peptides.peptideKey, peptideKey));
  const row = rows[0];
  if (row === undefined) {
    throw new Error(`No compound '${peptideKey}' in the register. Seed the cohort first.`);
  }
  return row;
}

/**
 * Resolves the sources a packet cites, and refuses the ones the audit
 * disqualified.
 *
 * A packet resting on a source marked `replace` or `exclude` is refused at load
 * rather than stored and caught later by a publish gate, because a claim in the
 * database is a claim somebody can read.
 */
async function requireCitableSources(
  db: SeedDb,
  packet: CompoundPacket,
): Promise<Map<string, string>> {
  const keys = [...new Set(packet.locations.map((location) => location.sourceKey))];
  const rows = await db
    .select({
      id: schema.sources.id,
      sourceKey: schema.sources.sourceKey,
      isCitable: schema.sources.isCitable,
    })
    .from(schema.sources)
    .where(inArray(schema.sources.sourceKey, keys));

  const found = new Map<string, string>();
  for (const row of rows) {
    if (!row.isCitable) continue;
    found.set(row.sourceKey, row.id);
  }

  const missing = keys.filter((key) => !found.has(key));
  if (missing.length > 0) {
    throw new Error(
      `${packet.packetKey}: cites ${missing.join(', ')}, which are absent or not citable.`,
    );
  }
  return found;
}

function rowsOf<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (result && typeof result === 'object' && Array.isArray((result as { rows?: unknown }).rows)) {
    return (result as { rows: T[] }).rows;
  }
  return [];
}

/**
 * Removes the rows of `table` for this compound that the packet no longer
 * contains, naming the survivors by id.
 *
 * The counterpart to upserting. These relations are owned wholesale by a
 * packet, so a record that leaves the packet must leave the database — but the
 * records that stayed must keep the identity they had. They used to be deleted
 * and re-inserted, which gave every one of them a new id and a
 * `publication_state` back at its default: a routine re-seed quietly took 177
 * published records off the public site, with nothing withdrawn and no error
 * raised, because the published rows had simply ceased to exist.
 *
 * An upsert keeps the row, and this removes only what the packet dropped.
 */
async function pruneToKept(
  db: SeedDb,
  table: string,
  peptideId: string,
  keptIds: readonly string[],
): Promise<void> {
  const keep =
    keptIds.length === 0
      ? sql`array[]::uuid[]`
      : sql`array[${sql.join(
          keptIds.map((id) => sql`${id}::uuid`),
          sql`, `,
        )}]`;

  await db.execute(sql`
    delete from ${sql.identifier(table)}
     where peptide_id = ${peptideId}
       and id <> all(${keep})
  `);
}
