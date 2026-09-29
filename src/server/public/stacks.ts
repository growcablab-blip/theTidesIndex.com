/**
 * Combination pages: what identifiable sources report using together.
 *
 * A combination page is the most dangerous surface this index has. Two
 * compounds shown side by side, each with its own evidence, reads as a
 * recommendation to use both — so the shape of the reading below is built to
 * keep three things apart that a reader will otherwise merge:
 *
 *   1. what is known about each compound on its own,
 *   2. what identifiable sources report about using them together,
 *   3. what has actually been studied about the combination itself.
 *
 * The third is nearly always the smallest, and it is never inferred from the
 * first two. Nothing here composes a regimen and no combined amount is ever
 * stated: each source's report stands under that source's name, exactly as it
 * does on a compound page.
 */
import 'server-only';

import { sql } from 'drizzle-orm';
import { getPublicDb } from '@/server/db/client';
import type { Database } from '@/server/db/types';
import { withPublicSession } from '@/server/db/session';
import type { ReadingMode } from '@/domain/presentation/reading-mode';
import { CITATION_SELECT, rows, toCitation, type Citation, type CitationRow } from './shapes';
import { readPublishedPeptidePage, type PeptidePage } from './queries';

/**
 * The register of combination pages.
 *
 * Deliberately a list of compound slugs and nothing else. A `rationale` field
 * here would be an unreviewed medical claim living in application code; every
 * word the page says about the pairing is read out of the protocol records.
 */
export interface StackDefinition {
  readonly slug: string;
  readonly title: string;
  /** What the page does, in navigational terms. Never a claim about the pairing. */
  readonly summary: string;
  readonly memberSlugs: readonly string[];
}

export const STACK_DEFINITIONS: readonly StackDefinition[] = [
  {
    slug: 'bpc-157-tb-500',
    title: 'BPC-157 with TB-500 and thymosin beta-4',
    summary:
      'What each compound is on its own, which identifiable sources report using them together, and what has actually been studied about the combination itself — kept apart.',
    memberSlugs: ['bpc-157', 'tb-500', 'thymosin-beta-4'],
  },
];

export function stackDefinition(slug: string): StackDefinition | null {
  return STACK_DEFINITIONS.find((s) => s.slug === slug) ?? null;
}

export function stacksForCompound(slug: string): readonly StackDefinition[] {
  return STACK_DEFINITIONS.filter((s) => s.memberSlugs.includes(slug));
}

/** A combination page as another page links to it. */
export interface StackLink {
  readonly href: string;
  readonly title: string;
  readonly summary: string;
}

// ---------------------------------------------------------------------------
// The reading
// ---------------------------------------------------------------------------

/** One source's report of two members being used together. */
export interface CombinationReport {
  readonly protocolId: string;
  readonly protocolKey: string;
  /** The compound whose record carries the report. */
  readonly memberSlug: string;
  readonly memberName: string;
  /** Other members named by a term that denotes only them. */
  readonly partnerNames: readonly string[];
  /**
   * Names in the report that denote more than one member of this stack.
   *
   * Not a rounding error. The register itself records "TB-500" and "thymosin
   * beta-4" as aliases of each other, because sources use them
   * interchangeably for a 43-amino-acid peptide and a seven-amino-acid
   * fragment of it. A matcher that silently picked one would manufacture an
   * attribution the record does not support, so the ambiguity is carried to
   * the reader instead.
   */
  readonly ambiguousNames: readonly AmbiguousName[];
  readonly evidenceTypeLabel: string;
  readonly isHumanEvidence: boolean;
  /**
   * The source's own words about what it reports the regimen alongside.
   *
   * Null in simple reading. The data model classifies this as a regimen
   * detail, and the patient boundary is drawn at the data rather than at a
   * component remembering to leave something out.
   */
  readonly combinationsText: string | null;
  readonly objectiveContext: string;
  /** Who reports it, as the card is headed. Attribution survives simple reading. */
  readonly sourceName: string;
  readonly citations: readonly Citation[];
}

export interface AmbiguousName {
  /** The name as the register holds it, e.g. "Thymosin beta-4". */
  readonly term: string;
  /** The members that name could denote, canonical names. */
  readonly candidates: readonly string[];
}

export interface StackMemberReading {
  readonly slug: string;
  readonly name: string;
  readonly shortDescription: string | null;
  readonly page: PeptidePage;
}

export interface StackPage {
  readonly slug: string;
  readonly title: string;
  readonly members: readonly StackMemberReading[];
  /** Every held report of two members being used together. */
  readonly combination: readonly CombinationReport[];
  /** The subset that is a record of people, rather than a source's advice. */
  readonly combinationHuman: readonly CombinationReport[];
}

