import { sql, type SQL } from 'drizzle-orm';
import type { Database } from '../db/types';
import type { EvidenceClass } from '@/domain/evidence/evidence-types';
import {
  CITATION_SELECT,
  rows,
  str,
  toCitation,
  type CitationRow,
  type EvidenceGap,
  type EvidenceRecord,
  type PublicClaim,
} from './shapes';

/**
 * Assembling a learning topic for reading.
 *
 * The same arrangement as `readQualityTopic`: one assembly, two relation sets.
 * The public site reads the `public_v_*` views; a development preview reads the
 * base tables. Every column is named, so no private column can arrive through
 * the preview path.
 *
 * A learning topic carries all three editorial states: its claims are SOURCE
 * FACTS, its syntheses are TIDES SYNTHESES naming the claims they rest on, and
 * its gaps are SOURCE NEEDED.
 */

export interface EditorialSynthesis {
  readonly id: string;
  readonly synthesisKey: string;
  readonly statement: string;
  readonly plainLanguageText: string;
  readonly reasoning: string;
  readonly doesNotConclude: string;
  /** The claims it rests on, in order. Always at least two. */
  readonly claimKeys: readonly string[];
}

export interface LearningTopicSummary {
  readonly slug: string;
  readonly topicKey: string;
  readonly title: string;
  readonly publicationChapter: string | null;
  readonly summary: string | null;
  readonly claimCount: number;
  readonly synthesisCount: number;
  readonly gapCount: number;
  readonly isPreview: boolean;
}

export interface LearningTopicReading {
  readonly id: string;
  readonly slug: string;
  readonly topicKey: string;
  readonly title: string;
  readonly publicationChapter: string | null;
  readonly summary: string | null;
  readonly isPreview: boolean;
  readonly claims: readonly PublicClaim[];
  readonly syntheses: readonly EditorialSynthesis[];
  readonly gaps: readonly EvidenceGap[];
}

interface Relations {
  topics: SQL;
  claims: SQL;
  claimEvidence: SQL;
  sources: SQL;
  sourceTypes: SQL;
  evidenceTypes: SQL;
  locations: SQL;
  gaps: SQL;
  syntheses: SQL;
}

const PUBLIC_RELATIONS: Relations = {
  topics: sql`public_v_learning_topics`,
  claims: sql`public_v_claims`,
  claimEvidence: sql`public_v_claim_evidence`,
  sources: sql`public_v_sources`,
  sourceTypes: sql`public_v_source_types`,
  evidenceTypes: sql`public_v_evidence_types`,
  locations: sql`public_v_source_locations`,
  gaps: sql`public_v_evidence_gaps`,
  syntheses: sql`public_v_editorial_syntheses`,
};

const BASE_RELATIONS: Relations = {
  topics: sql`learning_topics`,
  claims: sql`claims`,
  claimEvidence: sql`claim_evidence`,
  sources: sql`sources`,
  sourceTypes: sql`source_types`,
  evidenceTypes: sql`evidence_types`,
  locations: sql`source_locations`,
  gaps: sql`evidence_gaps`,
  syntheses: sql`editorial_syntheses`,
};

export async function readLearningTopics(
  tx: Database,
  options: { preview?: boolean } = {},
): Promise<readonly LearningTopicSummary[]> {
  const preview = options.preview === true;
  const r = preview ? BASE_RELATIONS : PUBLIC_RELATIONS;
  const topicRows = rows<Record<string, unknown>>(
    await tx.execute(sql`
      select t.slug, t.topic_key, t.title, t.publication_chapter, t.summary,
             ${preview ? sql`t.publication_state::text` : sql`'published'::text`} as publication_state,
             (select count(*) from ${r.claims} c where c.learning_topic_id = t.id)::int as claim_count,
             (select count(*) from ${r.syntheses} s where s.learning_topic_id = t.id)::int as synthesis_count,
             (select count(*) from ${r.gaps} g where g.learning_topic_id = t.id
                and g.resolution_state::text = 'open')::int as gap_count
        from ${r.topics} t
       order by t.title
    `),
  );
  return topicRows.map((t) => ({
    slug: String(t.slug),
    topicKey: String(t.topic_key),
    title: String(t.title),
    publicationChapter: str(t.publication_chapter),
    summary: str(t.summary),
    claimCount: Number(t.claim_count),
    synthesisCount: Number(t.synthesis_count),
    gapCount: Number(t.gap_count),
    isPreview: preview && t.publication_state !== 'published',
  }));
}

