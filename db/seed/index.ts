import { sql } from 'drizzle-orm';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import * as schema from '../schema';
import { loadEvidencePackets } from './evidence-packets';
import { loadCompoundPackets } from './compound-packets';
import { loadLearningPackets } from './learning';
import { loadSyntheses } from './syntheses';
import { loadSourceArtifacts, loadTrialPackets } from './trials';
import { loadLiteratureScreens } from './literature-screens';
import { loadQualityMap } from './quality-map';
import { loadSpecimenCertificate } from './certificates';
import { seedData } from './seed-data';

/**
 * Idempotent seeding of controlled vocabularies, the source registry, compound
 * skeletons and the open verification queue.
 *
 * Nothing seeded here is published: a record arrives at `unreviewed` and must
 * pass the editorial gates like anything else. Re-seeding an existing database
 * leaves publication state alone — it neither publishes nor unpublishes, which
 * is what `tests/integration/seed-preserves-publication.test.ts` holds it to. In particular the compound records are
 * deliberately empty of medical content: a seeded page says "not yet
 * established", it does not invent a summary to look finished
 * (MASTER_BUILD_SPEC.md §13).
 */
export type SeedDb = PgDatabase<PgQueryResultHKT, typeof schema>;

export interface SeedResult {
  sourceTypes: number;
  evidenceTypes: number;
  routes: number;
  compoundTypes: number;
  compoundCategories: number;
  qualityTopics: number;
  reviewClocks: number;
  sources: number;
  peptides: number;
  aliases: number;
  verificationIssues: number;
  sourceLocations: number;
  claims: number;
  claimEvidence: number;
  evidenceGaps: number;
  compoundClaims: number;
  compoundRoutes: number;
  compoundProtocols: number;
  compoundDisagreements: number;
  compoundProducts: number;
  compoundForms: number;
  pkObservations: number;
  identityClaims: number;
  replicationAssessments: number;
  literatureScreenRecords: number;
  qualityRelationships: number;
  specimenCertificateTests: number;
}

/**
 * One transaction for the whole seed.
 *
 * Not for speed, and not for tidiness: the provenance watchdogs are deferred
 * constraint triggers (migration 0031) that ask their question once, at commit.
 * A packet owns its `protocol_sources` and `claim_evidence` rows and rebuilds
 * them, and a rebuild passes through a moment where a published record has no
 * source. Outside a transaction the watchdog sees that moment, believes it, and
 * withdraws the record — which is how a routine re-seed took all 98 published
 * protocols off the public site.
 *
 * Inside one transaction the intermediate state is never visible to the
 * watchdog, and the completed graph is what gets judged. The second guarantee
 * matters just as much: a seed that fails part way now rolls back whole, so it
 * cannot leave a published record standing on provenance it no longer has.
 */
export async function seedDatabase(db: SeedDb): Promise<SeedResult> {
  return db.transaction((tx) => seedWithinTransaction(tx));
}

