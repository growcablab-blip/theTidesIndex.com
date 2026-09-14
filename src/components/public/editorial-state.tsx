import Link from 'next/link';
import type { EvidenceGap } from '@/server/public/shapes';
import type { EditorialSynthesis } from '@/server/public/learning';

/**
 * Three editorial states, one visual grammar.
 *
 *   SOURCE FACT      directly supported by a cited source, at a location you can check
 *   TIDES SYNTHESIS  a transparent conclusion this index draws from several sourced
 *                    facts, naming every one
 *   SOURCE NEEDED    a factual point no held source supports, so it is not made
 *
 * The distinction is the product's promise made visible. Each state carries a
 * word, a glyph and a shape as well as a tint, so it survives greyscale print,
 * forced colours and a reader who cannot tell the hues apart.
 */

export type EditorialStateKind = 'source-fact' | 'synthesis' | 'source-needed';

interface StateStyle {
  readonly label: string;
  readonly glyph: string;
  readonly description: string;
  readonly chip: string;
  readonly card: string;
}

export const EDITORIAL_STATE: Readonly<Record<EditorialStateKind, StateStyle>> = {
  'source-fact': {
    label: 'Source fact',
    glyph: '§',
    description: 'Directly supported by a cited source, at a location you can check.',
    chip: 'border-tide-teal/60 bg-warm-white text-deep-tide',
    card: 'border border-rule border-l-[3px] border-l-tide-teal bg-warm-white',
  },
  synthesis: {
    label: 'Tides synthesis',
    glyph: '∴',
    description:
      'A conclusion this index draws from several sourced facts. It names every one, adds no number, mechanism, effect or safety conclusion, and states what it does not conclude.',
    chip: 'border-deep-tide/40 bg-sea-glass text-deep-tide',
    card: 'border border-deep-tide/25 border-l-[3px] border-l-deep-tide bg-sea-glass/50',
  },
  'source-needed': {
    label: 'Source needed',
    glyph: '?',
    description: 'A factual point no source held by this index supports, so the index does not make it.',
    chip: 'border-[var(--color-caution-rule)] bg-[var(--color-caution-bg)] text-[var(--color-caution)]',
    card: 'border border-dashed border-[var(--color-caution-rule)] border-l-[3px] border-l-[var(--color-caution)] bg-[var(--color-caution-bg)]',
  },
};

export function EditorialStateChip({ kind }: { kind: EditorialStateKind }) {
  const s = EDITORIAL_STATE[kind];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-2xs font-medium tracking-[0.06em] uppercase ${s.chip}`}
      title={s.description}
    >
      <span aria-hidden="true" className="font-serif text-xs normal-case">
        {s.glyph}
      </span>
      {s.label}
    </span>
  );
}

/** The key to the three states, shown once near the top of a page that uses them. */
export function EditorialStateLegend({ compact = false }: { compact?: boolean }) {
  const kinds: readonly EditorialStateKind[] = ['source-fact', 'synthesis', 'source-needed'];
  return (
    <dl className={compact ? 'grid gap-3 sm:grid-cols-3' : 'grid gap-4 sm:grid-cols-3'}>
      {kinds.map((kind) => (
        <div key={kind} className={`rounded-lg px-4 py-3 ${EDITORIAL_STATE[kind].card}`}>
          <dt>
            <EditorialStateChip kind={kind} />
          </dt>
          <dd className="mt-2 text-sm leading-relaxed text-ink-soft">
            {EDITORIAL_STATE[kind].description}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * A Tides synthesis, with its working.
 *
 * The statement leads; the claims it rests on are linked beneath it, and what it
 * does not conclude is always visible — a conclusion without its limit beside it
 * is read as more than it says. In simple mode the plain version leads and the
 * reasoning sits behind a disclosure.
 */
export function SynthesisCard({
  synthesis,
  simple,
}: {
  synthesis: EditorialSynthesis;
  simple: boolean;
}) {
  return (
    <article
      id={`synthesis-${synthesis.synthesisKey}`}
      className={`avoid-break scroll-mt-28 rounded-xl px-5 py-5 sm:px-6 ${EDITORIAL_STATE.synthesis.card}`}
    >
      <EditorialStateChip kind="synthesis" />
      <p className="mt-3 font-serif text-lg leading-snug text-ink sm:text-xl">
        {simple ? synthesis.plainLanguageText : synthesis.statement}
      </p>

      <p className="mt-3 text-sm text-ink-soft">
        <span className="font-medium text-deep-tide">Rests on </span>
        {synthesis.claimKeys.map((key, i) => (
          <span key={key}>
            {i > 0 ? (i === synthesis.claimKeys.length - 1 ? ' and ' : ', ') : null}
            <Link
              href={`#claim-${key}`}
              className="tabular underline decoration-deep-tide/30 underline-offset-2 hover:decoration-deep-tide"
            >
              {key}
            </Link>
          </span>
        ))}
        <span className="text-slate"> — each a sourced claim on this page.</span>
      </p>

      {simple ? (
        <details className="tides-disclosure mt-3 text-sm">
          <summary className="cursor-pointer text-deep-tide">How this conclusion is drawn</summary>
          <p className="mt-2 leading-relaxed text-ink-soft">{synthesis.reasoning}</p>
        </details>
      ) : (
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          <span className="font-medium text-ink">How it is drawn. </span>
          {synthesis.reasoning}
        </p>
      )}

      <p className="mt-3 border-t border-deep-tide/15 pt-3 text-sm leading-relaxed text-ink-soft">
        <span className="font-medium text-ink">What it does not conclude. </span>
        {synthesis.doesNotConclude}
      </p>
    </article>
  );
}

/**
 * A point no held source supports.
 *
 * Worded as a statement about this index, not about the world: "no source held
 * here states this" is true and checkable. In practitioner mode the reason and
 * what would settle it are shown; in simple mode, the reason.
 */
export function SourceNeededCard({ gap, simple }: { gap: EvidenceGap; simple: boolean }) {
  const resolved = gap.resolutionState === 'resolved' || gap.resolutionState === 'superseded';
  return (
    <article className={`avoid-break rounded-xl px-5 py-4 ${EDITORIAL_STATE['source-needed'].card}`}>
      <div className="flex flex-wrap items-center gap-2">
        <EditorialStateChip kind="source-needed" />
        {resolved ? (
          <span className="text-2xs tracking-[0.06em] text-slate uppercase">
            {gap.resolutionState === 'resolved' ? 'Since answered' : 'Superseded'}
          </span>
        ) : null}
      </div>
      <p className="mt-2.5 text-ink">{gap.statement}</p>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">
        <span className="font-medium">Why it is not stated: </span>
        {gap.whyNotSupported}
      </p>
      {!simple && gap.whatWouldResolveIt ? (
        <p className="mt-1.5 text-sm leading-relaxed text-slate">
          <span className="font-medium">What would settle it: </span>
          {gap.whatWouldResolveIt}
        </p>
      ) : null}
      {resolved && gap.resolutionNote ? (
        <p className="mt-2 text-sm leading-relaxed text-deep-tide">{gap.resolutionNote}</p>
      ) : null}
    </article>
  );
}
