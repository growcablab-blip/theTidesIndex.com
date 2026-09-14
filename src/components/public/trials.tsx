import Link from 'next/link';
import type { ClinicalTrialRecord, TrialComparison, TrialDocument } from '@/server/public/trials';
import { formatDate } from '@/components/public/primitives';

/**
 * The registered trials behind a record.
 *
 * One card per trial, however many documents describe it. Under each trial, the
 * documents are listed by the question they answer — article, registry record,
 * posted results, protocol, statistical plan, substudy — with how much of each
 * this index holds, so "full text not held" is read where it matters rather than
 * discovered in a reference list.
 *
 * Journal and registry are not ranked against each other. Where two documents
 * of one trial report the same thing differently, both are shown with their
 * locations and the difference is left standing.
 *
 * Nothing here decides what is safe to show a patient: the dose arms and the
 * comparisons that carry arm amounts never reach simple mode, because the query
 * does not select them.
 */

const ROLE_LABEL: Record<string, string> = {
  primary_publication: 'Main article',
  substudy_publication: 'Substudy article',
  post_hoc_publication: 'Post hoc analysis',
  secondary_publication: 'Related article',
  registry_record: 'Registry record',
  posted_results: 'Results posted to the registry',
  protocol: 'Protocol',
  statistical_analysis_plan: 'Statistical analysis plan',
  supplement: 'Supplement',
  conference_material: 'Conference material',
};

const DEPTH_LABEL: Record<string, string> = {
  full_text_held: 'Full text held and read',
  abstract_only: 'Abstract only — full text not held',
  structured_record_held: 'Registry record held',
  not_held: 'Not held',
};

const STATE_LABEL: Record<string, string> = {
  agree: 'Agree',
  differ: 'Differ',
  only_one_reports: 'Only one reports it',
  not_comparable: 'Not directly comparable',
};

function registryHref(trial: ClinicalTrialRecord): string | null {
  return trial.registryName === 'ClinicalTrials.gov'
    ? `https://clinicaltrials.gov/study/${trial.registryId}`
    : null;
}

function Row({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-x-4 gap-y-0.5 border-b border-rule-soft py-2 sm:grid-cols-[11rem_1fr]">
      <dt className="text-sm text-slate">{term}</dt>
      <dd className="text-sm text-ink-soft">{children}</dd>
    </div>
  );
}

function DocumentItem({ document }: { document: TrialDocument }) {
  const held = document.depth === 'full_text_held' || document.depth === 'structured_record_held';
  return (
    <li className="rounded-md border border-rule-soft bg-warm-white px-4 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="meta-label">{ROLE_LABEL[document.role] ?? document.role}</p>
        <span
          className={`rounded-sm border px-1.5 py-0.5 text-2xs tracking-wide uppercase ${
            held ? 'border-tide-teal text-deep-tide' : 'border-rule text-slate'
          }`}
        >
          {DEPTH_LABEL[document.depth] ?? document.depth}
        </span>
      </div>
      <p className="mt-1 text-sm text-ink">
        <Link href={`/sources/${document.sourceKey}`} className="hover:text-deep-tide hover:underline">
          {document.sourceTitle}
        </Link>
        <span className="text-slate"> · {document.sourceKey}</span>
        {document.versionLabel ? <span className="text-slate"> · {document.versionLabel}</span> : null}
        {document.documentDate ? (
          <span className="text-slate"> · {formatDate(document.documentDate)}</span>
        ) : null}
      </p>
      {document.answers ? <p className="mt-1 text-sm text-ink-soft">{document.answers}</p> : null}
      {document.linkBasis === 'unconfirmed' ? (
        <p className="mt-1 text-xs tracking-wide text-[var(--color-caution)] uppercase">
          Link to this trial not confirmed
        </p>
      ) : null}
      {document.notes ? <p className="mt-1 text-xs text-slate">{document.notes}</p> : null}
    </li>
  );
}

function ComparisonItem({ comparison }: { comparison: TrialComparison }) {
  return (
    <li className="rounded-md border border-rule bg-warm-white px-4 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="font-serif text-base text-ink">{comparison.topic}</p>
        <span
          className={`rounded-sm border px-1.5 py-0.5 text-2xs tracking-wide uppercase ${
            comparison.state === 'differ'
              ? 'border-[var(--color-caution-rule)] text-[var(--color-caution)]'
              : 'border-rule text-slate'
          }`}
        >
          {STATE_LABEL[comparison.state] ?? comparison.state}
        </span>
      </div>
      <div className="mt-2 grid gap-3 sm:grid-cols-2">
        <div className="text-sm text-ink-soft">
          <p className="text-xs text-slate">
            {comparison.aSourceKey}
            {comparison.aLocator ? ` · ${comparison.aLocator}` : ''}
          </p>
          <p className="mt-0.5">{comparison.aReports}</p>
        </div>
        <div className="text-sm text-ink-soft">
          <p className="text-xs text-slate">
            {comparison.bSourceKey}
            {comparison.bLocator ? ` · ${comparison.bLocator}` : ''}
          </p>
          <p className="mt-0.5">{comparison.bReports}</p>
        </div>
      </div>
      <p className="mt-2 text-sm text-ink-soft">
        <span className="text-slate">What is known about it: </span>
        {comparison.knownExplanation}
      </p>
      {comparison.whyItMatters ? (
        <p className="mt-1 text-sm text-ink-soft">
          <span className="text-slate">Why it matters: </span>
          {comparison.whyItMatters}
        </p>
      ) : null}
    </li>
  );
}

