import { sql } from 'drizzle-orm';
import type { Database } from '../db/types';
import type { EvidenceClass } from '@/domain/evidence/evidence-types';

/**
 * Deterministic search over published records.
 *
 * Full-text ranking with a trigram similarity fallback, so an exact term, a
 * partial term and a misremembered spelling all reach the right record. Results
 * are always real rows: there is no generated answer layer, and any semantic
 * search added later sits beside this rather than in front of it (CLAUDE.md).
 *
 * Reads `public_v_search_documents`, which only ever contains published
 * records.
 */

export type SearchEntityType =
  | 'peptide'
  | 'claim'
  | 'protocol'
  | 'quality_topic'
  | 'source'
  | 'publication';

export interface SearchFilters {
  readonly entityTypes?: readonly SearchEntityType[];
  /** Restrict to records carrying evidence of these classes. */
  readonly evidenceClasses?: readonly EvidenceClass[];
  /** Restrict to records with human evidence recorded. */
  readonly humanEvidenceOnly?: boolean;
  readonly routeKeys?: readonly string[];
  readonly sourceTypeKeys?: readonly string[];
  readonly categoryKey?: string;
}

export interface SearchResult {
  readonly entityType: SearchEntityType;
  readonly entityId: string;
  readonly slug: string;
  readonly title: string;
  readonly subtitle: string | null;
  readonly aliasText: string | null;
  readonly peptideSlug: string | null;
  readonly evidenceClasses: readonly EvidenceClass[] | null;
  readonly routeKeys: readonly string[] | null;
  readonly isHumanEvidence: boolean;
  readonly rank: number;
  /** True when the match came from an alias rather than the canonical name. */
  readonly matchedAlias: boolean;
}

export interface SearchOptions extends SearchFilters {
  readonly limit?: number;
  readonly offset?: number;
}

/**
 * drizzle's `execute` returns a bare array on some drivers and a result object
 * carrying `rows` on others. Services are driver-agnostic by design, so the
 * shape is normalised here rather than in every caller.
 */
function toRows<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (result && typeof result === 'object' && Array.isArray((result as { rows?: unknown }).rows)) {
    return (result as { rows: T[] }).rows;
  }
  return [];
}

/**
 * Builds an array literal from individually bound parameters.
 *
 * Passing a JavaScript array as a single bind parameter relies on the driver's
 * array encoding, which differs between drivers. Binding each element keeps the
 * query portable and keeps every value parameterised.
 */
function boundArray(values: readonly string[], castTo: string) {
  return sql`array[${sql.join(
    values.map((value) => sql`${value}`),
    sql`, `,
  )}]::${sql.raw(castTo)}[]`;
}

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;
/** Below this trigram similarity a fuzzy hit is noise rather than a near miss. */
const FUZZY_THRESHOLD = 0.3;

interface SearchRow {
  entity_type: SearchEntityType;
  entity_id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  alias_text: string | null;
  peptide_slug: string | null;
  evidence_classes: EvidenceClass[] | null;
  route_keys: string[] | null;
  is_human_evidence: boolean;
  rank: number;
  matched_alias: boolean;
}

export async function search(
  db: Database,
  term: string,
  options: SearchOptions = {},
): Promise<SearchResult[]> {
  const trimmed = term.trim();
  if (trimmed === '') return [];

  const limit = Math.min(options.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
  const offset = Math.max(options.offset ?? 0, 0);

  const conditions = [
    sql`(
      d.search_vector @@ websearch_to_tsquery('english', ${trimmed})
      or d.title % ${trimmed}
      or coalesce(d.alias_text, '') % ${trimmed}
    )`,
  ];

  if (options.entityTypes?.length) {
    conditions.push(
      sql`d.entity_type = any(${boundArray(options.entityTypes, 'search_entity_type')})`,
    );
  }
  if (options.evidenceClasses?.length) {
    conditions.push(
      sql`d.evidence_classes && ${boundArray(options.evidenceClasses, 'evidence_class')}`,
    );
  }
  if (options.humanEvidenceOnly) {
    conditions.push(sql`d.is_human_evidence`);
  }
  if (options.routeKeys?.length) {
    conditions.push(sql`d.route_keys && ${boundArray(options.routeKeys, 'text')}`);
  }
  if (options.sourceTypeKeys?.length) {
    conditions.push(sql`d.source_type_keys && ${boundArray(options.sourceTypeKeys, 'text')}`);
  }
  if (options.categoryKey) {
    conditions.push(sql`d.category_key = ${options.categoryKey}`);
  }

  const where = sql.join(conditions, sql` and `);

  const result = await db.execute(sql`
    select
      d.entity_type,
      d.entity_id,
      d.slug,
      d.title,
      d.subtitle,
      d.alias_text,
      d.peptide_slug,
      d.evidence_classes,
      d.route_keys,
      d.is_human_evidence,
      greatest(
        ts_rank(d.search_vector, websearch_to_tsquery('english', ${trimmed})),
        similarity(d.title, ${trimmed}),
        similarity(coalesce(d.alias_text, ''), ${trimmed}) * 0.9
      )::float8 as rank,
      (
        similarity(coalesce(d.alias_text, ''), ${trimmed}) > similarity(d.title, ${trimmed})
      ) as matched_alias
    from public_v_search_documents d
    where ${where}
    order by rank desc, d.title asc
    limit ${limit}
    offset ${offset}
  `);

  return toRows<SearchRow>(result)
    .filter((row) => row.rank > 0)
    .map((row) => ({
      entityType: row.entity_type,
      entityId: row.entity_id,
      slug: row.slug,
      title: row.title,
      subtitle: row.subtitle,
      aliasText: row.alias_text,
      peptideSlug: row.peptide_slug,
      evidenceClasses: row.evidence_classes,
      routeKeys: row.route_keys,
      isHumanEvidence: row.is_human_evidence,
      rank: row.rank,
      matchedAlias: row.matched_alias,
    }));
}

/** Sets the trigram similarity floor for the session. Call once per connection. */
export async function configureFuzzyMatching(db: Database): Promise<void> {
  await db.execute(sql`select set_limit(${FUZZY_THRESHOLD}::float4)`);
}
