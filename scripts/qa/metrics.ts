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
    note: 'Stage 8. Zero is expected while every source is a primary one.' }));
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
