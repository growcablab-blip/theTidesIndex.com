import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * BPC-157's evidence shape, held against the committed data (15 September 2026).
 *
 * The record once reported human evidence present and preclinical evidence
 * zero while discussing a large animal literature, because every laboratory
 * finding reached it through a handbook or a review abstract. The repair cites
 * primary preclinical studies directly, keeps the systematic review as an
 * evidence map, and records registrations as registrations. Each rule below is
 * one a later edit could quietly undo:
 *
 *   - a review promoted to primary preclinical evidence;
 *   - a registry entry counted as a result;
 *   - an uncontrolled human study relabelled as something stronger;
 *   - a preclinical citation resting on something nobody read.
 */

interface Location {
  key: string;
  sourceKey: string;
}
interface Evidence {
  locationKey: string;
  evidenceTypeKey: string;
  primaryTrace: string;
  populationModel: string | null;
}
interface Claim {
  claimKey: string;
  evidence: Evidence[];
}
interface Gap {
  gapType: string;
  statement: string;
  why: string;
  whatWouldResolveIt: string | null;
}
interface Packet {
  locations: Location[];
  claims: Claim[];
  notYetSupported: Gap[];
}
interface EvidenceType {
  key: string;
  evidenceClass: 'human' | 'preclinical' | 'reference_opinion';
  isHumanEvidence: boolean;
}
interface Source {
  source_key: string;
  source_type: string;
  access_status: string;
  access_notes: string | null;
  integrity_notes: string | null;
  trial_registry_id: string | null;
  authors: string[];
}
interface Trial {
  registryId: string;
  resultsPostedDate: string | null;
  doseArmsText: string | null;
  documents: { sourceKey: string; role: string }[];
}

const read = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T;

const packet = read<Packet>('data/seed/evidence/bpc-157.json');
const types = new Map(read<EvidenceType[]>('data/seed/taxonomy/evidence_types.json').map((t) => [t.key, t]));
const manifest = new Map(read<{ sources: Source[] }>('SOURCE_MANIFEST.json').sources.map((s) => [s.source_key, s]));
const trials = read<{ peptideKey: string; trials: Trial[] }>('data/seed/trials/bpc-157-trials.json');
const locations = new Map(packet.locations.map((l) => [l.key, l]));

type Lane = 'human' | 'preclinical' | 'reference';

function laneOf(evidenceTypeKey: string): Lane {
  const type = types.get(evidenceTypeKey);
  if (type === undefined) throw new Error(`unknown evidence type ${evidenceTypeKey}`);
  if (type.isHumanEvidence) return 'human';
  if (type.evidenceClass === 'preclinical') return 'preclinical';
  return 'reference';
}

const citations = packet.claims.flatMap((claim) =>
  claim.evidence.map((evidence) => {
    const location = locations.get(evidence.locationKey);
    if (location === undefined) throw new Error(`${claim.claimKey}: no location ${evidence.locationKey}`);
    const source = manifest.get(location.sourceKey);
    if (source === undefined) throw new Error(`${location.sourceKey} missing from manifest`);
    return { claim, evidence, source, lane: laneOf(evidence.evidenceTypeKey) };
  }),
);

const sourcesIn = (lane: Lane) =>
  new Set(citations.filter((c) => c.lane === lane).map((c) => c.source.source_key));

/** The patient dose scan's pattern (scripts/qa/patient-dose-scan.ts). */
const DOSE =
  /\b\d+(?:[.,]\d+)?\s*(?:[-–]\s*\d+(?:[.,]\d+)?\s*)?(?:mcg|µg|ug|micrograms?|mg|milligrams?|grams?|g|ml|mL|IU|units)\b/;

