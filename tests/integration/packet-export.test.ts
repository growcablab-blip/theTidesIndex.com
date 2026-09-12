import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { seedDatabase } from '@db/seed';
import {
  buildPacketExport,
  exportDocumentId,
  EXPORT_IS_NOT_AN_APPROVAL,
} from '@/server/editorial/packet-export';
import { PacketExportDocument } from '@/components/admin/packet-export-document';
import { closeTestDb, createTestDb, query, truncateContent, type TestDb } from '../support/test-db';
import { createStaff } from '../support/fixtures';

/**
 * The review packet as a document that leaves the building (Phase C.10 §14).
 *
 * Everything asserted here is a property the document must have *because it
 * travels*. On screen the application answers these questions by surrounding
 * the packet; a PDF in somebody's inbox answers them alone or not at all.
 *
 * Three things must hold, and each has a way of quietly stopping holding:
 *
 *   it carries nothing private — a column added to `sources` later is the way
 *   that breaks;
 *
 *   it cannot record a decision — a helpful "approve" button added to the
 *   editorial page and inherited by the document is the way that breaks;
 *
 *   it names the version it describes — a template tidy-up that drops the
 *   masthead is the way that breaks.
 */

describe('the exported review packet', () => {
  let db: TestDb;
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
    await createStaff(db);
    const [topic] = await query<{ id: string }>(
      db,
      `select id from quality_topics where slug = 'hplc-purity'`,
    );
    topicId = topic!.id;
  });

  // --- It cannot carry private material -----------------------------------

  it('carries no trace of the private copy this index holds', async () => {
    // The held file's name and checksum are on the same row as the
    // bibliography the reviewer does need, one careless `select *` away.
    await query(
      db,
      `update sources set local_private_filename = 'grant-2002-PRIVATE.pdf',
                          local_file_sha256 = 'deadbeefdeadbeefdeadbeefdeadbeef'
       where source_key = 'SRC-006'`,
    );

    const doc = await buildPacketExport(db, topicId);
    const serialised = JSON.stringify(doc);

    expect(serialised).not.toContain('PRIVATE.pdf');
    expect(serialised).not.toContain('deadbeef');
    expect(serialised).not.toContain('local_private_filename');
    expect(serialised).not.toContain('localFileSha256');
  });

  it('carries no internal register annotations', async () => {
    // `access_notes` names build phases and database columns. Found by reading
    // the rendered document: SRC-006's note mentioned `integrity_notes`.
    await query(
      db,
      `update sources set access_notes = 'see integrity_notes, phase C.5'
       where source_key = 'SRC-006'`,
    );

    const doc = await buildPacketExport(db, topicId);
    expect(JSON.stringify(doc)).not.toContain('integrity_notes');
  });

  it('still tells the reviewer how to reach every source it cites', async () => {
    const doc = await buildPacketExport(db, topicId);
    expect(doc!.sources.length).toBeGreaterThan(0);
    for (const source of doc!.sources) {
      expect(source.title.length).toBeGreaterThan(0);
      expect(source.accessStatus.length).toBeGreaterThan(0);
      // Every source is cited for at least one claim, or it would not be here.
      expect(source.claimKeys.length).toBeGreaterThan(0);
    }
  });

  // --- It cannot record a decision ------------------------------------------

  it('renders without a single interactive control', async () => {
    const doc = await buildPacketExport(db, topicId);
    const html = renderToStaticMarkup(createElement(PacketExportDocument, { doc: doc! }));

    for (const tag of ['<form', '<button', '<input', '<select', '<textarea']) {
      expect(html).not.toContain(tag);
    }
  });

  it('says on its face that returning it approves nothing', async () => {
    const doc = await buildPacketExport(db, topicId);
    const html = renderToStaticMarkup(createElement(PacketExportDocument, { doc: doc! }));
    expect(html).toContain('not a review record');
    // The full sentence, not a paraphrase that could drift away from it.
    expect(doc!.omissions.join(' ')).toContain('Any way to record a decision');
    expect(EXPORT_IS_NOT_AN_APPROVAL).toContain('does not approve anything');
  });

  it('produces no review row as a side effect of being produced', async () => {
    const [before] = await query<{ n: number }>(db, `select count(*)::int as n from reviews`);
    await buildPacketExport(db, topicId);
    const [after] = await query<{ n: number }>(db, `select count(*)::int as n from reviews`);
    expect(after!.n).toBe(before!.n);
  });

  it('does not move the record it describes', async () => {
    const [before] = await query<{ version: number; review_state: string }>(
      db,
      `select version, review_state from quality_topics where id = $1`,
      [topicId],
    );
    await buildPacketExport(db, topicId);
    const [after] = await query<{ version: number; review_state: string }>(
      db,
      `select version, review_state from quality_topics where id = $1`,
      [topicId],
    );
    expect(after).toEqual(before);
  });

  // --- It names the version it describes ------------------------------------

  it('binds the document identifier to the version', async () => {
    const doc = await buildPacketExport(db, topicId, { issuedAt: '2026-09-11T10:00:00.000Z' });
    expect(doc!.documentId).toBe(
      exportDocumentId('hplc-purity', doc!.version, '2026-09-11T10:00:00.000Z'),
    );
    expect(doc!.documentId).toContain(`v${String(doc!.version)}`);

    const html = renderToStaticMarkup(createElement(PacketExportDocument, { doc: doc! }));
    expect(html).toContain(doc!.documentId);
  });

  it('issues a different document once the record is edited', async () => {
    const first = await buildPacketExport(db, topicId, { issuedAt: '2026-09-11T10:00:00.000Z' });
    await query(
      db,
      `update quality_topics set short_description = 'Edited after the packet went out'
       where id = $1`,
      [topicId],
    );
    const second = await buildPacketExport(db, topicId, { issuedAt: '2026-09-11T10:00:00.000Z' });

    expect(second!.version).toBe(first!.version + 1);
    expect(second!.documentId).not.toBe(first!.documentId);
  });

  it('returns null for a topic that does not exist', async () => {
    const doc = await buildPacketExport(db, '11111111-1111-4111-8111-111111111111');
    expect(doc).toBeNull();
  });

  // --- It says what it is missing -------------------------------------------

  it('names the source text as absent rather than implying it is included', async () => {
    const doc = await buildPacketExport(db, topicId);
    const omissions = doc!.omissions.join(' ');
    expect(omissions).toContain('third-party copyrighted works');
    expect(omissions).toContain('does not redistribute');

    // A locator is a pointer. If one ever started carrying a transcription the
    // copyright position would change without anybody deciding to change it.
    for (const claim of doc!.packet.claims) {
      for (const evidence of claim.evidence) {
        expect(evidence.locatorText === null || evidence.locatorText.length < 200).toBe(true);
      }
    }
  });
});
