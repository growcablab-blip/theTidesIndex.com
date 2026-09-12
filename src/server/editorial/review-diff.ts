import { sql } from 'drizzle-orm';
import type { Database } from '../db/types';

/**
 * What changed since a reviewer last looked.
 *
 * An approval is bound to a version. Editing a record bumps its version and
 * strands every approval against the old one, which is correct and is also the
 * moment a reviewer is most likely to give up: they are asked to look again at
 * something that appears identical, with no indication of what moved.
 *
 * `revisions` already holds a full snapshot of the prior row at each version, so
 * the answer exists — it just has never been surfaced. This turns it into the
 * one question a returning reviewer actually has.
 *
 * Deliberately not a git-style interface. A reviewer needs to know which fields
 * changed and what they changed from; anything more is a tool they did not ask
 * for.
 */

/** The fields a reviewer's approval actually rests on. */
const REVIEWED_FIELDS: Readonly<Record<string, string>> = {
  claim_text: 'Claim',
  plain_language_text: 'Plain language',
  interpretation_notes: 'How this index reads it',
  uncertainty_text: 'What remains uncertain',
  importance: 'Importance',
  claim_category: 'Category',
  certificate_type_scope: 'Document scope',
  what_it_proves: 'What it establishes',
  what_it_does_not_prove: 'What it does not establish',
  simple_summary: 'Plain-language summary',
  practitioner_summary: 'Practitioner summary',
  common_misinterpretations: 'Common misreadings',
  short_description: 'Short description',
};

export interface FieldChange {
  readonly field: string;
  readonly label: string;
  readonly before: string | null;
  readonly after: string | null;
}

export interface ReviewDiff {
  /** The version the reviewer approved or commented on. */
  readonly reviewedVersion: number;
  readonly currentVersion: number;
  /** True when nothing has moved and the earlier review still describes this. */
  readonly unchanged: boolean;
  readonly changes: readonly FieldChange[];
  /**
   * Set when the record has changed but no snapshot covers the gap — the honest
   * answer is that the difference cannot be shown, not that there is none.
   */
  readonly note: string | null;
}

function text(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return typeof value === 'string' ? value : JSON.stringify(value);
}

/**
 * Compares the row as it stood at `reviewedVersion` with the row as it stands
 * now.
 *
 * A revision row records the version the record *had* when it was superseded,
 * together with a snapshot of that row. So the state a reviewer saw at version N
 * is the snapshot on the revision whose `version` is N — the first such revision
 * at or after the reviewed version, since intermediate versions may have been
 * skipped.
 */
export async function reviewDiff(
  tx: Database,
  table: 'claims' | 'quality_topics' | 'protocols',
  entityType: 'claim' | 'quality_topic' | 'protocol',
  entityId: string,
  reviewedVersion: number,
): Promise<ReviewDiff | null> {
  const currentRows = rows<Record<string, unknown>>(
    await tx.execute(sql`select * from ${sql.raw(table)} where id = ${entityId}`),
  );
  const current = currentRows[0];
  if (current === undefined) return null;

  const currentVersion = Number(current.version);
  if (currentVersion === reviewedVersion) {
    return {
      reviewedVersion,
      currentVersion,
      unchanged: true,
      changes: [],
      note: null,
    };
  }

  const snapshotRows = rows<{ snapshot: unknown; version: number }>(
    await tx.execute(sql`
      select snapshot, version from revisions
      where entity_type = ${entityType}::reviewable_entity_type
        and entity_id = ${entityId}
        and version >= ${reviewedVersion}
        and snapshot is not null
      order by version asc
      limit 1
    `),
  );
  const snapshot = snapshotRows[0]?.snapshot;

  if (snapshot === undefined || snapshot === null || typeof snapshot !== 'object') {
    return {
      reviewedVersion,
      currentVersion,
      unchanged: false,
      changes: [],
      note:
        `This record has changed from version ${String(reviewedVersion)} to ` +
        `${String(currentVersion)}, and no stored snapshot covers that change. ` +
        'The difference cannot be shown, so the whole record needs reading again.',
    };
  }

  const before = snapshot as Record<string, unknown>;
  const changes: FieldChange[] = [];

  for (const [field, label] of Object.entries(REVIEWED_FIELDS)) {
    if (!(field in current)) continue;
    const from = text(before[field]);
    const to = text(current[field]);
    if (from !== to) changes.push({ field, label, before: from, after: to });
  }

  return {
    reviewedVersion,
    currentVersion,
    unchanged: changes.length === 0,
    changes,
    // A version bump with no change to a reviewed field is worth saying out
    // loud: the approval was invalidated by an edit that does not affect what
    // was approved, and a reviewer should know that before re-reading it all.
    note:
      changes.length === 0
        ? `The version moved from ${String(reviewedVersion)} to ${String(currentVersion)}, ` +
          'but none of the fields an approval rests on changed.'
        : null,
  };
}

function rows<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (result && typeof result === 'object' && Array.isArray((result as { rows?: unknown }).rows)) {
    return (result as { rows: T[] }).rows;
  }
  return [];
}