async function seedWithinTransaction(db: SeedDb): Promise<SeedResult> {
  await seedTaxonomies(db);
  const sources = await seedSourceRegistry(db);
  const { peptides, aliases } = await seedPeptideSkeletons(db);
  const verificationIssues = await seedVerificationIssues(db);
  // Packets load last: they resolve against the source registry, and a packet
  // resting on a source the audit disqualified is refused rather than stored.
  const packets = await loadEvidencePackets(db);
  const total = (field: 'locations' | 'claims' | 'evidence' | 'gaps'): number =>
    packets.reduce((sum, p) => sum + p[field], 0);
  // The map cites the claims and gaps the packets created, so it loads last.
  // Compounds load after the quality packets: both write source_locations, and
  // a compound packet cites the same source registry.
  const compoundPackets = await loadCompoundPackets(db);
  // Artifacts describe copies of registered sources; trials cite locations the
  // compound packets created, so both follow them.
  await loadSourceArtifacts(db);
  await loadLearningPackets(db);
  await loadSyntheses(db);
  await loadTrialPackets(db);
  // Screens load after the compounds they belong to, and before nothing:
  // they are a record of what a search returned, not an input to anything else.
  const literatureScreens = await loadLiteratureScreens(db);
  const qualityRelationships = await loadQualityMap(db);
  const specimenCertificateTests = await loadSpecimenCertificate(db);

  return {
    sourceTypes: seedData.sourceTypes.length,
    evidenceTypes: seedData.evidenceTypes.length,
    routes: seedData.routes.length,
    compoundTypes: seedData.compoundTypes.length,
    compoundCategories: seedData.compoundCategories.length,
    qualityTopics: seedData.qualityTopics.length,
    reviewClocks: seedData.reviewClocks.length,
    sources,
    peptides,
    aliases,
    verificationIssues,
    sourceLocations: total('locations'),
    claims: total('claims'),
    claimEvidence: total('evidence'),
    evidenceGaps: total('gaps'),
    compoundClaims: compoundPackets.reduce((n, p) => n + p.claims, 0),
    compoundRoutes: compoundPackets.reduce((n, p) => n + p.routes, 0),
    compoundProtocols: compoundPackets.reduce((n, p) => n + p.protocols, 0),
    compoundDisagreements: compoundPackets.reduce((n, p) => n + p.disagreements, 0),
    compoundProducts: compoundPackets.reduce((n, p) => n + p.products, 0),
    compoundForms: compoundPackets.reduce((n, p) => n + p.forms, 0),
    pkObservations: compoundPackets.reduce((n, p) => n + p.pharmacokinetics, 0),
    identityClaims: compoundPackets.reduce((n, p) => n + p.identities, 0),
    replicationAssessments: compoundPackets.reduce((n, p) => n + p.replication, 0),
    literatureScreenRecords: literatureScreens.reduce((n, s) => n + s.records, 0),
    qualityRelationships,
    specimenCertificateTests,
  };
}

export async function seedTaxonomies(db: SeedDb): Promise<void> {
  await db
    .insert(schema.sourceTypes)
    .values(seedData.sourceTypes)
    .onConflictDoUpdate({
      target: schema.sourceTypes.key,
      set: {
        publicLabel: sql`excluded.public_label`,
        description: sql`excluded.description`,
        typicalEvidenceClass: sql`excluded.typical_evidence_class`,
        sortOrder: sql`excluded.sort_order`,
      },
    });

  await db
    .insert(schema.evidenceTypes)
    .values(seedData.evidenceTypes)
    .onConflictDoUpdate({
      target: schema.evidenceTypes.key,
      set: {
        publicLabel: sql`excluded.public_label`,
        description: sql`excluded.description`,
        evidenceClass: sql`excluded.evidence_class`,
        isHumanEvidence: sql`excluded.is_human_evidence`,
        isInterpretive: sql`excluded.is_interpretive`,
        sortOrder: sql`excluded.sort_order`,
      },
    });

  await db
    .insert(schema.routes)
    .values(seedData.routes)
    .onConflictDoUpdate({
      target: schema.routes.key,
      set: {
        name: sql`excluded.name`,
        slug: sql`excluded.slug`,
        descriptionSimple: sql`excluded.description_simple`,
        descriptionPractitioner: sql`excluded.description_practitioner`,
        generalLimitations: sql`excluded.general_limitations`,
        sortOrder: sql`excluded.sort_order`,
      },
    });

  await db
    .insert(schema.compoundTypes)
    .values(seedData.compoundTypes)
    .onConflictDoUpdate({
      target: schema.compoundTypes.key,
      set: {
        label: sql`excluded.label`,
        description: sql`excluded.description`,
        isPeptide: sql`excluded.is_peptide`,
        sortOrder: sql`excluded.sort_order`,
      },
    });

  await db
    .insert(schema.compoundCategories)
    .values(seedData.compoundCategories)
    .onConflictDoUpdate({
      target: schema.compoundCategories.key,
      set: {
        label: sql`excluded.label`,
        description: sql`excluded.description`,
        sortOrder: sql`excluded.sort_order`,
      },
    });

  await db
    .insert(schema.reviewClocks)
    .values(seedData.reviewClocks)
    .onConflictDoUpdate({
      target: schema.reviewClocks.contentClass,
      set: {
        label: sql`excluded.label`,
        minMonths: sql`excluded.min_months`,
        maxMonths: sql`excluded.max_months`,
        notes: sql`excluded.notes`,
      },
    });

  // Quality topics are created as empty shells. `what_it_proves` and
  // `what_it_does_not_prove` are left null on purpose: the publish gate refuses
  // a topic that cannot state both, and inventing them here would be exactly the
  // fabrication the editorial policy forbids.
  await db
    .insert(schema.qualityTopics)
    .values(seedData.qualityTopics)
    .onConflictDoUpdate({
      target: schema.qualityTopics.qualityKey,
      set: {
        name: sql`excluded.name`,
        slug: sql`excluded.slug`,
        family: sql`excluded.family`,
        sortOrder: sql`excluded.sort_order`,
      },
    });
}

