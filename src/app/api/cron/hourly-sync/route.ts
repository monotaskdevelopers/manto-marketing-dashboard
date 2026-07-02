/*
File description:
This route is the hourly Vercel Cron entrypoint for refreshing Shopify and Klaviyo reporting data.
It requires a bearer CRON_SECRET, runs a bounded sync window, and returns sanitized sync metadata.
*/

import { NextResponse, type NextRequest } from "next/server";
import { getCronSecret } from "@/lib/env";
import { runSync } from "@/lib/sync/run-sync";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  let expectedSecret: string;

  try {
    expectedSecret = getCronSecret();
  } catch {
    return NextResponse.json({ ok: false, error: "Cron is not configured." }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization");

  if (authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const result = await runSync({
    triggeredBy: "cron",
    rangeDays: 30,
  });

  return NextResponse.json({
    ok: result.status !== "failed",
    syncRunId: result.syncRunId,
    status: result.status,
    message: result.message,
  });
}
