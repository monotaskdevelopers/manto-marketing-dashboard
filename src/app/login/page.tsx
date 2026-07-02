/*
File description:
This page renders the internal sign-in screen and redirects already-authenticated users to `/dashboard`.
It is intentionally simple because access control is handled by Supabase Auth and protected server routes.
*/

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "@/app/login/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  const resolvedSearchParams = await searchParams;
  const error = Array.isArray(resolvedSearchParams.error)
    ? resolvedSearchParams.error[0]
    : resolvedSearchParams.error;

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/70">
        <div>
          <p className="text-sm font-semibold text-teal-700">Internal reporting</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal text-slate-950">
            Sign in to Marketing Reports
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Access is limited to internal users configured in Supabase Auth.
          </p>
        </div>
        <LoginForm error={error} />
      </div>
    </main>
  );
}
