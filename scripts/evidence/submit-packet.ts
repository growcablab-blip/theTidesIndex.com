/**
 * Hands a loaded evidence packet to a human reviewer.
 *
 *   npm run evidence:submit -- <packet-key> --as <staff-user-id>
 *   npm run evidence:submit -- --all --as <staff-user-id>
 *
 * `--all` submits every loaded packet in one go. It is a convenience for
 * standing an environment up, not a shortcut around attribution: `--as` is
 * still required, every check is still recorded against that editor's session,
 * and a packet that fails its preconditions is still refused individually.
 *
 * Loading a packet is data. Submitting one is an action, and the database
 * insists on knowing who took it: `tides_record_automated_check` runs under the
 * caller's staff role, so the check is recorded as a named tool run by a named
 * editor, and neither half can be left blank.
 *
 * What this buys is `ready_for_scientific_review` and nothing beyond it. The
 * publish gates require a human scientific approval, and the
 * `reviews_automation_scope` constraint means an automated one cannot be written
 * down at all. A packet that ends here is finished, not stuck: it is complete
 * enough for a person to read, and no one has pretended a person has.
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@db/schema';
import { seedData } from '@db/seed/seed-data';
import { submitEvidencePacketForReview } from '@db/seed/evidence-packets';
import { withStaffSession } from '@/server/db/session';

const EXTRACTION_TOOL = 'tides-extraction/0.1 (locator resolution against registered file)';

const args = process.argv.slice(2);
const packetKey = args.find((a) => !a.startsWith('--'));
const submitAll = args.includes('--all');
const asIndex = args.indexOf('--as');
const actingUserId = asIndex === -1 ? undefined : args[asIndex + 1];

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}

if ((packetKey === undefined && !submitAll) || actingUserId === undefined) {
  console.error('Usage: npm run evidence:submit -- <packet-key> --as <staff-user-id>');
  console.error('       npm run evidence:submit -- --all --as <staff-user-id>');
  console.error('');
  console.error('Available packets:');
  for (const packet of seedData.evidencePackets) {
    console.error(`  ${packet.packetKey}`);
  }
  console.error('');
  console.error('The acting user must be an active editor or admin. The check is recorded');
  console.error('as automated and attributed to the tool, but someone has to have run it.');
  process.exit(1);
}

const packets = submitAll
  ? [...seedData.evidencePackets]
  : seedData.evidencePackets.filter((p) => p.packetKey === packetKey);

if (packets.length === 0) {
  console.error(`No packet '${String(packetKey)}'.`);
  process.exit(1);
}

const client = postgres(url, { max: 1, prepare: false });

try {
  const db = drizzle(client, { schema, casing: 'snake_case' });

  const advanced: string[] = [];
  const refused: { key: string; reason: string }[] = [];

  // One session per packet rather than one for all of them: a packet that fails
  // its preconditions must not take the others down with it, and a partially
  // applied batch is harder to reason about than several small ones.
  for (const packet of packets) {
    console.log(`\n${packet.packetKey}`);
    const result = await withStaffSession(db, actingUserId, (tx) =>
      submitEvidencePacketForReview(tx, packet, EXTRACTION_TOOL),
    );
    advanced.push(...result.advanced);
    refused.push(...result.refused);

    if (result.advanced.length > 0) {
      console.log('  Ready for scientific review:');
      for (const key of result.advanced) console.log(`    ${key}`);
    }
    if (result.refused.length > 0) {
      console.log('  Not advanced:');
      for (const item of result.refused) console.log(`    ${item.key}: ${item.reason}`);
    }
  }

  console.log(
    `\n${String(advanced.length)} record(s) advanced, ${String(refused.length)} refused.`,
  );
  if (refused.length > 0) process.exitCode = 1;

  console.log('\nNothing was published. Publication requires a human scientific review.');
} catch (error) {
  console.error('Submission failed:', error);
  process.exitCode = 1;
} finally {
  await client.end();
}
