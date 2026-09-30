/**
 * Live counts for the public holding experience.
 *
 * Read from the same anon-only public views every public page uses, so a number
 * on the front page can never include a draft record. Four counts and nothing
 * else — no names, no content.
 *
 * The home page is Railway's healthcheck path. A failed read here returns null
 * and the telemetry band hides itself; it never falls back to typed-in numbers,
 * which would drift from the database the day after they were written.
 */
import 'server-only';

import { sql } from 'drizzle-orm';
import { cache } from 'react';
import { getPublicDb } from '../db/client';
import { withPublicSession } from '../db/session';
import { rows } from './shapes';

export interface ShowcaseTelemetry {
  readonly compounds: number;
  readonly sources: number;
  readonly evidenceRecords: number;
  readonly protocols: number;
}

/*
 * How long the home page waits for the counts. The database client's own
 * connect timeout is 30 seconds; on the public service the home page is also
 * the healthcheck, and an unreachable database should cost a visitor a missing
 * band, not a stalled page.
 */
const TELEMETRY_DEADLINE_MS = 2500;

function withDeadline<T>(work: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`telemetry read exceeded ${String(ms)}ms`)), ms);
  });
  return Promise.race([work, deadline]).finally(() => clearTimeout(timer));
}

export const getShowcaseTelemetry = cache(async (): Promise<ShowcaseTelemetry | null> => {
  try {
    return await withDeadline(readTelemetry(), TELEMETRY_DEADLINE_MS);
  } catch (error) {
    console.error('[showcase] telemetry unavailable', error);
    return null;
  }
});

function readTelemetry(): Promise<ShowcaseTelemetry | null> {
  return withPublicSession(getPublicDb(), async (tx) => {
    /*
     * "Evidence records" is the published-record total the operations docs
     * and `qa:publication-integrity` report: every published row across the
     * record relations that tool tracks, counted here through their public
     * views. Protocols are counted from the practitioner view — only the
     * count leaves the query, so no dosing column is read into the page.
     */
    const result = await tx.execute(sql`
      select
        (select count(*) from public_v_peptides)::int as compounds,
        (select count(*) from public_v_sources)::int as sources,
        (
          (select count(*) from public_v_peptides)
          + (select count(*) from public_v_claims)
          + (select count(*) from public_v_protocol_practitioner)
          + (select count(*) from public_v_literature_screens)
          + (select count(*) from public_v_peptide_routes)
          + (select count(*) from public_v_regulatory_statuses)
          + (select count(*) from public_v_disagreements)
          + (select count(*) from public_v_compound_products)
          + (select count(*) from public_v_pk_observations)
          + (select count(*) from public_v_compound_identity_claims)
          + (select count(*) from public_v_replication_assessments)
          + (select count(*) from public_v_quality_topics)
          + (select count(*) from public_v_learning_topics)
          + (select count(*) from public_v_editorial_syntheses)
        )::int as evidence_records,
        (select count(*) from public_v_protocol_practitioner)::int as protocols
    `);
    const row = rows<Record<string, number>>(result)[0];
    if (row === undefined) return null;
    return {
      compounds: row.compounds ?? 0,
      sources: row.sources ?? 0,
      evidenceRecords: row.evidence_records ?? 0,
      protocols: row.protocols ?? 0,
    };
});
}