export async function readLearningTopic(
  tx: Database,
  slug: string,
  options: { preview?: boolean } = {},
): Promise<LearningTopicReading | null> {
  const preview = options.preview === true;
  const r = preview ? BASE_RELATIONS : PUBLIC_RELATIONS;

  const topic = rows<Record<string, unknown>>(
    await tx.execute(sql`
      select id, slug, topic_key, title, publication_chapter, summary,
             ${preview ? sql`publication_state::text` : sql`'published'::text`} as publication_state
        from ${r.topics}
       where slug = ${slug}
    `),
  )[0];
  if (topic === undefined) return null;
  const topicId = String(topic.id);

  const claimRows = rows<Record<string, unknown>>(
    await tx.execute(sql`
      select id, claim_key, claim_text, plain_language_text, claim_category,
             importance, certificate_type_scope, interpretation_notes, uncertainty_text,
             is_editorial_non_evidentiary, needs_update,
             last_reviewed_at::text as last_reviewed_at
        from ${r.claims}
       where learning_topic_id = ${topicId}
       order by claim_key
    `),
  );

  const evidenceRows = rows<CitationRow & Record<string, unknown>>(
    await tx.execute(sql`
      select ce.id, ce.claim_id, ce.evidence_type_key, ce.relationship,
             ce.population_model, ce.route_key, null::text as route_name,
             ce.formulation, ce.interpretation, ce.primary_source_verified,
             ce.primary_trace,
             et.public_label as evidence_type_label, et.evidence_class,
             et.is_human_evidence, et.is_interpretive,
             ${CITATION_SELECT}
        from ${r.claimEvidence} ce
        join ${r.claims} c on c.id = ce.claim_id
        join ${r.evidenceTypes} et on et.key = ce.evidence_type_key
        join ${r.sources} s on s.id = ce.source_id
        join ${r.sourceTypes} st on st.key = s.source_type_key
        left join ${r.locations} l on l.id = ce.source_location_id
       where c.learning_topic_id = ${topicId}
       order by et.sort_order, s.source_key, l.page_start nulls last, ce.id
    `),
  );

  const evidenceByClaim = new Map<string, EvidenceRecord[]>();
  for (const row of evidenceRows) {
    const claimId = String(row.claim_id);
    const list = evidenceByClaim.get(claimId) ?? [];
    list.push({
      id: String(row.id),
      evidenceTypeKey: String(row.evidence_type_key),
      evidenceTypeLabel: String(row.evidence_type_label),
      evidenceClass: row.evidence_class as EvidenceClass,
      isHumanEvidence: Boolean(row.is_human_evidence),
      isInterpretive: Boolean(row.is_interpretive),
      relationship: String(row.relationship),
      populationModel: str(row.population_model),
      routeKey: str(row.route_key),
      routeName: null,
      formulation: str(row.formulation),
      interpretation: str(row.interpretation),
      primarySourceVerified: Boolean(row.primary_source_verified),
      primaryTrace: String(row.primary_trace),
      citation: toCitation(row),
    });
    evidenceByClaim.set(claimId, list);
  }

  const synthesisRows = rows<Record<string, unknown>>(
    await tx.execute(sql`
      select id, synthesis_key, statement, plain_language_text, reasoning, does_not_conclude
        from ${r.syntheses}
       where learning_topic_id = ${topicId}
       order by sort_order, synthesis_key
    `),
  );
  const synthesisClaimRows = rows<{ synthesis_id: string; claim_key: string }>(
    await tx.execute(
      preview
        ? sql`
            select l.synthesis_id, c.claim_key
              from editorial_synthesis_claims l
              join claims c on c.id = l.claim_id
              join editorial_syntheses s on s.id = l.synthesis_id
             where s.learning_topic_id = ${topicId}
             order by l.sort_order
          `
        : sql`
            select l.synthesis_id, l.claim_key
              from public_v_editorial_synthesis_claims l
              join public_v_editorial_syntheses s on s.id = l.synthesis_id
             where s.learning_topic_id = ${topicId}
             order by l.sort_order
          `,
    ),
  );
  const claimKeysBySynthesis = new Map<string, string[]>();
  for (const row of synthesisClaimRows) {
    const list = claimKeysBySynthesis.get(String(row.synthesis_id)) ?? [];
    list.push(String(row.claim_key));
    claimKeysBySynthesis.set(String(row.synthesis_id), list);
  }

  const gapRows = rows<Record<string, unknown>>(
    await tx.execute(sql`
      select id, gap_type, statement, why_not_supported, what_would_resolve_it,
             verification_issue_key, sort_order, resolution_state::text as resolution_state,
             resolution_note, resolution_checked_at::text as resolution_checked_at
        from ${r.gaps}
       where learning_topic_id = ${topicId}
       order by sort_order
    `),
  );

  return {
    id: topicId,
    slug: String(topic.slug),
    topicKey: String(topic.topic_key),
    title: String(topic.title),
    publicationChapter: str(topic.publication_chapter),
    summary: str(topic.summary),
    isPreview: preview && topic.publication_state !== 'published',
    claims: claimRows.map((c) => ({
      id: String(c.id),
      claimKey: String(c.claim_key),
      claimText: String(c.claim_text),
      plainLanguageText: str(c.plain_language_text),
      claimCategory: str(c.claim_category),
      importance: String(c.importance),
      certificateTypeScope: str(c.certificate_type_scope),
      interpretationNotes: str(c.interpretation_notes),
      uncertaintyText: str(c.uncertainty_text),
      isEditorialNonEvidentiary: Boolean(c.is_editorial_non_evidentiary),
      needsUpdate: Boolean(c.needs_update),
      lastReviewedAt: str(c.last_reviewed_at),
      evidence: evidenceByClaim.get(String(c.id)) ?? [],
    })),
    syntheses: synthesisRows.map((s) => ({
      id: String(s.id),
      synthesisKey: String(s.synthesis_key),
      statement: String(s.statement),
      plainLanguageText: String(s.plain_language_text),
      reasoning: String(s.reasoning),
      doesNotConclude: String(s.does_not_conclude),
      claimKeys: claimKeysBySynthesis.get(String(s.id)) ?? [],
    })),
    gaps: gapRows.map((g) => ({
      id: String(g.id),
      gapType: String(g.gap_type),
      statement: String(g.statement),
      whyNotSupported: String(g.why_not_supported),
      whatWouldResolveIt: str(g.what_would_resolve_it),
      verificationIssueKey: str(g.verification_issue_key),
      researchQuestion: null,
      opportunityType: null,
      resolutionState: str(g.resolution_state) ?? 'open',
      resolutionNote: str(g.resolution_note),
      resolutionCheckedAt: str(g.resolution_checked_at),
    })),
  };
}
