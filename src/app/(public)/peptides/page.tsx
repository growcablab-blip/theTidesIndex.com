import Link from 'next/link';
import type { Metadata } from 'next';
import { getDiscovery, listPeptides, listRegisteredPeptides } from '@/server/public/queries';
import { previewDiscovery } from '@/server/public/preview';
import type { DiscoveryRow } from '@/server/public/research-index';
import { Container, EmptyState, EvidenceClassTag } from '@/components/public/primitives';
import { REPLICATION_LABELS } from '@/components/public/research-figures';
import { EVIDENCE_RECORD_DEFINITION, formatEvidenceRecordCount } from '@/domain/evidence/evidence-counts';

/**
 * Rendered on demand rather than at build time.
 *
 * The content of this page changes when an editor publishes, not when the
 * application is deployed, so a build-time snapshot would serve stale evidence
 * until the next deploy. It also means a build does not need database access,
 * which keeps deployment independent of the database being reachable.
 */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Compounds',
  description:
    'Every compound with a reviewed record in The Tides Index, with the kind of evidence recorded for each.',
};

/**
 * The compound index.
 *
 * Each row states what kind of evidence stands behind that compound before a
 * reader opens it. Sorting alphabetically rather than by "strength" is
 * deliberate: any ranking would be a judgement the underlying records do not
 * support, and readers arrive looking for a specific compound anyway.
 */
type SearchParams = Promise<{ area?: string; human?: string; route?: string; regimen?: string; replication?: string }>;

const TRIAL_KEYS = new Set([
  'human_rct',
  'human_controlled_nonrandomized',
  'human_prospective_uncontrolled',
  'human_observational',
  'human_pk_pd',
  'human_case_series',
  'human_case_report',
]);
const HANDBOOK_KEYS = new Set(['practitioner_reference', 'expert_commentary', 'experiential_anecdotal']);
const INDEPENDENT = new Set(['confirmed_in_humans', 'independent_multiple_countries', 'independent_group']);

function regimenKinds(keys: readonly string[]): string[] {
  const kinds: string[] = [];
  if (keys.includes('approved_label_evidence')) kinds.push('Approved label');
  if (keys.some((k) => TRIAL_KEYS.has(k))) kinds.push('Human study');
  if (keys.some((k) => HANDBOOK_KEYS.has(k))) kinds.push('Handbook');
  return kinds;
}

/**
 * Descriptive states, not counts.
 *
 * The directory used to print "17" against one compound and "3" against
 * another, side by side, which reads as a league table however the caption is
 * worded — and a paper count is a poor thing to rank on: it rewards compounds
 * that are fashionable, counts substudies twice, and says nothing about what
 * any of the papers found. The counts still exist, on the record page, where
 * the database, the search date, the study types and the substudy treatment
 * are all stated around them.
 *
 * So each dimension here answers a question in words: has anyone studied this
 * in people, is there laboratory work, has anybody repeated it, where do the
 * regimens come from, and how close to the research the citations actually
 * get.
 */
function humanState(row: DiscoveryRow): { text: string; tone: 'plain' | 'caution' | 'quiet' } {
  if (!row.hasScreen) return { text: 'No literature screen yet', tone: 'quiet' };
  if (row.humanRecords === 0) return { text: 'None found in the screen', tone: 'caution' };
  return { text: 'Studies in people identified', tone: 'plain' };
}

function preclinicalState(row: DiscoveryRow): string {
  if (!row.hasScreen) return '—';
  if (row.preclinicalRecords === 0) return 'None found';
  return 'Laboratory or animal work identified';
}

/** How close to the research this record's citations get. */
function traceState(row: DiscoveryRow): { text: string; detail: string | null } {
  if (row.evidenceRows === 0) return { text: '—', detail: null };
  const direct = row.citesPrimaryResearch + row.abstractOnly;
  if (direct === 0) {
    return { text: 'Secondary sources', detail: 'Handbooks and reviews; citations not obtained' };
  }
  if (row.restsOnSecondary === 0) {
    return {
      text: 'Cites the research',
      detail: row.fullTextRead > 0 ? 'Some full texts read' : 'Abstract level',
    };
  }
  return {
    text: 'Mixed',
    detail: row.fullTextRead > 0 ? 'Research and handbooks; some full texts read' : 'Research and handbooks',
  };
}