export function TrialsSection({
  trials,
  simple,
}: {
  trials: readonly ClinicalTrialRecord[];
  simple: boolean;
}) {
  return (
    <div className="space-y-6">
      <p className="max-w-[66ch] text-sm text-ink-soft">
        Each trial is counted once. Articles, registry records, protocols, statistical plans and
        substudies are listed under the trial they describe, with how much of each this index
        holds. None of these documents outranks the others: each answers a different question.
      </p>

      {trials.map((trial) => {
        const href = registryHref(trial);
        return (
          <article key={trial.trialKey} className="rounded-md border border-rule bg-mist px-5 py-4">
            <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <p className="font-serif text-lg text-ink">
                {href ? (
                  <a href={href} rel="noreferrer noopener" className="hover:text-deep-tide hover:underline">
                    {trial.registryId}
                  </a>
                ) : (
                  trial.registryId
                )}
                {trial.acronym ? <span className="text-ink-soft"> · {trial.acronym}</span> : null}
              </p>
              <span className="rounded-sm border border-rule px-1.5 py-0.5 text-2xs tracking-wide text-ink-soft uppercase">
                {trial.phase}
              </span>
            </header>
            <p className="mt-1 text-sm text-ink-soft">{trial.officialTitle}</p>

            <dl className="mt-3 border-t border-rule-soft">
              <Row term="Design">{trial.design}</Row>
              <Row term="Who took part">{trial.population}</Row>
              {trial.comparator ? <Row term="Compared with">{trial.comparator}</Row> : null}
              {trial.enrolmentText ? <Row term="Enrolled">{trial.enrolmentText}</Row> : null}
              {trial.countries ? <Row term="Where">{trial.countries}</Row> : null}
              {trial.durationText ? <Row term="How long">{trial.durationText}</Row> : null}
              <Row term="Dates">
                {[
                  trial.startDate ? `Started ${formatDate(trial.startDate)}` : null,
                  trial.completionDate ? `completed ${formatDate(trial.completionDate)}` : null,
                  trial.resultsPostedDate
                    ? `results posted ${formatDate(trial.resultsPostedDate)}`
                    : 'no results posted to the registry',
                ]
                  .filter(Boolean)
                  .join('; ')}
              </Row>
              <Row term="Sponsor">{trial.sponsor}</Row>
              <Row term="Registry status">
                {trial.registryStatus}, as read on {formatDate(trial.registryCheckedAt)}
              </Row>
              {!simple && trial.primaryOutcome ? (
                <Row term="Primary outcome">{trial.primaryOutcome}</Row>
              ) : null}
              {!simple && trial.analysisPopulations ? (
                <Row term="Analysed">{trial.analysisPopulations}</Row>
              ) : null}
              {!simple && trial.statisticalPlan ? (
                <Row term="Statistical plan">{trial.statisticalPlan}</Row>
              ) : null}
              {!simple && trial.oversight ? <Row term="Oversight">{trial.oversight}</Row> : null}
              {!simple && trial.doseArmsText ? (
                <Row term="Arms as randomised">
                  {trial.doseArmsText}
                  <span className="mt-1 block text-xs text-slate">
                    Study-design data: what this trial randomised people to. Not a recommended
                    regimen.
                  </span>
                </Row>
              ) : null}
            </dl>

            {trial.notes ? <p className="mt-3 text-xs text-slate">{trial.notes}</p> : null}

            <div className="mt-4">
              <p className="meta-label">Documents of this trial</p>
              <ul className="mt-2 space-y-2">
                {trial.documents.map((document) => (
                  <DocumentItem
                    key={`${document.sourceKey}-${document.role}`}
                    document={document}
                  />
                ))}
              </ul>
            </div>

            {!simple && trial.comparisons.length > 0 ? (
              <div className="mt-4">
                <p className="meta-label">Where the documents agree and differ</p>
                <ul className="mt-2 space-y-2">
                  {trial.comparisons.map((comparison) => (
                    <ComparisonItem key={comparison.comparisonKey} comparison={comparison} />
                  ))}
                </ul>
              </div>
            ) : null}
            {simple && trial.comparisons.length > 0 ? (
              <p className="mt-3 text-xs text-slate">
                Where this trial&rsquo;s documents report things differently is recorded in the
                practitioner view.
              </p>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
