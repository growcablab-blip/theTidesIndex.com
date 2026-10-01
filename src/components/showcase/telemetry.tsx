import type { ShowcaseTelemetry } from '@/server/public/showcase';

/**
 * The index in numbers — the four live counts, set as a quiet, confident band
 * between the hero and the Protocol Library. The page's tone shifts here: from
 * the dark of the hero, through deep teal, into the ivory of the library.
 *
 * The numbers are rendered in full on the server; the count-up is decoration
 * layered on by the motion script. If the database could not be read, the
 * numbers are not shown at all — never a number nobody measured.
 */

const READOUTS = [
  { key: 'compounds', label: 'Compounds' },
  { key: 'sources', label: 'Research sources' },
  { key: 'evidenceRecords', label: 'Evidence records' },
  { key: 'protocols', label: 'Reported protocols' },
] as const satisfies readonly { key: keyof ShowcaseTelemetry; label: string }[];

export function Telemetry({ data }: { data: ShowcaseTelemetry | null }) {
  return (
    <section aria-label="The index in numbers" className="relative bg-[linear-gradient(180deg,var(--sx-bg)_0%,#052430_60%,#062c35_100%)]">
      {data !== null ? (
        <div className="sx-wrap relative pb-6 pt-16 sm:pt-20">
          <p className="max-w-[46ch] text-lg leading-relaxed text-[var(--sx-soft)]" data-reveal>
            Behind every guide is a growing, source-linked research index.
          </p>
          <dl className="mt-12 grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
            {READOUTS.map((r, i) => (
              <div
                key={r.key}
                data-reveal
                style={{ '--delay': `${String(i * 0.1)}s` } as React.CSSProperties}
                className="flex flex-col border-t border-[rgb(165_243_252/0.16)] pt-6"
              >
                <dt className="order-2 mt-3 text-sm font-medium text-[var(--sx-soft)]">{r.label}</dt>
                <dd className="order-1">
                  <span className="sx-stat-value block text-[var(--sx-text)]" data-count={data[r.key]}>
                    {data[r.key].toLocaleString('en-US')}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ) : (
        <div className="h-16" />
      )}
      <div className="sx-handover" aria-hidden="true" />
    </section>
  );
}
