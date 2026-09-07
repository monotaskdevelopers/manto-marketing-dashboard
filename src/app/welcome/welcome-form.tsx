/*
File description:
This client form accepts a one-time Supabase invitation and lets its recipient choose a password.
It reads the invite from the URL fragment only when submitted, removes it from browser history, verifies
it with Supabase, and updates only the verified recipient's account. No invitation, password, or user
information is logged. Public signup and service-role credentials are never used by this component.
*/

"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export function WelcomeForm() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const verifiedUserId = useRef<string | null>(null);
  const inviteToken = useRef<string | null>(null);
  const inFlight = useRef(false);

  async function activate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") || "");
    if (password.length < 12 || password.length > 128 || password !== form.get("confirmation")) {
      setMessage("Use 12 to 128 characters and enter the same password in both boxes.");
      return;
    }

    inFlight.current = true;
    setBusy(true);
    setMessage("");
    try {
      const supabase = createClient();
      if (!verifiedUserId.current) {
        // A normal page visit or email scanner does not consume the invitation.
        inviteToken.current ||= new URLSearchParams(window.location.hash.slice(1)).get("token_hash");
        window.history.replaceState(null, "", window.location.pathname);
        if (!inviteToken.current || !/^[a-f0-9]{32,128}$/i.test(inviteToken.current)) {
          setMessage("Open the private invitation link from your email. Ask the tool owner for a new link if it has expired.");
          return;
        }
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: inviteToken.current,
          type: "invite",
        });
        if (error || !data.user || !data.session) {
          setMessage("This invitation has expired or was already used. Ask the tool owner for a new link.");
          return;
        }
        verifiedUserId.current = data.user.id;
        inviteToken.current = null;
        console.info("[account-setup] Invitation verified.");
      }

      // Recheck identity in case another tab switched the browser's signed-in account.
      const { data: current, error: identityError } = await supabase.auth.getUser();
      if (identityError || current.user?.id !== verifiedUserId.current) {
        setMessage("Your sign-in changed. Ask the tool owner for a new invitation.");
        return;
      }
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setMessage("Your password could not be saved. Try a longer, unique password or ask the tool owner for help.");
        return;
      }
      console.info("[account-setup] Password saved.");
      // Full navigation lets the server read the fresh Supabase session cookies.
      window.location.replace("/klaviyo/campaigns");
    } catch {
      setMessage("We could not connect. Check your internet connection and try again.");
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <form onSubmit={activate} className="mt-6 space-y-4">
      <label className="block text-sm font-medium text-slate-700">
        New password
        <input name="password" type="password" autoComplete="new-password" required minLength={12} maxLength={128}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Enter it again
        <input name="confirmation" type="password" autoComplete="new-password" required minLength={12} maxLength={128}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" />
      </label>
      <p className="text-sm text-slate-500">Use at least 12 characters. Do not reuse a password from another account.</p>
      {message && <p role="alert" className="text-sm text-rose-700">{message}</p>}
      <button disabled={busy} type="submit" className="w-full rounded-md bg-teal-700 px-4 py-3 font-medium text-white disabled:opacity-50">
        {busy ? "Setting up your account…" : "Set password and open dashboard"}
      </button>
      <Link href="/login" className="block text-center text-sm text-teal-700">Already set up? Sign in</Link>
    </form>
  );
}
