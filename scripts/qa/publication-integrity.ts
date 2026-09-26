/**
 * Proves that a deterministic re-seed does not cost the public site anything.
 *
 *   npm run qa:publication-integrity
 *
 * Exits non-zero, naming every record, if any published record is withdrawn,
 * unpublished, replaced or deleted by seeding — or if seeding publishes anything.
 *
 * WHY THIS EXISTS, AND WHY qa:production WAS NOT ENOUGH
 *
 * `qa:production` judges one state of the database: is what I am looking at fit
 * to serve? Both re-seed defects found during the Section 4 expansion passed it,
 * because the database was perfectly fit to serve afterwards — it was just
 * serving 275 fewer records than an hour before. A single snapshot cannot see a
 * loss. This compares two.
 *
 * HOW IT AVOIDS TOUCHING WHAT IT MEASURES
 *
 * The re-seed runs inside a transaction that is **always rolled back**, so the
 * database it is pointed at is unchanged whether the check passes or fails. That
 * is what makes it safe to run against production before a deploy rather than
 * against a copy that might differ from it.
 *
 * `SET CONSTRAINTS ALL IMMEDIATE` is the part that makes the rollback honest.
 * The provenance guards are deferred constraint triggers (migration 0031): they
 * fire at COMMIT, and a transaction that never commits would never fire them —
 * so the withdrawal failure mode would be invisible to exactly the check written
 * to catch it. Forcing the queued events to fire mid-transaction reproduces what
 * commit would have done, and then the rollback discards it.
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import postgres from 'postgres';
import * as schema from '@db/schema';
import { seedDatabase } from '@db/seed';
import {
  comparePublicationSurface,
  publishedCount,
  rowsCompared,
  standingProvenanceFailures,
  type IntegrityFailure,
  type PublicationSnapshot,
  type RelationSnapshot,
} from '@/server/ops/publication-integrity';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}

/**
 * Every relation the public site can publish from, with something a person can
 * search for when one of them goes missing.
 *
 * The list is derived from the schema rather than curated: any table carrying
 * `publication_state` belongs here, and a new one added without being listed is
 * a relation this check silently ignores. `assertRegistryIsComplete` below fails
 * the run rather than letting that happen quietly.
 */
const RELATIONS: Readonly<Record<string, string>> = {
  peptides: 'peptide_key',
  claims: 'claim_key',
  protocols: 'protocol_key',
  literature_screens: 'screen_key',
  // These two have no key of their own, so the compound is part of the label:
  // "subcutaneous" on its own names nineteen different records.
  peptide_routes: `(select p.peptide_key from peptides p where p.id = peptide_id)
                   || ' · ' || route_key`,
  regulatory_statuses: `(select p.peptide_key from peptides p where p.id = peptide_id)
                        || ' · ' || jurisdiction
                        || ' / ' || coalesce(indication_context, 'any indication')`,
  disagreements: 'disagreement_key',
  compound_products: 'product_key',
  pk_observations: 'observation_key',
  compound_identity_claims: 'identity_key',
  replication_assessments: 'assessment_key',
  quality_topics: 'quality_key',
  learning_topics: 'topic_key',
  editorial_syntheses: 'synthesis_key',
};

type Db = ReturnType<typeof drizzle<typeof schema>>;
type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];
type AnyDb = Db | Tx;

function rowsOf<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (result && typeof result === 'object' && Array.isArray((result as { rows?: unknown }).rows)) {
    return (result as { rows: T[] }).rows;
  }
  return [];
}

/** A relation carrying `publication_state` that nobody listed is one nobody checks. */
async function assertRegistryIsComplete(db: AnyDb): Promise<void> {
  const found = rowsOf<{ table_name: string }>(
    await db.execute(sql`
      select c.table_name
        from information_schema.columns c
        join information_schema.tables t
          on t.table_name = c.table_name and t.table_schema = c.table_schema
       where c.column_name = 'publication_state'
         and c.table_schema = 'public'
         and t.table_type = 'BASE TABLE'
       order by c.table_name
    `),
  ).map((r) => r.table_name);

  const missing = found.filter((name) => !(name in RELATIONS));
  if (missing.length > 0) {
    throw new Error(
      `These relations carry publication_state but are not checked: ${missing.join(', ')}.\n` +
        'Add them to RELATIONS in scripts/qa/publication-integrity.ts with a label column.',
    );
  }
}

