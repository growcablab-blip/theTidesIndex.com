/**
 * Seeds controlled vocabularies, the source registry, the first compound cohort
 * and the open verification queue.
 *
 * Idempotent: safe to re-run after editing anything under data/seed or
 * SOURCE_MANIFEST.json. Nothing seeded is published — every record arrives at
 * `unreviewed` and must pass the editorial gates.
 *
 *   npm run db:seed
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@db/schema';
import { seedDatabase } from '@db/seed';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}

const client = postgres(url, { max: 1, prepare: false });

try {
  const db = drizzle(client, { schema, casing: 'snake_case' });
  const result = await seedDatabase(db);

  console.log('Seeded:');
  for (const [key, count] of Object.entries(result)) {
    console.log(`  ${key.padEnd(20)} ${String(count).padStart(4)}`);
  }
  // Not "everything is unpublished": on a re-seed most of these records already
  // exist, and the seed deliberately leaves their publication state alone.
  console.log('\nNew records arrive unpublished. Existing publication states are unchanged.');
} catch (error) {
  console.error('Seeding failed:', error);
  process.exitCode = 1;
} finally {
  await client.end();
}
