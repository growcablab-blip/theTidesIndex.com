import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { seedDatabase } from '@db/seed';
import { readPeptideTrials, readSourceArtifacts } from '@/server/public/trials';
import {
  closeTestDb,
  createTestDb,
  query,
  rejectionMessage,
  truncateContent,
  type TestDb,
} from '../support/test-db';

/**
 * Migration 0026 against the seeded register.
 *
 * Trials, held artifacts, learning topics and gap resolution each exist to stop
 * a specific mistake, and each mistake is one a later edit could make without
 * any page looking wrong: a substudy counted as another trial, a transcription
 * promoted to the article it copies, a study arm reaching a patient, a closed
 * gap disappearing instead of saying what closed it. These run the real
 * migrations, the real seed and the real read path.
 */
describe('trials, artifacts and gap resolution (0026)', () => {
  let db: TestDb;

  beforeAll(async () => {
    db = await createTestDb();
    await truncateContent(db);
    await seedDatabase(db);
  });

  afterAll(async () => {
    await closeTestDb(db);
  });

  it('records five retatrutide trials, each once', async () => {
    const trials = await readPeptideTrials(db, 'retatrutide', 'practitioner', { preview: true });
    expect(trials.map((t) => t.registryId).sort()).toEqual([
      'NCT03841630',
      'NCT04143802',
      'NCT04867785',
      'NCT04881760',
      'NCT06354660',
    ]);
    const obesity = trials.find((t) => t.registryId === 'NCT04881760');
    const substudy = obesity?.documents.find((d) => d.sourceKey === 'SRC-051');
    expect(substudy?.role).toBe('substudy_publication');
    expect(substudy?.depth).toBe('full_text_held');
    const t2d = trials.find((t) => t.registryId === 'NCT04867785');
    expect(t2d?.documents.find((d) => d.role === 'primary_publication')?.depth).toBe('abstract_only');
  });

  it('keeps journal and registry side by side where they differ', async () => {
    const trials = await readPeptideTrials(db, 'retatrutide', 'practitioner', { preview: true });
    const obesity = trials.find((t) => t.registryId === 'NCT04881760');
    const weight = obesity?.comparisons.find((c) => c.comparisonKey === 'RETA-OB-CMP-01');
    expect(weight?.state).toBe('differ');
    expect(weight?.aSourceKey).toBe('SRC-050');
    expect(weight?.bSourceKey).toBe('SRC-129');
  });

  it('gives simple mode no dose arms and no dose-specific comparison', async () => {
    const practitioner = await readPeptideTrials(db, 'retatrutide', 'practitioner', { preview: true });
    const simple = await readPeptideTrials(db, 'retatrutide', 'simple', { preview: true });
    expect(simple.every((t) => t.doseArmsText === null)).toBe(true);
    const count = (list: typeof simple) => list.reduce((n, t) => n + t.comparisons.length, 0);
    expect(count(simple)).toBeLessThan(count(practitioner));
    expect(JSON.stringify(simple)).not.toMatch(/\b\d+(?:\.\d+)?\s?mg\b/);
  });

  it('describes copies without exposing filenames or hashes', async () => {
    const usp = await readSourceArtifacts(db, 'SRC-022');
    expect(usp.map((a) => a.artifactKind)).toContain('research_copy_unverified_distribution');
    expect(JSON.stringify(usp)).not.toMatch(/\.pdf|[0-9a-f]{64}/);
    const lehninger = await readSourceArtifacts(db, 'SRC-120');
    expect(lehninger[0]?.artifactKind).toBe('advertisement');
    expect(lehninger[0]?.disposition).toBe('rejected');
  });

  it('refuses a second working copy, and refuses to verify a transcription', async () => {
    const [row] = await query<{ id: string }>(db, `select id from sources where source_key = 'SRC-022'`);
    const second = rejectionMessage(
      db.$client.query(
        `insert into source_artifacts (artifact_key, source_id, artifact_kind, disposition, verification,
           filename, sha256, acquired_from)
         values ('TEST-SECOND', $1, 'publisher_version', 'working_copy', 'title_page_verified',
           'x.pdf', repeat('a', 64), 'test')`,
        [row?.id],
      ),
    );
    expect(await second).toMatch(/source_artifacts_one_working_copy/);

    const promoted = rejectionMessage(
      db.$client.query(
        `update source_artifacts set verification = 'title_page_verified'
          where artifact_key = 'ART-SRC029-TRANSCRIPTION'`,
      ),
    );
    expect(await promoted).toMatch(/source_artifacts_transcription_not_verified/);
  });

  it('lets a real correction to a funding row or a trial through, and versions it', async () => {
    // Regression: study_funding (0025) was attached to the review-state trigger
    // and had no review_state column, so any material edit failed.
    const [before] = await query<{ version: number }>(
      db,
      `select version from study_funding where funding_key = 'FUND-SRC-050'`,
    );
    await db.$client.query(
      `update study_funding set notes = notes || ' (test edit)' where funding_key = 'FUND-SRC-050'`,
    );
    const [after] = await query<{ version: number }>(
      db,
      `select version from study_funding where funding_key = 'FUND-SRC-050'`,
    );
    expect(after?.version).toBe((before?.version ?? 0) + 1);

    await db.$client.query(
      `update clinical_trials set notes = coalesce(notes, '') || ' ' where registry_id = 'NCT04881760'`,
    );
    const [trial] = await query<{ version: number }>(
      db,
      `select version from clinical_trials where registry_id = 'NCT04881760'`,
    );
    expect(trial?.version).toBeGreaterThan(1);
  });

  it('will not let a gap change state without saying why', async () => {
    const attempt = rejectionMessage(
      db.$client.query(
        `update evidence_gaps set resolution_state = 'resolved', resolution_note = null
          where gap_key = 'retatrutide-gap-01'`,
      ),
    );
    expect(await attempt).toMatch(/evidence_gaps_resolution_explained/);

    const [partial] = await query<{ resolution_state: string; resolution_note: string }>(
      db,
      `select resolution_state::text, resolution_note from evidence_gaps where gap_key = 'retatrutide-gap-07'`,
    );
    expect(partial?.resolution_state).toBe('partially_resolved');
    expect(partial?.resolution_note).toMatch(/SRC-132/);
  });

  it('rests every learning-topic claim on a located page of the held textbook sample', async () => {
    const rowsFound = await query<{ claim_key: string; source_key: string; page_start: number | null }>(
      db,
      `select c.claim_key, s.source_key, l.page_start
         from claims c
         join learning_topics t on t.id = c.learning_topic_id
         join claim_evidence ce on ce.claim_id = c.id
         join source_locations l on l.id = ce.source_location_id
         join sources s on s.id = ce.source_id
        where t.topic_key = 'pharmacology-receptors'`,
    );
    expect(new Set(rowsFound.map((r) => r.claim_key)).size).toBe(16);
    for (const r of rowsFound) {
      expect(r.source_key, r.claim_key).toBe('SRC-121');
      expect(r.page_start, r.claim_key).toBeGreaterThanOrEqual(6);
      expect(r.page_start, r.claim_key).toBeLessThanOrEqual(23);
    }
  });

  it('rests the second learning topic only on the two open-access reviews, never on a missing book', async () => {
    // Added 14 September 2026: where Rang and Dale (SRC-122) is not held, the
    // question "why are most peptides injected" is answered from two CC BY
    // reviews cited as themselves.
    const rowsFound = await query<{ claim_key: string; source_key: string }>(
      db,
      `select c.claim_key, s.source_key
         from claims c
         join learning_topics t on t.id = c.learning_topic_id
         join claim_evidence ce on ce.claim_id = c.id
         join sources s on s.id = ce.source_id
        where t.topic_key = 'peptides-as-medicines'`,
    );
    expect(new Set(rowsFound.map((r) => r.claim_key)).size).toBe(18);
    for (const r of rowsFound) {
      expect(['SRC-143', 'SRC-146'], r.claim_key).toContain(r.source_key);
    }
  });
});