/**
 * Loads the source registry from SOURCE_MANIFEST.json.
 *
 * QC status travels with the record, so a source marked `replace` is stored as
 * non-citable and the publish gates will refuse to accept it as provenance.
 */
export async function seedSourceRegistry(db: SeedDb): Promise<number> {
  const rows = seedData.sourceManifest.sources
    .filter((source) => source.source_type !== null)
    .map((source) => ({
      sourceKey: source.source_key,
      title: source.title,
      sourceTypeKey: source.source_type,
      authors: source.authors,
      year: source.year,
      publisher: source.publisher,
      publicationName: source.publication_name,
      qcStatus: source.qc_status,
      localPrivateFilename: source.known_local_filename,
      primaryRole: source.primary_role,
      authorityNotes: source.authority_notes,
      limitationsNotes: source.limitations_notes,
      publicFulltextAllowed: source.public_fulltext_allowed,
      isbn: source.isbn,
      edition: source.edition,
      canonicalFilename: source.canonical_filename,
      localFileSha256: source.local_file_sha256,
      localFileBytes: source.local_file_bytes,
      pageCount: source.page_count,
      printedPageOffset: source.printed_page_offset,
      accessStatus: source.access_status,
      accessNotes: source.access_notes,
      replacesSourceKey: source.replaces_source_key,
      titlePageVerified: source.title_page_verified,
      bibliographicVerified: source.bibliographic_verified,
      titlePageTitle: source.title_page_title,
      titlePageAuthors: source.title_page_authors,
      integrityNotes: source.integrity_notes,
      verifiedAt: source.verified_at,
      verifiedBy: source.verified_by,
      doi: source.doi,
      pmid: source.pmid,
      trialRegistryId: source.trial_registry_id,
      canonicalUrl: source.canonical_url,
    }));

  if (rows.length === 0) return 0;

  await db
    .insert(schema.sources)
    .values(rows)
    .onConflictDoUpdate({
      target: schema.sources.sourceKey,
      set: {
        title: sql`excluded.title`,
        sourceTypeKey: sql`excluded.source_type_key`,
        authors: sql`excluded.authors`,
        year: sql`excluded.year`,
        publisher: sql`excluded.publisher`,
        publicationName: sql`excluded.publication_name`,
        qcStatus: sql`excluded.qc_status`,
        localPrivateFilename: sql`excluded.local_private_filename`,
        primaryRole: sql`excluded.primary_role`,
        authorityNotes: sql`excluded.authority_notes`,
        limitationsNotes: sql`excluded.limitations_notes`,
        isbn: sql`excluded.isbn`,
        edition: sql`excluded.edition`,
        canonicalFilename: sql`excluded.canonical_filename`,
        localFileSha256: sql`excluded.local_file_sha256`,
        localFileBytes: sql`excluded.local_file_bytes`,
        pageCount: sql`excluded.page_count`,
        printedPageOffset: sql`excluded.printed_page_offset`,
        accessStatus: sql`excluded.access_status`,
        accessNotes: sql`excluded.access_notes`,
        replacesSourceKey: sql`excluded.replaces_source_key`,
        titlePageVerified: sql`excluded.title_page_verified`,
        bibliographicVerified: sql`excluded.bibliographic_verified`,
        titlePageTitle: sql`excluded.title_page_title`,
        titlePageAuthors: sql`excluded.title_page_authors`,
        integrityNotes: sql`excluded.integrity_notes`,
        verifiedAt: sql`excluded.verified_at`,
        verifiedBy: sql`excluded.verified_by`,
        doi: sql`excluded.doi`,
        pmid: sql`excluded.pmid`,
        trialRegistryId: sql`excluded.trial_registry_id`,
        canonicalUrl: sql`excluded.canonical_url`,
      },
    });

  return rows.length;
}

