/**
 * Deterministic figures for "From sequence to final vial".
 *
 * Same rules as the quality figures: real SVG text, `role="img"` with a title
 * and description, `currentColor` throughout, no numbers, no scales.
 *
 * Two further rules specific to manufacturing:
 *
 *   - **No figure depicts a particular product's process.** Every figure says
 *     "generally" in its description, because the held sources describe
 *     different chemistries, scales and routes, and a clean single pipeline
 *     would imply an industry standard nobody has shown exists.
 *   - **A stage with no held source is drawn dashed and says so.** Whether a
 *     stage is sourced is passed in from the page, which derives it from the
 *     records it actually loaded, so a figure cannot claim coverage the
 *     evidence layer does not have.
 */

function useIds(id: string) {
  return { titleId: `${id}-title`, descId: `${id}-desc` };
}

function FigureScroller({ children }: { children: React.ReactNode }) {
  return (
    <>
      <p className="no-print mb-1 text-xs text-slate sm:hidden" aria-hidden="true">
        Scroll the figure sideways to see all of it.
      </p>
      <div className="overflow-x-auto">{children}</div>
    </>
  );
}

function Arrowhead({ id }: { id: string }) {
  return (
    <defs>
      <marker
        id={id}
        viewBox="0 0 10 10"
        refX="9"
        refY="5"
        markerWidth="6"
        markerHeight="6"
        orient="auto-start-reverse"
      >
        <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
      </marker>
    </defs>
  );
}

export interface FlowStage {
  readonly key: string;
  /** One or two short lines; the figure does not wrap text. */
  readonly lines: readonly [string] | readonly [string, string];
  readonly sourced: boolean;
}

