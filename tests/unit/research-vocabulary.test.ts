import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  GAP_TYPE_LABELS,
  OPPORTUNITY_LABELS,
  SOURCE_THAT_WOULD_HELP,
} from '@/components/public/research-figures';

/**
 * The vocabulary the research agenda renders, and the honesty rules for the
 * two fields this sprint added.
 *
 * A missing label is not a cosmetic bug here. The research page groups
 * questions by the kind of absence that produced them, and an unlabelled key
 * renders as a database enum value — which tells a reader nothing and reads as
 * a fault in the record rather than in the page.
 */

const EVIDENCE = fileURLToPath(new URL('../../data/seed/evidence/', import.meta.url));

/** Every gap type the packet schema accepts. */
const GAP_TYPES = [
  'source_missing',
  'source_inaccessible',
  'source_corrupted',
  'primary_source_missing',
  'no_current_reviewed_evidence',
  'scope_not_established',
  'numerical_threshold_not_established',
  'human_evidence_not_established',
  'route_not_established',
  'safety_not_established',
  'regulatory_status_unverified',
  'terminology_unresolved',
  'conflicting_sources',
  'formulation_unspecified',
  'chain_of_custody_unknown',
] as const;

/** Every opportunity type the database constraint accepts. */
const OPPORTUNITY_TYPES = [
  'identity_clarification',
  'human_evidence',
  'human_safety',
  'human_pharmacokinetics',
  'route_comparison',
  'formulation_comparison',
  'dose_response',
  'independent_replication',
  'long_term_outcomes',
  'mechanism_confirmation',
  'protocol_validation',
  'product_characterisation',
  'regulatory_position',
] as const;

const FULL_TEXT_VERDICTS = new Set([
  'full_text_supports',
  'full_text_partially_supports',
  'full_text_does_not_support',
  'full_text_different_context',
]);

interface Packet {
  readonly compound?: unknown;
  readonly claims?: readonly {
    readonly claimKey: string;
    readonly evidence: readonly {
      readonly locationKey: string;
      readonly primaryTrace?: string;
      readonly primaryTraceNote?: string | null;
    }[];
  }[];
  readonly funding?: readonly {
    readonly fundingKey: string;
    readonly funderKind: string;
    readonly sponsorName: string | null;
    readonly locationKey: string | null;
    readonly disclosureText: string | null;
    readonly notes: string | null;
  }[];
}

function packets(): readonly (readonly [string, Packet])[] {
  return readdirSync(EVIDENCE)
    .filter((name) => name.endsWith('.json'))
    .map((name) => [name, JSON.parse(readFileSync(`${EVIDENCE}${name}`, 'utf8')) as Packet]);
}

describe('research vocabulary', () => {
  it('labels every kind of absence a gap can record', () => {
    const missing = GAP_TYPES.filter((key) => GAP_TYPE_LABELS[key] === undefined);
    expect(missing).toEqual([]);
  });

  it('labels every kind of research opportunity', () => {
    const missing = OPPORTUNITY_TYPES.filter((key) => OPPORTUNITY_LABELS[key] === undefined);
    expect(missing).toEqual([]);
  });

  it('says what kind of work would answer each kind of question', () => {
    const missing = OPPORTUNITY_TYPES.filter((key) => SOURCE_THAT_WOULD_HELP[key] === undefined);
    expect(missing).toEqual([]);
  });

  it('describes work to be done rather than anything a reader could try', () => {
    // The line between a research agenda and a recommendation engine. None of
    // these may read as an instruction addressed to the reader.
    for (const [key, text] of Object.entries(SOURCE_THAT_WOULD_HELP)) {
      expect(text, key).not.toMatch(/\byou\b|\btry\b|\btake\b|\bdose yourself\b/i);
    }
  });
});

describe('primary-source tracing', () => {
  it('never records a full-text verdict without saying what was read', () => {
    for (const [name, packet] of packets()) {
      for (const claim of packet.claims ?? []) {
        for (const evidence of claim.evidence) {
          if (evidence.primaryTrace !== undefined && FULL_TEXT_VERDICTS.has(evidence.primaryTrace)) {
            expect(
              evidence.primaryTraceNote,
              `${name} ${claim.claimKey}: a verdict about a full text needs a note`,
            ).toBeTruthy();
          }
        }
      }
    }
  });

  it('gives every piece of evidence a trace state', () => {
    // An absent state and `not_attempted` mean the same thing, but only one of
    // them is a decision. The derivation writes one onto every row so that a
    // blank is a fault rather than a shrug.
    for (const [name, packet] of packets()) {
      for (const claim of packet.claims ?? []) {
        for (const evidence of claim.evidence) {
          expect(evidence.primaryTrace, `${name} ${claim.claimKey}`).toBeDefined();
        }
      }
    }
  });
});

describe('funding context', () => {
  it('never claims nothing was declared when nothing was checked', () => {
    // The distinction the whole field gets wrong. "No funding was declared" is
    // a finding about a study; "we did not check" is a fact about us.
    for (const [name, packet] of packets()) {
      for (const funding of packet.funding ?? []) {
        expect(funding.funderKind, `${name} ${funding.fundingKey}`).not.toBe('none_declared');
      }
    }
  });

  it('says where a disclosure was read, and says when it was not read at all', () => {
    for (const [name, packet] of packets()) {
      for (const funding of packet.funding ?? []) {
        const where = `${name} ${funding.fundingKey}`;
        if (funding.funderKind === 'not_checked') {
          expect(funding.sponsorName, where).toBeNull();
          expect(funding.notes, where).toBeTruthy();
        } else {
          expect(funding.locationKey, where).toBeTruthy();
          expect(funding.disclosureText, where).toBeTruthy();
        }
      }
    }
  });

  it('records funding as context and never as a score', () => {
    // No numeric weight, rank or grade may appear on a funding record. If one
    // ever does, something has started treating a sponsor as evidence.
    for (const [name, packet] of packets()) {
      for (const funding of packet.funding ?? []) {
        const keys = Object.keys(funding);
        expect(
          keys.filter((key) => /score|rating|rank|weight|grade|trust/i.test(key)),
          name,
        ).toEqual([]);
      }
    }
  });
});
