/**
 * Internal extraction quality metrics.
 *
 *   npm run qa:metrics
 *
 * A dashboard for the people doing the work, and deliberately never a public
 * figure. Every number here describes how thoroughly this index has checked
 * itself — not how good any compound, supplier or source is. Published as a
 * score it would be read as the second, which is why it lives in a terminal and
 * has no route.
 *
 * The numbers are meant to be uncomfortable. A register where everything reads
 * 100% either has very little in it or is not looking hard enough.
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

interface Metric {
  label: string;
  value: number;
  of: number | null;
  note?: string;
}

function line(metric: Metric): string {
  const value =
    metric.of === null
      ? String(metric.value)
      : `${String(metric.value)} / ${String(metric.of)}` +
        (metric.of === 0 ? '' : `  (${String(Math.round((metric.value / metric.of) * 100))}%)`);
  return `  ${metric.label.padEnd(44)} ${value}${metric.note ? `\n      ${metric.note}` : ''}`;
}

const client = postgres(url, { max: 1, prepare: false });

try {
  const db = drizzle(client, { schema, casing: 'snake_case' });
  const rows = async <T>(query: ReturnType<typeof sql>): Promise<T[]> => {
    const result = await db.execute(query);
    return (Array.isArray(result) ? result : (result as { rows: unknown[] }).rows) as T[];
  };

  const [s] = await rows<{
    sources: number;
    identity_verified: number;
    held: number;
    citable: number;
    replace: number;
    offsets: number;
    with_files: number;
  }>(sql`
    select count(*)::int as sources,
           count(*) filter (where bibliographic_verified)::int as identity_verified,
           count(*) filter (where access_status = 'held')::int as held,
           count(*) filter (where is_citable)::int as citable,
           count(*) filter (where qc_status = 'replace')::int as replace,
           count(*) filter (where printed_page_offset is not null)::int as offsets,
           count(*) filter (where local_private_filename is not null)::int as with_files
    from sources
  `);

  const [c] = await rows<{
    claims: number;
    with_locator: number;
    primary_verified: number;
    with_interpretation: number;
    with_uncertainty: number;
    high_impact: number;
    high_impact_with_uncertainty: number;
    published: number;
    ready: number;
    needs_update: number;
  }>(sql`
    select count(*)::int as claims,
           count(*) filter (where exists (
             select 1 from claim_evidence ce
             where ce.claim_id = c.id and ce.source_location_id is not null))::int as with_locator,
           count(*) filter (where exists (
             select 1 from claim_evidence ce
             where ce.claim_id = c.id and ce.primary_source_verified))::int as primary_verified,
           count(*) filter (where interpretation_notes is not null)::int as with_interpretation,
           count(*) filter (where uncertainty_text is not null)::int as with_uncertainty,
           count(*) filter (where importance in ('high','critical'))::int as high_impact,
           count(*) filter (where importance in ('high','critical')
                              and uncertainty_text is not null)::int as high_impact_with_uncertainty,
           count(*) filter (where publication_state = 'published')::int as published,
           count(*) filter (where review_state = 'ready_for_scientific_review')::int as ready,
           count(*) filter (where needs_update)::int as needs_update
    from claims c
  `);

  const [p] = await rows<{ protocols: number; with_provenance: number }>(sql`
    select count(*)::int as protocols,
           count(*) filter (where exists (
             select 1 from protocol_sources ps
             where ps.protocol_id = p.id and ps.source_location_id is not null))::int
             as with_provenance
    from protocols p
  `);

  const gaps = await rows<{ gap_type: string; n: number }>(sql`
    select gap_type, count(*)::int as n from evidence_gaps group by gap_type order by n desc
  `);

  const [issues] = await rows<{ open: number }>(sql`
    select count(*) filter (where status = 'open')::int as open from verification_issues
  `);

  /*
   * Review. These are the numbers that say whether the review system is a
   * system or a diagram of one, so they are deliberately the least flattering
   * section here: a register with zero standing approvals is reporting the
   * truth about itself.
   */
  const [rv] = await rows<{
    awaiting_claims: number;
    awaiting_topics: number;
    standing_approvals: number;
    invalidated_approvals: number;
    returned: number;
    rejected: number;
    human_reviews: number;
    automated_checks: number;
  }>(sql`
    select
      (select count(*) filter (where review_state = 'ready_for_scientific_review')::int
         from claims) as awaiting_claims,
      (select count(*) filter (where review_state = 'ready_for_scientific_review')::int
         from quality_topics) as awaiting_topics,
      -- Bound to the version the record is at now. An approval against an
      -- earlier version is history, and counting it here is exactly the drift
      -- the version binding exists to prevent.
      (select count(*)::int from reviews r join claims c on c.id = r.entity_id
        where r.entity_type = 'claim' and r.review_type = 'scientific'
          and r.outcome = 'approved' and r.performed_by = 'human'
          and r.entity_version = c.version) as standing_approvals,
      (select count(*)::int from reviews r join claims c on c.id = r.entity_id
        where r.entity_type = 'claim' and r.review_type = 'scientific'
          and r.outcome = 'approved' and r.performed_by = 'human'
          and r.entity_version <> c.version) as invalidated_approvals,
      (select count(*)::int from reviews
        where review_type = 'scientific' and outcome = 'changes_requested') as returned,
      (select count(*)::int from reviews
        where review_type = 'scientific' and outcome = 'rejected') as rejected,
      (select count(*)::int from reviews
        where review_type in ('scientific','clinical','compliance')
          and performed_by = 'human') as human_reviews,
      (select count(*)::int from reviews where performed_by = 'automated') as automated_checks
  `);

  const [turnaround] = await rows<{
    completed: number;
    measurable: number;
    median_days: number | null;
    outstanding: number;
    outstanding_measurable: number;
    longest_wait_days: number | null;
  }>(sql`
    with completed as (
      select r.reviewed_at, c.review_submitted_at
      from reviews r join claims c on c.id = r.entity_id
      where r.entity_type = 'claim' and r.review_type = 'scientific'
        and r.performed_by = 'human'
    ),
    outstanding as (
      select review_submitted_at from claims
      where review_state = 'ready_for_scientific_review'
    )
    select
      (select count(*)::int from completed) as completed,
      (select count(*)::int from completed where review_submitted_at is not null) as measurable,
      (select round(percentile_cont(0.5) within group (
                order by extract(epoch from (reviewed_at - review_submitted_at)) / 86400))::int
         from completed where review_submitted_at is not null) as median_days,
      (select count(*)::int from outstanding) as outstanding,
      (select count(*)::int from outstanding where review_submitted_at is not null)
        as outstanding_measurable,
      (select round(max(extract(epoch from (now() - review_submitted_at)) / 86400))::int
         from outstanding where review_submitted_at is not null) as longest_wait_days
  `);

  const [reviewers] = await rows<{
    scientific_reviewers: number;
    with_standing: number;
    disclosed: number;
  }>(sql`
    select count(*) filter (where role = 'scientific_reviewer')::int as scientific_reviewers,
           count(*) filter (where role = 'scientific_reviewer'
                              and credential_summary is not null)::int as with_standing,
           count(*) filter (where role = 'scientific_reviewer'
                              and conflicts_disclosed is not null)::int as disclosed
    from profiles
  `);

  const [d] = await rows<{ n: number }>(sql`select tides_demonstration_record_count() as n`);

  console.log('\nEXTRACTION QUALITY — internal only, never a public figure\n');

  console.log('SOURCES');
  console.log(line({ label: 'bibliographic identity verified', value: s!.identity_verified, of: s!.sources }));
  console.log(line({ label: 'copy actually held', value: s!.held, of: s!.sources }));
  console.log(line({ label: 'citable', value: s!.citable, of: s!.sources }));
  console.log(line({ label: 'printed-page offset recorded', value: s!.offsets, of: s!.with_files,
    note: 'Only meaningful where the file and the work number differently.' }));
  console.log(line({ label: 'awaiting replacement', value: s!.replace, of: null }));

  console.log('\nCLAIMS');
  console.log(line({ label: 'resolve to an exact locator', value: c!.with_locator, of: c!.claims }));
  console.log(line({ label: 'primary source traced', value: c!.primary_verified, of: c!.claims,
    note:
      'Stage 8. Traces attempted and not completed are tracked as their own gaps — see V-022.' }));
  console.log(line({ label: 'carry a recorded reading', value: c!.with_interpretation, of: c!.claims }));
  console.log(line({ label: 'high-impact stating uncertainty', value: c!.high_impact_with_uncertainty, of: c!.high_impact }));
  console.log(line({ label: 'ready for scientific review', value: c!.ready, of: c!.claims }));
  console.log(line({ label: 'published', value: c!.published, of: c!.claims,
    note: 'Zero until a human scientific reviewer approves something.' }));
  console.log(line({ label: 'flagged for update', value: c!.needs_update, of: null }));

  console.log('\nPROTOCOLS');
  console.log(line({ label: 'complete provenance', value: p!.with_provenance, of: p!.protocols }));

  console.log('\nOPEN GAPS BY TYPE');
  if (gaps.length === 0) console.log('  none recorded');
  for (const gap of gaps) {
    console.log(`  ${gap.gap_type.replaceAll('_', ' ').padEnd(44)} ${String(gap.n)}`);
  }

  console.log('\nREVIEW');
  console.log(line({ label: 'claims awaiting scientific review', value: rv!.awaiting_claims, of: null }));
  console.log(line({ label: 'topics awaiting scientific review', value: rv!.awaiting_topics, of: null }));
  console.log(line({ label: 'standing human approvals (claims)', value: rv!.standing_approvals, of: null,
    note: 'Bound to the version each record is at now.' }));
  console.log(line({ label: 'approvals invalidated by later edits', value: rv!.invalidated_approvals, of: null,
    note: 'A reviewer was asked again. Not a failure, but a cost worth watching.' }));
  console.log(line({ label: 'returned for changes', value: rv!.returned, of: null }));
  console.log(line({ label: 'rejected', value: rv!.rejected, of: null }));
  console.log(line({ label: 'human scientific/clinical/compliance reviews', value: rv!.human_reviews, of: null }));
  console.log(line({ label: 'automated checks recorded', value: rv!.automated_checks, of: null,
    note: 'Confined by constraint to source_check and primary_verification.' }));

  console.log('\nREVIEW TURNAROUND');
  console.log(line({ label: 'completed scientific reviews', value: turnaround!.completed, of: null }));
  console.log(
    turnaround!.measurable === 0
      ? '  ' + 'median days to a decision'.padEnd(44) + 'not measurable' +
        '\n      No completed review has a submission timestamp. Null is not zero wait.'
      : line({ label: 'median days to a decision', value: turnaround!.median_days ?? 0, of: null,
          note: `Over ${String(turnaround!.measurable)} of ${String(turnaround!.completed)} completed reviews.` }),
  );
  console.log(line({ label: 'submissions outstanding', value: turnaround!.outstanding, of: null }));
  console.log(
    turnaround!.outstanding_measurable === 0
      ? '  ' + 'longest outstanding wait'.padEnd(44) + 'not measurable' +
        '\n      Submitted before review_submitted_at existed (migration 0019).'
      : line({ label: 'longest outstanding wait (days)', value: turnaround!.longest_wait_days ?? 0, of: null }),
  );
  console.log(
    '  ' + 'records beyond their review clock'.padEnd(44) + 'not computable' +
      '\n      review_clocks defines the cadences, but no content record carries a' +
      '\n      clock class, so staleness cannot be computed. Assigning one is an' +
      '\n      editorial decision, not a derivation.',
  );

  console.log('\nREVIEWERS');
  console.log(line({ label: 'scientific reviewer accounts', value: reviewers!.scientific_reviewers, of: null }));
  console.log(line({ label: 'with recorded standing', value: reviewers!.with_standing, of: reviewers!.scientific_reviewers }));
  console.log(line({ label: 'conflicts position recorded', value: reviewers!.disclosed, of: reviewers!.scientific_reviewers,
    note: 'Null means nobody asked, which is different from a declaration of none.' }));

  console.log('\nQUEUE');
  console.log(line({ label: 'open verification issues', value: issues!.open, of: null }));
  console.log(line({ label: 'demonstration records present', value: d!.n, of: null,
    note: 'Must be zero in production.' }));
  console.log('');
} catch (error) {
  console.error('Metrics failed:', error);
  process.exitCode = 1;
} finally {
  await client.end();
}