/** Figure 1 — the whole flow, fifteen stages in three rows. */
export function SequenceToVialFigure({
  stages,
  id = 'fig-sequence-to-vial',
}: {
  stages: readonly FlowStage[];
  id?: string;
}) {
  const { titleId, descId } = useIds(id);
  const perRow = 5;
  const boxW = 124;
  const boxH = 58;
  const gapX = 20;
  const gapY = 44;
  const left = 10;
  const top = 16;
  const rows = Math.ceil(stages.length / perRow);
  const height = top + rows * boxH + (rows - 1) * gapY + 34;
  const unsourced = stages.filter((s) => !s.sourced).map((s) => s.lines.join(' '));

  const position = (index: number) => {
    const row = Math.floor(index / perRow);
    const col = index % perRow;
    return { x: left + col * (boxW + gapX), y: top + row * (boxH + gapY), row, col };
  };

  return (
    <figure className="my-2">
      <FigureScroller>
        <svg
          viewBox={`0 0 ${String(left * 2 + perRow * boxW + (perRow - 1) * gapX)} ${String(height)}`}
          role="img"
          aria-labelledby={`${titleId} ${descId}`}
          className="h-auto w-full min-w-[560px] text-ink"
        >
          <title id={titleId}>From sequence to final vial, as a general sequence of stages</title>
          <desc id={descId}>
            {`A general sequence of ${String(stages.length)} stages, read left to right along each row: ${stages
              .map((s) => s.lines.join(' '))
              .join(', ')}. Not every product passes through every stage, and not in exactly this order. ${
              unsourced.length > 0
                ? `No held source describes: ${unsourced.join(', ')}. Those stages are drawn dashed.`
                : ''
            }`}
          </desc>
          <Arrowhead id={`${id}-arrow`} />

          {stages.map((stage, index) => {
            const { x, y } = position(index);
            const next = index + 1 < stages.length ? position(index + 1) : null;
            return (
              <g key={stage.key}>
                <rect
                  x={x}
                  y={y}
                  width={boxW}
                  height={boxH}
                  rx="5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={stage.sourced ? 1.5 : 1.2}
                  strokeDasharray={stage.sourced ? undefined : '5 4'}
                  opacity={stage.sourced ? 0.9 : 0.55}
                />
                <text x={x + 10} y={y + 17} fontSize="10" fill="currentColor" opacity="0.6">
                  {String(index + 1).padStart(2, '0')}
                </text>
                <g fill="currentColor" fontSize="12.5" textAnchor="middle">
                  <text x={x + boxW / 2} y={y + (stage.lines.length === 2 ? 30 : 36)}>
                    {stage.lines[0]}
                  </text>
                  {stage.lines.length === 2 ? (
                    <text x={x + boxW / 2} y={y + 45}>
                      {stage.lines[1]}
                    </text>
                  ) : null}
                </g>
                {stage.sourced ? null : (
                  <text
                    x={x + boxW / 2}
                    y={y + boxH + 13}
                    fontSize="10"
                    fill="currentColor"
                    opacity="0.7"
                    textAnchor="middle"
                  >
                    source needed
                  </text>
                )}
                {next === null ? null : next.row === position(index).row ? (
                  <line
                    x1={x + boxW}
                    y1={y + boxH / 2}
                    x2={next.x - 3}
                    y2={next.y + boxH / 2}
                    stroke="currentColor"
                    strokeWidth="1.3"
                    markerEnd={`url(#${id}-arrow)`}
                  />
                ) : (
                  <path
                    d={`M ${String(x + boxW / 2)} ${String(y + boxH + (stage.sourced ? 2 : 17))} L ${String(x + boxW / 2)} ${String(y + boxH + gapY / 2 + 6)} L ${String(next.x + boxW / 2)} ${String(y + boxH + gapY / 2 + 6)} L ${String(next.x + boxW / 2)} ${String(next.y - 3)}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    opacity="0.6"
                    markerEnd={`url(#${id}-arrow)`}
                  />
                )}
              </g>
            );
          })}

          <g fontSize="11" fill="currentColor" opacity="0.75">
            <line x1="10" y1={height - 12} x2="34" y2={height - 12} stroke="currentColor" strokeWidth="1.5" />
            <text x="40" y={height - 8}>
              described by a held source
            </text>
            <line
              x1="210"
              y1={height - 12}
              x2="234"
              y2={height - 12}
              stroke="currentColor"
              strokeWidth="1.2"
              strokeDasharray="5 4"
            />
            <text x="240" y={height - 8}>
              no held source describes this stage
            </text>
          </g>
        </svg>
      </FigureScroller>
      <figcaption className="mt-3 max-w-[62ch] text-sm text-slate">
        A general sequence, not any product&rsquo;s actual process. Processes differ in chemistry,
        scale and route, and some stages are combined, repeated or skipped.
      </figcaption>
    </figure>
  );
}

/** Figure 2 — the bulk peptide and the finished vial are different things. */
export function ApiVersusVialFigure({ id = 'fig-api-vs-vial' }: { id?: string }) {
  const { titleId, descId } = useIds(id);
  return (
    <figure className="my-2">
      <FigureScroller>
        <svg
          viewBox="0 0 720 220"
          role="img"
          aria-labelledby={`${titleId} ${descId}`}
          className="h-auto w-full min-w-[520px] text-ink"
        >
          <title id={titleId}>The bulk peptide and the finished vial</title>
          <desc id={descId}>
            On the left, the bulk peptide, called the active pharmaceutical ingredient: the peptide
            substance itself. The held manufacturing guideline, ICH Q7, covers this. On the right,
            the finished vial: the peptide combined with other ingredients, filled, sealed and
            sometimes freeze-dried. No source held by the index describes that part. Between them,
            formulation, filling and finishing. A test result on one does not automatically
            describe the other.
          </desc>
          <Arrowhead id={`${id}-arrow`} />

          <rect x="10" y="30" width="250" height="160" rx="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <rect
            x="460"
            y="30"
            width="250"
            height="160"
            rx="6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeDasharray="5 4"
            opacity="0.7"
          />
          <line x1="268" y1="110" x2="452" y2="110" stroke="currentColor" strokeWidth="1.5" markerEnd={`url(#${id}-arrow)`} />

          {/* A heap of powder and a vial, schematic */}
          <path d="M 100 140 Q 135 96 170 140 Z" fill="currentColor" opacity="0.18" />
          <g fill="none" stroke="currentColor" strokeWidth="1.4">
            <rect x="570" y="102" width="30" height="46" rx="4" />
            <rect x="574" y="92" width="22" height="10" rx="2" />
          </g>
          <rect x="572" y="126" width="26" height="20" fill="currentColor" opacity="0.18" />

          <g fill="currentColor" textAnchor="middle">
            <text x="135" y="56" fontSize="14">
              Bulk peptide (API)
            </text>
            <text x="135" y="74" fontSize="11" opacity="0.75">
              the peptide substance itself
            </text>
            <text x="135" y="166" fontSize="11" opacity="0.75">
              ICH Q7 covers its manufacture
            </text>
            <text x="135" y="181" fontSize="11" opacity="0.75">
              and distribution
            </text>

            <text x="360" y="96" fontSize="12">
              formulation · fill · finish
            </text>
            <text x="360" y="130" fontSize="11" opacity="0.7">
              a result on one side is not
            </text>
            <text x="360" y="144" fontSize="11" opacity="0.7">
              a result on the other
            </text>

            <text x="585" y="56" fontSize="14">
              Finished vial
            </text>
            <text x="585" y="74" fontSize="11" opacity="0.75">
              peptide plus other ingredients
            </text>
            <text x="585" y="172" fontSize="11" opacity="0.75">
              no held source describes this
            </text>
          </g>
        </svg>
      </FigureScroller>
      <figcaption className="mt-3 max-w-[62ch] text-sm text-slate">
        Much of what is sold is bought as bulk material and put into vials later, sometimes by a
        different company. The guideline held here stops at the bulk material.
      </figcaption>
    </figure>
  );
}

export interface Checkpoint {
  readonly label: string;
  readonly detail: string;
  readonly claimKey: string;
}

/** Figure 3 — where checks sit along the flow. Labels come from the page. */
export function QualityCheckpointsFigure({
  checkpoints,
  id = 'fig-quality-checkpoints',
}: {
  checkpoints: readonly Checkpoint[];
  id?: string;
}) {
  const { titleId, descId } = useIds(id);
  const width = 720;
  const step = (width - 80) / Math.max(1, checkpoints.length - 1);
  return (
    <figure className="my-2">
      <FigureScroller>
        <svg
          viewBox={`0 0 ${String(width)} 190`}
          role="img"
          aria-labelledby={`${titleId} ${descId}`}
          className="h-auto w-full min-w-[560px] text-ink"
        >
          <title id={titleId}>Quality checkpoints along the flow</title>
          <desc id={descId}>
            {`Checks sit at several points, not only at the end: ${checkpoints
              .map((c) => `${c.label} (${c.detail})`)
              .join('; ')}. Each is described by a held source, cited below the figure. The figure does not say every product passes every checkpoint.`}
          </desc>
          <line x1="40" y1="80" x2={width - 40} y2="80" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
          {checkpoints.map((checkpoint, index) => {
            const cx = 40 + index * step;
            return (
              <g key={checkpoint.claimKey}>
                <path
                  d={`M ${String(cx)} 66 L ${String(cx + 14)} 80 L ${String(cx)} 94 L ${String(cx - 14)} 80 Z`}
                  fill="currentColor"
                  opacity="0.85"
                />
                <text
                  x={cx}
                  y={index % 2 === 0 ? 40 : 124}
                  fontSize="12.5"
                  fill="currentColor"
                  textAnchor={index === 0 ? 'start' : index === checkpoints.length - 1 ? 'end' : 'middle'}
                >
                  {checkpoint.label}
                </text>
                <text
                  x={cx}
                  y={index % 2 === 0 ? 55 : 139}
                  fontSize="10.5"
                  fill="currentColor"
                  opacity="0.7"
                  textAnchor={index === 0 ? 'start' : index === checkpoints.length - 1 ? 'end' : 'middle'}
                >
                  {checkpoint.detail}
                </text>
              </g>
            );
          })}
          <text x="40" y="176" fontSize="10.5" fill="currentColor" opacity="0.6">
            manufacture
          </text>
          <text x={width - 40} y="176" fontSize="10.5" fill="currentColor" opacity="0.6" textAnchor="end">
            use
          </text>
        </svg>
      </FigureScroller>
      <figcaption className="mt-3 max-w-[62ch] text-sm text-slate">
        A single certificate usually reports one of these checkpoints. It is worth knowing which.
      </figcaption>
    </figure>
  );
}

/** Figure 4 — batch, sample, test, document: the links a certificate depends on. */
export function BatchTraceabilityFigure({ id = 'fig-batch-traceability' }: { id?: string }) {
  const { titleId, descId } = useIds(id);
  const boxes: readonly { x: number; y: number; w: number; label: string; sub: string; dashed?: boolean }[] = [
    { x: 10, y: 20, w: 150, label: 'Raw material lots', sub: 'maker, supplier, receipt no.' },
    { x: 10, y: 130, w: 150, label: 'In-process results', sub: 'checks during manufacture' },
    { x: 250, y: 75, w: 190, label: 'Batch production record', sub: 'one unique batch number' },
    { x: 530, y: 20, w: 180, label: 'Release results', sub: 'before distribution' },
    { x: 530, y: 130, w: 180, label: 'Distribution record', sub: 'where each batch went' },
    { x: 250, y: 215, w: 190, label: 'Reseller or repacker', sub: 'passes on maker + batch' },
    { x: 530, y: 250, w: 180, label: 'Certificate you are shown', sub: 'names a batch', dashed: true },
    { x: 10, y: 250, w: 150, label: 'The vial in front of you', sub: 'carries a batch number', dashed: true },
  ];
  return (
    <figure className="my-2">
      <FigureScroller>
        <svg
          viewBox="0 0 720 320"
          role="img"
          aria-labelledby={`${titleId} ${descId}`}
          className="h-auto w-full min-w-[560px] text-ink"
        >
          <title id={titleId}>What a batch number is supposed to connect</title>
          <desc id={descId}>
            Under the held manufacturing guideline for pharmaceutical ingredients, a batch number
            indexes a batch production record. That record connects to the raw material lots used,
            the in-process results, the release results and the distribution record, and a reseller
            or repacker is expected to pass on the original manufacturer and batch. At the bottom,
            the vial and the certificate a buyer is shown. The links from them back into the chain
            are drawn dashed: a document on its own cannot prove it came from the batch in the
            vial.
          </desc>
          <Arrowhead id={`${id}-arrow`} />

          <g stroke="currentColor" strokeWidth="1.3" fill="none" markerEnd={`url(#${id}-arrow)`}>
            <path d="M 160 45 L 246 90" />
            <path d="M 160 155 L 246 120" />
            <path d="M 440 90 L 526 45" />
            <path d="M 440 120 L 526 155" />
            <path d="M 620 180 L 440 225" />
          </g>
          <g stroke="currentColor" strokeWidth="1.2" fill="none" strokeDasharray="5 4" opacity="0.7" markerEnd={`url(#${id}-arrow)`}>
            <path d="M 250 250 L 164 270" />
            <path d="M 526 275 L 164 285" />
            <path d="M 620 250 L 620 74" />
          </g>

          {boxes.map((box) => (
            <g key={box.label}>
              <rect
                x={box.x}
                y={box.y}
                width={box.w}
                height="50"
                rx="5"
                fill="none"
                stroke="currentColor"
                strokeWidth={box.dashed ? 1.2 : 1.5}
                strokeDasharray={box.dashed ? '5 4' : undefined}
                opacity={box.dashed ? 0.8 : 1}
              />
              <text x={box.x + box.w / 2} y={box.y + 22} fontSize="12.5" fill="currentColor" textAnchor="middle">
                {box.label}
              </text>
              <text x={box.x + box.w / 2} y={box.y + 38} fontSize="10.5" fill="currentColor" opacity="0.7" textAnchor="middle">
                {box.sub}
              </text>
            </g>
          ))}
          <text x="360" y="312" fontSize="11" fill="currentColor" opacity="0.75" textAnchor="middle">
            dashed: a link a document cannot establish by itself
          </text>
        </svg>
      </FigureScroller>
      <figcaption className="mt-3 max-w-[62ch] text-sm text-slate">
        Drawn from ICH Q7, which covers pharmaceutical ingredients. Whether any particular supplier
        keeps these records is not something the figure, or a label, can show.
      </figcaption>
    </figure>
  );
}

/** Figure 5 — storage and transport between the test and the use. */
export function StorageTransportChainFigure({ id = 'fig-storage-transport' }: { id?: string }) {
  const { titleId, descId } = useIds(id);
  const links: readonly { label: string; sub: string }[] = [
    { label: 'Manufacturer', sub: 'recorded storage' },
    { label: 'Carrier', sub: 'conditions on label' },
    { label: 'Distributor', sub: 'holding under control' },
    { label: 'Repacker', sub: 'new stability data' },
    { label: 'Before use', sub: 'no held source' },
  ];
  const boxW = 128;
  const gap = 14;
  return (
    <figure className="my-2">
      <FigureScroller>
        <svg
          viewBox="0 0 720 200"
          role="img"
          aria-labelledby={`${titleId} ${descId}`}
          className="h-auto w-full min-w-[560px] text-ink"
        >
          <title id={titleId}>The storage and transport chain</title>
          <desc id={descId}>
            A general chain from manufacturer to use: manufacturer storage under recorded
            conditions, a carrier expected to follow labelled conditions, a distributor holding
            material under control, a repacker who is expected to generate new stability data if
            the container type changes, and storage before use, which no held source describes. A
            test result is usually obtained at the start of the chain; the material is used at the
            end. What happened in between is not measured by that result.
          </desc>
          <Arrowhead id={`${id}-arrow`} />
          {links.map((link, index) => {
            const x = 10 + index * (boxW + gap);
            const last = index === links.length - 1;
            return (
              <g key={link.label}>
                <rect
                  x={x}
                  y="60"
                  width={boxW}
                  height="56"
                  rx="5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={last ? 1.2 : 1.5}
                  strokeDasharray={last ? '5 4' : undefined}
                  opacity={last ? 0.7 : 1}
                />
                <text x={x + boxW / 2} y="85" fontSize="12.5" fill="currentColor" textAnchor="middle">
                  {link.label}
                </text>
                <text x={x + boxW / 2} y="102" fontSize="10.5" fill="currentColor" opacity="0.7" textAnchor="middle">
                  {link.sub}
                </text>
                {last ? null : (
                  <line
                    x1={x + boxW}
                    y1="88"
                    x2={x + boxW + gap - 3}
                    y2="88"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    markerEnd={`url(#${id}-arrow)`}
                  />
                )}
              </g>
            );
          })}
          <g fill="currentColor" fontSize="11">
            <path d="M 74 52 L 74 36 L 642 36 L 642 52" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.5" />
            <text x="74" y="28" opacity="0.8">
              test result usually obtained here
            </text>
            <text x="642" y="28" opacity="0.8" textAnchor="end">
              material used here
            </text>
            <text x="360" y="150" textAnchor="middle" opacity="0.75">
              Time, temperature and handling in between are not measured by a result taken at the
            </text>
            <text x="360" y="166" textAnchor="middle" opacity="0.75">
              start. No held source says how much any peptide changes along the way.
            </text>
          </g>
        </svg>
      </FigureScroller>
      <figcaption className="mt-3 max-w-[62ch] text-sm text-slate">
        The first four links follow ICH Q7 for pharmaceutical ingredients. The last is where most
        readers are, and it is the part the held sources say least about.
      </figcaption>
    </figure>
  );
}
