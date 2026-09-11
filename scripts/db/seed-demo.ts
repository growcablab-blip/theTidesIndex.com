/**
 * Loads the demonstration dataset.
 *
 *   TIDES_ALLOW_DEMO_DATA=1 npm run db:demo
 *
 * The dataset exercises every part of the public reference experience with data
 * that flows through the real publish gates. It belongs to a compound and
 * sources whose names announce them as demonstrations, and it says nothing
 * about any real molecule — see db/seed/demo.ts for why that separation matters.
 *
 * Two guards, because demonstration content reaching a production database would
 * be exactly the failure this platform is built to prevent: an explicit opt-in,
 * and a refusal to run against anything that is not a local database.
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@db/schema';
import { seedDemoData } from '@db/seed/demo';

const url = process.env.DATABASE_URL;

if (!url) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}

if (process.env.TIDES_ALLOW_DEMO_DATA !== '1') {
  console.error(
    'Refusing to load demonstration data.\n\n' +
      'This dataset is for development only. Re-run with TIDES_ALLOW_DEMO_DATA=1 if that is\n' +
      'what you intend.',
  );
  process.exit(1);
}

const isLocal = /@(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(url);
if (!isLocal) {
  console.error(
    'Refusing to load demonstration data into a non-local database.\n\n' +
      `DATABASE_URL does not point at localhost. Demonstration records must never reach a\n` +
      'shared or production database.',
  );
  process.exit(1);
}

const client = postgres(url, { max: 1, prepare: false });

try {
  const db = drizzle(client, { schema, casing: 'snake_case' });
  const result = await seedDemoData(db);

  console.log('Demonstration dataset loaded.\n');
  console.log(`  /peptides/${result.peptideSlug}`);
  console.log(`  /quality/${result.qualityTopicSlug}\n`);
  console.log(
    'Every record is attributed to sources named as demonstrations. No real compound was\n' +
      'touched: the seeded cohort remains registered and in preparation.',
  );
} catch (error) {
  console.error('Failed to load demonstration data:', error);
  process.exitCode = 1;
} finally {
  await client.end();
}
