import type { ComponentProps, ReactNode } from "react";
import { clsx } from "clsx";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={clsx("input", className)} {...props} />;
}
export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={clsx("input textarea", className)} {...props} />;
}
export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={clsx("input", className)} {...props} />;
}
export function Checkbox({ className, ...props }: Omit<ComponentProps<"input">, "type">) {
  return <input type="checkbox" className={clsx("checkbox", className)} {...props} />;
}
export function FormField({ id, label, hint, error, children }: {
  id: string; label: string; hint?: string; error?: string;
  children: (props: { id: string; "aria-describedby"?: string; "aria-invalid": boolean }) => ReactNode;
}) {
  const description = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;
  return <div className="form-field">
    <label htmlFor={id}>{label}</label>
    {children({ id, "aria-describedby": description, "aria-invalid": Boolean(error) })}
    {hint && <p className="field-hint" id={`${id}-hint`}>{hint}</p>}
    {error && <p className="field-error" role="alert" id={`${id}-error`}>{error}</p>}
  </div>;
}
