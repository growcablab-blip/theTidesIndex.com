import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { seedDatabase } from '@db/seed';
import {
  attachClaimEvidence,
  attachProtocolSource,
  createClaim,
  createProtocol,
  createSource,
  createSourceLocation,
  createStaffProfile,
  publishRecord,
  recordReview,
  setPublicationState,
  updatePeptideSummaries,
  updateQualityTopic,
} from '@/server/editorial/mutations';
import type { StaffSession } from '@/server/auth/session';
import { closeTestDb, createTestDb, query, truncateContent, type TestDb } from '../support/test-db';
import { createStaff, type Staff } from '../support/fixtures';

/**
 * ACCEPTANCE_TESTS.md section F — the editorial workflow, exercised through the
 * services the application actually calls.
 *
 * This covers the layer between the forms and the database: the SQL itself, the
 * affected-row checks that stop a silently-refused update reporting success, and
 * the translation of database errors into something an editor can act on.
 */
describe('editorial services', () => {
  let db: TestDb;
  let staff: Staff;

  function sessionFor(userId: string, role: StaffSession['role']): StaffSession {
    return { userId, role, displayName: 'Test user', email: null };
  }

  beforeAll(async () => {
    db = await createTestDb();
  });

  afterAll(async () => {
    await closeTestDb(db);
  });

  beforeEach(async () => {
    await truncateContent(db);
    await seedDatabase(db);
    staff = await createStaff(db);
  });

  it('walks a claim from a blank source to publication', async () => {
    const editor = sessionFor(staff.editor, 'editor');

    const source = await createSource(db, editor, {
      sourceKey: 'SRC-SERVICE',
      title: 'A journal article',
      sourceTypeKey: 'primary_journal_article',
      qcStatus: 'usable',
      authors: ['A Researcher', 'B Researcher'],
      year: 2021,
      publisher: null,
      doi: '10.1000/example',
      pmid: null,
      canonicalUrl: null,
      primaryRole: 'Reports the trial directly.',
      limitationsNotes: null,
      authorityNotes: null,
    });
    expect(source.ok).toBe(true);
    if (!source.ok) return;

    const location = await createSourceLocation(db, editor, {
      sourceId: source.data.id,
      locatorText: 'pp. 412–418',
      pageStart: 412,
      pageEnd: 418,
      chapter: null,
      section: null,
      notes: null,
    });
    expect(location.ok).toBe(true);
    if (!location.ok) return;

    const [peptide] = await query<{ id: string }>(
      db,
      `select id from peptides where slug = 'bpc-157'`,
    );

    const claim = await createClaim(db, editor, {
      claimKey: 'SERVICE-C-001',
      peptideId: peptide!.id,
      qualityTopicId: null,
      claimText: 'The cited trial reported a difference on its primary endpoint.',
      plainLanguageText: 'The study found a difference in what it set out to measure.',
      importance: 'high',
      interpretationNotes: 'Read as reported; the endpoint was pre-specified.',
      uncertaintyText: 'A single trial in a narrow population; not replicated.',
      isEditorialNonEvidentiary: false,
    });
    expect(claim.ok).toBe(true);
    if (!claim.ok) return;

    // Not publishable yet: no evidence and no reviews.
    const tooEarly = await publishRecord(db, editor, 'claim', claim.data.id);
    expect(tooEarly.ok).toBe(false);
    if (!tooEarly.ok) {
      expect(tooEarly.fieldErrors?.evidence?.[0]).toMatch(/no evidence link/i);
    }

    const evidence = await attachClaimEvidence(db, editor, {
      claimId: claim.data.id,
      sourceId: source.data.id,
      sourceLocationId: location.data.id,
      evidenceTypeKey: 'human_rct',
      relationship: 'supports',
      populationModel: 'Adults aged 18–65',
      routeKey: 'subcutaneous',
      formulation: null,
      interpretation: 'The passage reports the primary endpoint result.',
      extractedTextPrivate: 'Verbatim text retained for review only.',
      primarySourceVerified: true,
    });
    expect(evidence.ok).toBe(true);

    for (const [role, reviewType, userId] of [
      ['editor', 'source_check', staff.editor],
      ['scientific_reviewer', 'scientific', staff.scientific],
      ['compliance_reviewer', 'compliance', staff.compliance],
    ] as const) {
      const result = await recordReview(db, sessionFor(userId, role), {
        entityType: 'claim',
        entityId: claim.data.id,
        reviewType,
        outcome: 'approved',
        comments: null,
      });
      expect(result.ok, `${reviewType} review`).toBe(true);
    }

    const published = await publishRecord(db, editor, 'claim', claim.data.id);
    expect(published.ok).toBe(true);

    const [row] = await query<{ publication_state: string }>(
      db,
      `select publication_state from claims where id = $1`,
      [claim.data.id],
    );
    expect(row?.publication_state).toBe('published');

    // The private extract never reaches the public relation.
    const [publicRow] = await query<Record<string, unknown>>(
      db,
      `select * from public_v_claim_evidence where claim_id = $1`,
      [claim.data.id],
    );
    expect(Object.keys(publicRow ?? {})).not.toContain('extracted_text_private');
  });

  it('reports a refused write instead of claiming success', async () => {
    // A reviewer cannot edit content. RLS excludes the row rather than raising,
    // so the service has to notice that nothing was affected.
    const [peptide] = await query<{ id: string; short_description: string | null }>(
      db,
      `select id, short_description from peptides where slug = 'semax'`,
    );

    const result = await updatePeptideSummaries(
      db,
      sessionFor(staff.clinical, 'clinical_reviewer'),
      {
        peptideId: peptide!.id,
        shortDescription: 'Should not be saved.',
        simpleSummary: null,
        practitionerSummary: null,
        unknownsSummary: null,
        sequence: null,
        molecularDescription: null,
      },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/refused/i);

    const [row] = await query<{ short_description: string | null }>(
      db,
      `select short_description from peptides where id = $1`,
      [peptide!.id],
    );
    // Unchanged, whatever the seeded record held: the assertion is about the
    // refused write, not about which compounds have descriptions yet.
    expect(row?.short_description).toBe(peptide!.short_description);
  });

  it('translates a duplicate key into a sentence an editor can act on', async () => {
    const editor = sessionFor(staff.editor, 'editor');
    const input = {
      sourceKey: 'SRC-DUPLICATE',
      title: 'First registration',
      sourceTypeKey: 'other' as const,
      qcStatus: 'usable' as const,
      authors: [],
      year: null,
      publisher: null,
      doi: null,
      pmid: null,
      canonicalUrl: null,
      primaryRole: null,
      limitationsNotes: null,
      authorityNotes: null,
    };

    expect((await createSource(db, editor, input)).ok).toBe(true);

    const second = await createSource(db, editor, { ...input, title: 'Second registration' });
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.message).toMatch(/already exists/i);
  });

  it('keeps two sources describing the same compound as two protocol records', async () => {
    const editor = sessionFor(staff.editor, 'editor');
    const [peptide] = await query<{ id: string }>(
      db,
      `select id from peptides where slug = 'bpc-157'`,
    );

    const keys: string[] = [];
    for (const [index, title] of ['Handbook A', 'Handbook B'].entries()) {
      const source = await createSource(db, editor, {
        sourceKey: `SRC-MULTI-${String(index)}`,
        title,
        sourceTypeKey: 'practitioner_handbook',
        qcStatus: 'usable',
        authors: [],
        year: 2022,
        publisher: null,
        doi: null,
        pmid: null,
        canonicalUrl: null,
        primaryRole: null,
        limitationsNotes: null,
        authorityNotes: null,
      });
      if (!source.ok) throw new Error('source not created');

      const location = await createSourceLocation(db, editor, {
        sourceId: source.data.id,
        locatorText: `p. ${String(10 + index)}`,
        pageStart: 10 + index,
        pageEnd: null,
        chapter: null,
        section: null,
        notes: null,
      });
      if (!location.ok) throw new Error('location not created');

      const protocolKey = `MULTI-PR-${String(index)}`;
      keys.push(protocolKey);

      const protocol = await createProtocol(db, editor, {
        protocolKey,
        peptideId: peptide!.id,
        combinationName: null,
        objectiveContext: `Recovery, as described by ${title}.`,
        populationModel: 'Adults, as described by the source',
        routeKey: 'subcutaneous',
        formulation: null,
        regulatoryContext: 'Practitioner-described regimen. Not approved labelling.',
        evidenceTypeKey: 'practitioner_reference',
        amountReported: index === 0 ? '250 mcg' : '500 mcg',
        amountUnit: 'mcg',
        frequencyText: index === 0 ? 'twice daily' : 'once daily',
        timingText: null,
        durationText: null,
        cycleText: null,
        titrationText: null,
        monitoringText: null,
        contraindicationsText: null,
        safetyNotes: null,
        adverseEventsText: null,
        outcomeContext: null,
        patientVisibility: false,
      });
      if (!protocol.ok) throw new Error('protocol not created');

      expect(
        (
          await attachProtocolSource(db, editor, {
            protocolId: protocol.data.id,
            sourceId: source.data.id,
            sourceLocationId: location.data.id,
            sourceRole: 'original',
            notes: null,
          })
        ).ok,
      ).toBe(true);
    }

    const rows = await query<{ protocol_key: string; amount_reported: string }>(
      db,
      // Scoped to the two this test created. The compound packets now load
      // real source-reported regimens against the seeded cohort, so "every
      // protocol on this peptide" is no longer the same set as "the ones this
      // test made" — and the property under test is that two sources produce
      // two rows, not that the table is otherwise empty.
      `select protocol_key, amount_reported from protocols
        where peptide_id = $1 and protocol_key = any($2) order by protocol_key`,
      [peptide!.id, keys],
    );

    expect(rows.map((r) => r.protocol_key)).toEqual(keys);
    expect(rows.map((r) => r.amount_reported)).toEqual(['250 mcg', '500 mcg']);
  });

  it('refuses to publish a quality topic that does not say what its test cannot show', async () => {
    const editor = sessionFor(staff.editor, 'editor');
    const [topic] = await query<{ id: string }>(
      db,
      `select id from quality_topics where quality_key = 'hplc-purity'`,
    );

    await updateQualityTopic(db, editor, {
      qualityTopicId: topic!.id,
      shortDescription: null,
      simpleSummary: null,
      practitionerSummary: null,
      whatItProves: 'Chromatographic purity of the sample analysed.',
      whatItDoesNotProve: null,
      commonMisinterpretations: null,
    });

    const refused = await publishRecord(db, editor, 'quality_topic', topic!.id);
    expect(refused.ok).toBe(false);
    if (!refused.ok) {
      expect(refused.fieldErrors?.whatItDoesNotProve?.[0]).toMatch(/sterility/i);
    }
  });

  it('withdraws published content when a reviewer requests changes', async () => {
    const editor = sessionFor(staff.editor, 'editor');
    const [topic] = await query<{ id: string }>(
      db,
      `select id from quality_topics where quality_key = 'sterility'`,
    );

    await updateQualityTopic(db, editor, {
      qualityTopicId: topic!.id,
      shortDescription: null,
      simpleSummary: null,
      practitionerSummary: null,
      whatItProves: 'That the tested units showed no growth under the method used.',
      whatItDoesNotProve: 'It does not establish that every unit in the batch is sterile.',
      commonMisinterpretations: null,
    });

    await recordReview(db, sessionFor(staff.scientific, 'scientific_reviewer'), {
      entityType: 'quality_topic',
      entityId: topic!.id,
      reviewType: 'scientific',
      outcome: 'approved',
      comments: null,
    });

    expect((await publishRecord(db, editor, 'quality_topic', topic!.id)).ok).toBe(true);

    await recordReview(db, sessionFor(staff.scientific, 'scientific_reviewer'), {
      entityType: 'quality_topic',
      entityId: topic!.id,
      reviewType: 'scientific',
      outcome: 'changes_requested',
      comments: 'The scope of the method needs stating.',
    });

    const [row] = await query<{ editorial_state: string; needs_update: boolean }>(
      db,
      `select editorial_state, needs_update from quality_topics where id = $1`,
      [topic!.id],
    );
    // Withdrawn from the public site and flagged, but the scientific review
    // that was already given is not undone by a request for changes.
    expect(row?.editorial_state).toBe('withdrawn');
    expect(row?.needs_update).toBe(true);
  });

  it('lets an administrator grant access and refuses everyone else', async () => {
    const admin = sessionFor(staff.admin, 'admin');
    const newUserId = '11111111-2222-4333-8444-555555555555';

    const granted = await createStaffProfile(db, admin, {
      userId: newUserId,
      displayName: 'New Editor',
      email: 'new@example.org',
      role: 'editor',
    });
    expect(granted.ok).toBe(true);

    const refused = await createStaffProfile(db, sessionFor(staff.editor, 'editor'), {
      userId: '99999999-8888-4777-8666-555555555555',
      displayName: 'Should not exist',
      email: null,
      role: 'admin',
    });
    expect(refused.ok).toBe(false);

    const rows = await query(db, `select user_id from profiles where display_name = $1`, [
      'Should not exist',
    ]);
    expect(rows).toHaveLength(0);
  });

  it('refuses a withdrawal from a role that cannot edit content', async () => {
    const [peptide] = await query<{ id: string }>(
      db,
      `select id from peptides where slug = 'selank'`,
    );

    const result = await setPublicationState(
      db,
      sessionFor(staff.compliance, 'compliance_reviewer'),
      'peptide',
      peptide!.id,
      'withdrawn',
    );
    expect(result.ok).toBe(false);
  });
});
