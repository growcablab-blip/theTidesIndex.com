import { describe, expect, it } from 'vitest';
import {
  comparePublicationSurface,
  publishedCount,
  rowsCompared,
  standingProvenanceFailures,
  type PublicationSnapshot,
} from '@/server/ops/publication-integrity';

/**
 * The rules behind `npm run qa:publication-integrity`.
 *
 * Both of the defects this check exists for are reproduced here as snapshots,
 * because both are cheap to describe and expensive to rediscover: 98 published
 * protocols withdrawn by a watchdog watching a rebuild, and 177 published rows
 * replaced by unpublished rows carrying the same content. The second left no
 * trace in the database at all, which is why the check compares row identity
 * and not just counts.
 */

function snap(
  rows: readonly (readonly [string, string, string])[],
  provenanceFailures = 0,
): PublicationSnapshot {
  const byRelation = new Map<string, { states: Record<string, string>; labels: Record<string, string> }>();
  for (const [relation, id, state] of rows) {
    const entry = byRelation.get(relation) ?? { states: {}, labels: {} };
    entry.states[id] = state;
    entry.labels[id] = `${relation.toUpperCase()}-${id}`;
    byRelation.set(relation, entry);
  }
  return {
    relations: [...byRelation].map(([relation, e]) => ({ relation, ...e })),
    provenanceFailures,
  };
}

describe('publication-surface comparison', () => {
  it('passes when a re-seed changes nothing', () => {
    const before = snap([
      ['protocols', 'p1', 'published'],
      ['protocols', 'p2', 'unpublished'],
      ['claims', 'c1', 'published'],
    ]);
    expect(comparePublicationSurface(before, before)).toEqual([]);
  });

  it('catches a published record the watchdog withdrew', () => {
    // The first Tranche-1 defect: the guard fired on the delete half of a
    // rebuild and withdrew a protocol whose provenance was intact by the end.
    const before = snap([['protocols', 'p1', 'published']]);
    const after = snap([['protocols', 'p1', 'withdrawn']]);

    const failures = comparePublicationSurface(before, after);
    expect(failures).toHaveLength(1);
    expect(failures[0]?.kind).toBe('published_record_withdrawn');
    expect(failures[0]?.label).toBe('PROTOCOLS-p1');
  });

  it('catches a published record that was deleted and re-inserted', () => {
    /*
     * The second, and the one a count would miss: one published row out, one
     * unpublished row in. Same relation, same content, same total.
     */
    const before = snap([['peptide_routes', 'old', 'published']]);
    const after = snap([['peptide_routes', 'new', 'unpublished']]);

    const failures = comparePublicationSurface(before, after);
    expect(failures.map((f) => f.kind)).toEqual(['published_record_vanished']);
    expect(failures[0]?.detail).toMatch(/upsert on a natural key/);
  });

  it('catches a published record quietly unpublished', () => {
    const failures = comparePublicationSurface(
      snap([['claims', 'c1', 'published']]),
      snap([['claims', 'c1', 'unpublished']]),
    );
    expect(failures.map((f) => f.kind)).toEqual(['published_record_unpublished']);
  });

  it('catches a relation that disappeared', () => {
    const failures = comparePublicationSurface(
      snap([
        ['protocols', 'p1', 'published'],
        ['pk_observations', 'o1', 'published'],
      ]),
      snap([['protocols', 'p1', 'published']]),
    );
    expect(failures.map((f) => f.kind)).toEqual(['relation_disappeared']);
    expect(failures[0]?.relation).toBe('pk_observations');
  });

  it('catches a seed that publishes something', () => {
    /*
     * Pointing the other way on purpose. Publication is a decision that passes
     * through the gates, not a side effect of loading data — and a seed that
     * publishes as much as it loses would otherwise keep the totals level and
     * hide the loss.
     */
    const failures = comparePublicationSurface(
      snap([['quality_topics', 'q1', 'unpublished']]),
      snap([['quality_topics', 'q1', 'published']]),
    );
    expect(failures.map((f) => f.kind)).toEqual(['record_published_by_seed']);
  });

  it('reports a loss and a publication together rather than netting them off', () => {
    const failures = comparePublicationSurface(
      snap([
        ['protocols', 'p1', 'published'],
        ['protocols', 'p2', 'unpublished'],
      ]),
      snap([
        ['protocols', 'p1', 'withdrawn'],
        ['protocols', 'p2', 'published'],
      ]),
    );
    expect(failures.map((f) => f.kind).sort()).toEqual([
      'published_record_withdrawn',
      'record_published_by_seed',
    ]);
  });

  it('ignores records that were never published', () => {
    // Not this check's business. A record that was unpublished before and is
    // gone after may simply have left its packet, which is allowed.
    const failures = comparePublicationSurface(
      snap([['claims', 'c1', 'unpublished']]),
      snap([['claims', 'c2', 'unpublished']]),
    );
    expect(failures).toEqual([]);
  });

  it('reports provenance broken after a re-seed separately from before it', () => {
    const clean = snap([['protocols', 'p1', 'published']], 0);
    const broken = snap([['protocols', 'p1', 'published']], 3);

    expect(comparePublicationSurface(clean, broken).map((f) => f.kind)).toEqual([
      'provenance_broken',
    ]);
    expect(comparePublicationSurface(clean, clean)).toEqual([]);

    // A fault in the database as it stands is not something the re-seed did.
    expect(standingProvenanceFailures(broken).map((f) => f.kind)).toEqual(['provenance_broken']);
    expect(standingProvenanceFailures(clean)).toEqual([]);
  });

  it('counts what it compared', () => {
    const before = snap([
      ['protocols', 'p1', 'published'],
      ['protocols', 'p2', 'unpublished'],
      ['claims', 'c1', 'published'],
    ]);
    expect(rowsCompared(before)).toBe(3);
    expect(publishedCount(before)).toBe(2);
  });
});
