/**
 * Did anything that was public stop being public?
 *
 *   npm run qa:publication-integrity
 *
 * `qa:production` answers a different question: *is the data in front of me fit
 * to serve?* It looks at one state of the database and judges it. Both of the
 * defects found during the Section 4 expansion passed it comfortably, because
 * the database was fit to serve after each of them — it was simply serving much
 * less than it had been an hour earlier:
 *
 *   - a re-seed tripped the provenance watchdog mid-rebuild and **withdrew 98
 *     published protocols**;
 *   - six relations were rebuilt by delete-and-insert, so **177 published rows
 *     ceased to exist** and unpublished rows carrying the same content replaced
 *     them, leaving no trace at all.
 *
 * Neither is visible in a single snapshot. "Is this valid?" and "is this still
 * everything it was?" are different questions, and only the second one catches
 * a silent loss.
 *
 * So this compares two states of the same database across a deterministic
 * re-seed. The rules are here, pure and tested; the gathering and the re-seed
 * are in `scripts/qa/publication-integrity.ts`.
 *
 * Deliberately **not** a check on absolute numbers. "793 records, 21 compounds,
 * 98 protocols" is true today and wrong next week, and a check that has to be
 * edited every time the library grows is a check that gets edited without being
 * read. What it asserts is structural: a re-seed of unchanged content must
 * preserve identity and publication state, and must not publish anything either.
 */

/** A row's identity and public state at one moment. */
export interface RelationSnapshot {
  readonly relation: string;
  /** Row id to `publication_state`, for every row in the relation. */
  readonly states: Readonly<Record<string, string>>;
  /** Row id to something a person can search for. Messages only. */
  readonly labels: Readonly<Record<string, string>>;
}

export interface PublicationSnapshot {
  readonly relations: readonly RelationSnapshot[];
  /**
   * Published rows whose provenance does not hold — a published claim with no
   * evidence link to a citable location, or a published protocol with no
   * citable source. Must be zero before and after.
   */
  readonly provenanceFailures: number;
}

export type IntegrityFailureKind =
  | 'relation_disappeared'
  | 'published_record_vanished'
  | 'published_record_unpublished'
  | 'published_record_withdrawn'
  | 'record_published_by_seed'
  | 'provenance_broken';

export interface IntegrityFailure {
  readonly kind: IntegrityFailureKind;
  readonly relation: string;
  /** The record, named the way an editor would search for it. */
  readonly label: string;
  readonly detail: string;
}

const PUBLISHED = 'published';

/**
 * What the re-seed cost, if anything.
 *
 * Every rule is about a record that *was* public. A record that was unpublished
 * before and is unpublished after is not this check's business; a record that
 * was published and is now anything else, or is now gone, is the whole point.
 *
 * The one rule pointing the other way is `record_published_by_seed`. A seed that
 * quietly publishes is as wrong as one that quietly withdraws — publication is a
 * decision that passes through the gates, not a side effect of loading data —
 * and it would otherwise hide a loss by keeping the totals level.
 */
export function comparePublicationSurface(
  before: PublicationSnapshot,
  after: PublicationSnapshot,
): IntegrityFailure[] {
  const failures: IntegrityFailure[] = [];
  const afterByRelation = new Map(after.relations.map((r) => [r.relation, r]));

  for (const was of before.relations) {
    const now = afterByRelation.get(was.relation);

    if (now === undefined) {
      failures.push({
        kind: 'relation_disappeared',
        relation: was.relation,
        label: was.relation,
        detail: 'the relation is absent after the re-seed',
      });
      continue;
    }

    for (const [id, state] of Object.entries(was.states)) {
      if (state !== PUBLISHED) continue;
      const label = was.labels[id] ?? id;
      const stateNow = now.states[id];

      if (stateNow === undefined) {
        /*
         * The signature of the second Tranche-1 defect. The row was not
         * withdrawn and no trigger fired — it was deleted and re-inserted, so
         * the published row simply no longer exists and an unpublished one
         * carrying the same content stands where it was. Nothing in a
         * single-snapshot check can see this.
         */
        failures.push({
          kind: 'published_record_vanished',
          relation: was.relation,
          label,
          detail:
            'was published before the re-seed and its row no longer exists. ' +
            'A rebuild that deletes and re-inserts replaces a published record ' +
            'with an unpublished one; upsert on a natural key instead',
        });
        continue;
      }

      if (stateNow === 'withdrawn') {
        failures.push({
          kind: 'published_record_withdrawn',
          relation: was.relation,
          label,
          detail:
            'was published before the re-seed and is withdrawn after it. A ' +
            'withdrawal is a decision; a re-seed of unchanged content is not ' +
            'entitled to make one',
        });
      } else if (stateNow !== PUBLISHED) {
        failures.push({
          kind: 'published_record_unpublished',
          relation: was.relation,
          label,
          detail: `was published before the re-seed and is '${stateNow}' after it`,
        });
      }
    }
  }

  const beforeByRelation = new Map(before.relations.map((r) => [r.relation, r]));
  for (const now of after.relations) {
    const was = beforeByRelation.get(now.relation);
    if (was === undefined) continue;
    for (const [id, state] of Object.entries(now.states)) {
      if (state !== PUBLISHED) continue;
      if (was.states[id] === PUBLISHED) continue;
      failures.push({
        kind: 'record_published_by_seed',
        relation: now.relation,
        label: now.labels[id] ?? id,
        detail:
          was.states[id] === undefined
            ? 'did not exist before the re-seed and is published after it'
            : `was '${was.states[id]}' before the re-seed and is published after it`,
      });
    }
  }

  if (after.provenanceFailures > 0) {
    failures.push({
      kind: 'provenance_broken',
      relation: 'claims, protocols',
      label: `${String(after.provenanceFailures)} record(s)`,
      detail:
        'are published after the re-seed without a citable source at an exact ' +
        'location. The publish gates should make this impossible; if it is ' +
        'reachable, a gate is being bypassed',
    });
  }

  return failures;
}

/**
 * Was anything published on provenance that does not hold, before the re-seed?
 *
 * Separate from the comparison because it is a fault in the database as it
 * stands rather than something the re-seed did, and the two should not be
 * reported as if they were the same problem.
 */
export function standingProvenanceFailures(before: PublicationSnapshot): IntegrityFailure[] {
  if (before.provenanceFailures === 0) return [];
  return [
    {
      kind: 'provenance_broken',
      relation: 'claims, protocols',
      label: `${String(before.provenanceFailures)} record(s)`,
      detail:
        'are published without a citable source at an exact location. This is ' +
        'true of the database as it stands, before any re-seed',
    },
  ];
}

/** Total rows compared, for the report line that says what was actually checked. */
export function rowsCompared(snapshot: PublicationSnapshot): number {
  return snapshot.relations.reduce((n, r) => n + Object.keys(r.states).length, 0);
}

/** Published rows, so the summary can say how much of the surface was public. */
export function publishedCount(snapshot: PublicationSnapshot): number {
  return snapshot.relations.reduce(
    (n, r) => n + Object.values(r.states).filter((s) => s === PUBLISHED).length,
    0,
  );
}
