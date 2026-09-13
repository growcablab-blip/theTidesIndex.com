import type { ReactNode } from 'react';
import type { EvidenceClass } from '@/domain/evidence/evidence-types';

/**
 * Public presentation primitives.
 *
 * The design job on this site is almost entirely typographic: establish a clear
 * hierarchy, make dense evidence readable, and keep the distinction between
 * fact, interpretation and uncertainty visible at a glance. Colour is a second
 * signal, never the only one.
 */

export function Container({
  children,
  width = 'page',
  className = '',
}: {
  children: ReactNode;
  width?: 'reading' | 'page' | 'wide';
  className?: string;
}) {
  const max =
    width === 'reading'
      ? 'max-w-[var(--container-reading)]'
      : width === 'wide'
        ? 'max-w-[var(--container-wide)]'
        : 'max-w-[var(--container-page)]';
  return <div className={`mx-auto w-full ${max} px-5 sm:px-8 ${className}`}>{children}</div>;
}

/** A major movement of a page. Anchored so the contents rail can reach it. */
export function Section({
  id,
  title,
  lede,
  children,
  aside,
}: {
  id: string;
  title: string;
  lede?: string;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 py-[calc(var(--rhythm)*2)]">
      <div className="mb-[var(--rhythm)] flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h2 className="font-serif text-2xl text-ink">{title}</h2>
        {aside ? <div className="text-sm text-slate">{aside}</div> : null}
      </div>
      {lede ? <p className="mb-[var(--rhythm)] max-w-[52ch] text-slate">{lede}</p> : null}
      {children}
    </section>
  );
}

/**
 * An empty state.
 *
 * These carry more weight here than in most products. Most of this reference is
 * deliberately unpopulated, and saying precisely *why* something is absent — not
 * yet extracted, not yet verified, captured but unreviewed — is more useful and
 * more honest than filling the space. An empty state is a claim about the state
 * of the work, so it should be as specific as any other claim.
 */
export function EmptyState({
  headline,
  detail,
  children,
}: {
  headline: string;
  detail?: string;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-md border border-dashed border-rule bg-mist/60 px-5 py-6">
      <p className="font-serif text-base text-deep-tide">{headline}</p>
      {detail ? <p className="mt-1.5 max-w-[56ch] text-sm text-slate">{detail}</p> : null}
      {children ? <div className="mt-3 text-sm text-slate">{children}</div> : null}
    </div>
  );
}

const EVIDENCE_CLASS_STYLE: Readonly<Record<EvidenceClass, string>> = {
  human: 'border-[var(--color-evidence-human)]/35 bg-[var(--color-evidence-human-bg)] text-[var(--color-evidence-human)]',
  preclinical:
    'border-[var(--color-evidence-preclinical)]/35 bg-[var(--color-evidence-preclinical-bg)] text-[var(--color-evidence-preclinical)]',
  reference_opinion:
    'border-[var(--color-evidence-reference)]/35 bg-[var(--color-evidence-reference-bg)] text-[var(--color-evidence-reference)]',
};

export const EVIDENCE_CLASS_LABEL: Readonly<Record<EvidenceClass, string>> = {
  human: 'Human',
  preclinical: 'Preclinical',
  reference_opinion: 'Reference',
};

/**
 * The evidence class of a record, as a label.
 *
 * Always reads as a word. The tint helps someone scanning a long page find the
 * human evidence quickly; it is never the thing that carries the meaning.
 */
