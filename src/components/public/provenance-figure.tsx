/**
 * The claim on the front page, drawn.
 *
 * The headline says every statement traces to a named source at an exact page.
 * Review is drawn as the fourth link because it is a real part of the chain —
 * but it is drawn unfilled and labelled as not yet recorded, because no record
 * in the index has been through it. A filled fourth box would be the figure
 * telling the reader something the database does not.
 * The right half of the hero was empty, and the obvious things to put there —
 * a photograph of a vial, a laboratory stock image — would each say something
 * this index is not: a product, or a laboratory.
 *
 * So it says the same thing the headline says, structurally. A reader who takes
 * nothing else from the page should come away knowing that a statement here has
 * a chain behind it, and that the chain ends at a person who has not yet read it.
 *
 * Deterministic vector, no animation, no gradient: the same visual language as
 * the figures inside the reference and the publications, so the front page does
 * not read as marketing attached to a different product.
 */
export function ProvenanceFigure({ id = 'fig-provenance' }: { id?: string }) {
  const steps: readonly { label: string; note: string; pending?: boolean }[] = [
    { label: 'Source', note: 'a named work' },
    { label: 'Page', note: 'an exact location' },
    { label: 'Claim', note: 'one statement' },
    { label: 'Review', note: 'by a named person — not yet recorded', pending: true },
  ];

  const width = 340;
  const rowH = 62;
  const height = steps.length * rowH + 14;
  const boxW = 214;
  const boxH = 46;
  const x = 52;

  return (
    <svg
      viewBox={`0 0 ${String(width)} ${String(height)}`}
      className="h-auto w-full max-w-[22rem] text-ink"
      role="img"
      aria-labelledby={`${id}-title ${id}-desc`}
    >
      <title id={`${id}-title`}>How a statement is built</title>
      <desc id={`${id}-desc`}>
        Four steps in sequence: a named source, an exact page within it, a single claim resting on
        that page, and a review of that claim by a named person — which has not yet been
        recorded for any record in this index.
      </desc>

      {steps.map((step, index) => {
        const y = index * rowH + 4;
        const isLast = index === steps.length - 1;
        return (
          <g key={step.label}>
            {/* The connector, drawn as a shallow curve rather than a straight
                line — the one place the brand's tide shows up at this scale. */}
            {isLast ? null : (
              <path
                d={`M ${String(x + 22)} ${String(y + boxH)} C ${String(x + 22)} ${String(y + boxH + 7)}, ${String(x + 30)} ${String(y + rowH - 9)}, ${String(x + 22)} ${String(y + rowH)}`}
                stroke="var(--color-rule)"
                strokeWidth={1}
                fill="none"
              />
            )}

            <circle
              cx={x + 22}
              cy={y + boxH / 2}
              r={4.5}
              fill="var(--color-warm-white)"
              stroke="var(--color-tide-teal)"
              strokeWidth={1.2}
              strokeDasharray={step.pending === true ? '2 2' : undefined}
            />

            <rect
              x={x + 44}
              y={y}
              width={boxW}
              height={boxH}
              rx={3}
              fill="var(--color-warm-white)"
              stroke="var(--color-rule)"
              strokeWidth={1}
              strokeDasharray={step.pending === true ? '3 3' : undefined}
            />
            <text
              x={x + 60}
              y={y + 20}
              className="fill-[var(--color-ink)] font-serif text-[13px]"
            >
              {step.label}
            </text>
            <text x={x + 60} y={y + 34} className="fill-[var(--color-slate)] text-[10px]">
              {step.note}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