describe('BPC-157 evidence shape', () => {
  it('has a human lane and a preclinical lane, both non-empty, and a larger reference lane', () => {
    expect(sourcesIn('human').size).toBeGreaterThan(0);
    expect(sourcesIn('preclinical').size).toBeGreaterThanOrEqual(3);
    expect(sourcesIn('reference').size).toBeGreaterThan(0);
  });

  it('classifies the human studies as what they are, and never as controlled trials', () => {
    const human = citations.filter((c) => c.lane === 'human');
    const typeBySource = new Map<string, Set<string>>();
    for (const c of human) {
      const set = typeBySource.get(c.source.source_key) ?? new Set<string>();
      set.add(c.evidence.evidenceTypeKey);
      typeBySource.set(c.source.source_key, set);
    }
    expect([...(typeBySource.get('SRC-029') ?? [])]).toEqual(['human_prospective_uncontrolled']);
    expect([...(typeBySource.get('SRC-030') ?? [])]).toEqual(['human_observational']);
    expect([...(typeBySource.get('SRC-031') ?? [])]).toEqual(['human_observational']);
    for (const c of human) {
      expect(['human_rct', 'human_controlled_nonrandomized'], c.claim.claimKey).not.toContain(
        c.evidence.evidenceTypeKey,
      );
    }
  });

  it('uses the systematic review as an evidence map, never as preclinical or human evidence', () => {
    const review = manifest.get('SRC-032');
    expect(review?.source_type).toBe('systematic_review_meta_analysis');
    expect(review?.access_status).toBe('abstract_held');
    expect(review?.authors).toContain('Voos JE');

    const reviewCitations = citations.filter((c) => c.source.source_key === 'SRC-032');
    expect(reviewCitations.length).toBeGreaterThan(0);
    for (const c of reviewCitations) {
      expect(c.lane, c.claim.claimKey).toBe('reference');
    }
    expect(sourcesIn('preclinical').has('SRC-032')).toBe(false);
    expect(sourcesIn('human').has('SRC-032')).toBe(false);

    // A preclinical statement cites the primary paper, not the review beside it.
    for (const claim of packet.claims) {
      const lanes = claim.evidence.map((e) => laneOf(e.evidenceTypeKey));
      if (!lanes.includes('preclinical')) continue;
      const cited = claim.evidence.map((e) => locations.get(e.locationKey)?.sourceKey);
      expect(cited, claim.claimKey).not.toContain('SRC-032');
    }
  });

  it('rests every preclinical citation on a primary study read in full under a permissive licence', () => {
    const preclinical = citations.filter((c) => c.lane === 'preclinical');
    for (const c of preclinical) {
      const label = `${c.claim.claimKey} ${c.source.source_key}`;
      expect(c.source.source_type, label).toBe('primary_journal_article');
      expect(c.source.access_status, label).toBe('held');
      expect(c.evidence.primaryTrace, label).toMatch(/^full_text_/);
      expect(c.evidence.populationModel, label).toBeTruthy();
      expect(c.source.integrity_notes, label).toMatch(/Creative Commons Attribution|CC BY|licenses\/by\//);
      expect(c.source.integrity_notes, label).not.toMatch(/by-nc|by-nd|noncommercial|non-commercial|noderivatives/i);
    }
  });

  it('keeps practitioner material in the reference lane', () => {
    for (const c of citations.filter((x) => x.evidence.evidenceTypeKey === 'practitioner_reference')) {
      expect(c.lane, c.claim.claimKey).toBe('reference');
      expect(c.source.source_type, c.claim.claimKey).toBe('practitioner_handbook');
    }
  });

  it('records registrations as trials with no results, and never as evidence', () => {
    expect(trials.peptideKey).toBe('bpc-157');
    expect(trials.trials.length).toBeGreaterThan(0);

    const registryKeys = new Set<string>();
    for (const trial of trials.trials) {
      expect(trial.resultsPostedDate, trial.registryId).toBeNull();
      // No amount from a registry record is transcribed anywhere on the trial.
      expect(trial.doseArmsText, trial.registryId).toBeNull();
      expect(JSON.stringify(trial), trial.registryId).not.toMatch(DOSE);

      const snapshot = `data/sources/registry/${trial.registryId}.json`;
      expect(existsSync(snapshot), snapshot).toBe(true);
      expect(read<{ hasResults: boolean }>(snapshot).hasResults, trial.registryId).toBe(false);

      for (const doc of trial.documents) {
        expect(doc.role, trial.registryId).toBe('registry_record');
        const source = manifest.get(doc.sourceKey);
        expect(source?.source_type, doc.sourceKey).toBe('clinical_trial_registry');
        expect(source?.trial_registry_id, doc.sourceKey).toBe(trial.registryId);
        registryKeys.add(doc.sourceKey);
      }
    }

    // Not one claim cites a registration, so none can count in any lane.
    for (const c of citations) {
      expect(registryKeys.has(c.source.source_key), c.claim.claimKey).toBe(false);
    }
  });

  it('records what could not be read, and what the registrations have not yet shown, as gaps', () => {
    const gaps = packet.notYetSupported;
    const primaryMissing = gaps.find((g) => g.gapType === 'primary_source_missing' && /14554208/.test(g.whatWouldResolveIt ?? ''));
    expect(primaryMissing, 'no gap for the unread primary healing studies').toBeDefined();

    const registered = gaps.find((g) => g.gapType === 'human_evidence_not_established' && /NCT07437547/.test(g.why));
    expect(registered, 'no gap for registered trials without results').toBeDefined();
    expect(registered!.why).toMatch(/not a finding/i);

    const review = gaps.find((g) => g.gapType === 'source_inaccessible' && /systematic review/i.test(g.statement));
    expect(review, 'no gap for the review full text').toBeDefined();
  });
});
