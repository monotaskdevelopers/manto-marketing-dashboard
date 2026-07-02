/*
File description:
This client-adjacent login form renders the email/password fields for Supabase Auth while submitting to a
server action. It keeps the form simple for internal users and avoids client-side token handling.
*/

import { signInAction } from "@/app/auth/actions";
import { PillButton, TextControl } from "@/components/ui-controls";

export function LoginForm({
  error,
}: {
  error?: string;
}) {
  return (
    <form action={signInAction} className="mt-6 space-y-4">
      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error === "missing_credentials"
            ? "Enter both email and password."
            : "The email or password was not accepted."}
        </div>
      ) : null}
      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-700" htmlFor="email">
          Email
        </label>
        <TextControl id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-700" htmlFor="password">
          Password
        </label>
        <TextControl id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      <PillButton type="submit" className="w-full" size="lg">
        Sign in
      </PillButton>
    </form>
  );
}
