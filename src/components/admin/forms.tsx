'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import type { ReactNode } from 'react';
import type { ActionResult } from '@/server/editorial/mutations';

export type FormAction = (
  state: ActionResult | null,
  formData: FormData,
) => Promise<ActionResult | null>;

export function Form({
  action,
  children,
  submitLabel,
  successMessage = 'Saved.',
}: {
  action: FormAction;
  children: ReactNode;
  submitLabel: string;
  successMessage?: string;
}) {
  const [state, formAction] = useActionState(action, null);

  return (
    <form action={formAction} className="space-y-4">
      {children}

      {state && !state.ok ? (
        <div
          role="alert"
          className="rounded border border-red-700 bg-red-50 px-3 py-2 text-sm text-red-900"
        >
          <p className="font-medium">{state.message}</p>
          {state.fieldErrors ? (
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {Object.entries(state.fieldErrors).flatMap(([field, messages]) =>
                messages.map((message) => <li key={`${field}-${message}`}>{message}</li>),
              )}
            </ul>
          ) : null}
        </div>
      ) : null}

      {state?.ok ? (
        <p
          role="status"
          className="rounded border border-tide-teal bg-sea-glass px-3 py-2 text-sm text-deep-tide"
        >
          {successMessage}
        </p>
      ) : null}

      <SubmitButton label={submitLabel} />
    </form>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded bg-deep-tide px-4 py-2 text-sm font-medium text-warm-white disabled:opacity-60"
    >
      {pending ? 'Working…' : label}
    </button>
  );
}

export function Field({
  label,
  name,
  hint,
  children,
  required,
}: {
  label: string;
  name: string;
  hint?: string | undefined;
  children?: ReactNode;
  required?: boolean | undefined;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-ink">
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      {hint ? (
        <p id={`${name}-hint`} className="mt-0.5 text-xs text-slate">
          {hint}
        </p>
      ) : null}
      <div className="mt-1">{children}</div>
    </div>
  );
}

const inputClass =
  'w-full rounded border border-rule bg-warm-white px-3 py-2 text-sm text-ink focus:border-tide-teal';

export function TextInput({
  name,
  label,
  hint,
  defaultValue,
  required,
  placeholder,
}: {
  name: string;
  label: string;
  hint?: string;
  defaultValue?: string | null;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <Field label={label} name={name} hint={hint} required={required}>
      <input
        id={name}
        name={name}
        defaultValue={defaultValue ?? ''}
        required={required}
        placeholder={placeholder}
        aria-describedby={hint ? `${name}-hint` : undefined}
        className={inputClass}
      />
    </Field>
  );
}

export function TextArea({
  name,
  label,
  hint,
  defaultValue,
  rows = 4,
  required,
}: {
  name: string;
  label: string;
  hint?: string;
  defaultValue?: string | null;
  rows?: number;
  required?: boolean;
}) {
  return (
    <Field label={label} name={name} hint={hint} required={required}>
      <textarea
        id={name}
        name={name}
        rows={rows}
        required={required}
        defaultValue={defaultValue ?? ''}
        aria-describedby={hint ? `${name}-hint` : undefined}
        className={inputClass}
      />
    </Field>
  );
}

export interface SelectOption {
  value: string;
  label: string;
  group?: string;
}

export function Select({
  name,
  label,
  hint,
  options,
  defaultValue,
  required,
  includeBlank,
}: {
  name: string;
  label: string;
  hint?: string;
  options: readonly SelectOption[];
  defaultValue?: string | null;
  required?: boolean;
  includeBlank?: string;
}) {
  const groups = [...new Set(options.map((option) => option.group).filter(Boolean))] as string[];

  return (
    <Field label={label} name={name} hint={hint} required={required}>
      <select
        id={name}
        name={name}
        defaultValue={defaultValue ?? ''}
        required={required}
        aria-describedby={hint ? `${name}-hint` : undefined}
        className={inputClass}
      >
        {includeBlank ? <option value="">{includeBlank}</option> : null}
        {groups.length > 0
          ? groups.map((group) => (
              <optgroup key={group} label={group}>
                {options
                  .filter((option) => option.group === group)
                  .map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
              </optgroup>
            ))
          : options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
      </select>
    </Field>
  );
}

export function Checkbox({
  name,
  label,
  hint,
  defaultChecked,
}: {
  name: string;
  label: string;
  hint?: string;
  defaultChecked?: boolean;
}) {
  return (
    <div className="flex items-start gap-2">
      <input
        id={name}
        name={name}
        type="checkbox"
        defaultChecked={defaultChecked}
        className="mt-1"
        aria-describedby={hint ? `${name}-hint` : undefined}
      />
      <div>
        <label htmlFor={name} className="text-sm font-medium text-ink">
          {label}
        </label>
        {hint ? (
          <p id={`${name}-hint`} className="text-xs text-slate">
            {hint}
          </p>
        ) : null}
      </div>
    </div>
  );
}
