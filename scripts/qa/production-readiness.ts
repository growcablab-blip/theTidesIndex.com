/**
 * Refuses to certify a database for public service when it is not fit for it.
 *
 *   npm run qa:production
 *
 * Exits non-zero with the reasons. Meant to run before a deploy and in CI
 * against whatever database that deploy will point at.
 *
 * A development database is expected to fail this — it contains demonstration
 * records on purpose. That is not a reason to soften the check. It is a release
 * gate, and the useful property of a gate is that it is closed.
 *
 * The gathering is here; the judging is in `src/server/ops/production-readiness.ts`
 * so that the rules are tested rather than trusted.
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import postgres from 'postgres';
import * as schema from '@db/schema';
import {
  isFixtureKey,
  PRIVATE_SOURCE_COLUMNS,
  productionBlockers,
  type ProductionFacts,
} from '@/server/ops/production-readiness';

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

  const [counts] = await rows<{
    demonstration_records: number;
    demonstration_approvals: number;
    published_without_approval: number;
  }>(sql`
    select
      tides_demonstration_record_count() as demonstration_records,
      (select count(*)::int from reviews r
         join profiles p on p.user_id = r.reviewer_user_id
        where p.is_demonstration) as demonstration_approvals,
      (
        (select count(*)::int from claims c
          where c.publication_state = 'published'
            and not tides_has_approved_review('claim', c.id, c.version, 'scientific'))
        + (select count(*)::int from quality_topics q
            where q.publication_state = 'published'
              and not tides_has_approved_review('quality_topic', q.id, q.version, 'scientific'))
        + (select count(*)::int from protocols p
            where p.publication_state = 'published'
              and not tides_has_approved_review('protocol', p.id, p.version, 'scientific'))
        + (select count(*)::int from peptides pe
            where pe.publication_state = 'published'
              and not tides_has_approved_review('peptide', pe.id, pe.version, 'scientific'))
      ) as published_without_approval
  `);

  /*
   * Fixture keys, gathered as keys rather than as a count so the operator is
   * told which rows to remove. Every table here is one a test or a paste could
   * plausibly add a row to.
   */
  const keys = await rows<{ source: string; key: string }>(sql`
      select 'claims' as source, claim_key as key from claims
      union all select 'evidence_gaps', gap_key from evidence_gaps
      union all select 'sources', source_key from sources
      union all select 'quality_topics', quality_key from quality_topics
      union all select 'peptides', peptide_key from peptides
      union all select 'certificates', certificate_key from certificates
  `);
  const fixtures = keys.filter((row) => isFixtureKey(row.key));

  /*
   * Private source fields reaching a public view.
   *
   * Introspected rather than asserted against a list of views, so a view added
   * later is covered the day it is created rather than the day somebody
   * remembers to add it here.
   */
  const exposed = await rows<{ table_name: string; column_name: string }>(sql`
    select table_name, column_name
      from information_schema.columns
     where table_schema = 'public'
       and table_name like 'public\\_v\\_%'
       and column_name in ${sql.raw(`(${PRIVATE_SOURCE_COLUMNS.map((c) => "'" + c + "'").join(', ')})`)}
     order by table_name, column_name
  `);

  const facts: ProductionFacts = {
    demonstrationRecords: Number(counts!.demonstration_records),
    approvalsByDemonstrationReviewers: Number(counts!.demonstration_approvals),
    publishedWithoutStandingApproval: Number(counts!.published_without_approval),
    fixtureRecords: fixtures.length,
    privateColumnsExposed: exposed.map((row) => `${row.table_name}.${row.column_name}`),
    previewEnabled: process.env.TIDES_PREVIEW_UNPUBLISHED === '1',
    nodeEnv: process.env.NODE_ENV ?? 'development',
  };

  const blockers = productionBlockers(facts);

  console.log('');
  console.log('  PRODUCTION READINESS');
  console.log('');

  if (blockers.length === 0) {
    console.log('  No blockers. This database may serve the public.');
    console.log('');
  } else {
    for (const blocker of blockers) {
      console.log(`  BLOCKED  ${blocker.summary}`);
      console.log(`           ${blocker.consequence}`);
      if (blocker.key === 'fixture_records') {
        for (const fixture of fixtures) {
          console.log(`           · ${fixture.source}: ${fixture.key}`);
        }
      }
      console.log('');
    }
    console.log(
      `  ${String(blockers.length)} blocker(s). This database must not serve the public.`,
    );
    console.log('');
    process.exitCode = 1;
  }
} catch (error) {
  console.error('Readiness check failed:', error);
  process.exitCode = 1;
} finally {
  await client.end();
}
