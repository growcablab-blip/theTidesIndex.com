/**
 * A local Postgres for development, with no installation required.
 *
 * Runs PGlite — real Postgres compiled to WebAssembly — behind a TCP socket
 * speaking the Postgres wire protocol, so the application connects to it with
 * an ordinary connection string and cannot tell the difference. The point is
 * that development, tests and production all run the same migrations against
 * the same database engine; nothing about the application knows this is not a
 * server someone installed.
 *
 *   npm run db:dev        starts it, applies migrations, seeds, and stays up
 *
 * Data persists in .pglite/ (gitignored). Delete that directory for a clean
 * slate. This is a development convenience only — production uses Supabase.
 */
import { PGlite } from '@electric-sql/pglite';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as schema from '@db/schema';
import { seedDatabase } from '@db/seed';

const PORT = Number(process.env.TIDES_DEV_DB_PORT ?? 5433);
const dataDir = fileURLToPath(new URL('../../.pglite/dev', import.meta.url));
const migrationsFolder = fileURLToPath(new URL('../../db/migrations', import.meta.url));

mkdirSync(dataDir, { recursive: true });

const client = await PGlite.create({
  dataDir,
  extensions: { pg_trgm, pgcrypto },
});

const db = drizzle(client, { schema, casing: 'snake_case' });

console.log('Applying migrations…');
await migrate(db, { migrationsFolder });

console.log('Seeding…');
const seeded = await seedDatabase(db);
console.log(
  `  ${String(seeded.sources)} sources, ${String(seeded.peptides)} compounds, ` +
    `${String(seeded.qualityTopics)} quality topics, ` +
    `${String(seeded.verificationIssues)} verification issues — all unpublished.`,
);

const server = new PGLiteSocketServer({ db: client, port: PORT, host: '127.0.0.1' });
await server.start();

console.log(`\nPostgres listening on 127.0.0.1:${String(PORT)}`);
console.log('Add this to .env.local:\n');
console.log(`  DATABASE_URL=postgres://postgres:postgres@127.0.0.1:${String(PORT)}/postgres\n`);
console.log('Press Ctrl+C to stop.');

async function shutdown(): Promise<void> {
  console.log('\nStopping…');
  await server.stop();
  await client.close();
  process.exit(0);
}

process.on('SIGINT', () => void shutdown());
process.on('SIGTERM', () => void shutdown());
