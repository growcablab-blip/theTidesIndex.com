import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { seedDatabase } from '@db/seed';
import {
  closeTestDb,
  createTestDb,
  query,
  truncateContent,
  type TestDb,
} from '../support/test-db';
import {
  approve,
  attachClaimEvidence,
  attachProtocolSource,
  createClaim,
  createPeptide,
  createProtocol,
  createSource,
  createSourceLocation,
  createStaff,
  publishClaim,
  publishProtocol,
  setWorkflowStatus,
  type Staff,
} from '../support/fixtures';

/**
 * ACCEPTANCE_TESTS.md section A — data and provenance.
 *
 * Each test drives the database directly. If a gate can be bypassed by writing
 * straight to a table, these tests fail, which is the point: the guarantee has
 * to hold for every writer, not only for the admin UI.
 */
describe('publish gates', () => {
  let db: TestDb;
  let staff: Staff;
  let peptideId: string;
  let usableSourceId: string;
  let usableLocationId: string;

  beforeAll(async () => {
    db = await createTestDb();
  });

  afterAll(async () => {
    await closeTestDb(db);
  });

  // One database per suite, emptied between tests. Each test still starts from
  // a clean, freshly seeded state; only the Postgres image is reused.
  beforeEach(async () => {
    await truncateContent(db);
    await seedDatabase(db);
    staff = await createStaff(db);
    peptideId = await createPeptide(db, {
      key: 'test-compound',
      name: 'Test Compound',
      slug: 'test-compound',
    });
    usableSourceId = await createSource(db, {
      key: 'SRC-TEST-USABLE',
      title: 'A complete, citable source',
      sourceType: 'primary_journal_article',
      qcStatus: 'usable',
    });
    usableLocationId = await createSourceLocation(db, usableSourceId, 'pp. 101–104');
  });

  describe('claims', () => {
    it('refuses publication without any evidence link', async () => {
      const claimId = await createClaim(db, {
        key: 'C-NO-EVIDENCE',
        peptideId,
        text: 'An assertion with nothing behind it.',
      });

      await expect(publishClaim(db, claimId, staff)).rejects.toThrow(
        /needs at least one evidence link/i,
      );
    });

    it('refuses publication when the evidence has no exact source location', async () => {
      const claimId = await createClaim(db, {
        key: 'C-NO-LOCATOR',
        peptideId,
        text: 'Cited to a whole book rather than a page.',
      });
      await attachClaimEvidence(db, {
        claimId,
        sourceId: usableSourceId,
        sourceLocationId: null,
        evidenceType: 'academic_reference',
      });

      await expect(publishClaim(db, claimId, staff)).rejects.toThrow(/exact location/i);
    });

    it('refuses a source marked for replacement as provenance', async () => {
      // ACCEPTANCE_TESTS.md A.4. SRC-013/014/015 are corrupted or partial copies.
      const badSourceId = await createSource(db, {
        key: 'SRC-TEST-REPLACE',
        title: 'A corrupted copy awaiting replacement',
        sourceType: 'academic_textbook',
        qcStatus: 'replace',
      });
      const badLocationId = await createSourceLocation(db, badSourceId, 'p. 12');

      const claimId = await createClaim(db, {
        key: 'C-BAD-SOURCE',
        peptideId,
        text: 'Rests entirely on a source that is not authoritative.',
      });
      await attachClaimEvidence(db, {
        claimId,
        sourceId: badSourceId,
        sourceLocationId: badLocationId,
        evidenceType: 'academic_reference',
      });

      await expect(publishClaim(db, claimId, staff)).rejects.toThrow(/citable source/i);
    });

    it('refuses a high-importance claim that does not state its uncertainty', async () => {
      const claimId = await createClaim(db, {
        key: 'C-NO-UNCERTAINTY',
        peptideId,
        text: 'A safety-relevant assertion.',
        importance: 'critical',
        uncertaintyText: null,
      });
      await attachClaimEvidence(db, {
        claimId,
        sourceId: usableSourceId,
        sourceLocationId: usableLocationId,
        evidenceType: 'human_rct',
      });

      await expect(publishClaim(db, claimId, staff)).rejects.toThrow(/remains uncertain/i);
    });

    it('refuses publication without an approved scientific review', async () => {
      const claimId = await createClaim(db, {
        key: 'C-NO-REVIEW',
        peptideId,
        text: 'Never seen by a reviewer.',
      });
      await attachClaimEvidence(db, {
        claimId,
        sourceId: usableSourceId,
        sourceLocationId: usableLocationId,
        evidenceType: 'human_rct',
      });
      await approve(db, {
        entityType: 'claim',
        entityId: claimId,
        reviewType: 'source_check',
        reviewerId: staff.editor,
        table: 'claims',
      });

      await expect(setWorkflowStatus(db, 'claims', claimId, 'published')).rejects.toThrow(
        /scientific review/i,
      );
    });

    it('publishes when provenance, uncertainty and review are all present', async () => {
      const claimId = await createClaim(db, {
        key: 'C-GOOD',
        peptideId,
        text: 'A well-supported assertion.',
        importance: 'high',
        uncertaintyText: 'Replication is limited and the population studied was narrow.',
      });
      await attachClaimEvidence(db, {
        claimId,
        sourceId: usableSourceId,
        sourceLocationId: usableLocationId,
        evidenceType: 'human_rct',
      });

      await publishClaim(db, claimId, staff);

      const [row] = await query<{ workflow_status: string; published_at: string | null }>(
        db,
        `select workflow_status, published_at from claims where id = $1`,
        [claimId],
      );
      expect(row?.workflow_status).toBe('published');
      expect(row?.published_at).not.toBeNull();
    });

    it('exempts editorial, non-evidentiary copy from provenance but not from review', async () => {
      const [row] = await query<{ id: string }>(
        db,
        `insert into claims (claim_key, claim_text, is_editorial_non_evidentiary, interpretation_notes)
         values ('C-EDITORIAL', 'How to read this site.', true, 'Site copy.') returning id`,
      );
      const claimId = row!.id;

      await expect(setWorkflowStatus(db, 'claims', claimId, 'published')).rejects.toThrow(
        /scientific review/i,
      );

      await approve(db, {
        entityType: 'claim',
        entityId: claimId,
        reviewType: 'scientific',
        reviewerId: staff.scientific,
        table: 'claims',
      });
      await setWorkflowStatus(db, 'claims', claimId, 'published');

      const [published] = await query<{ workflow_status: string }>(
        db,
        `select workflow_status from claims where id = $1`,
        [claimId],
      );
      expect(published?.workflow_status).toBe('published');
    });

    it('invalidates approvals when the claim is rewritten after review', async () => {
      const claimId = await createClaim(db, {
        key: 'C-REWRITTEN',
        peptideId,
        text: 'Original wording.',
      });
      await attachClaimEvidence(db, {
        claimId,
        sourceId: usableSourceId,
        sourceLocationId: usableLocationId,
        evidenceType: 'human_rct',
      });
      await publishClaim(db, claimId, staff);

      // Rewriting the text bumps the version, which strands the approvals.
      await query(db, `update claims set claim_text = 'Materially different wording.' where id = $1`, [
        claimId,
      ]);
      await setWorkflowStatus(db, 'claims', claimId, 'needs_update');

      await expect(setWorkflowStatus(db, 'claims', claimId, 'published')).rejects.toThrow(
        /source check|scientific review/i,
      );
    });
  });

  describe('protocols', () => {
    it('refuses publication without source provenance', async () => {
      const protocolId = await createProtocol(db, {
        key: 'P-NO-SOURCE',
        peptideId,
        objectiveContext: 'Post-operative recovery.',
      });

      await expect(publishProtocol(db, protocolId, staff)).rejects.toThrow(/citable source/i);
    });

    it('refuses publication without a population or model', async () => {
      const protocolId = await createProtocol(db, {
        key: 'P-NO-POPULATION',
        peptideId,
        objectiveContext: 'Tendon healing.',
        populationModel: null,
      });
      await attachProtocolSource(db, {
        protocolId,
        sourceId: usableSourceId,
        sourceLocationId: usableLocationId,
      });

      await expect(publishProtocol(db, protocolId, staff)).rejects.toThrow(/population_model/i);
    });

    it('refuses publication without regulatory framing', async () => {
      const protocolId = await createProtocol(db, {
        key: 'P-NO-CONTEXT',
        peptideId,
        objectiveContext: 'Tendon healing.',
        regulatoryContext: null,
      });
      await attachProtocolSource(db, {
        protocolId,
        sourceId: usableSourceId,
        sourceLocationId: usableLocationId,
      });

      await expect(publishProtocol(db, protocolId, staff)).rejects.toThrow(/regulatory_context/i);
    });

    it('requires scientific, clinical and compliance approval', async () => {
      const protocolId = await createProtocol(db, {
        key: 'P-PARTIAL-REVIEW',
        peptideId,
        objectiveContext: 'Tendon healing.',
      });
      await attachProtocolSource(db, {
        protocolId,
        sourceId: usableSourceId,
        sourceLocationId: usableLocationId,
      });

      for (const [reviewType, reviewerId] of [
        ['source_check', staff.editor],
        ['scientific', staff.scientific],
      ] as const) {
        await approve(db, {
          entityType: 'protocol',
          entityId: protocolId,
          reviewType,
          reviewerId,
          table: 'protocols',
        });
      }

      await expect(setWorkflowStatus(db, 'protocols', protocolId, 'published')).rejects.toThrow(
        /clinical review/i,
      );
    });

    it('keeps protocols from different sources side by side without merging them', async () => {
      // The central editorial rule: two sources describing the same compound
      // produce two records, permanently distinguishable by source.
      const secondSourceId = await createSource(db, {
        key: 'SRC-TEST-SECOND',
        title: 'A second practitioner handbook',
        sourceType: 'practitioner_handbook',
      });
      const secondLocationId = await createSourceLocation(db, secondSourceId, 'pp. 40–41');

      const first = await createProtocol(db, {
        key: 'P-SOURCE-A',
        peptideId,
        objectiveContext: 'Tendon healing, as described by source A.',
        amountReported: '250 mcg',
        frequencyText: 'twice daily',
      });
      await attachProtocolSource(db, {
        protocolId: first,
        sourceId: usableSourceId,
        sourceLocationId: usableLocationId,
      });
      await publishProtocol(db, first, staff);

      const second = await createProtocol(db, {
        key: 'P-SOURCE-B',
        peptideId,
        objectiveContext: 'Tendon healing, as described by source B.',
        amountReported: '500 mcg',
        frequencyText: 'once daily',
      });
      await attachProtocolSource(db, {
        protocolId: second,
        sourceId: secondSourceId,
        sourceLocationId: secondLocationId,
      });
      await publishProtocol(db, second, staff);

      const rows = await query<{ protocol_key: string; amount_reported: string }>(
        db,
        `select protocol_key, amount_reported from public_v_protocol_practitioner
         where peptide_id = $1 order by protocol_key`,
        [peptideId],
      );

      expect(rows).toHaveLength(2);
      expect(rows.map((r) => r.amount_reported)).toEqual(['250 mcg', '500 mcg']);
    });
  });

  describe('provenance cannot be removed from under published content', () => {
    it('withdraws a published claim when its last evidence link is deleted', async () => {
      const claimId = await createClaim(db, {
        key: 'C-ORPHANED',
        peptideId,
        text: 'Supported, for now.',
      });
      const evidenceId = await attachClaimEvidence(db, {
        claimId,
        sourceId: usableSourceId,
        sourceLocationId: usableLocationId,
        evidenceType: 'human_rct',
      });
      await publishClaim(db, claimId, staff);

      await query(db, `delete from claim_evidence where id = $1`, [evidenceId]);

      const [row] = await query<{ workflow_status: string }>(
        db,
        `select workflow_status from claims where id = $1`,
        [claimId],
      );
      expect(row?.workflow_status).toBe('needs_update');
    });

    it('withdraws published content when its source stops being citable', async () => {
      const claimId = await createClaim(db, {
        key: 'C-SOURCE-DOWNGRADED',
        peptideId,
        text: 'Rests on a source later found to be corrupted.',
      });
      await attachClaimEvidence(db, {
        claimId,
        sourceId: usableSourceId,
        sourceLocationId: usableLocationId,
        evidenceType: 'academic_reference',
      });
      await publishClaim(db, claimId, staff);

      await query(db, `update sources set qc_status = 'replace' where id = $1`, [usableSourceId]);

      const [row] = await query<{ workflow_status: string }>(
        db,
        `select workflow_status from claims where id = $1`,
        [claimId],
      );
      expect(row?.workflow_status).toBe('needs_update');

      const visible = await query(db, `select id from public_v_claims where id = $1`, [claimId]);
      expect(visible).toHaveLength(0);
    });
  });

  describe('revision history', () => {
    it('records every material change with the prior state', async () => {
      const claimId = await createClaim(db, {
        key: 'C-HISTORY',
        peptideId,
        text: 'First wording.',
      });
      await query(db, `update claims set claim_text = 'Second wording.' where id = $1`, [claimId]);
      await query(db, `update claims set claim_text = 'Third wording.' where id = $1`, [claimId]);

      const rows = await query<{ version: number; snapshot: { claim_text: string } }>(
        db,
        `select version, snapshot from revisions
         where entity_type = 'claim' and entity_id = $1 order by version`,
        [claimId],
      );

      expect(rows).toHaveLength(2);
      expect(rows[0]?.snapshot.claim_text).toBe('First wording.');
      expect(rows[1]?.snapshot.claim_text).toBe('Second wording.');
    });
  });
});
