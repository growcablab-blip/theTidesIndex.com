import type { ShowcaseTelemetry } from '@/server/public/showcase';

/**
 * Research telemetry: the four live counts, read as instrument readouts.
 *
 * The numbers are rendered in full on the server — the count-up is decoration
 * layered on top by the motion script. If the database could not be read the
 * band is not shown at all, rather than showing a number nobody measured.
 */

const READOUTS = [
  { key: 'compounds', label: 'Compounds', note: 'Public compound records' },
  { key: 'sources', label: 'Sources', note: 'Registered research sources' },
  { key: 'evidenceRecords', label: 'Evidence records', note: 'Published, source-linked' },
  { key: 'protocols', label: 'Reported protocols', note: 'Attributed to their source' },
] as const satisfies readonly { key: keyof ShowcaseTelemetry; label: string; note: string }[];

export function Telemetry({ data }: { data: ShowcaseTelemetry | null }) {
  if (data === null) return null;

  return (
    <section aria-label="The index in numbers" className="relative border-y border-[var(--sx-line)] bg-[var(--sx-bg-2)]">
      <div className="sx-grid-bg opacity-60" aria-hidden="true" />
      <div className="sx-wrap relative py-14 sm:py-20">
        <div className="mb-10 flex flex-wrap items-center justify-between gap-4" data-reveal>
          <p className="sx-eyebrow flex items-center gap-3">
            <span className="sx-hud-dot !mr-0" aria-hidden="true" />
            Live index telemetry
          </p>
          <p className="sx-mono text-[0.68rem] tracking-[0.16em] text-[var(--sx-faint)]">
            READ FROM THE PUBLISHED RECORD
          </p>
        </div>

        <dl className="grid grid-cols-2 gap-x-6 gap-y-12 lg:grid-cols-4 lg:gap-x-0">
          {READOUTS.map((r, i) => (
            <div
              key={r.key}
              data-reveal
              style={{ '--delay': `${String(i * 0.12)}s` } as React.CSSProperties}
              className={`flex flex-col lg:px-8 ${i > 0 ? 'lg:border-l lg:border-[var(--sx-line)]' : 'lg:pl-0'}`}
            >
              <dt className="order-2 mt-4">
                <span className="sx-mono block text-[0.72rem] uppercase tracking-[0.2em] text-[var(--sx-cyan-soft)]">
                  {r.label}
                </span>
                <span className="mt-1.5 block text-sm text-[var(--sx-faint)]">{r.note}</span>
              </dt>
              <dd className="order-1">
                <span className="sx-stat-value block text-[var(--sx-text)]" data-count={data[r.key]}>
                  {data[r.key].toLocaleString('en-US')}
                </span>
                <span className="sx-meter mt-5 block" style={{ '--delay': `${String(i * 0.9)}s` } as React.CSSProperties} />
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