/**
 * Terms that identify a member inside another record's free text.
 *
 * Built from the register — canonical name plus published aliases — so a
 * renamed compound cannot leave a stale literal behind in a matcher.
 */
export function matchTerms(name: string, aliases: readonly string[]): readonly string[] {
  const terms = new Set<string>();
  for (const term of [name, ...aliases]) {
    const trimmed = term.trim();
    if (trimmed.length < 3) continue;
    terms.add(trimmed);
  }
  return [...terms];
}

/** Both spellings a name is written in. Sources use "TB-500" and "TB500" alike. */
function forms(term: string): readonly string[] {
  const lower = term.toLowerCase();
  return [...new Set([lower, lower.replaceAll('-', '')])];
}

export function mentions(haystack: string, term: string): boolean {
  const flat = haystack.toLowerCase();
  const dehyphenated = flat.replaceAll('-', '');
  return forms(term).some((f) => flat.includes(f) || dehyphenated.includes(f));
}

/**
 * Which members a report names, and which names cannot be pinned to one.
 *
 * A term owned by exactly one member attributes; a term owned by several
 * does not, and is carried out as an ambiguity rather than resolved by
 * picking the first.
 */
export function attributeNames(
  text: string,
  self: string,
  termsById: ReadonlyMap<string, readonly string[]>,
  nameById: ReadonlyMap<string, string>,
): { partnerNames: string[]; ambiguousNames: AmbiguousName[] } {
  const owners = new Map<string, Set<string>>();
  const spelling = new Map<string, string>();
  for (const [id, terms] of termsById) {
    for (const term of terms) {
      const key = term.toLowerCase();
      const set = owners.get(key) ?? new Set<string>();
      set.add(id);
      owners.set(key, set);
      if (!spelling.has(key)) spelling.set(key, term);
    }
  }

  const partners = new Set<string>();
  const ambiguous = new Map<string, readonly string[]>();

  for (const [key, ids] of owners) {
    if (!mentions(text, key)) continue;
    const others = [...ids].filter((id) => id !== self);
    if (others.length === 0) continue;
    if (ids.size === 1) {
      for (const id of others) partners.add(id);
    } else {
      ambiguous.set(key, [...ids]);
    }
  }

  const partnerNames = [...partners].map((id) => nameById.get(id) ?? id);
  const ambiguousNames: AmbiguousName[] = [...ambiguous]
    // A name that also resolves unambiguously elsewhere in the same text adds
    // nothing: the reader already knows which member is meant.
    .filter(([, ids]) => !ids.some((id) => id !== self && partners.has(id)))
    .map(([key, ids]) => ({
      term: spelling.get(key) ?? key,
      candidates: ids.map((id) => nameById.get(id) ?? id),
    }));

  return { partnerNames, ambiguousNames };
}

/** The name a citation is filed under: first author, else the title. */
function citationName(citations: readonly Citation[]): string {
  const first = citations[0];
  if (first === undefined) return 'Source not recorded';
  return first.authors[0] ?? first.sourceTitle;
}

function asRows(result: unknown): readonly Record<string, unknown>[] {
  if (Array.isArray(result)) return result as readonly Record<string, unknown>[];
  const rows = (result as { rows?: unknown }).rows;
  return Array.isArray(rows) ? (rows as readonly Record<string, unknown>[]) : [];
}

