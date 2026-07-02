/*
File description:
This file contains server actions for signing internal users in and out with Supabase Auth. The actions
centralize auth mutations so forms do not need client-side access to tokens or sensitive credentials.
*/

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isDemoMode } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export async function signInAction(formData: FormData) {
  if (isDemoMode()) {
    redirect("/dashboard");
  }

  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  if (!email || !password) {
    redirect("/login?error=missing_credentials");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect("/login?error=invalid_login");
  }

  revalidatePath("/dashboard", "layout");
  redirect("/dashboard");
}

export async function signOutAction() {
  if (isDemoMode()) {
    redirect("/login");
  }

  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/dashboard", "layout");
  redirect("/login");
}
