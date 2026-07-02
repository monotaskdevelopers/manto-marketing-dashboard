/*
File description:
This small client component wraps URL-driven filter forms that should feel like toolbar controls.
It submits the form when a select changes while preserving normal Enter-key form submission for search
inputs, so table controls can stay visually minimal without adding visible apply buttons.
*/

"use client";

import type { FormHTMLAttributes, ReactNode } from "react";

export function AutoSubmitForm({
  children,
  submitLabel = "Apply table controls",
  onChange,
  ...props
}: FormHTMLAttributes<HTMLFormElement> & {
  children: ReactNode;
  submitLabel?: string;
}) {
  return (
    <form
      {...props}
      onChange={(event) => {
        onChange?.(event);

        // Select changes are intentional filter choices, so submit immediately like the reference toolbar.
        if (event.target instanceof HTMLSelectElement) {
          event.currentTarget.requestSubmit();
        }
      }}
    >
      {children}
      <button type="submit" className="sr-only" aria-label={submitLabel} />
    </form>
  );
}
