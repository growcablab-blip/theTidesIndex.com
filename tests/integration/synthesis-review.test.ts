import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { seedDatabase } from '@db/seed';
import { loadSyntheses } from '@db/seed/syntheses';
import type { SynthesisSeed } from '@db/seed/seed-data';
import { listSynthesesAwaitingScientificReview } from '@/server/editorial/synthesis-review';
import {
  closeTestDb,
  createTestDb,
  query,
  rejectionMessage,
  truncateContent,
  type TestDb,
} from '../support/test-db';
import {
  attachClaimEvidence,
  createClaim,
  createPeptide,
  createSource,
  createSourceLocation,
  createStaff,
  publishClaim,
  type Staff,
} from '../support/fixtures';

/**
 * Human scientific review for Tides syntheses (migration 0028).
 *
 * A synthesis about a compound, or one interpreting mechanism, efficacy, safety,
 * clinical meaning or a protocol, is published only on an approved human
 * scientific review of its current version. A general synthesis on a learning
 * topic keeps the mechanical rules.
 *
 * Every synthesis here is demonstration text about a fictional compound. It
 * exercises the mechanics and says nothing about any real substance.
 */

const DEMO_TEXT = {
  statement: 'Demonstration wording used only to exercise review mechanics.',
  plain: 'Demonstration wording. It describes nothing real.',
  reasoning: 'Test fixture: the two linked demonstration claims exist only in this suite.',
  limit: 'It concludes nothing about any compound, real or fictional.',
};