/**
 * Creates the first cohort of compound records (docs/LOCKED_DECISIONS.md #13).
 *
 * Summaries are left empty. These are placeholders for extraction, not content.
 */
export async function seedPeptideSkeletons(
  db: SeedDb,
): Promise<{ peptides: number; aliases: number }> {
  const inserted = await db
    .insert(schema.peptides)
    .values(
      seedData.peptides.map((p) => ({
        peptideKey: p.peptideKey,
        canonicalName: p.canonicalName,
        slug: p.slug,
        compoundTypeKey: p.compoundTypeKey,
        primaryCategoryKey: p.primaryCategoryKey,
      })),
    )
    .onConflictDoUpdate({
      target: schema.peptides.peptideKey,
      set: {
        canonicalName: sql`excluded.canonical_name`,
        slug: sql`excluded.slug`,
        compoundTypeKey: sql`excluded.compound_type_key`,
        primaryCategoryKey: sql`excluded.primary_category_key`,
      },
    })
    .returning({ id: schema.peptides.id, peptideKey: schema.peptides.peptideKey });

  const byKey = new Map(inserted.map((row) => [row.peptideKey, row.id]));

  const aliasRows = seedData.peptides.flatMap((p) => {
    const peptideId = byKey.get(p.peptideKey);
    if (!peptideId) return [];
    return p.aliases.map((a) => ({
      peptideId,
      alias: a.alias,
      aliasType: a.aliasType,
      notes: a.notes,
    }));
  });

  if (aliasRows.length > 0) {
    await db
      .insert(schema.peptideAliases)
      .values(aliasRows)
      .onConflictDoUpdate({
        target: [schema.peptideAliases.peptideId, schema.peptideAliases.alias],
        set: {
          aliasType: sql`excluded.alias_type`,
          notes: sql`excluded.notes`,
        },
      });
  }

  return { peptides: inserted.length, aliases: aliasRows.length };
}

/** The open verification queue: what has not yet been checked is part of the record. */
export async function seedVerificationIssues(db: SeedDb): Promise<number> {
  const rows = seedData.verificationIssues.map((issue) => ({
    issueKey: issue.issueKey,
    topic: issue.topic,
    whyItMatters: issue.whyItMatters,
    currentSourceSignal: issue.currentSourceSignal,
    neededVerification: issue.neededVerification,
    priority: issue.priority,
    relatedKeys: issue.relatedKeys,
  }));

  await db
    .insert(schema.verificationIssues)
    .values(rows)
    .onConflictDoUpdate({
      target: schema.verificationIssues.issueKey,
      set: {
        topic: sql`excluded.topic`,
        whyItMatters: sql`excluded.why_it_matters`,
        currentSourceSignal: sql`excluded.current_source_signal`,
        neededVerification: sql`excluded.needed_verification`,
        priority: sql`excluded.priority`,
        relatedKeys: sql`excluded.related_keys`,
      },
    });

  return rows.length;
}
