/**
 * The bridge between a public protocol guide and the research engine.
 *
 * The guides are owner-supplied artwork. This module is what lets one of them
 * point at the published record behind a compound it names — without the guide
 * register learning anything about evidence, and without the research engine
 * learning anything about artwork.
 *
 * Three rules hold here.
 *
 *  - **Slugs, never display names.** The register carries "Thymosin beta-4" as
 *    an alias of `tb-500` and the reverse, so resolving a guide's printed name
 *    against the register sends TB-500 to the wrong compound. Joins are on the
 *    slug a guide declares.
 *  - **Publication gates are the database's.** Every read below goes through
 *    `public_v_*` views on the anon role, which is the same path every other
 *    public page takes. An unpublished compound is not hidden by this file; it
 *    is invisible to it.
 *  - **Exposure is explicit.** `EXPOSED_COMPOUNDS` is the list of compounds the
 *    public surface will serve a profile for. The library is not migrated by
 *    adding a route; it is migrated one reviewed slug at a time.
 */
import 'server-only';

import { sql } from 'drizzle-orm';
import { cache } from 'react';
import { getPublicDb } from '../db/client';
import { withPublicSession } from '../db/session';
import { rows, str } from './shapes';

/**
 * Compounds whose profile the public surface serves.
 *
 * One, deliberately. BPC-157 is the first integration: it leads the Recovery
 * guide and carries the most complete record in the index. Nothing else is
 * exposed until this one has been reviewed.
 */
export const EXPOSED_COMPOUNDS: ReadonlySet<string> = new Set(['bpc-157']);

export function isExposedCompound(slug: string): boolean {
  return EXPOSED_COMPOUNDS.has(slug);
}

/** A compound as a guide lists it: enough to decide whether to link, and what to say. */
export interface GuideCompound {
  readonly slug: string;
  readonly name: string;
  readonly categoryLabel: string | null;
  readonly shortDescription: string | null;
  /** Statements resting on evidence from people. */
  readonly humanClaims: number;
  /** Distinct published works cited anywhere on the record. */
  readonly sources: number;
  /** Source-reported protocols held for the compound. */
  readonly protocols: number;
  /** Whether the public surface currently serves a profile for it. */
  readonly exposed: boolean;
}

/**
 * Read the published compounds a guide names.
 *
 * Returns them in the order the guide declares, which is the order its artwork
 * presents them. A slug with no published record simply does not come back —
 * the guide then shows the name without a link, exactly as its artwork prints
 * it, and claims nothing.
 */
export const readGuideCompounds = cache(
  async (slugs: readonly string[]): Promise<readonly GuideCompound[]> => {
    if (slugs.length === 0) return [];

    const found = await withPublicSession(getPublicDb(), async (tx) => {
      const list = sql.join(
        slugs.map((s) => sql`${s}`),
        sql`, `,
      );
      /*
       * One query, all counts computed in Postgres. `claim_evidence` is the
       * provenance join the whole index rests on: a claim counts as human
       * evidence only through an evidence record whose type says so.
       */
      const result = await tx.execute(sql`
        select
          p.slug,
          p.canonical_name,
          cc.label as category_label,
          p.short_description,
          (
            select count(distinct c.id) from public_v_claims c
            join public_v_claim_evidence ce on ce.claim_id = c.id
            join public_v_evidence_types et on et.key = ce.evidence_type_key
            where c.peptide_id = p.id and et.is_human_evidence
          )::int as human_claims,
          (
            select count(distinct s.id) from public_v_claims c
            join public_v_claim_evidence ce on ce.claim_id = c.id
            join public_v_source_locations sl on sl.id = ce.source_location_id
            join public_v_sources s on s.id = sl.source_id
            where c.peptide_id = p.id
          )::int as sources,
          (
            select count(*) from public_v_protocol_practitioner pr
            where pr.peptide_id = p.id
          )::int as protocols
        from public_v_peptides p
        left join public_v_compound_categories cc on cc.key = p.primary_category_key
        where p.slug in (${list})
      `);

      const bySlug = new Map<string, GuideCompound>();
      for (const row of rows<Record<string, unknown>>(result)) {
        const slug = String(row['slug']);
        bySlug.set(slug, {
          slug,
          name: String(row['canonical_name']),
          categoryLabel: str(row['category_label']),
          shortDescription: str(row['short_description']),
          humanClaims: Number(row['human_claims'] ?? 0),
          sources: Number(row['sources'] ?? 0),
          protocols: Number(row['protocols'] ?? 0),
          exposed: isExposedCompound(slug),
        });
      }
      return bySlug;
    });

    return slugs.flatMap((s) => {
      const compound = found.get(s);
      return compound === undefined ? [] : [compound];
    });
  },
);