export function EvidenceClassTag({
  evidenceClass,
  label,
}: {
  evidenceClass: EvidenceClass;
  label?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-sm border px-1.5 py-0.5 text-2xs font-medium tracking-wide whitespace-nowrap ${EVIDENCE_CLASS_STYLE[evidenceClass]}`}
    >
      {label ?? EVIDENCE_CLASS_LABEL[evidenceClass]}
    </span>
  );
}

/** Quiet metadata, e.g. "Last reviewed 14 March 2026". */
export function MetaItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="meta-label">{label}</dt>
      <dd className="mt-0.5 text-sm text-ink-soft">{children}</dd>
    </div>
  );
}

/**
 * A statement the platform makes about its own confidence, rather than about
 * the compound. Visually distinct from evidence so the two are never confused.
 */
export function UncertaintyNote({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-md border-l-2 border-[var(--color-caution-rule)] bg-[var(--color-caution-bg)] px-4 py-3">
      <p className="meta-label text-[var(--color-caution)]">What remains uncertain</p>
      <div className="mt-1 text-sm text-ink-soft">{children}</div>
    </div>
  );
}

/** Editorial reading of a source, kept visibly separate from what it says. */
export function InterpretationNote({ children }: { children: ReactNode }) {
  return (
    <div className="border-l-2 border-rule pl-3">
      <p className="meta-label">The Tides Index reads this as</p>
      <div className="mt-0.5 text-sm text-ink-soft">{children}</div>
    </div>
  );
}

export function Callout({
  tone = 'neutral',
  title,
  children,
}: {
  tone?: 'neutral' | 'caution';
  title?: string;
  children: ReactNode;
}) {
  const styles =
    tone === 'caution'
      ? 'border-[var(--color-caution-rule)] bg-[var(--color-caution-bg)]'
      : 'border-rule bg-mist';
  return (
    <div className={`rounded-md border px-5 py-4 ${styles}`}>
      {title ? <p className="font-serif text-base text-ink">{title}</p> : null}
      <div className={`text-sm text-ink-soft ${title ? 'mt-1.5' : ''}`}>{children}</div>
    </div>
  );
}

/** Wide content scrolls inside itself; the page never scrolls sideways. */
export function TableScroller({ children }: { children: ReactNode }) {
  return (
    <div className="scroll-x -mx-5 px-5 sm:mx-0 sm:px-0">
      <div className="min-w-[38rem]">{children}</div>
    </div>
  );
}

export function DefinitionRow({
  term,
  children,
}: {
  term: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-1 border-b border-rule-soft py-3 last:border-b-0 sm:grid-cols-[11rem_1fr] sm:gap-4">
      <dt className="text-sm font-medium text-deep-tide">{term}</dt>
      <dd className="text-sm text-ink-soft">{children}</dd>
    </div>
  );
}

/** Absence, stated rather than left blank. */
export function NotRecorded({ what }: { what?: string }) {
  return (
    <span className="text-sm text-slate italic">
      {what ? `Not recorded — ${what}` : 'Not recorded'}
    </span>
  );
}

export function formatDate(value: string | null): string {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not recorded';
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

/**
 * A summary from the record, as paragraphs.
 *
 * Summaries are stored with blank lines between paragraphs and `**lead-ins**`
 * marking the section a paragraph is about, and both were being rendered
 * literally: the tesamorelin practitioner summary arrived on the page as one
 * unbroken block of eight hundred words with visible asterisks in it. Legible
 * to nobody, and the fault of the renderer rather than the record.
 *
 * The subset handled is deliberately tiny — paragraph breaks, and bold runs
 * delimited by a doubled asterisk. No links, no raw HTML, no markdown library.
 * Everything here is React elements built from split strings, so there is no
 * path by which stored text could become markup.
 */
export function SummaryProse({
  text,
  className = 'max-w-[62ch] text-lg leading-relaxed text-ink-soft',
}: {
  text: string;
  className?: string;
}) {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph !== '');

  return (
    <div className="space-y-4">
      {paragraphs.map((paragraph) => (
        <p key={paragraph.slice(0, 48)} className={className}>
          {paragraph.split('**').map((run, index) =>
            // Odd-indexed runs sit between a pair of delimiters. An unmatched
            // delimiter leaves its tail unbolded rather than swallowing the
            // rest of the paragraph.
            index % 2 === 1 ? (
              <strong key={`${String(index)}-${run.slice(0, 24)}`} className="font-medium text-ink">
                {run}
              </strong>
            ) : (
              <span key={`${String(index)}-${run.slice(0, 24)}`}>{run}</span>
            ),
          )}
        </p>
      ))}
    </div>
  );
}
