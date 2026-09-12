/**
 * Refuses to certify a database for public service when it is not fit for it.
 *
 *   npm run qa:production
 *
 * Exits non-zero with the reasons. Meant to run before a deploy and in CI
 * against whatever database that deploy will point at.
 *
 * The gathering is here; the judging is in `src/server/ops/production-readiness.ts`
 * so that the rules are tested rather than trusted.
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import postgres from 'postgres';
import * as schema from '@db/schema';
import { productionBlockers, type ProductionFacts } from '@/server/ops/production-readiness';

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
      (select count(*)::int from claims c
        where c.publication_state = 'published'
          and not tides_has_approved_review('claim', c.id, c.version, 'scientific'))
        as published_without_approval
  `);

  const facts: ProductionFacts = {
    demonstrationRecords: Number(counts!.demonstration_records),
    approvalsByDemonstrationReviewers: Number(counts!.demonstration_approvals),
    publishedWithoutStandingApproval: Number(counts!.published_without_approval),
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
