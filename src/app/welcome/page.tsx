/*
File description:
This public onboarding page hosts the invitation form for approved internal users. Invitation secrets
arrive in the URL fragment, so the server never receives them in request paths or query logs. The page
contains no account data and prevents indexing and referrer sharing.
*/

import type { Metadata } from "next";
import { WelcomeForm } from "./welcome-form";

export const metadata: Metadata = {
  title: "Set up your Marketing Reports account",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function WelcomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-lg">
        <h1 className="text-2xl font-semibold text-slate-950">Welcome to Marketing Reports</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Choose your own password to activate your invited account. Keep your invitation link private.
        </p>
        <WelcomeForm />
      </section>
    </main>
  );
}
