import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { seedDatabase } from '@db/seed';
import { readQualityTopic } from '@/server/public/quality-topic';
import { withPublicSession } from '@/server/db/session';
import type { Database } from '@/server/db/types';
import { closeTestDb, createTestDb, query, truncateContent, type TestDb } from '../support/test-db';

/**
 * What a reader is handed for a quality topic (Phase C.4).
 *
 * The page has to carry three things that are easy to get subtly wrong, and
 * costly when wrong:
 *
 *   - the difference between "a source establishes that X does not bear on Y"
 *     and "the sources here do not establish whether X bears on Y";
 *   - the difference between a record that has been checked against its sources
 *     and one a scientist has actually read;
 *   - the difference between the page of a book and the page of the file this
 *     index holds a copy in.
 *
 * Each of those collapses into a plausible-looking page if nobody is watching.
 */

const SLUG = 'hplc-purity';

describe('the public quality topic', () => {
  let db: TestDb;

  beforeAll(async () => {
    db = await createTestDb();
  });

  afterAll(async () => {
    await closeTestDb(db);
  });

  beforeEach(async () => {
    await truncateContent(db);
    await seedDatabase(db);
  });

  const read = (preview: boolean) => readQualityTopic(db, SLUG, { preview });

  // --- Evidence versus its absence ---------------------------------------
  it('keeps gaps out of the claim list entirely', async () => {
    const topic = await read(true);

    expect(topic?.gaps.length).toBeGreaterThan(0);
    const claimText = (topic?.claims ?? []).map((c) => c.claimText).join(' ');
    // A gap is not a weakly-held claim. It never enters the layer that resolves
    // to a source, because it has no source to resolve to.
    for (const gap of topic?.gaps ?? []) {
      expect(claimText).not.toContain(gap.statement);
    }
  });

  it('words a gap as a statement about this library, not about the world', async () => {
    const topic = await read(true);
    const sterility = topic?.gaps.find((g) => /steril/i.test(g.statement));

    expect(sterility).toBeDefined();
    // The reason must locate the absence here — in what this index holds — and
    // not assert a finding. "No source is held" is checkable; "HPLC cannot bear
    // on sterility" would be a claim nothing supports.
    expect(sterility?.whyNotSupported).toMatch(/no (compendial|source)|does not address|holds no/i);
  });

  it('never labels a gap-backed relationship as evidence-backed', async () => {
    const topic = await read(true);
    const gapBacked = topic?.relationships.filter((r) => r.gapKey !== null) ?? [];

    expect(gapBacked.length).toBeGreaterThan(0);
    for (const relationship of gapBacked) {
      expect(relationship.evidenceStatus, relationship.toSlug).toBe('evidence_gap');
      expect(relationship.claimKey).toBeNull();
    }
  });

  it('never labels a structural relationship as evidence-backed', async () => {
    const topic = await read(true);
    const structural =
      topic?.relationships.filter((r) => r.claimKey === null && r.gapKey === null) ?? [];

    expect(structural.length).toBeGreaterThan(0);
    for (const relationship of structural) {
      expect(relationship.evidenceStatus, relationship.toSlug).toBe('structural');
    }
  });

  it('keeps unsupported scientific copy out of structural relationships', async () => {
    const topic = await read(true);
    const structural =
      topic?.relationships.filter((r) => r.evidenceStatus === 'structural') ?? [];

    // A structural edge exists to let a reader move around the section. The
    // moment its rationale starts telling them what a test does or does not
    // show, it is an unsourced claim wearing navigation's clothes — which is
    // exactly the defect caught in review at the end of C.3.
    const asserts =
      /\b(does not|cannot|never|proves|establishes|guarantees|shows that|means that)\b/i;
    for (const relationship of structural) {
      expect(relationship.rationale, `${relationship.toSlug} rationale`).not.toMatch(asserts);
    }
  });

  // --- How far the record has been checked --------------------------------
  it('reports the review state the database actually holds', async () => {
    const [row] = await query<{ review_state: string; publication_state: string }>(
      db,
      `select review_state, publication_state from quality_topics where slug = $1`,
      [SLUG],
    );
    const topic = await read(true);

    expect(topic?.reviewState).toBe(row?.review_state);
    expect(topic?.publicationState).toBe(row?.publication_state);
  });

  it('cannot present an unreviewed record as reviewed', async () => {
    const topic = await read(true);

    // The seeded record has had no human review of any kind. Whatever the page
    // says about it, it must not be one of the reviewed rungs.
    expect(topic?.reviewState).not.toBe('scientific_reviewed');
    expect(topic?.reviewState).not.toBe('clinical_reviewed');
    expect(topic?.reviewState).not.toBe('compliance_reviewed');
    expect(topic?.publicationState).toBe('unpublished');
    expect(topic?.isPreview).toBe(true);
  });

  it('shows nothing at all through the public surface while unpublished', async () => {
    const published = await withPublicSession(db as unknown as Database, (tx) =>
      readQualityTopic(tx, SLUG),
    );
    // The preview is a local convenience. The gate is unchanged.
    expect(published).toBeNull();
  });

  // --- Locators ------------------------------------------------------------
  it('keeps the printed page and the held copy’s page apart', async () => {
    const topic = await read(true);
    const citations = (topic?.claims ?? []).flatMap((c) => c.evidence.map((e) => e.citation));

    expect(citations.length).toBeGreaterThan(0);
    for (const citation of citations) {
      expect(citation.printedPage, citation.sourceKey).not.toBeNull();
      // SRC-006's held copy runs eleven pages ahead of the book.
      expect(citation.filePage, citation.sourceKey).toBe((citation.printedPage ?? 0) + 11);
      // And they are genuinely different numbers, so conflating them is a real
      // error rather than a theoretical one.
      expect(citation.filePage).not.toBe(citation.printedPage);
    }
  });

  it('leaves the held copy’s page null when no offset is recorded', async () => {
    await query(db, `update sources set printed_page_offset = null where source_key = 'SRC-006'`);
    const topic = await read(true);
    const citation = topic?.claims[0]?.evidence[0]?.citation;

    // Better to say nothing than to guess. An unknown offset means the page of
    // the held copy is unknown, not that it equals the printed page.
    expect(citation?.printedPage).not.toBeNull();
    expect(citation?.filePage).toBeNull();
  });

  // --- What must never travel ---------------------------------------------
  it('never carries extracted source text', async () => {
    // Reviewers keep verbatim extracts so they can confirm a reading. They are
    // copyrighted and private, and the preview path reads base tables where the
    // column is right there — so this is the path most likely to leak it.
    await query(
      db,
      `update claim_evidence set extracted_text_private = 'VERBATIM COPYRIGHTED EXTRACT'`,
    );

    const topic = await read(true);
    const serialised = JSON.stringify(topic);
    expect(serialised).not.toContain('VERBATIM COPYRIGHTED EXTRACT');
    expect(serialised).not.toContain('extractedTextPrivate');
  });

  it('carries a related topic’s name and status but none of its unpublished content', async () => {
    const topic = await read(true);
    const sterility = topic?.relationships.find((r) => r.toSlug === 'sterility');

    expect(sterility?.toName).toBe('Sterility');
    expect(sterility?.toIsPublished).toBe(false);

    // The card may say a topic exists and is not ready. It may not carry what
    // that topic would say if it were.
    const keys = Object.keys(sterility ?? {});
    for (const leaked of [
      'toSimpleSummary',
      'toWhatItProves',
      'toWhatItDoesNotProve',
      'toPractitionerSummary',
    ]) {
      expect(keys).not.toContain(leaked);
    }
  });

  // --- Reading modes -------------------------------------------------------
  it('gives simple mode its own summary rather than the practitioner one', async () => {
    const topic = await read(true);

    expect(topic?.simpleSummary).not.toBeNull();
    expect(topic?.practitionerSummary).not.toBeNull();
    expect(topic?.simpleSummary).not.toBe(topic?.practitionerSummary);

    // The plain-language summary should not be carrying method vocabulary that
    // only means something to a practitioner.
    expect(topic?.simpleSummary).not.toMatch(/stationary phase|organic modifier|co-elut/i);
  });

  it('gives every claim a plain-language form, so simple mode is never left empty', async () => {
    const topic = await read(true);
    for (const claim of topic?.claims ?? []) {
      expect(claim.plainLanguageText, claim.claimKey).not.toBeNull();
      expect(claim.plainLanguageText).not.toBe(claim.claimText);
    }
  });
});
