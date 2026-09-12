import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { seedDatabase } from '@db/seed';
import { buildReviewBundle, claimScope, evidenceStatus } from '@/server/editorial/review-bundle';
import { ReviewBundleDocument } from '@/components/admin/review-bundle-document';
import { closeTestDb, createTestDb, query, truncateContent, type TestDb } from '../support/test-db';
import { approve, createStaff, type Staff } from '../support/fixtures';

/**
 * The external review bundle (human review pilot).
 *
 * The bundle is the first artefact this project sends to somebody outside it, so
 * the properties asserted here are the ones that only matter once it has left:
 *
 *   a form on paper must not be capable of becoming an approval;
 *   a claim with no recorded scope must say so rather than leave a blank;
 *   "no human has reviewed this" must be printed, not implied by an absence;
 *   and nothing private may travel.
 */

describe('the external review bundle', () => {
  let db: TestDb;
  let staff: Staff;
  let topicId: string;

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
    const [topic] = await query<{ id: string }>(
      db,
      `select id from quality_topics where slug = 'hplc-purity'`,
    );
    topicId = topic!.id;
  });

  async function render(): Promise<string> {
    const bundle = await buildReviewBundle(db, topicId);
    return renderToStaticMarkup(createElement(ReviewBundleDocument, { bundle: bundle! }));
  }

  // --- The form cannot be an approval --------------------------------------

  it('renders a response form with no interactive control of any kind', async () => {
    const html = await render();
    for (const tag of ['<form', '<button', '<input', '<select', '<textarea']) {
      expect(html).not.toContain(tag);
    }
  });

  it('offers all three outcomes for every statement, and for the gaps', async () => {
    const bundle = await buildReviewBundle(db, topicId);
    const html = await render();

    const approveBoxes = html.split('Approve').length - 1;
    // One row per claim, plus one for the gaps taken together.
    expect(approveBoxes).toBe(bundle!.claims.length + 1);
    expect(html).toContain('Request change');
    expect(html).toContain('Comment only');
    expect(html).toContain('Overall comments');
  });

  it('says on the form itself that returning it records nothing', async () => {
    const html = await render();
    expect(html).toContain('records nothing on its own');
    expect(html).toContain('will not enter a decision on your behalf');
    // And the signature line must not read as an approval line.
    expect(html).toContain('It does not record an approval');
  });

  it('creates no review row and moves no record', async () => {
    const [before] = await query<{ reviews: number; version: number; state: string }>(
      db,
      `select (select count(*)::int from reviews) as reviews,
              version, review_state as state from quality_topics where id = $1`,
      [topicId],
    );
    await buildReviewBundle(db, topicId, { addressedTo: 'A. Reviewer' });
    const [after] = await query<{ reviews: number; version: number; state: string }>(
      db,
      `select (select count(*)::int from reviews) as reviews,
              version, review_state as state from quality_topics where id = $1`,
      [topicId],
    );
    expect(after).toEqual(before);
  });

  it('names the addressee when one is given, and says so when none is', async () => {
    const unaddressed = await buildReviewBundle(db, topicId);
    expect(unaddressed!.addressedTo).toBeNull();
    expect(
      renderToStaticMarkup(createElement(ReviewBundleDocument, { bundle: unaddressed! })),
    ).toContain('reviewer not yet selected');

    const addressed = await buildReviewBundle(db, topicId, { addressedTo: 'A. Reviewer' });
    expect(
      renderToStaticMarkup(createElement(ReviewBundleDocument, { bundle: addressed! })),
    ).toContain('A. Reviewer');
  });

  // --- Scope is reported, including its absence ------------------------------

  it('says when nothing on a record narrows a claim', async () => {
    const bundle = await buildReviewBundle(db, topicId);
    const [claim] = await query<{ id: string }>(
      db,
      `select id from claims where claim_key = 'HPLC-001'`,
    );
    // Strip everything that could narrow it, and the bundle must still not
    // leave a blank that reads as "applies to everything".
    await query(db, `update claims set claim_category = null where id = $1`, [claim!.id]);
    await query(
      db,
      `update source_locations set chapter = null, section = null
        where id in (select source_location_id from claim_evidence where claim_id = $1)`,
      [claim!.id],
    );

    const stripped = await buildReviewBundle(db, topicId);
    const entry = stripped!.claims.find((c) => c.claim.claimKey === 'HPLC-001');
    expect(entry!.scope.noRecordedScope).toBe(true);

    const html = renderToStaticMarkup(
      createElement(ReviewBundleDocument, { bundle: stripped! }),
    );
    expect(html).toContain('Nothing on this record narrows the statement');

    // And before stripping, it did have something to say.
    const original = bundle!.claims.find((c) => c.claim.claimKey === 'HPLC-001');
    expect(original!.scope.noRecordedScope).toBe(false);
  });

  it('carries the chapter and section a passage was read within', async () => {
    const bundle = await buildReviewBundle(db, topicId);
    const entry = bundle!.claims.find((c) => c.claim.claimKey === 'HPLC-001');
    expect(entry!.scope.sourceSubjects.join(' ')).toContain('Evaluation of the Synthetic Product');
  });

  // --- Status is printed, not implied ---------------------------------------

  it('prints that no human has reviewed a statement', async () => {
    const html = await render();
    expect(html).toContain('No human has reviewed this statement');
  });

  it('prints a standing approval once one exists, bound to the version', async () => {
    const [claim] = await query<{ id: string }>(
      db,
      `select id from claims where claim_key = 'HPLC-001'`,
    );
    await approve(db, {
      entityType: 'claim',
      entityId: claim!.id,
      reviewType: 'scientific',
      reviewerId: staff.scientific,
      table: 'claims',
    });

    const bundle = await buildReviewBundle(db, topicId);
    const entry = bundle!.claims.find((c) => c.claim.claimKey === 'HPLC-001');
    expect(entry!.status.humanApprovalStanding).toBe(true);

    // And it stops standing the moment the wording changes.
    await query(db, `update claims set uncertainty_text = 'Revised.' where id = $1`, [claim!.id]);
    const after = await buildReviewBundle(db, topicId);
    const revised = after!.claims.find((c) => c.claim.claimKey === 'HPLC-001');
    expect(revised!.status.humanApprovalStanding).toBe(false);
  });

  it('reports an untraced primary source rather than omitting the question', async () => {
    const html = await render();
    expect(html).toContain('Primary source not traced');
  });

  it('reports a source that is no longer citable', async () => {
    const bundle = await buildReviewBundle(db, topicId);
    expect(bundle!.claims.every((c) => c.status.allSourcesCitable)).toBe(true);

    await query(db, `update sources set qc_status = 'replace' where source_key = 'SRC-006'`);
    const after = await buildReviewBundle(db, topicId);
    expect(after!.claims.some((c) => !c.status.allSourcesCitable)).toBe(true);
    expect(
      renderToStaticMarkup(createElement(ReviewBundleDocument, { bundle: after! })),
    ).toContain('under replacement or excluded');
  });

  // --- Nothing private travels ----------------------------------------------

  it('carries no private file identity into the bundle', async () => {
    await query(
      db,
      `update sources set local_private_filename = 'grant-PRIVATE.pdf',
                          local_file_sha256 = 'deadbeefdeadbeefdeadbeefdeadbeef'
       where source_key = 'SRC-006'`,
    );
    const bundle = await buildReviewBundle(db, topicId);
    const html = renderToStaticMarkup(createElement(ReviewBundleDocument, { bundle: bundle! }));

    for (const secret of ['PRIVATE.pdf', 'deadbeef']) {
      expect(JSON.stringify(bundle)).not.toContain(secret);
      expect(html).not.toContain(secret);
    }
  });

  it('offers lawful access rather than a file', async () => {
    const html = await render();
    expect(html).toContain('does not redistribute them');
    expect(html).toContain('arrange lawful access rather than send you a file');
  });

  // --- The derivations are pure and testable on their own --------------------

  it('derives scope and status from the record alone', async () => {
    const bundle = await buildReviewBundle(db, topicId);
    for (const entry of bundle!.claims) {
      expect(claimScope(entry.claim)).toEqual(entry.scope);
      expect(evidenceStatus(entry.claim)).toEqual(entry.status);
    }
  });
});