async function snapshot(db: AnyDb): Promise<PublicationSnapshot> {
  const relations: RelationSnapshot[] = [];

  for (const [relation, labelExpression] of Object.entries(RELATIONS)) {
    const rows = rowsOf<{ id: string; publication_state: string; label: string | null }>(
      await db.execute(
        sql.raw(
          `select id::text as id, publication_state::text as publication_state,
                  (${labelExpression})::text as label
             from ${relation}`,
        ),
      ),
    );

    const states: Record<string, string> = {};
    const labels: Record<string, string> = {};
    for (const row of rows) {
      states[row.id] = row.publication_state;
      labels[row.id] = row.label ?? row.id;
    }
    relations.push({ relation, states, labels });
  }

  // The gates are supposed to make this unreachable. Checked anyway, because a
  // gate that can be bypassed is exactly the kind of thing this tool is for.
  const [provenance] = rowsOf<{ n: number }>(
    await db.execute(sql`
      select (
        (select count(*)::int from claims c
          where c.publication_state = 'published'
            and not c.is_editorial_non_evidentiary
            and not tides_claim_provenance_ok(c.id))
        + (select count(*)::int from protocols p
            where p.publication_state = 'published'
              and not tides_protocol_provenance_ok(p.id))
      ) as n
    `),
  );

  return { relations, provenanceFailures: provenance?.n ?? 0 };
}

function report(failures: readonly IntegrityFailure[]): void {
  const byKind = new Map<string, IntegrityFailure[]>();
  for (const failure of failures) {
    const list = byKind.get(failure.kind) ?? [];
    list.push(failure);
    byKind.set(failure.kind, list);
  }

  for (const [kind, list] of byKind) {
    console.log(`\n  ${kind.replace(/_/g, ' ').toUpperCase()} — ${String(list.length)}`);
    console.log(`    ${list[0]!.detail}`);
    for (const failure of list.slice(0, 20)) {
      console.log(`      ${failure.relation} · ${failure.label}`);
    }
    if (list.length > 20) console.log(`      … and ${String(list.length - 20)} more`);
  }
}

/** Thrown to roll the QA transaction back. Never an error the operator needs to see. */
class Rollback extends Error {
  readonly failures: readonly IntegrityFailure[];
  readonly summary: string;

  constructor(failures: readonly IntegrityFailure[], summary: string) {
    super('rolling back the publication-integrity transaction');
    this.failures = failures;
    this.summary = summary;
  }
}

const client = postgres(url, { max: 1, prepare: false });

try {
  const db = drizzle(client, { schema, casing: 'snake_case' });
  console.log('\n  PUBLICATION-SURFACE INTEGRITY\n');
  console.log('  Re-seeding inside a transaction that is always rolled back.');
  console.log('  The database this is pointed at is not modified.\n');

  let outcome: Rollback | null = null;
  try {
    await db.transaction(async (tx) => {
      await assertRegistryIsComplete(tx);

      const before = await snapshot(tx);
      const standing = standingProvenanceFailures(before);

      await seedDatabase(tx);

      /*
       * The deferred provenance guards would otherwise fire at COMMIT, and this
       * transaction never commits. Forcing them now is what makes a rolled-back
       * check tell the truth about what committing would have done.
       */
      await tx.execute(sql`set constraints all immediate`);

      const after = await snapshot(tx);
      const failures = [...standing, ...comparePublicationSurface(before, after)];
      const summary =
        `  ${String(rowsCompared(before))} rows across ` +
        `${String(before.relations.length)} publishable relations, ` +
        `${String(publishedCount(before))} of them published.`;

      throw new Rollback(failures, summary);
    });
  } catch (error) {
    if (error instanceof Rollback) outcome = error;
    else throw error;
  }

  const { failures, summary } = outcome!;
  console.log(summary);

  if (failures.length === 0) {
    console.log('\n  A deterministic re-seed preserves every published record.\n');
  } else {
    report(failures);
    console.log(
      `\n  ${String(failures.length)} integrity failure(s). A re-seed of this database would ` +
        'change what the public can see.\n',
    );
    process.exitCode = 1;
  }
} catch (error) {
  console.error('Publication-integrity check failed to run:', error);
  process.exitCode = 1;
} finally {
  await client.end();
}