export async function readStackPage(
  tx: Database,
  slug: string,
  mode: ReadingMode,
): Promise<StackPage | null> {
  const definition = stackDefinition(slug);
  if (definition === null) return null;

  const members: StackMemberReading[] = [];
  for (const memberSlug of definition.memberSlugs) {
    const page = await readPublishedPeptidePage(tx, memberSlug, mode);
    // An unpublished member takes itself out of the page rather than taking
    // the page down: the combination is still describable without it.
    if (page === null) continue;
    members.push({
      slug: page.slug,
      name: page.canonicalName,
      shortDescription: page.shortDescription,
      page,
    });
  }
  if (members.length < 2) return null;

  const memberIds = members.map((m) => m.page.id);
  const idList = sql.join(
    memberIds.map((id) => sql`${id}::uuid`),
    sql`, `,
  );

  const aliasRows = asRows(
    await tx.execute(sql`
      select peptide_id::text as peptide_id, alias
      from public_v_peptide_aliases
      where peptide_id in (${idList})
    `),
  );
  const aliasesById = new Map<string, string[]>();
  for (const row of aliasRows) {
    const id = String(row['peptide_id']);
    const list = aliasesById.get(id) ?? [];
    list.push(String(row['alias']));
    aliasesById.set(id, list);
  }

  const termsById = new Map<string, readonly string[]>(
    members.map((m) => [m.page.id, matchTerms(m.name, aliasesById.get(m.page.id) ?? [])]),
  );
  const nameById = new Map<string, string>(members.map((m) => [m.page.id, m.name]));

  /*
   * Read from the practitioner view whatever the mode. The question being
   * asked — does this record name another member? — is answered off a field
   * only that view carries. What reaches the reader stays mode-gated:
   * `combinationsText` is nulled below in simple reading, and the regimen
   * fields are never read at all.
   */
  const protocolRows = asRows(
    await tx.execute(sql`
      select p.id::text as id, p.protocol_key, p.peptide_id::text as peptide_id,
             p.combinations_text, p.objective_context,
             et.public_label as evidence_type_label, et.is_human_evidence
      from public_v_protocol_practitioner p
      join public_v_evidence_types et on et.key = p.evidence_type_key
      where p.peptide_id in (${idList})
        and p.combinations_text is not null
      order by p.protocol_key
    `),
  );

  /*
   * Citations for those records, read directly rather than off the compound
   * pages. In simple reading a compound page carries no protocols at all, so
   * taking attribution from it would leave every card on this page unsourced —
   * and who reports a thing is precisely what simple reading is meant to keep.
   * A citation is attribution, never a regimen.
   */
  const citationRows = rows<CitationRow & { protocol_id: string }>(
    await tx.execute(sql`
      select ps.protocol_id, ${CITATION_SELECT}
      from public_v_protocol_sources ps
      join public_v_sources s on s.id = ps.source_id
      join public_v_source_types st on st.key = s.source_type_key
      left join public_v_source_locations l on l.id = ps.source_location_id
      join public_v_protocol_practitioner p on p.id = ps.protocol_id
      where p.peptide_id in (${idList})
      order by ps.source_role, s.source_key
    `),
  );
  const citationsByProtocol = new Map<string, Citation[]>();
  for (const row of citationRows) {
    const list = citationsByProtocol.get(row.protocol_id) ?? [];
    list.push(toCitation(row));
    citationsByProtocol.set(row.protocol_id, list);
  }

  const combination: CombinationReport[] = [];
  for (const row of protocolRows) {
    const ownerId = String(row['peptide_id']);
    const owner = members.find((m) => m.page.id === ownerId);
    if (owner === undefined) continue;
    const text = String(row['combinations_text']);

    const { partnerNames, ambiguousNames } = attributeNames(text, ownerId, termsById, nameById);
    // A note about standard care, or about a compound outside this stack, is
    // not a report of this combination.
    if (partnerNames.length === 0 && ambiguousNames.length === 0) continue;

    const protocolId = String(row['id']);

    combination.push({
      protocolId,
      protocolKey: String(row['protocol_key']),
      memberSlug: owner.slug,
      memberName: owner.name,
      partnerNames,
      ambiguousNames,
      evidenceTypeLabel: String(row['evidence_type_label']),
      isHumanEvidence: Boolean(row['is_human_evidence']),
      combinationsText: mode === 'simple' ? null : text,
      objectiveContext: String(row['objective_context']),
      sourceName: citationName(citationsByProtocol.get(protocolId) ?? []),
      citations: citationsByProtocol.get(protocolId) ?? [],
    });
  }

  return {
    slug: definition.slug,
    title: definition.title,
    members,
    combination,
    combinationHuman: combination.filter((c) => c.isHumanEvidence),
  };
}

/** The combination page, on the public read surface. */
export function getStackPage(slug: string, mode: ReadingMode): Promise<StackPage | null> {
  return withPublicSession(getPublicDb(), (tx) => readStackPage(tx, slug, mode));
}

/**
 * The combination pages that actually render, for the sitemap.
 *
 * Derived rather than taken from the register. A definition whose compounds
 * are not published has no page, and naming its URL in the sitemap would
 * advertise a 404 — the exact failure the sitemap is written to avoid.
 */
export function listPublishedStacks(): Promise<readonly StackDefinition[]> {
  return withPublicSession(getPublicDb(), async (tx) => {
    const published = new Set(
      asRows(await tx.execute(sql`select slug from public_v_peptides`)).map((r) =>
        String(r['slug']),
      ),
    );
    return STACK_DEFINITIONS.filter(
      (s) => s.memberSlugs.filter((slug) => published.has(slug)).length >= 2,
    );
  });
}
