import Link from 'next/link';
import type { PractitionerProtocol } from '@/server/public/shapes';
import type { CombinationReport, StackMemberReading, StackPage } from '@/server/public/stacks';
import { Movement, ReportedProtocolCard, SourceDrawer } from './experience';
import { protocolSourceName } from './compound-experience';

/**
 * The combination experience.
 *
 * Built around one distinction and organised so a reader cannot miss it:
 * evidence about each compound alone is not evidence about the two together.
 * The page states, in its own first screen, how many sources report the
 * pairing and how much of that is a record of people rather than advice — and
 * where that number is small, it says so rather than filling the space.
 *
 * There is no combined regimen anywhere on this page, and there will not be
 * one. Each source's report appears under that source's name, unaveraged.
 */

function EvidenceTier({
  label,
  weight,
  children,
}: {
  readonly label: string;
  readonly weight: 'individual' | 'combination';
  readonly children: React.ReactNode;
}) {
  const tone =
    weight === 'combination'
      ? 'border-indigo-400/50 bg-indigo-50/50'
      : 'border-rule/70 bg-warm-white';
  return (
    <div className={`rounded-2xl border p-6 md:p-7 ${tone}`}>
      <p className="text-xs tracking-[0.12em] text-slate uppercase">{label}</p>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function MemberCard({
  member,
  simple,
}: {
  readonly member: StackMemberReading;
  readonly simple: boolean;
}) {
  const human = member.page.claims.filter((c) =>
    c.evidence.some((e) => e.evidenceClass === 'human'),
  ).length;
  const protocols = member.page.protocols.length;
  return (
    <div className="rounded-2xl border border-rule/70 bg-warm-white p-6">
      <Link href={`/peptides/${member.slug}`} className="group">
        <h3 className="font-serif text-xl text-deep-tide group-hover:text-scientific-teal">
          {member.name}
        </h3>
      </Link>
      {member.shortDescription === null ? null : (
        <p className="mt-2.5 text-sm leading-relaxed text-ink-soft">{member.shortDescription}</p>
      )}
      <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-3 border-t border-rule/60 pt-4">
        <div>
          <dt className="text-xs tracking-[0.1em] text-slate uppercase">Statements on human evidence</dt>
          <dd className="mt-0.5 font-serif text-2xl text-deep-tide">{human}</dd>
        </div>
        {/* Simple reading holds no regimen, so a count of them would read as
            "none exist" rather than "none are shown here". */}
        {simple ? null : (
          <div>
            <dt className="text-xs tracking-[0.1em] text-slate uppercase">
              Source-reported regimens
            </dt>
            <dd className="mt-0.5 font-serif text-2xl text-deep-tide">{protocols}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}

function CombinationReportCard({ report }: { readonly report: CombinationReport }) {
  return (
    <div className="rounded-xl border border-rule/70 bg-warm-white p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="font-serif text-lg text-ink">
          {report.sourceName}
        </h3>
        <p className="text-xs tracking-[0.1em] text-slate uppercase">{report.evidenceTypeLabel}</p>
      </div>
      <p className="mt-1.5 text-sm text-slate">
        On the {report.memberName} record
        {report.partnerNames.length === 0
          ? null
          : ` · names ${report.partnerNames.join(' and ')}`}
      </p>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">{report.objectiveContext}</p>
      {report.combinationsText === null ? null : (
        <blockquote className="mt-4 border-l-2 border-scientific-teal/50 pl-4 text-sm leading-relaxed text-ink">
          {report.combinationsText}
        </blockquote>
      )}
      {report.ambiguousNames.map((a) => (
        <p
          key={a.term}
          className="mt-4 rounded-lg border border-amber-300/60 bg-amber-50/70 px-4 py-3 text-sm leading-relaxed text-ink-soft"
        >
          This record names <strong className="font-medium text-ink">{a.term}</strong>, which the
          register holds as a name for {a.candidates.join(' and ')} alike. Which of them was given
          cannot be determined from the record, and this index does not choose one.
        </p>
      ))}
      {report.citations.length === 0 ? null : (
        <div className="mt-4">
          <SourceDrawer label="Source" citations={report.citations} />
        </div>
      )}
    </div>
  );
}

export function StackExperience({
  stack,
  simple,
}: {
  readonly stack: StackPage;
  readonly simple: boolean;
}) {
  const names = stack.members.map((m) => m.name);
  const reports = stack.combination;
  const humanReports = stack.combinationHuman;
  const sourceCount = new Set(
    reports.flatMap((r) => r.citations.map((c) => c.sourceKey)),
  ).size;
  const ambiguousReports = reports.filter((r) => r.ambiguousNames.length > 0);
  const humanResolved = humanReports.filter((r) => r.partnerNames.length > 0);

  /* Every regimen held for any member, so the page can show what each source
   * reports for the individual compounds without composing anything. */
  const byMember = stack.members.map((m) => ({
    member: m,
    protocols: m.page.protocols,
  }));

  return (
    <div className="pb-24">
      {/* Hero ------------------------------------------------------------- */}
      <header className="relative overflow-hidden border-b border-rule/60 bg-deep-tide">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.22]"
          style={{
            backgroundImage:
              'radial-gradient(60% 80% at 15% 20%, #2563eb 0%, transparent 60%), radial-gradient(50% 70% at 85% 30%, #5eead4 0%, transparent 55%), radial-gradient(70% 90% at 50% 100%, #818cf8 0%, transparent 60%)',
          }}
        />
        <div className="relative mx-auto max-w-[72rem] px-4 py-16 md:px-8 md:py-24">
          <p className="text-xs tracking-[0.18em] text-scientific-teal uppercase">
            Combination · What sources report using together
          </p>
          <h1 className="mt-4 max-w-[22ch] font-serif text-4xl leading-[1.08] text-warm-white md:text-6xl">
            {stack.title}
          </h1>
          <p className="mt-6 max-w-[62ch] leading-relaxed text-warm-white/80 md:text-lg">
            {reports.length === 0
              ? 'No source held by this index reports these compounds being used together.'
              : `${String(reports.length)} held record${reports.length === 1 ? '' : 's'} report${reports.length === 1 ? 's' : ''} these compounds being used together, drawn from ${String(sourceCount)} identifiable source${sourceCount === 1 ? '' : 's'}. ${
                  humanReports.length === 0
                    ? 'None of them is a record of what happened to people.'
                    : humanResolved.length === 0
                      ? `${String(humanReports.length)} of them ${humanReports.length === 1 ? 'is' : 'are'} a record of what happened to people — and the second compound is named there in a way that does not identify which of these it was.`
                      : `${String(humanResolved.length)} of them ${humanResolved.length === 1 ? 'is' : 'are'} a record of what happened to people.`
                }`}
          </p>
          <p className="mt-5 max-w-[62ch] text-sm leading-relaxed text-warm-white/60">
            No study held here compares the combination against either compound alone. Nothing on
            this page is a recommendation, and no combined regimen is stated anywhere on it.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-[72rem] px-4 md:px-8">
        {/* 1 · The three questions ---------------------------------------- */}
        <Movement
          id="how-to-read"
          eyebrow="How to read this"
          title="Three different questions, kept apart"
          lede="A combination page invites one mistake above all others: reading evidence about each compound as evidence about the pair. These are not the same question and this page never merges them."
        >
          <div className="grid gap-4 md:grid-cols-3">
            <EvidenceTier label="Question one" weight="individual">
              <p className="font-serif text-lg text-ink">What is known about each compound alone?</p>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                Answered on each compound&rsquo;s own record. Summarised below, and linked.
              </p>
            </EvidenceTier>
            <EvidenceTier label="Question two" weight="individual">
              <p className="font-serif text-lg text-ink">
                Who reports using them together, and for what?
              </p>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                Answered by the records below, each under the name of the source that reports it.
              </p>
            </EvidenceTier>
            <EvidenceTier label="Question three" weight="combination">
              <p className="font-serif text-lg text-ink">
                What has been studied about the combination itself?
              </p>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                {humanReports.length === 0
                  ? 'Nothing held here. This is the honest answer, and it is the most important line on the page.'
                  : humanResolved.length === 0
                    ? `${String(humanReports.length)} held record${humanReports.length === 1 ? '' : 's'} describe${humanReports.length === 1 ? 's' : ''} people given a second compound alongside — under a name that does not identify which. None is a trial of the combination against either compound alone.`
                    : `${String(humanResolved.length)} held record${humanResolved.length === 1 ? '' : 's'} of people given both. None is a trial of the combination against either compound alone.`}
              </p>
            </EvidenceTier>
          </div>
        </Movement>

        {/* 2 · The compounds individually --------------------------------- */}
        <Movement
          id="members"
          eyebrow="Individually"
          title="What each compound is, on its own record"
          lede="These summaries are the compounds' own. Nothing here is altered by their appearing on a combination page."
        >
          <div className="grid gap-5 lg:grid-cols-3">
            {stack.members.map((m) => (
              <MemberCard key={m.slug} member={m} simple={simple} />
            ))}
          </div>
        </Movement>

        {/* 3 · The combination reports ------------------------------------ */}
        <Movement
          id="combination"
          eyebrow="Together"
          title="Every held record that names the pairing"
          lede="Each card is one source saying it uses these together. That several sources say so is a fact about the sources, not evidence that the combination works."
        >
          {reports.length === 0 ? (
            <p className="text-ink-soft">
              No held record names these compounds being used together.
            </p>
          ) : (
            <div className="grid gap-5 lg:grid-cols-2">
              {reports.map((r) => (
                <CombinationReportCard key={r.protocolId} report={r} />
              ))}
            </div>
          )}
        </Movement>

        {/* 4 · What would settle it --------------------------------------- */}
        <Movement
          id="unsettled"
          eyebrow="Unsettled"
          title="What none of this establishes"
        >
          <ul className="grid max-w-[74ch] gap-3">
            {[
              'Whether using these together does more than using either alone. No held record compares them.',
              'Whether the combination is safer, or less safe, than either compound by itself.',
              'Whether the practitioner sources reached the same pairing independently, or from each other.',
              humanReports.length === 0
                ? 'What happens to people given both, in any setting. No held record describes it.'
                : 'What the combination contributed in the records where people received both: those records were not designed to separate it.',
              ...(ambiguousReports.length === 0
                ? []
                : [
                    `Which compound was actually given, where a record names ${ambiguousReports
                      .flatMap((r) => r.ambiguousNames.map((a) => a.term))
                      .filter((t, i, all) => all.indexOf(t) === i)
                      .join(' or ')}. The register holds that name for more than one of these compounds, because sources use it for more than one; the records do not settle it.`,
                  ]),
            ].map((line) => (
              <li
                key={line}
                className="rounded-lg border border-rule/70 bg-mist/40 px-5 py-3.5 text-sm leading-relaxed text-ink-soft"
              >
                {line}
              </li>
            ))}
          </ul>
        </Movement>

        {/* 5 · What each source reports for the compounds alone ----------- */}
        {simple ? null : (
          <Movement
            id="regimens"
            eyebrow="Reported regimens"
            title="What each source reports for the compounds separately"
            lede="Shown separately on purpose. These are single-compound regimens; no source held here states a combined amount, and this index does not assemble one."
          >
            <div className="grid gap-10">
              {byMember
                .filter((m) => m.protocols.length > 0)
                .map(({ member, protocols }) => (
                  <section key={member.slug}>
                    <h3 className="font-serif text-xl text-deep-tide">{member.name}</h3>
                    <div className="mt-4 grid gap-5 lg:grid-cols-2">
                      {protocols.map((protocol) => (
                        <ReportedProtocolCard
                          key={protocol.id}
                          sourceName={protocolSourceName(protocol)}
                          contextLabel={protocol.evidenceTypeLabel}
                          protocol={protocol as PractitionerProtocol}
                          simple={simple}
                        />
                      ))}
                    </div>
                  </section>
                ))}
            </div>
          </Movement>
        )}

        {/* 6 · Onward ------------------------------------------------------ */}
        <Movement id="records" eyebrow="Full records" title="Read the compounds in full">
          <div className="grid gap-4 md:grid-cols-3">
            {stack.members.map((m) => (
              <Link
                key={m.slug}
                href={`/peptides/${m.slug}`}
                className="group rounded-xl border border-rule/70 bg-warm-white px-5 py-4 transition-colors hover:border-scientific-teal/60"
              >
                <p className="font-serif text-lg text-deep-tide group-hover:text-scientific-teal">
                  {m.name}
                </p>
                <p className="mt-1 text-sm text-slate">Evidence, sources and regulatory status</p>
              </Link>
            ))}
          </div>
          <p className="mt-6 max-w-[70ch] text-sm leading-relaxed text-slate">
            Compounds are named here because sources name them, not because this index endorses the
            pairing. {names.join(', ')} each carry their own uncertainties, which are on their own
            records.
          </p>
        </Movement>
      </div>
    </div>
  );
}
