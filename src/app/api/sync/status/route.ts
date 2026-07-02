/*
File description:
This route returns the latest sanitized sync run metadata for authenticated dashboard users. It supports
the sync status indicator without exposing external API payloads, tokens, or detailed stack traces.
*/

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getLatestSyncRun } from "@/lib/data/dashboard";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const syncRun = await getLatestSyncRun();

  return NextResponse.json({
    ok: true,
    syncRun,
  });
}
