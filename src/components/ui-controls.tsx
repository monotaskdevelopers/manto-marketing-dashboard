/*
File description:
This file contains the small form and button primitives used by the dashboard. The controls wrap native
HTML inputs and selects with consistent pill-shaped styling, focus states, and micro-interactions without
adding a heavy UI dependency or replacing accessible browser behavior.
*/

import { ChevronDown } from "lucide-react";
import type { ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes } from "react";
import { clsx } from "clsx";

type ButtonVariant = "primary" | "secondary" | "soft" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    "border border-slate-950 bg-slate-950 text-white hover:bg-slate-800 disabled:border-slate-300 disabled:bg-slate-300 disabled:text-slate-500",
  secondary:
    "border border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 disabled:text-slate-400",
  soft:
    "border border-teal-100 bg-teal-50 text-teal-800 hover:border-teal-200 hover:bg-teal-100 disabled:text-teal-300",
  ghost:
    "border border-transparent bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-950 disabled:text-slate-400",
  danger:
    "border border-rose-200 bg-white text-rose-700 hover:bg-rose-50 disabled:text-rose-300",
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: "min-h-9 px-3 py-1.5 text-xs",
  md: "min-h-10 px-4 py-2 text-sm",
  lg: "min-h-11 px-5 py-2.5 text-sm",
};

export const inputControlClassName =
  "h-11 w-full rounded-full border border-slate-200 bg-white px-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-teal-500 focus:ring-4 focus:ring-teal-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500";

export function buttonClassName({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}) {
  return clsx(
    "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition duration-150 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none",
    buttonVariants[variant],
    buttonSizes[size],
    className,
  );
}

export function PillButton({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <button className={buttonClassName({ variant, size, className })} {...props}>
      {children}
    </button>
  );
}

export function SelectControl({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className="relative block">
      <select className={clsx(inputControlClassName, "appearance-none pr-10", className)} {...props}>
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
      />
    </span>
  );
}

export function DateControl({
  className,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  return <input type="date" className={clsx(inputControlClassName, className)} {...props} />;
}

export function TextControl({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={clsx(inputControlClassName, className)} {...props} />;
}
