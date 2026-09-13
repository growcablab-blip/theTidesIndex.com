/**
 * How close each record is to being worth a reviewer's time.
 *
 *   npm run readiness
 *
 * Not a quality score and not a substitute for review. Every check here is
 * mechanical: whether a citation resolves to a location, whether a claim about
 * people cites the research or only a handbook's account of it, whether every
 * regimen names the source that published it. A record can pass all of them
 * and still be wrong about the science, which is exactly why the last column
 * says "ready for review" rather than "good".
 *
 * The point is to stop a reviewer's first hour being spent finding missing
 * locators. Needs a database; start one with `npm run tides`.
 */
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import * as schema from '@db/schema';

const url = process.env.DATABASE_URL;
if (url === undefined || url === '') {
  console.error('\n  DATABASE_URL is not set. Start the local database with `npm run tides`.\n');
  process.exit(1);
}

const client = postgres(url, { max: 1, prepare: false });
const db = drizzle(client, { schema, casing: 'snake_case' });

interface Row {
  slug: string;
  name: string;
  review_state: string;
  claims: number;
  unlocated: number;
  human_claims: number;
  human_traced: number;
  safety_claims: number;
  safety_traced: number;
  protocols: number;
  protocols_attributed: number;
  gaps: number;
  questions: number;
  cited_sources: number;
  funded_sources: number;
}

function mark(ok: boolean): string {
  return ok ? 'yes' : 'no ';
}

try {
  const rows = (await db.execute(sql`
    select p.slug,
           p.canonical_name as name,
           p.review_state::text as review_state,
           (select count(*) from claims c where c.peptide_id = p.id)::int as claims,
           (select count(*) from claims c
              join claim_evidence ce on ce.claim_id = c.id
             where c.peptide_id = p.id and ce.source_location_id is null)::int as unlocated,
           (select count(distinct c.id) from claims c
              join claim_evidence ce on ce.claim_id = c.id
              join evidence_types et on et.key = ce.evidence_type_key
             where c.peptide_id = p.id and et.evidence_class = 'human')::int as human_claims,
           (select count(distinct c.id) from claims c
              join claim_evidence ce on ce.claim_id = c.id
              join evidence_types et on et.key = ce.evidence_type_key
             where c.peptide_id = p.id and et.evidence_class = 'human'
               and ce.primary_trace in ('primary_source_is_cited', 'abstract_only',
                 'full_text_supports', 'full_text_partially_supports',
                 'full_text_does_not_support', 'full_text_different_context'))::int as human_traced,
           (select count(distinct c.id) from claims c
             where c.peptide_id = p.id
               and (c.claim_category ilike '%safety%' or c.claim_text ilike '%safe%'
                    or c.claim_text ilike '%adverse%'))::int as safety_claims,
           (select count(distinct c.id) from claims c
              join claim_evidence ce on ce.claim_id = c.id
             where c.peptide_id = p.id
               and (c.claim_category ilike '%safety%' or c.claim_text ilike '%safe%'
                    or c.claim_text ilike '%adverse%')
               and ce.primary_trace <> 'not_attempted')::int as safety_traced,
           (select count(*) from protocols pr where pr.peptide_id = p.id)::int as protocols,
           (select count(*) from protocols pr
             where pr.peptide_id = p.id
               and exists (select 1 from protocol_sources ps where ps.protocol_id = pr.id))::int
             as protocols_attributed,
           (select count(*) from evidence_gaps g where g.peptide_id = p.id)::int as gaps,
           (select count(*) from evidence_gaps g
             where g.peptide_id = p.id and g.research_question is not null)::int as questions,
           -- Studies only. A label, a textbook or a handbook has no study
           -- funding to disclose, and counting them as uncovered would make
           -- the column meaningless for exactly the records that rest on
           -- regulatory documents.
           (select count(distinct ce.source_id) from claims c
              join claim_evidence ce on ce.claim_id = c.id
              join sources s on s.id = ce.source_id
             where c.peptide_id = p.id
               and s.source_type_key in ('primary_journal_article',
                 'systematic_review_meta_analysis', 'clinical_trial_registry'))::int
             as cited_sources,
           (select count(distinct f.source_id) from study_funding f
             where f.source_id in (
               select ce.source_id from claims c
                 join claim_evidence ce on ce.claim_id = c.id
                 join sources s on s.id = ce.source_id
                where c.peptide_id = p.id
                  and s.source_type_key in ('primary_journal_article',
                    'systematic_review_meta_analysis', 'clinical_trial_registry')))::int
             as funded_sources
      from peptides p
     where not p.is_demonstration
       and exists (select 1 from claims c where c.peptide_id = p.id)
     order by p.canonical_name
  `)) as unknown as readonly Row[];

  console.log('');
  console.log(
    '  RECORD              LOCATORS  HUMAN TRACED  SAFETY TRACED  PROTOCOLS  GAPS  FUNDING   READY',
  );
  console.log('  ' + '-'.repeat(92));

  let ready = 0;
  for (const row of rows) {
    const locators = row.unlocated === 0;
    const humanTraced = row.human_claims === 0 || row.human_traced === row.human_claims;
    const safetyTraced = row.safety_claims === 0 || row.safety_traced === row.safety_claims;
    const attributed = row.protocols === 0 || row.protocols_attributed === row.protocols;
    const gaps = row.gaps > 0 && row.questions > 0;
    const funding = row.cited_sources === 0 || row.funded_sources > 0;
    const all = locators && humanTraced && safetyTraced && attributed && gaps && funding;
    if (all) ready += 1;

    console.log(
      `  ${row.name.padEnd(20)}${mark(locators)}       ` +
        `${String(row.human_traced)}/${String(row.human_claims)}`.padEnd(14) +
        `${String(row.safety_traced)}/${String(row.safety_claims)}`.padEnd(15) +
        `${String(row.protocols_attributed)}/${String(row.protocols)}`.padEnd(11) +
        `${String(row.questions)}/${String(row.gaps)}`.padEnd(6) +
        `${String(row.funded_sources)}/${String(row.cited_sources)}`.padEnd(10) +
        (all ? 'ready' : 'not yet'),
    );
  }

  console.log('');
  console.log(`  ${String(ready)} of ${String(rows.length)} records pass every mechanical check.`);
  console.log('');
  console.log('  What these columns do not mean:');
  console.log('    - Passing is not review. No record here has been read by a scientific reviewer.');
  console.log('    - "Human traced" counts claims whose evidence cites the research itself or an');
  console.log('      abstract of it, rather than a handbook’s account of a study. It does not mean');
  console.log('      a full text was read: that state is set by hand, by whoever read it.');
  console.log('    - "Funding" counts sources with a funding record of any kind, including the');
  console.log('      record that says the PubMed entry disclosed nothing. Coverage, not quality.');
  console.log('');
} catch (error) {
  console.error('Readiness check failed:', error);
  process.exitCode = 1;
} finally {
  await client.end();
}
