/**
 * Applies the versioned migrations in db/migrations to the database named by
 * DATABASE_URL.
 *
 * One runner for every environment — local Postgres, Supabase, CI. The same
 * files are applied in tests through an in-process Postgres, so what is verified
 * is what ships.
 *
 *   npm run db:migrate
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { fileURLToPath } from 'node:url';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error(
    'DATABASE_URL is not set.\n' +
      'Copy .env.example to .env.local and provide a Postgres connection string, or export it for this command.',
  );
  process.exit(1);
}

const migrationsFolder = fileURLToPath(new URL('../../db/migrations', import.meta.url));

// A single connection, no pooling: migrations must run in order on one session.
const client = postgres(url, { max: 1, prepare: false });

try {
  const db = drizzle(client);
  console.log('Applying migrations from db/migrations …');
  await migrate(db, { migrationsFolder });
  console.log('Migrations applied.');
} catch (error) {
  console.error('Migration failed:', error);
  process.exitCode = 1;
} finally {
  await client.end();
}
