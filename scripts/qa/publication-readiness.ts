/**
 * What stands between one quality topic and publication.
 *
 *   npm run qa:publication -- <slug>
 *
 * Distinct from `qa:production`, which asks whether a *database* may serve the
 * public. This asks whether one *record* may be published, and answers with the
 * specific things that are missing rather than a yes or a no.
 *
 * It reads; it never writes, and it cannot publish anything.
 *
 * The output is the source for `docs/FIRST_PUBLICATION_READINESS.md`. Keeping it
 * a command rather than a hand-written table is the point: a readiness document
 * that is typed once goes stale the first time somebody edits a claim, and a
 * stale readiness document is worse than none.
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import postgres from 'postgres';
import * as schema from '@db/schema';
import { getClaimGateStatus, getQualityTopicGateStatus } from '@/server/editorial/gate-status';

const slug = process.argv[2];
if (slug === undefined) {
  console.error('Usage: npm run qa:publication -- <quality-topic-slug>');
  process.exit(2);
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}

const client = postgres(url, { max: 1, prepare: false });

function heading(text: string): void {
  console.log('');
  console.log(`  ${text.toUpperCase()}`);
}

function line(label: string, value: string, note?: string): void {
  console.log(`    ${label.padEnd(38)} ${value}`);
  if (note !== undefined) console.log(`        ${note}`);
}

try {
  const db = drizzle(client, { schema, casing: 'snake_case' });
  const rows = async <T>(query: ReturnType<typeof sql>): Promise<T[]> => {
    const result = await db.execute(query);
    return (Array.isArray(result) ? result : (result as { rows: unknown[] }).rows) as T[];
  };

  const [topic] = await rows<{
    id: string;
    name: string;
    quality_key: string;
    version: number;
    review_state: string;
    publication_state: string;
    needs_update: boolean;
    review_submitted_at: string | null;
  }>(sql`
    select id, name, quality_key, version, review_state, publication_state,
           needs_update, review_submitted_at::text as review_submitted_at
      from quality_topics where slug = ${slug}
  `);

  if (topic === undefined) {
    console.error(`No quality topic with slug '${slug}'.`);
    process.exit(1);
  }

  console.log('');
  console.log(`  PUBLICATION READINESS — ${topic.name}`);
  console.log(`  ${topic.quality_key} · version ${String(topic.version)} · ${slug}`);

  // --- The record -----------------------------------------------------------
  heading('record');
  line('current version', String(topic.version));
  line('review state', topic.review_state.replaceAll('_', ' '));
  line('publication state', topic.publication_state.replaceAll('_', ' '));
  line('flagged for re-review', topic.needs_update ? 'yes' : 'no');
  line(
    'submitted for review',
    topic.review_submitted_at ?? 'not recorded',
    topic.review_submitted_at === null
      ? 'Null means never submitted, or submitted before the column existed. Not zero wait.'
      : undefined,
  );

  // --- Sources --------------------------------------------------------------
  const sources = await rows<{
    source_key: string;
    qc_status: string;
    is_citable: boolean;
    access_status: string;
    bibliographic_verified: boolean;
    title_page_verified: boolean;
  }>(sql`
    select distinct s.source_key, s.qc_status, s.is_citable, s.access_status,
           s.bibliographic_verified, s.title_page_verified
      from claim_evidence e
      join claims c on c.id = e.claim_id
      join sources s on s.id = e.source_id
     where c.quality_topic_id = ${topic.id}
     order by s.source_key
  `);

  heading('source integrity');
  for (const source of sources) {
    line(
      source.source_key,
      `${source.qc_status} · ${source.is_citable ? 'citable' : 'NOT CITABLE'} · ${source.access_status}`,
      `title page verified: ${source.title_page_verified ? 'yes' : 'no'} · ` +
        `bibliography verified: ${source.bibliographic_verified ? 'yes' : 'no'}`,
    );
  }
  if (sources.length === 0) line('none', 'no source is cited by any claim on this topic');

  // --- Claims ---------------------------------------------------------------
  const [claimCounts] = await rows<{
    claims: number;
    evidence_links: number;
    with_locator: number;
    primary_verified: number;
    with_interpretation: number;
    with_uncertainty: number;
    high_impact: number;
    high_impact_with_uncertainty: number;
  }>(sql`
    select count(distinct c.id)::int as claims,
           count(e.id)::int as evidence_links,
           count(e.id) filter (where e.source_location_id is not null)::int as with_locator,
           count(e.id) filter (where e.primary_source_verified)::int as primary_verified,
           count(distinct c.id) filter (where c.interpretation_notes is not null)::int
             as with_interpretation,
           count(distinct c.id) filter (where c.uncertainty_text is not null)::int
             as with_uncertainty,
           count(distinct c.id) filter (where c.importance in ('high','critical'))::int
             as high_impact,
           count(distinct c.id) filter (where c.importance in ('high','critical')
                                          and c.uncertainty_text is not null)::int
             as high_impact_with_uncertainty
      from claims c
      left join claim_evidence e on e.claim_id = c.id
     where c.quality_topic_id = ${topic.id}
  `);

  heading('claims');
  line('claims on this topic', String(claimCounts!.claims));
  line(
    'exact locator coverage',
    `${String(claimCounts!.with_locator)} / ${String(claimCounts!.evidence_links)} evidence links`,
  );
  line(
    'carry a recorded reading',
    `${String(claimCounts!.with_interpretation)} / ${String(claimCounts!.claims)}`,
  );
  line(
    'high-impact stating uncertainty',
    `${String(claimCounts!.high_impact_with_uncertainty)} / ${String(claimCounts!.high_impact)}`,
  );
  line(
    'primary source traced',
    `${String(claimCounts!.primary_verified)} / ${String(claimCounts!.evidence_links)} evidence links`,
    'Nobody has opened the original study behind a cited passage.',
  );

  // --- Gaps -----------------------------------------------------------------
  const gaps = await rows<{ gap_key: string; gap_type: string; verification_issue_key: string | null }>(
    sql`
      select gap_key, gap_type, verification_issue_key
        from evidence_gaps where quality_topic_id = ${topic.id} order by sort_order
    `,
  );
  heading('evidence gaps');
  for (const gap of gaps) {
    line(
      gap.gap_key,
      gap.gap_type.replaceAll('_', ' '),
      gap.verification_issue_key === null ? undefined : `tracked as ${gap.verification_issue_key}`,
    );
  }
  if (gaps.length === 0) line('none recorded', '');

  // --- Reviews --------------------------------------------------------------
  const reviews = await rows<{
    review_type: string;
    outcome: string;
    performed_by: string;
    entity_version: number;
    applies_now: boolean;
    reviewer: string | null;
  }>(sql`
    select r.review_type, r.outcome, r.performed_by, r.entity_version,
           (r.entity_version = ${topic.version}) as applies_now,
           p.display_name as reviewer
      from reviews r
      left join profiles p on p.user_id = r.reviewer_user_id
     where r.entity_type = 'quality_topic' and r.entity_id = ${topic.id}
     order by r.reviewed_at desc
  `);

  heading('review');
  const human = (type: string): string => {
    const standing = reviews.filter(
      (r) =>
        r.review_type === type &&
        r.outcome === 'approved' &&
        r.performed_by === 'human' &&
        r.applies_now,
    );
    return standing.length === 0
      ? 'none'
      : `approved by ${standing.map((r) => r.reviewer ?? 'unnamed').join(', ')}`;
  };
  line('scientific review', human('scientific'));
  line('compliance review', human('compliance'));
  line('clinical review', human('clinical'), 'Not required for a quality topic.');
  line(
    'automated checks',
    String(reviews.filter((r) => r.performed_by === 'automated').length),
    'Locator resolution only. Advances the review state; opens no publication gate.',
  );
  const stranded = reviews.filter((r) => !r.applies_now);
  if (stranded.length > 0) {
    line(
      'stranded by later edits',
      String(stranded.length),
      'Recorded against an earlier version and no longer standing.',
    );
  }

  // --- The gates ------------------------------------------------------------
  const topicGate = await getQualityTopicGateStatus(db, topic.id);
  heading('publication gate — the topic');
  if (topicGate === null) {
    line('gate', 'could not be evaluated');
  } else {
    line('can publish', topicGate.canPublish ? 'yes' : 'no');
    for (const failure of topicGate.failures) {
      console.log(`      · ${failure.message} (${failure.field})`);
    }
  }

  const claimIds = await rows<{ id: string; claim_key: string }>(sql`
    select id, claim_key from claims where quality_topic_id = ${topic.id} order by claim_key
  `);
  heading('publication gate — the claims');
  /*
   * Worth stating plainly, because the output reads as a contradiction
   * otherwise: every claim here already carries an approved source check, and
   * the gate still asks for one.
   *
   * `tides_has_approved_review` counts human approvals only. An automated check
   * is a real check and advances the review state — it is why these claims sit
   * at `ready_for_scientific_review` — but it does not open a gate on its own.
   * Publishing a high-impact claim therefore needs three approvals by people:
   * the source check, the scientific review and the compliance review.
   */
  console.log('      An automated source check advances the state but opens no gate.');
  console.log('      Every "approved ... is required" below means a human approval.');
  console.log('');
  for (const claim of claimIds) {
    const gate = await getClaimGateStatus(db, claim.id);
    if (gate === null) continue;
    line(claim.claim_key, gate.canPublish ? 'can publish' : 'blocked');
    if (!gate.canPublish) {
      for (const failure of gate.failures) {
        console.log(`        · ${failure.message} (${failure.field})`);
      }
    }
  }

  // --- Everything around it -------------------------------------------------
  const [corrections] = await rows<{ total: number; public_total: number }>(sql`
    select count(*)::int as total,
           count(*) filter (where is_public)::int as public_total from corrections
  `);
  heading('surrounding machinery');
  line(
    'correction mechanism',
    `${String(corrections!.total)} correction(s) recorded, ${String(corrections!.public_total)} public`,
    'The table, the trigger and /corrections exist. Nothing has needed correcting yet.',
  );
  line(
    'indexing',
    'noindex, site-wide',
    'Unchanged. Lifting it is an owner decision and not a consequence of publishing.',
  );
  line(
    'preview of unpublished content',
    process.env.TIDES_PREVIEW_UNPUBLISHED === '1' ? 'ENABLED' : 'disabled',
    'Development only; a production build refuses it regardless.',
  );

  console.log('');
} catch (error) {
  console.error('Readiness check failed:', error);
  process.exitCode = 1;
} finally {
  await client.end();
}
