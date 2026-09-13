import { setReadingModeAction } from '@/app/(public)/actions';
import type { ReadingMode } from '@/domain/presentation/reading-mode';

/**
 * The reading-depth switch.
 *
 * A form rather than a client toggle, because the choice decides which database
 * relation the next render reads from. Doing it on the client would mean the
 * practitioner payload — doses included — had already been sent to someone
 * reading in patient mode.
 *
 * It also means the switch works without JavaScript, which matters for a
 * reference that people print and read on hospital machines.
 */
export function ModeSwitch({ mode, path }: { mode: ReadingMode; path: string }) {
  return (
    <div className="no-print">
      <div className="flex items-center gap-2.5">
        <span className="meta-label">Reading depth</span>
        <div
          className="inline-flex items-center rounded-md border border-rule bg-warm-white p-0.5"
          role="group"
          aria-label="Reading depth"
        >
          <ModeButton mode="simple" current={mode} path={path} label="Simple" />
          <ModeButton mode="practitioner" current={mode} path={path} label="Practitioner" />
        </div>
      </div>
      {/*
        The switch used to be two unlabelled words. A reader had to press one to
        find out what it did, and pressing the wrong one on a patient-facing page
        is the press that matters.
      */}
      <p className="mt-1.5 max-w-[30ch] text-right text-xs leading-snug text-slate sm:max-w-none">
        {mode === 'simple'
          ? 'Plain language, no doses. Switch for full evidence.'
          : 'Full evidence, sources and reported regimens.'}
      </p>
    </div>
  );
}

function ModeButton({
  mode,
  current,
  path,
  label,
}: {
  mode: ReadingMode;
  current: ReadingMode;
  path: string;
  label: string;
}) {
  const active = mode === current;
  return (
    <form action={setReadingModeAction}>
      <input type="hidden" name="mode" value={mode} />
      <input type="hidden" name="path" value={path} />
      <button
        type="submit"
        aria-pressed={active}
        className={`rounded-[5px] px-3.5 py-2.5 text-sm transition-colors ${
          active
            ? 'bg-deep-tide font-medium text-warm-white'
            : 'text-slate hover:bg-mist hover:text-deep-tide'
        }`}
      >
        {label}
      </button>
    </form>
  );
}

/** Explains what the current depth is doing, once per page. */
export function ModeExplainer({ mode }: { mode: ReadingMode }) {
  return (
    <p className="text-sm text-slate">
      {mode === 'simple' ? (
        <>
          You are reading in <strong className="font-medium text-deep-tide">simple</strong> mode:
          plain language, evidence strength, and what remains uncertain. Amounts, frequency and
          duration are not shown — those belong in a conversation with a clinician who knows your
          history.
        </>
      ) : (
        <>
          You are reading in <strong className="font-medium text-deep-tide">practitioner</strong>{' '}
          mode: full evidence records, route detail, and source-reported regimens exactly as each
          named source stated them. Nothing here is a recommendation.
        </>
      )}
    </p>
  );
}
