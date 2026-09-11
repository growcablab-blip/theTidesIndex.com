import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { seedDatabase } from '@db/seed';
import { getClaimGateStatus, getProtocolGateStatus } from '@/server/editorial/gate-status';
import {
  closeTestDb,
  createTestDb,
  query,
  rejectionMessage,
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
  type Staff,
} from '../support/fixtures';

/**
 * The publish rules exist twice: as database triggers, which enforce them, and
 * as pure functions in src/domain/publishing/gates.ts, which the editorial
 * interface uses to explain what is missing before an editor presses Publish.
 *
 * Two implementations of a safety rule will drift unless something holds them
 * together. This suite is that thing: for each scenario it asks the domain
 * layer whether the record can publish, then asks the database to publish it,
 * and requires the two answers to agree.
 *
 * A divergence in either direction is a defect. If the domain layer is more
 * permissive, an editor is told they may publish and then hits a raw constraint
 * violation. If it is stricter, the interface blocks work the rules allow.
 */
describe('publish gate parity between the domain layer and the database', () => {
  let db: TestDb;
  let staff: Staff;
  let peptideId: string;
  let citableSourceId: string;
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
      key: 'parity-compound',
      name: 'Parity Compound',
      slug: 'parity-compound',
    });
    citableSourceId = await createSource(db, {
      key: 'SRC-PARITY',
      title: 'A citable source',
      sourceType: 'primary_journal_article',
    });
    locationId = await createSourceLocation(db, citableSourceId, 'pp. 1–2');
  });

  /** Attempts publication and reports whether the database allowed it. */
  async function databaseAllowsPublish(table: string, id: string): Promise<boolean> {
    const message = await rejectionMessage(
      db.execute(
        sql.raw(`update ${table} set publication_state = 'published' where id = '${id}'`),
      ),
    ).catch(() => null);
    return message === null;
  }

  describe('claims', () => {
    const scenarios = [
      { name: 'nothing attached', evidence: 'none', reviews: [] as const },
      { name: 'evidence without a locator', evidence: 'no-locator', reviews: [] as const },
      { name: 'full provenance, no reviews', evidence: 'full', reviews: [] as const },
      {
        name: 'full provenance, source check only',
        evidence: 'full',
        reviews: ['source_check'] as const,
      },
      {
        name: 'full provenance, fully reviewed',
        evidence: 'full',
        reviews: ['source_check', 'scientific'] as const,
      },
      {
        name: 'non-citable source, fully reviewed',
        evidence: 'non-citable',
        reviews: ['source_check', 'scientific'] as const,
      },
    ];

    for (const scenario of scenarios) {
      it(`agrees for: ${scenario.name}`, async () => {
        const claimId = await createClaim(db, {
          key: `C-PARITY-${scenario.name.replace(/\W+/g, '-')}`,
          peptideId,
          text: 'A claim under test.',
        });

        if (scenario.evidence === 'no-locator') {
          await attachClaimEvidence(db, {
            claimId,
            sourceId: citableSourceId,
            sourceLocationId: null,
            evidenceType: 'human_rct',
          });
        } else if (scenario.evidence === 'full') {
          await attachClaimEvidence(db, {
            claimId,
            sourceId: citableSourceId,
            sourceLocationId: locationId,
            evidenceType: 'human_rct',
          });
        } else if (scenario.evidence === 'non-citable') {
          const badSourceId = await createSource(db, {
            key: `SRC-BAD-${scenario.name.replace(/\W+/g, '-')}`,
            title: 'A copy awaiting replacement',
            sourceType: 'academic_textbook',
            qcStatus: 'replace',
          });
          const badLocation = await createSourceLocation(db, badSourceId, 'p. 5');
          await attachClaimEvidence(db, {
            claimId,
            sourceId: badSourceId,
            sourceLocationId: badLocation,
            evidenceType: 'academic_reference',
          });
        }

        for (const reviewType of scenario.reviews) {
          await approve(db, {
            entityType: 'claim',
            entityId: claimId,
            reviewType,
            reviewerId: reviewType === 'scientific' ? staff.scientific : staff.editor,
            table: 'claims',
          });
        }

        const status = await getClaimGateStatus(db, claimId);
        expect(status).not.toBeNull();

        const allowed = await databaseAllowsPublish('claims', claimId);
        expect(
          allowed,
          `domain said canPublish=${String(status?.canPublish)} but the database said ${String(allowed)}. ` +
            `Failures: ${status?.failures.map((f) => f.code).join(', ') ?? ''}`,
        ).toBe(status?.canPublish);
      });
    }
  });

  describe('protocols', () => {
    const scenarios = [
      { name: 'nothing attached', provenance: false, complete: true, reviews: [] as const },
      {
        name: 'provenance but no population',
        provenance: true,
        complete: false,
        reviews: ['source_check', 'scientific', 'clinical', 'compliance'] as const,
      },
      {
        name: 'complete but only partly reviewed',
        provenance: true,
        complete: true,
        reviews: ['source_check', 'scientific'] as const,
      },
      {
        name: 'complete and fully reviewed',
        provenance: true,
        complete: true,
        reviews: ['source_check', 'scientific', 'clinical', 'compliance'] as const,
      },
    ];

    for (const scenario of scenarios) {
      it(`agrees for: ${scenario.name}`, async () => {
        const protocolId = await createProtocol(db, {
          key: `P-PARITY-${scenario.name.replace(/\W+/g, '-')}`,
          peptideId,
          objectiveContext: 'A regimen under test.',
          populationModel: scenario.complete ? 'Adult humans' : null,
        });

        if (scenario.provenance) {
          await attachProtocolSource(db, {
            protocolId,
            sourceId: citableSourceId,
            sourceLocationId: locationId,
          });
        }

        const reviewerFor: Record<string, string> = {
          source_check: staff.editor,
          scientific: staff.scientific,
          clinical: staff.clinical,
          compliance: staff.compliance,
        };

        for (const reviewType of scenario.reviews) {
          await approve(db, {
            entityType: 'protocol',
            entityId: protocolId,
            reviewType,
            reviewerId: reviewerFor[reviewType]!,
            table: 'protocols',
          });
        }

        const status = await getProtocolGateStatus(db, protocolId);
        const allowed = await databaseAllowsPublish('protocols', protocolId);

        expect(
          allowed,
          `domain said canPublish=${String(status?.canPublish)} but the database said ${String(allowed)}. ` +
            `Failures: ${status?.failures.map((f) => f.code).join(', ') ?? ''}`,
        ).toBe(status?.canPublish);
      });
    }
  });

  it('reports the specific gaps rather than a bare refusal', async () => {
    const claimId = await createClaim(db, {
      key: 'C-PARITY-GAPS',
      peptideId,
      text: 'A critical claim with nothing in place.',
      importance: 'critical',
      interpretationNotes: null,
      uncertaintyText: null,
    });

    const status = await getClaimGateStatus(db, claimId);
    const codes = status?.failures.map((f) => f.code) ?? [];

    expect(codes).toContain('missing_provenance');
    expect(codes).toContain('missing_interpretation');
    expect(codes).toContain('missing_uncertainty');
    expect(codes).toContain('missing_compliance_review');
    for (const failure of status?.failures ?? []) {
      expect(failure.message.length, failure.code).toBeGreaterThan(10);
      expect(failure.field.length, failure.code).toBeGreaterThan(0);
    }
  });

  it('invalidates the gate status when the record is edited after review', async () => {
    const claimId = await createClaim(db, {
      key: 'C-PARITY-REVISED',
      peptideId,
      text: 'Original.',
    });
    await attachClaimEvidence(db, {
      claimId,
      sourceId: citableSourceId,
      sourceLocationId: locationId,
      evidenceType: 'human_rct',
    });
    for (const [reviewType, reviewerId] of [
      ['source_check', staff.editor],
      ['scientific', staff.scientific],
    ] as const) {
      await approve(db, {
        entityType: 'claim',
        entityId: claimId,
        reviewType,
        reviewerId,
        table: 'claims',
      });
    }

    expect((await getClaimGateStatus(db, claimId))?.canPublish).toBe(true);

    await query(db, `update claims set claim_text = 'Rewritten.' where id = $1`, [claimId]);

    const after = await getClaimGateStatus(db, claimId);
    expect(after?.canPublish).toBe(false);
    expect(after?.version).toBe(2);
    expect(after?.approvedReviews).toEqual([]);
  });
});
