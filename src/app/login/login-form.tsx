/*
File description:
This client-adjacent login form renders the email/password fields for Supabase Auth while submitting to a
server action. It keeps the form simple for internal users and avoids client-side token handling.
*/

import { Lock, LogIn, Mail } from "lucide-react";
import { signInAction } from "@/app/auth/actions";

export function LoginForm({
  error,
}: {
  error?: string;
}) {
  return (
    <form action={signInAction} className="mt-6 space-y-4">
      {error ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error === "missing_credentials"
            ? "Enter both email and password."
            : "The email or password was not accepted."}
        </div>
      ) : null}
      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-700" htmlFor="email">
          Email
        </label>
        <div className="relative">
          <Mail aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="h-11 w-full rounded-md border border-slate-300 bg-white pl-10 pr-3 text-sm text-slate-950"
          />
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-700" htmlFor="password">
          Password
        </label>
        <div className="relative">
          <Lock aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="h-11 w-full rounded-md border border-slate-300 bg-white pl-10 pr-3 text-sm text-slate-950"
          />
        </div>
      </div>
      <button
        type="submit"
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800"
      >
        <LogIn aria-hidden="true" className="h-4 w-4" />
        Sign in
      </button>
    </form>
  );
}
