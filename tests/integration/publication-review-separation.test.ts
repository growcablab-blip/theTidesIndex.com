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
  setPublicationState,
  type Staff,
} from '../support/fixtures';

/**
 * Publication is separated from human review (migration 0029).
 *
 * The owner decision of 24 September 2026 is that source-linked,
 * provenance-complete content may be public while accurately labelled as not
 * yet reviewed. These tests hold both halves of that in place at once, because
 * each half is dangerous without the other:
 *
 *   - if provenance stopped gating publication, unsourced assertions would go
 *     public, which is the failure the whole index exists to prevent;
 *   - if publication still implied review, or stamped a review date, the site
 *     would claim a check nobody performed.
 *
 * Every test drives the database directly rather than going through the
 * editorial interface, so the guarantee holds for every writer.
 */
describe('publication is separate from human review', () => {
  let db: TestDb;
  let staff: Staff;
  let peptideId: string;
  let sourceId: string;
  let locationId: string;

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
    peptideId = await createPeptide(db, {
      key: 'separation-compound',
      name: 'Separation Compound',
      slug: 'separation-compound',
    });
    sourceId = await createSource(db, {
      key: 'SRC-SEPARATION',
      title: 'A complete, citable source',
      sourceType: 'primary_journal_article',
      qcStatus: 'usable',
    });
    locationId = await createSourceLocation(db, sourceId, 'pp. 11–14');
  });

  /** A claim with real provenance and no reviews of any kind. */
  async function sourcedClaim(key: string): Promise<string> {
    const claimId = await createClaim(db, {
      key,
      peptideId,
      text: 'A statement that resolves to an exact page in a citable source.',
    });
    await attachClaimEvidence(db, {
      claimId,
      sourceId,
      sourceLocationId: locationId,
      evidenceType: 'academic_reference',
    });
    return claimId;
  }

  async function claimRow(claimId: string) {
    const [row] = await query<{
      publication_state: string;
      review_state: string;
      last_reviewed_at: string | null;
      published_at: string | null;
    }>(
      db,
      'select publication_state, review_state, last_reviewed_at, published_at from claims where id = $1',
      [claimId],
    );
    return row;
  }

  describe('what publication now requires', () => {
    it('publishes a provenance-complete claim that no person has reviewed', async () => {
      const claimId = await sourcedClaim('C-UNREVIEWED');

      await setPublicationState(db, 'claims', claimId, 'published');

      const row = await claimRow(claimId);
      expect(row?.publication_state).toBe('published');
      expect(row?.review_state).toBe('unreviewed');
    });

    it('publishes a record whose review has only reached "captured"', async () => {
      const claimId = await sourcedClaim('C-CAPTURED');
      await query(db, `update claims set review_state = 'captured'::review_state where id = $1`, [
        claimId,
      ]);

      await setPublicationState(db, 'claims', claimId, 'published');

      const row = await claimRow(claimId);
      expect(row?.publication_state).toBe('published');
      expect(row?.review_state).toBe('captured');
    });

    it('cannot make a rejected record public', async () => {
      const claimId = await sourcedClaim('C-REJECTED');
      await query(db, `update claims set review_state = 'rejected'::review_state where id = $1`, [
        claimId,
      ]);

      // The coherence trigger coerces rather than raising: a request to publish
      // a rejected record is answered by withdrawing it. Either way the record
      // does not reach the public views, which is the guarantee that matters.
      await setPublicationState(db, 'claims', claimId, 'published');

      const row = await claimRow(claimId);
      expect(row?.publication_state).not.toBe('published');
      expect(row?.publication_state).toBe('withdrawn');

      const visible = await query(db, 'select id from public_v_claims where id = $1', [claimId]);
      expect(visible).toHaveLength(0);
    });

    it('still refuses a claim with no evidence link at all', async () => {
      const claimId = await createClaim(db, {
        key: 'C-NO-PROVENANCE',
        peptideId,
        text: 'An assertion with nothing behind it.',
      });

      await expect(setPublicationState(db, 'claims', claimId, 'published')).rejects.toThrow(
        /evidence link/i,
      );
    });

    it('still refuses a claim cited to a source marked for replacement', async () => {
      const badSourceId = await createSource(db, {
        key: 'SRC-SEPARATION-REPLACE',
        title: 'A corrupted copy awaiting replacement',
        sourceType: 'academic_textbook',
        qcStatus: 'replace',
      });
      const badLocationId = await createSourceLocation(db, badSourceId, 'p. 9');
      const claimId = await createClaim(db, {
        key: 'C-UNCITABLE',
        peptideId,
        text: 'Rests entirely on a copy that is not the registered work.',
      });
      await attachClaimEvidence(db, {
        claimId,
        sourceId: badSourceId,
        sourceLocationId: badLocationId,
        evidenceType: 'academic_reference',
      });

      await expect(setPublicationState(db, 'claims', claimId, 'published')).rejects.toThrow(
        /citable source/i,
      );
    });
  });

  /*
   * An unresolved request for changes blocks publication (migration 0030).
   *
   * This is the one thing "public without review" must not be allowed to mean.
   * Nobody having looked is silence; a reviewer having looked and objected is
   * information, and publishing over it would make the review queue decorative.
   */
  describe('an unresolved change request', () => {
    it('stops a record that would otherwise publish', async () => {
      const claimId = await sourcedClaim('C-CHANGE-REQUESTED');
      await approve(db, {
        entityType: 'claim',
        entityId: claimId,
        reviewType: 'scientific',
        reviewerId: staff.scientific,
        table: 'claims',
        outcome: 'changes_requested',
        comments: 'The scope sentence claims more than the source supports.',
      });

      await expect(setPublicationState(db, 'claims', claimId, 'published')).rejects.toThrow(
        /requested changes/i,
      );

      const row = await claimRow(claimId);
      expect(row?.publication_state).not.toBe('published');
    });

    it('is resolved by a later decision from the same reviewer', async () => {
      const claimId = await sourcedClaim('C-CHANGE-RESOLVED');
      await approve(db, {
        entityType: 'claim',
        entityId: claimId,
        reviewType: 'scientific',
        reviewerId: staff.scientific,
        table: 'claims',
        outcome: 'changes_requested',
        comments: 'Needs the population stating.',
      });
      await approve(db, {
        entityType: 'claim',
        entityId: claimId,
        reviewType: 'scientific',
        reviewerId: staff.scientific,
        table: 'claims',
        comments: 'Addressed.',
      });

      await setPublicationState(db, 'claims', claimId, 'published');
      expect((await claimRow(claimId))?.publication_state).toBe('published');
    });

    it('is not resolved by somebody else approving instead', async () => {
      const claimId = await sourcedClaim('C-CHANGE-OVERRIDDEN');
      await approve(db, {
        entityType: 'claim',
        entityId: claimId,
        reviewType: 'scientific',
        reviewerId: staff.scientific,
        table: 'claims',
        outcome: 'changes_requested',
        comments: 'This overstates the finding.',
      });
      await approve(db, {
        entityType: 'claim',
        entityId: claimId,
        reviewType: 'source_check',
        reviewerId: staff.editor,
        table: 'claims',
      });

      await expect(setPublicationState(db, 'claims', claimId, 'published')).rejects.toThrow(
        /requested changes/i,
      );
    });

    it('does not haunt a record whose wording has since been rewritten', async () => {
      // A material edit bumps the version, and the edit is itself the answer to
      // a request for changes. An objection to words that no longer exist must
      // not block the record for ever.
      const claimId = await sourcedClaim('C-CHANGE-SUPERSEDED');
      await approve(db, {
        entityType: 'claim',
        entityId: claimId,
        reviewType: 'scientific',
        reviewerId: staff.scientific,
        table: 'claims',
        outcome: 'changes_requested',
        comments: 'Rewrite the second sentence.',
      });

      await query(db, `update claims set claim_text = 'Rewritten as asked.' where id = $1`, [
        claimId,
      ]);

      await setPublicationState(db, 'claims', claimId, 'published');
      expect((await claimRow(claimId))?.publication_state).toBe('published');
    });

    it('leaves a record nobody has reviewed alone', async () => {
      const claimId = await sourcedClaim('C-NO-OBJECTION');
      await setPublicationState(db, 'claims', claimId, 'published');
      expect((await claimRow(claimId))?.publication_state).toBe('published');
    });
  });

  describe('last_reviewed_at means an actual human review', () => {
    it('is not written by publication', async () => {
      const claimId = await sourcedClaim('C-NO-FAKE-DATE');

      await setPublicationState(db, 'claims', claimId, 'published');

      const row = await claimRow(claimId);
      expect(row?.published_at).not.toBeNull();
      expect(row?.last_reviewed_at).toBeNull();
    });

    it('is written when a named person approves the record', async () => {
      const claimId = await sourcedClaim('C-REAL-REVIEW');
      await setPublicationState(db, 'claims', claimId, 'published');
      expect((await claimRow(claimId))?.last_reviewed_at).toBeNull();

      await approve(db, {
        entityType: 'claim',
        entityId: claimId,
        reviewType: 'scientific',
        reviewerId: staff.scientific,
        table: 'claims',
      });

      const row = await claimRow(claimId);
      expect(row?.last_reviewed_at).not.toBeNull();
      expect(row?.review_state).toBe('scientific_reviewed');
    });

    it('is not written by an automated approval', async () => {
      const claimId = await sourcedClaim('C-AUTOMATED');
      await setPublicationState(db, 'claims', claimId, 'published');

      const versions = await query<{ version: number }>(
        db,
        'select version from claims where id = $1',
        [claimId],
      );
      const version = versions[0]?.version;
      await query(
        db,
        `insert into reviews (entity_type, entity_id, entity_version, review_type, outcome,
                              performed_by, reviewer_user_id, comments, automated_tool)
         values ('claim', $1, $2, 'source_check', 'approved', 'automated', null, 'Automated sweep.',
                 'tides-extraction')`,
        [claimId, version],
      );

      const row = await claimRow(claimId);
      expect(row?.last_reviewed_at).toBeNull();
    });
  });

  describe('the review system is preserved, not removed', () => {
    it('keeps review history across publication', async () => {
      const claimId = await sourcedClaim('C-HISTORY');
      await approve(db, {
        entityType: 'claim',
        entityId: claimId,
        reviewType: 'source_check',
        reviewerId: staff.editor,
        table: 'claims',
      });

      await setPublicationState(db, 'claims', claimId, 'published');

      const reviews = await query<{ review_type: string; outcome: string; performed_by: string }>(
        db,
        'select review_type, outcome, performed_by from reviews where entity_id = $1',
        [claimId],
      );
      expect(reviews).toHaveLength(1);
      expect(reviews[0]?.review_type).toBe('source_check');
      expect(reviews[0]?.outcome).toBe('approved');
      expect(reviews[0]?.performed_by).toBe('human');
    });

    it('still refuses to treat an automated approval as a human one', async () => {
      const claimId = await sourcedClaim('C-NOT-HUMAN');
      const versions = await query<{ version: number }>(
        db,
        'select version from claims where id = $1',
        [claimId],
      );
      const version = versions[0]?.version;
      await query(
        db,
        `insert into reviews (entity_type, entity_id, entity_version, review_type, outcome,
                              performed_by, reviewer_user_id, comments, automated_tool)
         values ('claim', $1, $2, 'source_check', 'approved', 'automated', null, 'Automated sweep.',
                 'tides-extraction')`,
        [claimId, version],
      );

      const [row] = await query<{ approved: boolean }>(
        db,
        `select tides_has_approved_review('claim', $1, $2, 'source_check') as approved`,
        [claimId, version],
      );
      expect(row?.approved).toBe(false);

      // Stronger still: automation cannot even record the review types that
      // constitute an approval of medical content. The constraint refuses.
      await expect(
        query(
          db,
          `insert into reviews (entity_type, entity_id, entity_version, review_type, outcome,
                                performed_by, reviewer_user_id, comments, automated_tool)
           values ('claim', $1, $2, 'scientific', 'approved', 'automated', null, 'Automated.',
                   'tides-extraction')`,
          [claimId, version],
        ),
      ).rejects.toThrow(/automation_scope/i);
    });
  });

  describe('protocols', () => {
    /** The highest-consequence surface: attribution must not have moved. */
    async function sourcedProtocol(key: string): Promise<string> {
      const protocolId = await createProtocol(db, {
        key,
        peptideId,
        objectiveContext: 'Recovery support, as framed by the source',
        populationModel: 'Adults, as described by the source',
        routeKey: 'subcutaneous',
        regulatoryContext: 'Practitioner-described regimen. Not approved labelling.',
      });
      await attachProtocolSource(db, {
        protocolId,
        sourceId,
        sourceLocationId: locationId,
        role: 'original',
      });
      return protocolId;
    }

    it('publishes an attributable regimen with no clinical review', async () => {
      const protocolId = await sourcedProtocol('PR-UNREVIEWED');

      await setPublicationState(db, 'protocols', protocolId, 'published');

      const [row] = await query<{ publication_state: string; last_reviewed_at: string | null }>(
        db,
        'select publication_state, last_reviewed_at from protocols where id = $1',
        [protocolId],
      );
      expect(row?.publication_state).toBe('published');
      expect(row?.last_reviewed_at).toBeNull();
    });

    it('still refuses a regimen with no source location', async () => {
      const protocolId = await createProtocol(db, {
        key: 'PR-NO-PROVENANCE',
        peptideId,
        objectiveContext: 'Recovery support, as framed by the source',
        populationModel: 'Adults',
        routeKey: 'subcutaneous',
        regulatoryContext: 'Practitioner-described regimen.',
      });

      await expect(setPublicationState(db, 'protocols', protocolId, 'published')).rejects.toThrow(
        /citable source|exact source location/i,
      );
    });

    it('still refuses a regimen that does not say which population it was reported in', async () => {
      const protocolId = await createProtocol(db, {
        key: 'PR-NO-POPULATION',
        peptideId,
        objectiveContext: 'Recovery support, as framed by the source',
        populationModel: null,
        routeKey: 'subcutaneous',
        regulatoryContext: 'Practitioner-described regimen.',
      });
      await attachProtocolSource(db, {
        protocolId,
        sourceId,
        sourceLocationId: locationId,
        role: 'original',
      });

      await expect(setPublicationState(db, 'protocols', protocolId, 'published')).rejects.toThrow(
        /population_model/i,
      );
    });
  });

  describe('the public relations carry the review state', () => {
    it('publishes a compound together with how far it has been checked', async () => {
      await query(
        db,
        `update peptides set simple_summary = 'A plain-language summary.',
                             unknowns_summary = 'What is not established.'
          where id = $1`,
        [peptideId],
      );

      await setPublicationState(db, 'peptides', peptideId, 'published');

      const [row] = await query<{ review_state: string; last_reviewed_at: string | null }>(
        db,
        'select review_state, last_reviewed_at from public_v_peptides where id = $1',
        [peptideId],
      );
      expect(row?.review_state).toBe('unreviewed');
      expect(row?.last_reviewed_at).toBeNull();
    });
  });
});
