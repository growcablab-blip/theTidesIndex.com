import type { ReactNode } from 'react';

/**
 * Editorial interface primitives.
 *
 * The admin surface is deliberately plain: dense, legible, and unstyled beyond
 * what makes status and hierarchy readable. Visual design effort belongs to the
 * public reference experience.
 */

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-wrap items-start justify-between gap-4 border-b border-rule pb-4">
      <div>
        <h1 className="font-serif text-2xl text-ink">{title}</h1>
        {description ? <p className="mt-1 max-w-2xl text-sm text-slate">{description}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function Section({
  title,
  description,
  children,
  actions,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className="mb-10">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-serif text-lg text-deep-tide">{title}</h2>
        {actions}
      </div>
      {description ? <p className="mb-3 max-w-2xl text-sm text-slate">{description}</p> : null}
      {children}
    </section>
  );
}

/**
 * Status is conveyed by the word first and colour second. Never rely on colour
 * alone (DESIGN_SYSTEM.md).
 */
const STATUS_STYLES: Readonly<Record<string, string>> = {
  published: 'border-tide-teal bg-sea-glass text-deep-tide',
  needs_update: 'border-amber-600 bg-amber-50 text-amber-900',
  rejected: 'border-red-700 bg-red-50 text-red-900',
  superseded: 'border-slate bg-mist text-slate',
};

export const STATUS_LABELS: Readonly<Record<string, string>> = {
  unreviewed: 'Unreviewed',
  captured: 'Captured',
  source_checked: 'Source checked',
  primary_source_checked: 'Primary source checked',
  scientific_reviewed: 'Scientific review done',
  clinical_reviewed: 'Clinical review done',
  compliance_reviewed: 'Compliance review done',
  published: 'Published',
  needs_update: 'Needs update',
  superseded: 'Superseded',
  rejected: 'Rejected',
};

export function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? 'border-rule bg-mist text-slate';
  return (
    <span
      className={`inline-block rounded border px-2 py-0.5 text-xs font-medium whitespace-nowrap ${style}`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

const EVIDENCE_CLASS_LABELS: Readonly<Record<string, string>> = {
  human: 'Human',
  preclinical: 'Preclinical',
  reference_opinion: 'Reference / opinion',
};

export function EvidenceClassBadge({ evidenceClass }: { evidenceClass: string }) {
  return (
    <span className="inline-block rounded border border-rule bg-mist px-2 py-0.5 text-xs whitespace-nowrap text-deep-tide">
      {EVIDENCE_CLASS_LABELS[evidenceClass] ?? evidenceClass}
    </span>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="rounded border border-dashed border-rule bg-mist px-4 py-6 text-sm text-slate">
      {children}
    </p>
  );
}

export function Table({ head, children }: { head: readonly string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded border border-rule">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-mist text-left">
            {head.map((label) => (
              <th key={label} className="border-b border-rule px-3 py-2 font-medium text-deep-tide">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Row({ children }: { children: ReactNode }) {
  return <tr className="border-b border-rule last:border-b-0 align-top">{children}</tr>;
}

export function Cell({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <td className={`px-3 py-2 ${className}`}>{children}</td>;
}

/** A value the platform does not have. Shown as an absence, never filled in. */
export function NotRecorded({ what }: { what: string }) {
  return (
    <span className="text-sm text-slate italic">
      Not recorded — {what} has not been captured from a source.
    </span>
  );
}
