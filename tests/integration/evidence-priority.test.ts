import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { seedDatabase } from '@db/seed';
import { readPeptidePagePreview } from '@/server/public/queries';
import { sectionHintsFor } from '@/server/search/section-routing';
import { closeTestDb, createTestDb, query, truncateContent, type TestDb } from '../support/test-db';

/**
 * Evidence first, regulator second.
 *
 * The Tides Index is not a regulatory-status database. A regulator's position
 * on a compound in one jurisdiction on one date is a useful fact and is not a
 * measure of the science, and the difference matters most exactly where the two
 * come apart: Thymosin beta-4 has two independently replicated human safety
 * studies and no approval anywhere, while tesamorelin has an approval that
 * covers one indication and is quoted for others.
 *
 * A platform that led with the badge would rank those the wrong way round.
 * These tests guard the ordering, and they guard the identity rule that keeps
 * evidence from crossing between two molecules that share a name.
 */

describe('evidence priority and identity', () => {
  let db: TestDb;

  beforeAll(async () => {
    db = await createTestDb();
  });

  afterAll(async () => {
    await closeTestDb(db);
  });

  beforeEach(async () => {
    await truncateContent(db);
    await seedDatabase(db);
  });

  // --- Regulatory status is not evidence strength --------------------------

  it('does not treat regulatory status as a measure of the evidence', async () => {
    const tb4 = await readPeptidePagePreview(db, 'thymosin-beta-4', 'practitioner');
    const tesa = await readPeptidePagePreview(db, 'tesamorelin', 'practitioner');

    // The pair that makes the point: no approval, and two independently
    // replicated human safety studies.
    expect(tb4!.regulatoryStatuses.every((r) => r.status !== 'approved')).toBe(true);
    const replicated = tb4!.replication.filter((r) =>
      ['independent_group', 'independent_multiple_countries', 'confirmed_in_humans'].includes(
        r.state,
      ),
    );
    expect(replicated.length).toBeGreaterThan(0);

    // And the approved compound's own record does not use the approval to
    // stand for evidence outside the approved indication.
    expect(tesa!.regulatoryStatuses.some((r) => r.status === 'approved')).toBe(true);
    const scope = tesa!.gaps.map((g) => g.statement).join(' ');
    // The two ways an approval gets over-read: another population, another
    // jurisdiction. Both are recorded as absences on the approved compound.
    expect(scope).toMatch(/without HIV-associated lipodystrophy/i);
    expect(scope).toMatch(/outside the United States/i);
  });

  it('never phrases non-approval as an absence of evidence', async () => {
    for (const slug of ['thymosin-beta-4', 'tb-500', 'bpc-157']) {
      const page = await readPeptidePagePreview(db, slug, 'practitioner');
      for (const status of page!.regulatoryStatuses) {
        if (status.status === 'approved') continue;
        const notes = status.notes ?? '';
        expect(notes, `${slug}: a non-approval states nothing about why`).not.toBe('');
        /*
         * The failure this guards is a sentence like "not approved, so the
         * evidence is weak". Non-approval and evidence quality are different
         * axes and a status note may not conflate them.
         */
        expect(notes, slug).not.toMatch(
          /(therefore|so|which means)[^.]{0,40}(no|little|weak|insufficient) evidence/i,
        );
      }
    }
  });

  it('scopes a regulatory status to one jurisdiction rather than to the world', async () => {
    const [row] = await query<{ n: number }>(
      db,
      `select count(*)::int as n from regulatory_statuses
        where jurisdiction is null or btrim(jurisdiction) = ''
           or checked_at is null`,
    );
    expect(Number(row!.n)).toBe(0);

    // And an approval names its authority, so "approved" can never read as a
    // global scientific status.
    const approvals = await query<{ jurisdiction: string; authority: string | null }>(
      db,
      `select jurisdiction, authority from regulatory_statuses where status = 'approved'`,
    );
    for (const approval of approvals) {
      expect(approval.authority, approval.jurisdiction).toBeTruthy();
      expect(approval.jurisdiction).not.toMatch(/^(global|worldwide|international)$/i);
    }
  });

  // --- Geography is not a quality signal ------------------------------------

  it('does not demote evidence by the country it came from', async () => {
    const page = await readPeptidePagePreview(db, 'thymosin-beta-4', 'practitioner');
    const screen = page!.literatureScreens[0]!;

    // The Chinese phase I study is the compound's strongest human safety record
    // and carries the same evidence type as the US one.
    const human = page!.claims.flatMap((c) =>
      c.evidence.filter((e) => e.evidenceClass === 'human'),
    );
    const phaseOne = human.filter((e) => /healthy (adult )?volunteers/i.test(e.populationModel ?? ''));
    expect(phaseOne.length).toBeGreaterThanOrEqual(2);
    expect(new Set(phaseOne.map((e) => e.evidenceTypeKey)).size).toBe(1);

    // The ledger records the country, and more than one is represented among
    // the studies it counted as human.
    const countries = new Set(
      screen.humanRecords.filter((r) => r.included).map((r) => r.country).filter(Boolean),
    );
    expect(countries.size).toBeGreaterThan(1);

    // Nothing in the record's prose ranks a country.
    const prose = [page!.simpleSummary, page!.practitionerSummary, page!.unknownsSummary]
      .filter((t): t is string => typeof t === 'string')
      .join(' ');
    expect(prose).not.toMatch(
      /(chinese|russian|foreign|non-western)[^.]{0,30}(study|studies|data)[^.]{0,40}(less|weaker|unreliable|discount)/i,
    );
  });

  // --- Identity ------------------------------------------------------------

  it('keeps two molecules that share a name as two records', async () => {
    const tb4 = await readPeptidePagePreview(db, 'thymosin-beta-4', 'practitioner');
    const tb500 = await readPeptidePagePreview(db, 'tb-500', 'practitioner');
    expect(tb4).not.toBeNull();
    expect(tb500).not.toBeNull();

    // The analytical measurement is on the record, with the residue counts that
    // make the difference checkable rather than asserted.
    const measured = tb500!.identities.filter(
      (i) => i.verification === 'analytically_characterised',
    );
    expect(measured.length).toBeGreaterThanOrEqual(2);
    for (const identity of measured) {
      expect(identity.residueCount).toBe(7);
      expect(identity.form).toBe('fragment');
    }
    // The full-length claim that states a sequence. Seeds also records the
    // parent as full-length, by family and gene, without a residue count.
    const parent = tb4!.identities.find(
      (i) => i.form === 'full_length' && i.residueCount !== null,
    );
    expect(parent?.residueCount).toBe(43);
  });

  it('does not let evidence cross an unresolved chemical identity', async () => {
    /*
     * The structural guarantee. Evidence hangs off claims, claims hang off a
     * peptide, and the two names are two peptides — so a citation cannot be
     * shared between them by accident. What could still go wrong is an editor
     * citing the same source location on both records for the same finding,
     * which is why this checks the sources rather than the rows.
     */
    const tb4 = await readPeptidePagePreview(db, 'thymosin-beta-4', 'practitioner');
    const tb500 = await readPeptidePagePreview(db, 'tb-500', 'practitioner');

    const humanSources = (page: NonNullable<typeof tb4>): Set<string> =>
      new Set(
        page.claims.flatMap((c) =>
          c.evidence.filter((e) => e.evidenceClass === 'human').map((e) => e.citation.sourceKey),
        ),
      );

    const tb4Human = humanSources(tb4!);
    const tb500Human = humanSources(tb500!);

    expect(tb4Human.size).toBeGreaterThan(0);
    // No human study sits on the fragment's record at all, and none of the
    // parent's human sources has been reused there.
    expect(tb500Human.size).toBe(0);
    for (const key of tb500Human) {
      expect(tb4Human.has(key), `${key} is cited as human evidence on both records`).toBe(false);
    }
  });

  it('treats a related_but_distinct name differently from an exact alias', async () => {
    const rows = await query<{ alias: string; alias_type: string; notes: string | null }>(
      db,
      `select a.alias, a.alias_type, a.notes
         from peptide_aliases a
         join peptides p on p.id = a.peptide_id
        where p.peptide_key in ('thymosin-beta-4', 'tb-500')
        order by a.alias`,
    );

    const tb500Alias = rows.find((r) => r.alias === 'TB-500');
    expect(tb500Alias?.alias_type).toBe('related_but_distinct');
    expect(tb500Alias?.notes).toMatch(/not a synonym|separate record|fragment/i);

    const misnomer = rows.find(
      (r) => r.alias === 'Thymosin beta-4' && r.alias_type === 'common_misnomer',
    );
    expect(misnomer, 'the reverse misnomer is not recorded on the fragment').toBeDefined();

    // Neither may be recorded as a plain synonym anywhere.
    for (const row of rows) {
      if (row.alias === 'TB-500' || row.alias === 'Thymosin beta-4') {
        expect(['synonym', 'abbreviation', 'chemical_name'], row.alias).not.toContain(
          row.alias_type,
        );
      }
    }
  });

  // --- Protocols stay source-specific ---------------------------------------

  it('keeps every protocol attached to exactly one source', async () => {
    const [merged] = await query<{ n: number }>(
      db,
      `select count(*)::int as n from (
         select protocol_id from protocol_sources
          group by protocol_id having count(distinct source_id) > 1
       ) m`,
    );
    expect(Number(merged!.n)).toBe(0);

    for (const slug of ['thymosin-beta-4', 'bpc-157']) {
      const page = await readPeptidePagePreview(db, slug, 'practitioner');
      for (const protocol of page!.protocols) {
        expect(protocol.sources.length, `${slug}/${protocol.protocolKey}`).toBe(1);
        expect(protocol.regulatoryContext, `${slug}/${protocol.protocolKey}`).toBeTruthy();
      }
    }
  });

  // --- Research questions derive from recorded gaps -------------------------

  it('derives every research question from a recorded gap', async () => {
    const rows = await query<{
      gap_key: string;
      research_question: string | null;
      opportunity_type: string | null;
      statement: string;
    }>(
      db,
      `select gap_key, research_question, opportunity_type, statement from evidence_gaps
        where research_question is not null or opportunity_type is not null`,
    );
    expect(rows.length).toBeGreaterThan(0);

    for (const row of rows) {
      // Both fields or neither — the database enforces it; this proves the
      // constraint is doing its job on real data.
      expect(row.research_question, row.gap_key).toBeTruthy();
      expect(row.opportunity_type, row.gap_key).toBeTruthy();
      expect(row.statement, row.gap_key).toBeTruthy();

      /*
       * The wording line that separates a research platform from a
       * recommendation engine: a question describes what would be useful to
       * study, never what somebody should take.
       */
      expect(row.research_question, row.gap_key).not.toMatch(
        /\b(you should|should (try|take|use|start)|try taking|recommended dose)\b/i,
      );
    }
  });

  it('refuses a research question with no opportunity type', async () => {
    await expect(
      query(
        db,
        `update evidence_gaps set research_question = 'A question with no type'
          where gap_key = (select gap_key from evidence_gaps limit 1)`,
      ),
    ).rejects.toThrow(/evidence_gaps_question_and_type_together/i);
  });

  // --- Replication is not a paper count -------------------------------------

  it('refuses an independent-replication claim backed by one group', async () => {
    await expect(
      query(
        db,
        `update replication_assessments
            set state = 'independent_group', group_count = 1
          where assessment_key = 'TB4-REP-003'`,
      ),
    ).rejects.toThrow(/replication_independent_needs_groups/i);
  });

  it('records replication as a state with its working shown', async () => {
    const page = await readPeptidePagePreview(db, 'thymosin-beta-4', 'practitioner');
    expect(page!.replication.length).toBeGreaterThanOrEqual(4);

    // Both ends are present: the safety finding is independently replicated,
    // and the venous-ulcer finding is two papers from one group. If everything
    // were at one end the field would be decorative.
    const states = new Set(page!.replication.map((r) => r.state));
    expect(states.has('independent_multiple_countries')).toBe(true);
    expect(states.has('repeated_same_group')).toBe(true);

    for (const assessment of page!.replication) {
      expect(assessment.basis, assessment.assessmentKey).toBeTruthy();
      if (assessment.state === 'repeated_same_group') {
        expect(assessment.groupCount, assessment.assessmentKey).toBe(1);
        // The one that matters most: two papers must not read as two studies.
        expect(assessment.limitations, assessment.assessmentKey).toMatch(
          /one programme|same group|no independent/i,
        );
      }
    }
  });

  // --- A stratified screen says so ------------------------------------------

  it('never presents a partial ledger as a complete one', async () => {
    const tb4 = await readPeptidePagePreview(db, 'thymosin-beta-4', 'practitioner');
    const tb500 = await readPeptidePagePreview(db, 'tb-500', 'practitioner');

    const stratified = tb4!.literatureScreens[0]!;
    expect(stratified.screenedCount).toBeLessThan(stratified.resultCount);
    expect(stratified.stratum, 'a stratified screen must name its stratum').toBeTruthy();
    // The ledger's own counts add up to what it classified, not to the universe.
    expect(stratified.typeCounts.reduce((n, t) => n + t.count, 0)).toBe(stratified.screenedCount);

    const census = tb500!.literatureScreens[0]!;
    expect(census.screenedCount).toBe(census.resultCount);
    expect(census.typeCounts.reduce((n, t) => n + t.count, 0)).toBe(census.resultCount);
  });

  it('never counts a false string match as evidence', async () => {
    const page = await readPeptidePagePreview(db, 'tb-500', 'practitioner');
    const screen = page!.literatureScreens[0]!;
    const falseMatches = screen.typeCounts.find((t) => t.studyType === 'false_match');
    expect(falseMatches?.count).toBeGreaterThan(0);
    expect(screen.includedCount).toBeLessThan(screen.resultCount - (falseMatches?.count ?? 0) + 1);
    expect(screen.humanPrimaryCount).toBe(0);
  });

  // --- Patient mode ----------------------------------------------------------

  it('gives patient mode no regimen detail on either new record', async () => {
    for (const slug of ['thymosin-beta-4', 'tb-500']) {
      const page = await readPeptidePagePreview(db, slug, 'simple');
      const payload = JSON.stringify(page).replaceAll(
        /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g,
        '',
      );
      for (const amount of [
        '300 mcg',
        '1 gram',
        '60 micrograms per kilogram',
        '0.5 mg/mL',
        '1260 mg',
        '25.0 micrograms',
        '25.0 µg/kg',
      ]) {
        expect(payload, `${slug} patient payload contains ${amount}`).not.toContain(amount);
      }
      for (const protocol of page!.protocols) {
        expect(Object.prototype.hasOwnProperty.call(protocol, 'amountReported'), slug).toBe(false);
      }
      // The screen ledger's reasons name what each trial gave, so they go.
      for (const screen of page!.literatureScreens) {
        for (const record of screen.humanRecords) {
          expect(record.reason, `${slug}/${record.externalId}`).toBeNull();
        }
      }
      // And what a patient keeps: the identity answer, which carries no dose.
      expect(page!.identities.length, slug).toBeGreaterThan(0);
    }
  });

  // --- Page hierarchy -------------------------------------------------------

  it('places regulatory context after the science in the compound page', async () => {
    /*
     * Asserted against the order of section anchors in the page source. A
     * rendered-DOM test would need a running server; the source order is what
     * renders, and it is the thing an edit would change.
     */
    const { readFileSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    const source = readFileSync(
      fileURLToPath(new URL('../../src/app/(public)/peptides/[slug]/page.tsx', import.meta.url)),
      'utf8',
    );
    const at = (id: string): number => {
      const index = source.indexOf(`id="${id}"`);
      expect(index, `section ${id} not found`).toBeGreaterThan(-1);
      return index;
    };

    const regulatory = at('regulatory');
    for (const science of [
      'overview',
      'evidence',
      'literature',
      'replication',
      'routes',
      'protocols',
      'disagreements',
      'research-questions',
    ]) {
      expect(at(science), `${science} must precede regulatory context`).toBeLessThan(regulatory);
    }

    // And the at-a-glance panel puts regulatory context last, in its own line
    // rather than as one of the evidence items.
    const glance = readFileSync(
      fileURLToPath(new URL('../../src/components/public/evidence-at-a-glance.tsx', import.meta.url)),
      'utf8',
    );
    const items = [...glance.matchAll(/label="([^"]+)"/g)].map((m) => m[1]);
    expect(items[0]).toBe('Human evidence');
    expect(items).not.toContain('Regulatory status');
    expect(glance.indexOf('Regulatory context:')).toBeGreaterThan(glance.indexOf('label="Human evidence"'));
  });

  // --- Search ---------------------------------------------------------------

  it('routes research intent ahead of regulatory status', () => {
    const hint = (term: string): readonly string[] => sectionHintsFor(term).map((h) => h.id);

    expect(hint('TB-500 studies')).toContain('literature');
    expect(hint('Thymosin beta-4 human studies')).toContain('literature');
    expect(hint('TB-500 protocols')).toContain('protocols');
    expect(hint('TB-500 routes')).toContain('routes');
    expect(hint('Thymosin beta-4 mechanism')).toContain('evidence');
    expect(hint('BPC-157 human evidence')).toContain('literature');
    expect(hint('Tesamorelin trials')).toContain('literature');
    expect(hint('Tesamorelin protocols')).toContain('protocols');
    expect(hint('is TB-500 the same as thymosin beta-4')).toContain('nomenclature');
    expect(hint('TB-500 sequence')).toContain('nomenclature');
    expect(hint('thymosin beta-4 replication')).toContain('replication');

    // A bare compound name asks nothing more specific, and must not be answered
    // with a regulatory hint.
    for (const bare of ['Tesamorelin', 'TB-500', 'Thymosin beta-4', 'BPC-157']) {
      expect(hint(bare), bare).toEqual([]);
    }

    // A query naming both a regulator and a scientific question gets the
    // science first.
    const mixed = hint('Tesamorelin FDA human trials');
    expect(mixed[0]).toBe('literature');
    expect(mixed).toContain('regulatory');
  });
});