function fundingState(row: DiscoveryRow): string {
  if (row.fundingSources === 0) return '—';
  if (row.fundingChecked === 0) return 'Not captured';
  if (row.fundingChecked >= row.fundingSources) return 'Captured';
  return 'Partly captured';
}

async function loadDiscovery(): Promise<{ rows: DiscoveryRow[]; preview: boolean }> {
  const published = await getDiscovery();
  if (published.length > 0) return { rows: published, preview: false };
  const preview = await previewDiscovery();
  return { rows: preview ?? [], preview: preview !== null && preview.length > 0 };
}

export default async function PeptidesIndexPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const [peptides, registered, discovery] = await Promise.all([
    listPeptides(),
    listRegisteredPeptides(),
    loadDiscovery(),
  ]);
  const inPreparation = registered.filter((r) => !r.hasPublishedRecord);

  const rows = discovery.rows;
  const areas = [...new Map(rows.filter((r) => r.categoryKey).map((r) => [r.categoryKey!, r.categoryLabel ?? r.categoryKey!])).entries()].sort((a, b) => a[1].localeCompare(b[1]));
  const routes = [...new Map(rows.flatMap((r) => r.routes.map((x) => [x.key, x.name] as const))).entries()].sort((a, b) => a[1].localeCompare(b[1]));
  const shown = rows.filter((r) => {
    if (params.area && r.categoryKey !== params.area) return false;
    if (params.human === 'yes' && r.humanRecords === 0) return false;
    if (params.human === 'no' && r.humanRecords > 0) return false;
    if (params.route && !r.routes.some((x) => x.key === params.route)) return false;
    const kinds = regimenKinds(r.protocolEvidenceKeys);
    if (params.regimen === 'study' && !kinds.includes('Human study') && !kinds.includes('Approved label')) return false;
    if (params.regimen === 'handbook-only' && !(kinds.length === 1 && kinds[0] === 'Handbook')) return false;
    if (params.regimen === 'none' && r.protocolCount > 0) return false;
    if (params.replication === 'independent' && !(r.bestReplication && INDEPENDENT.has(r.bestReplication))) return false;
    return true;
  });
  const filtering = Boolean(params.area || params.human || params.route || params.regimen || params.replication);

  return (
    <Container width="wide" className="py-10 sm:py-14">
      <header className="max-w-[60ch]">
        <h1 className="font-serif text-3xl text-ink sm:text-4xl">Compounds</h1>
        <p className="mt-3 text-lg text-ink-soft">
          Every compound with a reviewed record. Each shows the kind of evidence recorded for it, so
          you can see before opening a page whether anything here rests on human studies.
        </p>
      </header>

      {rows.length > 0 ? (
        <section aria-labelledby="discover" className="mt-10">
          <h2 id="discover" className="font-serif text-2xl text-ink">
            Discover by evidence
          </h2>
          <p className="mt-1.5 max-w-[66ch] text-sm text-slate">
            Filter by what the evidence looks like rather than by what a compound is claimed to do.
            Each column describes a kind of evidence in words, because a count of papers is a poor
            thing to compare compounds on: it rewards whatever is fashionable and says nothing about
            what the papers found. The counts are on each record, with the database, the search date
            and the study types stated beside them. The list is alphabetical.
            {discovery.preview ? ' Development preview: these records are not published.' : ''}
          </p>

          <form method="get" className="mt-5 flex flex-wrap items-end gap-4 rounded-md border border-rule bg-mist px-4 py-4">
            <label className="text-sm">
              <span className="meta-label block">Research area</span>
              <select name="area" defaultValue={params.area ?? ''} className="mt-1 rounded border border-rule bg-warm-white px-2 py-1.5 text-sm text-ink">
                <option value="">Any</option>
                {areas.map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="meta-label block">Given to people</span>
              <select name="human" defaultValue={params.human ?? ''} className="mt-1 rounded border border-rule bg-warm-white px-2 py-1.5 text-sm text-ink">
                <option value="">Either</option>
                <option value="yes">Human studies found in the screen</option>
                <option value="no">None found in the screen</option>
              </select>
            </label>
            <label className="text-sm">
              <span className="meta-label block">Route recorded</span>
              <select name="route" defaultValue={params.route ?? ''} className="mt-1 rounded border border-rule bg-warm-white px-2 py-1.5 text-sm text-ink">
                <option value="">Any</option>
                {routes.map(([key, name]) => (
                  <option key={key} value={key}>{name}</option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="meta-label block">Regimens from</span>
              <select name="regimen" defaultValue={params.regimen ?? ''} className="mt-1 rounded border border-rule bg-warm-white px-2 py-1.5 text-sm text-ink">
                <option value="">Any</option>
                <option value="study">A label or human study</option>
                <option value="handbook-only">Handbooks only</option>
                <option value="none">None recorded</option>
              </select>
            </label>
            <label className="text-sm">
              <span className="meta-label block">Replication</span>
              <select name="replication" defaultValue={params.replication ?? ''} className="mt-1 rounded border border-rule bg-warm-white px-2 py-1.5 text-sm text-ink">
                <option value="">Any</option>
                <option value="independent">Repeated by an independent group</option>
              </select>
            </label>
            <button type="submit" className="rounded border border-deep-tide bg-deep-tide px-3 py-1.5 text-sm text-warm-white">Show</button>
            {filtering ? (
              <Link href="/peptides" className="text-sm text-deep-tide underline-offset-2 hover:underline">Clear</Link>
            ) : null}
          </form>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[64rem] border-collapse text-sm">
              <caption className="sr-only">
                Compounds by the shape of their evidence, described rather than counted.
                Alphabetical; not a ranking.
              </caption>
              <thead>
                <tr className="border-b border-ink text-left align-bottom">
                  <th scope="col" className="py-2 pr-4"><span className="meta-label">Compound</span></th>
                  <th scope="col" className="py-2 pr-4"><span className="meta-label">Area</span></th>
                  <th scope="col" className="py-2 pr-4"><span className="meta-label">Human evidence</span></th>
                  <th scope="col" className="py-2 pr-4"><span className="meta-label">Preclinical</span></th>
                  <th scope="col" className="py-2 pr-4"><span className="meta-label">Independent replication</span></th>
                  <th scope="col" className="py-2 pr-4"><span className="meta-label">Protocol sources</span></th>
                  <th scope="col" className="py-2 pr-4"><span className="meta-label">Routes recorded</span></th>
                  <th scope="col" className="py-2 pr-4"><span className="meta-label">Citations</span></th>
                  <th scope="col" className="py-2"><span className="meta-label">Open questions</span></th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => {
                  const human = humanState(r);
                  const trace = traceState(r);
                  return (
                    <tr key={r.slug} className="border-b border-rule-soft align-top">
                      <th scope="row" className="py-3 pr-4 text-left">
                        <Link href={`/peptides/${r.slug}`} className="font-serif text-base text-ink hover:text-deep-tide">{r.name}</Link>
                        {r.compoundTypeLabel ? <span className="block text-xs text-slate">{r.compoundTypeLabel}</span> : null}
                      </th>
                      <td className="py-3 pr-4 text-ink-soft">{r.categoryLabel ?? '—'}</td>
                      <td className="py-3 pr-4">
                        <span
                          className={
                            human.tone === 'caution'
                              ? 'text-[var(--color-caution)]'
                              : human.tone === 'quiet'
                                ? 'text-slate'
                                : 'text-ink-soft'
                          }
                        >
                          {human.text}
                        </span>
                        {r.nonEnglishHumanRecords > 0 ? (
                          <span className="block text-xs text-slate">Includes work not published in English</span>
                        ) : null}
                      </td>
                      <td className="py-3 pr-4 text-ink-soft">{preclinicalState(r)}</td>
                      <td className="py-3 pr-4 text-ink-soft">{r.bestReplication ? (REPLICATION_LABELS[r.bestReplication] ?? r.bestReplication) : 'Not assessed'}</td>
                      <td className="py-3 pr-4 text-ink-soft">
                        {r.protocolCount === 0 ? 'None recorded' : regimenKinds(r.protocolEvidenceKeys).join(', ')}
                      </td>
                      <td className="py-3 pr-4 text-ink-soft">{r.routes.length > 0 ? r.routes.map((x) => x.name).join(', ') : '—'}</td>
                      <td className="py-3 pr-4 text-ink-soft">
                        {trace.text}
                        {trace.detail === null ? null : <span className="block text-xs text-slate">{trace.detail}</span>}
                        <span className="block text-xs text-slate">Funding context: {fundingState(r).toLowerCase()}</span>
                      </td>
                      <td className="py-3 text-ink-soft">
                        {r.researchQuestions > 0 ? (
                          <Link href={`/research?subject=${r.slug}`} className="text-deep-tide underline-offset-2 hover:underline">
                            {r.researchQuestions} recorded
                          </Link>
                        ) : 'None recorded'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {shown.length === 0 ? <p className="mt-3 text-sm text-slate">No compound matches every filter.</p> : null}
          </div>
        </section>
      ) : null}

      <div className="mt-10">
        {peptides.length === 0 ? (
          <EmptyState
            headline="No compound records have been published yet."
            detail="A compound record is published only once it has a plain-language summary, a statement of what is not established about it, and both scientific and compliance review. Every compound in scope is listed below."
          >
            <p>
              The register of sources being worked through is{' '}
              <Link href="/sources" className="underline decoration-rule underline-offset-2">
                published in full
              </Link>
              , including which copies are unusable.
            </p>
          </EmptyState>
        ) : (
          <>
          <p className="mb-4 max-w-[66ch] text-xs text-slate">{EVIDENCE_RECORD_DEFINITION.short}</p>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {peptides.map((peptide) => (
              <li key={peptide.id}>
                <Link
                  href={`/peptides/${peptide.slug}`}
                  className="group flex h-full flex-col rounded-md border border-rule bg-warm-white px-5 py-4 transition-colors hover:border-tide-teal"
                >
                  <p className="font-serif text-lg text-ink group-hover:text-deep-tide">
                    {peptide.canonicalName}
                  </p>

                  {peptide.aliases.length > 0 ? (
                    <p className="mt-0.5 text-xs text-slate">{peptide.aliases.join(' · ')}</p>
                  ) : null}

                  <p className="mt-2 flex-1 text-sm text-ink-soft">
                    {peptide.shortDescription ?? (
                      <span className="text-slate italic">
                        Orientation line not yet written.
                      </span>
                    )}
                  </p>

                  <div className="mt-3.5 flex flex-wrap items-center gap-1.5 border-t border-rule-soft pt-3">
                    {peptide.humanEvidenceCount > 0 ? (
                      <EvidenceClassTag
                        evidenceClass="human"
                        label={formatEvidenceRecordCount('human', peptide.humanEvidenceCount)}
                      />
                    ) : null}
                    {peptide.preclinicalEvidenceCount > 0 ? (
                      <EvidenceClassTag
                        evidenceClass="preclinical"
                        label={formatEvidenceRecordCount('preclinical', peptide.preclinicalEvidenceCount)}
                      />
                    ) : null}
                    {peptide.referenceEvidenceCount > 0 ? (
                      <EvidenceClassTag
                        evidenceClass="reference_opinion"
                        label={formatEvidenceRecordCount('reference', peptide.referenceEvidenceCount)}
                      />
                    ) : null}
                    {peptide.humanEvidenceCount === 0 &&
                    peptide.preclinicalEvidenceCount === 0 &&
                    peptide.referenceEvidenceCount === 0 ? (
                      <span className="text-xs text-slate">No evidence records yet</span>
                    ) : null}
                    {!peptide.isPeptide ? (
                      <span className="rounded-sm border border-[var(--color-caution-rule)] bg-[var(--color-caution-bg)] px-1.5 py-0.5 text-2xs text-[var(--color-caution)]">
                        not a peptide
                      </span>
                    ) : null}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          </>
        )}
      </div>

      {inPreparation.length > 0 ? (
        <section className="mt-14">
          <h2 className="font-serif text-2xl text-ink">In scope, record in preparation</h2>
          <p className="mt-1.5 max-w-[62ch] text-sm text-slate">
            These compounds are being worked on. Nothing about them is published until their
            statements have been traced to a source and reviewed, so their pages say only that —
            which is different from the compound being out of scope.
          </p>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {inPreparation.map((peptide) => (
              <li key={peptide.id}>
                <Link
                  href={`/peptides/${peptide.slug}`}
                  className="group flex h-full flex-col rounded-md border border-dashed border-rule bg-mist/50 px-4 py-3 transition-colors hover:border-tide-teal"
                >
                  <p className="font-serif text-base text-ink-soft group-hover:text-deep-tide">
                    {peptide.canonicalName}
                  </p>
                  <p className="mt-1 text-xs text-slate">
                    {peptide.draftClaimCount > 0 || peptide.draftProtocolCount > 0
                      ? 'Extraction under way'
                      : 'Extraction not started'}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </Container>
  );
}
