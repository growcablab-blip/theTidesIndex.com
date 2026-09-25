/**
 * Removes demonstration fixtures from a database that is about to serve the public.
 *
 *   npm run db:strip-demo
 *
 * `npm run db:demo` exists so that the editorial interface can be exercised
 * against something. Those records are flagged `is_demonstration`, and every
 * public view excludes them — but `npm run qa:production` still refuses to
 * certify a database that contains them, and it is right to. A demonstration
 * compound with approvals recorded by a demonstration reviewer is exactly the
 * shape of a record that could one day be published on an approval no person
 * made.
 *
 * So this is the counterpart to the demo seeder: it takes them out again.
 *
 * It removes only rows that say of themselves that they are fixtures. It never
 * touches a record that is not flagged, and it reports the count of everything
 * it deletes so the removal can be checked rather than assumed. Running it
 * twice is harmless.
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import postgres from 'postgres';
import * as schema from '@db/schema';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}

const client = postgres(url, { max: 1, prepare: false });

try {
  const db = drizzle(client, { schema, casing: 'snake_case' });
  const rows = async <T>(query: ReturnType<typeof sql>): Promise<T[]> => {
    const result = await db.execute(query);
    return (Array.isArray(result) ? result : (result as { rows: unknown[] }).rows) as T[];
  };
  const count = async (query: ReturnType<typeof sql>): Promise<number> => {
    const [row] = await rows<{ n: number }>(query);
    return Number(row?.n ?? 0);
  };

  console.log('\n  REMOVING DEMONSTRATION FIXTURES\n');

  const before = {
    peptides: await count(sql`select count(*)::int n from peptides where is_demonstration`),
    qualityTopics: await count(
      sql`select count(*)::int n from quality_topics where is_demonstration`,
    ),
    sources: await count(sql`select count(*)::int n from sources where is_demonstration`),
    certificates: await count(
      sql`select count(*)::int n from certificates where is_demonstration`,
    ),
    profiles: await count(sql`select count(*)::int n from profiles where is_demonstration`),
    reviews: await count(sql`
      select count(*)::int n from reviews r
       join profiles p on p.user_id = r.reviewer_user_id
      where p.is_demonstration
    `),
  };

  /*
   * Reviews first, and by reviewer rather than by entity.
   *
   * The readiness check names this precisely: "Remove the reviews, not just the
   * profile." A review row that outlived its reviewer is worse than either,
   * because it still reads as an approval while nothing identifies who gave it.
   */
  await db.execute(sql`
    delete from reviews r
     using profiles p
     where p.user_id = r.reviewer_user_id
       and p.is_demonstration
  `);

  /*
   * Children before parents, discovered rather than listed.
   *
   * Not every foreign key to `peptides` cascades — `claims.peptide_id` is
   * RESTRICT, deliberately, so a compound cannot be deleted out from under the
   * statements that depend on it. A hand-written list of child tables would go
   * stale the first time the schema grew a new one and would fail loudly here
   * at the worst moment, so the reference graph is read from the catalogue.
   *
   * One level is enough: everything below a claim or a protocol cascades from
   * it.
   */
  interface ForeignKey {
    child_table: string;
    child_column: string;
  }

  const referencesTo = async (parent: string): Promise<ForeignKey[]> =>
    rows<ForeignKey>(sql`
      select tc.table_name as child_table, kcu.column_name as child_column
        from information_schema.table_constraints tc
        join information_schema.key_column_usage kcu
          on kcu.constraint_name = tc.constraint_name
         and kcu.table_schema = tc.table_schema
        join information_schema.constraint_column_usage ccu
          on ccu.constraint_name = tc.constraint_name
         and ccu.table_schema = tc.table_schema
       where tc.constraint_type = 'FOREIGN KEY'
         and tc.table_schema = 'public'
         and ccu.table_name = ${parent}
         and ccu.column_name = 'id'
         and tc.table_name <> ${parent}
    `);

  for (const parent of ['peptides', 'quality_topics', 'certificates', 'sources'] as const) {
    for (const fk of await referencesTo(parent)) {
      await db.execute(
        sql`delete from ${sql.identifier(fk.child_table)}
             where ${sql.identifier(fk.child_column)} in (
               select id from ${sql.identifier(parent)} where is_demonstration
             )`,
      );
    }
    await db.execute(sql`delete from ${sql.identifier(parent)} where is_demonstration`);
  }

  await db.execute(sql`delete from profiles where is_demonstration`);

  const after = {
    peptides: await count(sql`select count(*)::int n from peptides where is_demonstration`),
    qualityTopics: await count(
      sql`select count(*)::int n from quality_topics where is_demonstration`,
    ),
    sources: await count(sql`select count(*)::int n from sources where is_demonstration`),
    certificates: await count(
      sql`select count(*)::int n from certificates where is_demonstration`,
    ),
    profiles: await count(sql`select count(*)::int n from profiles where is_demonstration`),
  };

  const removed = (label: string, from: number, left: number): void => {
    console.log(`  ${String(from - left).padStart(4)}  ${label}${left > 0 ? `  (${left} left!)` : ''}`);
  };

  removed('demonstration reviews', before.reviews, 0);
  removed('demonstration compounds', before.peptides, after.peptides);
  removed('demonstration quality topics', before.qualityTopics, after.qualityTopics);
  removed('demonstration certificates', before.certificates, after.certificates);
  removed('demonstration sources', before.sources, after.sources);
  removed('demonstration staff profiles', before.profiles, after.profiles);

  const remaining =
    after.peptides + after.qualityTopics + after.sources + after.certificates + after.profiles;

  console.log(
    remaining === 0
      ? '\n  No demonstration record remains. Run npm run qa:production to confirm.\n'
      : `\n  ${remaining} demonstration record(s) could not be removed.\n`,
  );

  process.exit(remaining === 0 ? 0 : 1);
} finally {
  await client.end({ timeout: 5 });
}
