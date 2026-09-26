import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { seedDatabase } from '@db/seed';
import { readPublishedPeptidePage } from '@/server/public/queries';
import { assertPatientSafe } from '@/domain/presentation/reading-mode';
import { findDoses } from '@/domain/presentation/dose-text';
import { closeTestDb, createTestDb, query, truncateContent, type TestDb } from '../support/test-db';

/**
 * Every published compound renders, on the public path, in both reading depths.
 *
 * The existing suites assert deep properties of a handful of named records —
 * tesamorelin, BPC-157, thymosin beta-4 — and they read through the *preview*
 * path, because a freshly seeded test database has nothing published. Neither
 * covers the question that matters after adding a compound: does this record
 * render for a member of the public, with the preview flag off.
 *
 * The two are not the same. A compound can be published, indexed, and still fail
 * to render because a relation the page joins was left unpublished, or because
 * the record is missing something the reader assumes is there. That is a defect
 * a reader would find before any test did.
 *
 * So this publishes the library through the real gates, then walks every
 * compound the public views expose and renders it both ways. It names no
 * compound, which is the point: a record added next year is covered without
 * anyone remembering to add it here.
 */

describe('every published compound renders on the public path', () => {
  let db: TestDb;
  let slugs: string[];

  beforeAll(async () => {
    db = await createTestDb();
  });

  afterAll(async () => {
    await closeTestDb(db);
  });

  beforeEach(async () => {
    await truncateContent(db);
    await seedDatabase(db);

    // Through the gates, not around them: a record that cannot publish is not
    // one this suite should be rendering.
    for (const table of ['peptides', 'claims', 'protocols', 'peptide_routes', 'regulatory_statuses']) {
      await query(db, `update ${table} set publication_state = 'published'`);
    }

    const rows = await query<{ slug: string }>(db, 'select slug from public_v_peptides order by slug');
    slugs = rows.map((r) => r.slug);
  });

  it('finds a published compound to check', () => {
    // Guards against the whole suite passing vacuously if publishing ever fails.
    expect(slugs.length).toBeGreaterThan(20);
  });

  it('renders in practitioner mode, with its claims attached', async () => {
    for (const slug of slugs) {
      const page = await readPublishedPeptidePage(db, slug, 'practitioner');
      expect(page, `${slug} does not render in practitioner mode`).not.toBeNull();
      if (page === null) continue;

      expect(page.canonicalName.length, slug).toBeGreaterThan(0);
      // A record with no claim at all is not a record; it is a name.
      expect(page.claims.length, `${slug} renders with no claims`).toBeGreaterThan(0);
      expect(page.unknownsSummary, `${slug} has no statement of what is unknown`).toBeTruthy();
    }
  });

  it('renders in simple mode with no dose and no regimen rows', async () => {
    /*
     * The dose rule is the one `npm run qa:doses` uses, imported rather than
     * rewritten. Two definitions of "this is a dose" drift, and they drift the
     * dangerous way round: the looser copy becomes the one that gets run.
     *
     * `assertPatientSafe` is deliberately not applied to the whole page. It is
     * defined for the protocol view, where every field it names is a dosing
     * field; over a whole peptide page it also fires on `trials[].durationText`,
     * the length of a study rather than an instruction to anybody. Asserting it
     * here would fail on a record that is perfectly safe, and the pressure would
     * be to loosen the shared helper that guards the boundary that matters.
     */
    for (const slug of slugs) {
      const page = await readPublishedPeptidePage(db, slug, 'simple');
      expect(page, `${slug} does not render in simple mode`).not.toBeNull();
      if (page === null) continue;

      expect(page.simpleSummary, `${slug} has no simple summary`).toBeTruthy();

      const doses = findDoses(page);
      expect(doses.map((d) => `${d.path}: ${d.context}`), `${slug} leaks a dose`).toEqual([]);

      /*
       * And no regimen rows at all. Every protocol in the library carries
       * `patient_visibility = false`, so simple mode shows a reader *that*
       * regimens exist and from how many sources, never what they are. The
       * count is deliberately allowed through; the rows are not.
       *
       * `assertPatientSafe` still runs over anything that does appear, so the
       * day a protocol is made patient-visible this fails on the fields rather
       * than passing quietly.
       */
      expect(page.protocols, `${slug} exposes regimen rows in simple mode`).toEqual([]);
      for (const protocol of page.protocols) {
        assertPatientSafe(protocol, `simple-mode protocol on ${slug}`);
      }
    }
  });

  it('claims no review for any compound it renders', async () => {
    /*
     * The V1 promise: the site never implies a review happened. Checked here
     * rather than only in the publication suite because this is the surface a
     * reader actually sees.
     */
    for (const slug of slugs) {
      const page = await readPublishedPeptidePage(db, slug, 'practitioner');
      if (page === null) continue;
      expect(page.lastReviewedAt, `${slug} prints a review date`).toBeNull();
    }
  });
});