describe('scientific review of Tides syntheses', () => {
  let db: TestDb;
  let staff: Staff;
  let peptideId: string;
  let claimIds: string[];

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
      key: 'demo-compound-syn',
      name: 'Demonstration Compound',
      slug: 'demo-compound-syn',
    });
    const sourceId = await createSource(db, {
      key: 'SRC-SYN-DEMO',
      title: 'A demonstration source',
      sourceType: 'primary_journal_article',
    });
    const locationId = await createSourceLocation(db, sourceId, 'Demonstration locator');
    claimIds = [];
    for (const key of ['SYN-DEMO-C1', 'SYN-DEMO-C2']) {
      const claimId = await createClaim(db, {
        key,
        peptideId,
        text: 'A demonstration assertion.',
      });
      await attachClaimEvidence(db, {
        claimId,
        sourceId,
        sourceLocationId: locationId,
        evidenceType: 'human_rct',
      });
      await publishClaim(db, claimId, staff);
      claimIds.push(claimId);
    }
  });

  async function learningTopicId(): Promise<string> {
    const [row] = await query<{ id: string }>(db, `select id from learning_topics order by topic_key limit 1`);
    return row!.id;
  }

  async function draft(
    key: string,
    subject: { peptide: string } | { learning: string },
    kind = 'general',
  ): Promise<string> {
    const [row] = await query<{ id: string }>(
      db,
      `insert into editorial_syntheses (synthesis_key, peptide_id, learning_topic_id, statement,
         plain_language_text, reasoning, does_not_conclude, interpretation_kind)
       values ($1, $2, $3, $4, $5, $6, $7, $8::synthesis_interpretation_kind) returning id`,
      [
        key,
        'peptide' in subject ? subject.peptide : null,
        'learning' in subject ? subject.learning : null,
        DEMO_TEXT.statement,
        DEMO_TEXT.plain,
        DEMO_TEXT.reasoning,
        DEMO_TEXT.limit,
        kind,
      ],
    );
    for (const [i, claimId] of claimIds.entries()) {
      await query(
        db,
        `insert into editorial_synthesis_claims (synthesis_id, claim_id, sort_order) values ($1, $2, $3)`,
        [row!.id, claimId, i],
      );
    }
    return row!.id;
  }

  async function synthesis(id: string) {
    const [row] = await query<{ version: number; publication_state: string }>(
      db,
      `select version, publication_state::text from editorial_syntheses where id = $1`,
      [id],
    );
    return row!;
  }

  async function review(
    id: string,
    reviewerId: string,
    outcome: 'approved' | 'changes_requested' | 'rejected' = 'approved',
    options: { version?: number; reviewType?: string } = {},
  ): Promise<void> {
    const version = options.version ?? (await synthesis(id)).version;
    await query(
      db,
      `insert into reviews (entity_type, entity_id, entity_version, review_type, performed_by,
         reviewer_user_id, outcome, comments)
       values ('editorial_synthesis', $1, $2, $3::review_type, 'human', $4, $5::review_outcome,
         'Demonstration review.')`,
      [id, version, options.reviewType ?? 'scientific', reviewerId, outcome],
    );
  }

  const publish = (id: string) =>
    query(db, `update editorial_syntheses set publication_state = 'published' where id = $1`, [id]);

  it('refuses to publish a compound synthesis without a human scientific review', async () => {
    const id = await draft('SYN-DEMO-01', { peptide: peptideId }, 'mechanism');
    expect(await rejectionMessage(publish(id))).toMatch(/requires an approved human scientific review/);
    expect((await synthesis(id)).publication_state).toBe('unpublished');
  });

  it('treats a compound synthesis as requiring review even when declared general', async () => {
    const id = await draft('SYN-DEMO-02', { peptide: peptideId }, 'general');
    expect(await rejectionMessage(publish(id))).toMatch(/human scientific review/);
  });

  it('publishes on an approval at the current version, and publication does not strand it', async () => {
    const id = await draft('SYN-DEMO-03', { peptide: peptideId }, 'efficacy');
    await review(id, staff.scientific);
    const before = await synthesis(id);
    await publish(id);
    const after = await synthesis(id);
    expect(after.publication_state).toBe('published');
    expect(after.version).toBe(before.version);
  });

  it('does not count an approval of an earlier version after an edit', async () => {
    const id = await draft('SYN-DEMO-04', { peptide: peptideId }, 'safety');
    await review(id, staff.scientific);
    const reviewed = await synthesis(id);
    await query(db, `update editorial_syntheses set reasoning = reasoning || ' Revised.' where id = $1`, [id]);
    expect((await synthesis(id)).version).toBeGreaterThan(reviewed.version);
    expect(await rejectionMessage(publish(id))).toMatch(/awaiting_scientific_review/);
  });

  it('withdraws a live synthesis whose wording changes after approval', async () => {
    const id = await draft('SYN-DEMO-05', { peptide: peptideId }, 'mechanism');
    await review(id, staff.scientific);
    await publish(id);
    await query(db, `update editorial_syntheses set reasoning = reasoning || ' Revised.' where id = $1`, [id]);
    expect((await synthesis(id)).publication_state).toBe('withdrawn');
  });

  it('treats the claims a synthesis rests on as part of what was reviewed', async () => {
    const id = await draft('SYN-DEMO-06', { peptide: peptideId }, 'mechanism');
    const before = await synthesis(id);
    await query(db, `delete from editorial_synthesis_claims where synthesis_id = $1 and claim_id = $2`, [
      id,
      claimIds[1],
    ]);
    expect((await synthesis(id)).version).toBeGreaterThan(before.version);
  });

  it('refuses a synthesis review from anyone but an active scientific reviewer', async () => {
    const id = await draft('SYN-DEMO-07', { peptide: peptideId }, 'mechanism');
    for (const reviewer of [staff.admin, staff.editor, staff.clinical, staff.compliance]) {
      expect(await rejectionMessage(review(id, reviewer))).toMatch(/active scientific reviewer/);
    }
    await query(db, `update profiles set is_active = false where user_id = $1`, [staff.scientific]);
    expect(await rejectionMessage(review(id, staff.scientific))).toMatch(/active scientific reviewer/);
  });

  it('refuses a non-scientific review type, and a review naming a version not stored', async () => {
    const id = await draft('SYN-DEMO-08', { peptide: peptideId }, 'mechanism');
    expect(await rejectionMessage(review(id, staff.scientific, 'approved', { reviewType: 'clinical' }))).toMatch(
      /reviewed by a person, scientifically/,
    );
    const { version } = await synthesis(id);
    expect(
      await rejectionMessage(review(id, staff.scientific, 'approved', { version: version + 1 })),
    ).toMatch(/must name the version it read/);
  });

  it('does not publish on changes requested or a rejection, even beside an approval', async () => {
    const changes = await draft('SYN-DEMO-09', { peptide: peptideId }, 'clinical_interpretation');
    await review(changes, staff.scientific, 'changes_requested');
    expect(await rejectionMessage(publish(changes))).toMatch(/changes_requested/);

    const rejected = await draft('SYN-DEMO-10', { peptide: peptideId }, 'protocol_interpretation');
    await review(rejected, staff.scientific, 'approved');
    await review(rejected, staff.scientific, 'rejected');
    expect(await rejectionMessage(publish(rejected))).toMatch(/rejected/);
  });

  it('keeps a review record from being rewritten', async () => {
    const id = await draft('SYN-DEMO-11', { peptide: peptideId }, 'mechanism');
    await review(id, staff.scientific, 'rejected');
    expect(
      await rejectionMessage(
        query(db, `update reviews set outcome = 'approved' where entity_id = $1`, [id]),
      ),
    ).toMatch(/cannot be altered/);
  });

  it('still publishes a general synthesis on a learning topic mechanically', async () => {
    const id = await draft('SYN-DEMO-12', { learning: await learningTopicId() }, 'general');
    await publish(id);
    expect((await synthesis(id)).publication_state).toBe('published');
    const [reviews] = await query<{ n: number }>(
      db,
      `select count(*)::int as n from reviews where entity_id = $1`,
      [id],
    );
    expect(reviews!.n).toBe(0);
  });

  it('hides a review-requiring synthesis from the public view once its approval no longer stands', async () => {
    const topicId = await learningTopicId();
    // Learning topics are not emptied between suites; restore the state taken.
    await query(db, `update learning_topics set publication_state = 'published' where id = $1`, [topicId]);
    try {
      const id = await draft('SYN-DEMO-13', { learning: topicId }, 'mechanism');
      await review(id, staff.scientific);
      await publish(id);
      const visible = async () =>
        (
          await query<{ n: number }>(
            db,
            `select count(*)::int as n from public_v_editorial_syntheses where id = $1`,
            [id],
          )
        )[0]!.n;
      expect(await visible()).toBe(1);

      // Published, but a rejection now stands at the same version.
      await review(id, staff.scientific, 'rejected');
      expect((await synthesis(id)).publication_state).toBe('published');
      expect(await visible()).toBe(0);
    } finally {
      await query(db, `update learning_topics set publication_state = 'unpublished' where id = $1`, [topicId]);
    }
  });

  it('lists review-requiring syntheses without a standing approval for editors', async () => {
    const awaiting = await draft('SYN-DEMO-14', { peptide: peptideId }, 'mechanism');
    const changes = await draft('SYN-DEMO-15', { peptide: peptideId }, 'safety');
    const approved = await draft('SYN-DEMO-16', { peptide: peptideId }, 'efficacy');
    await review(changes, staff.scientific, 'changes_requested');
    await review(approved, staff.scientific, 'approved');

    const items = await listSynthesesAwaitingScientificReview(db);
    const keys = items.map((i) => i.synthesisKey);
    expect(keys).toContain('SYN-DEMO-14');
    expect(keys).toContain('SYN-DEMO-15');
    expect(keys).not.toContain('SYN-DEMO-16');
    // Foundational syntheses need no scientific review and are never listed.
    expect(keys.some((k) => !k.startsWith('SYN-DEMO-'))).toBe(false);

    const first = items.find((i) => i.id === changes)!;
    expect(first.reviewState).toBe('changes_requested');
    expect(first.latestReview?.outcome).toBe('changes_requested');
    expect(first.subjectKind).toBe('peptide');
    expect(items.find((i) => i.id === awaiting)?.reviewState).toBe('awaiting_scientific_review');

    const [state] = await query<{ s: string }>(
      db,
      `select tides_synthesis_review_state(id) as s from editorial_syntheses where synthesis_key = 'SYN-PEP-01'`,
    );
    expect(state!.s).toBe('not_required');
  });

  describe('the seed loader', () => {
    const seed = (overrides: Partial<SynthesisSeed>): SynthesisSeed => ({
      synthesisKey: 'SYN-DEMO-90',
      subject: { kind: 'peptide', key: 'demo-compound-syn' },
      claimKeys: ['SYN-DEMO-C1', 'SYN-DEMO-C2'],
      statement: DEMO_TEXT.statement,
      plainLanguageText: DEMO_TEXT.plain,
      reasoning: DEMO_TEXT.reasoning,
      doesNotConclude: DEMO_TEXT.limit,
      interpretationKind: 'general',
      publicationState: 'unpublished',
      ...overrides,
    });

    it('refuses to seed a compound synthesis as published, writing nothing', async () => {
      expect(await rejectionMessage(loadSyntheses(db, [seed({ publicationState: 'published' })]))).toMatch(
        /cannot be seeded as published/,
      );
      expect(
        await rejectionMessage(
          loadSyntheses(db, [
            seed({
              synthesisKey: 'SYN-DEMO-91',
              subject: { kind: 'learning', key: 'what-is-a-peptide' },
              interpretationKind: 'safety',
              publicationState: 'published',
            }),
          ]),
        ),
      ).toMatch(/cannot be seeded as published/);
      const [n] = await query<{ n: number }>(
        db,
        `select count(*)::int as n from editorial_syntheses where synthesis_key like 'SYN-DEMO-9%'`,
      );
      expect(n!.n).toBe(0);
    });

    it('seeds a compound synthesis as a draft, and re-seeding does not bump its version', async () => {
      await loadSyntheses(db, [seed({ interpretationKind: 'mechanism' })]);
      const [first] = await query<{ id: string; version: number; publication_state: string; kind: string }>(
        db,
        `select id, version, publication_state::text, interpretation_kind::text as kind
           from editorial_syntheses where synthesis_key = 'SYN-DEMO-90'`,
      );
      expect(first!.publication_state).toBe('unpublished');
      expect(first!.kind).toBe('mechanism');

      await loadSyntheses(db, [seed({ interpretationKind: 'mechanism' })]);
      expect((await synthesis(first!.id)).version).toBe(first!.version);
    });

    it('keeps the foundational syntheses general', async () => {
      const [row] = await query<{ n: number }>(
        db,
        `select count(*)::int as n from editorial_syntheses
          where interpretation_kind <> 'general' or peptide_id is not null`,
      );
      expect(row!.n).toBe(0);
    });
  });
});
