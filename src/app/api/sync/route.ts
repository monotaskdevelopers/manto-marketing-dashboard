/*
File description:
This route lets an authenticated internal user manually refresh Shopify and Klaviyo reporting data.
It rechecks Supabase auth on the server and caps the requested sync range to reduce platform API risk.
*/

import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { runSync } from "@/lib/sync/run-sync";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  let rangeDays = 30;

  try {
    const body = (await request.json()) as { rangeDays?: unknown };
    const requestedRange = Number(body.rangeDays);

    if (Number.isFinite(requestedRange)) {
      rangeDays = Math.min(Math.max(Math.floor(requestedRange), 1), 90);
    }
  } catch {
    rangeDays = 30;
  }

  const result = await runSync({
    triggeredBy: "manual",
    rangeDays,
    userId: user.id,
  });

  return NextResponse.json(
    {
      ok: result.status !== "failed",
      syncRunId: result.syncRunId,
      status: result.status,
      message: result.message,
    },
    { status: result.status === "failed" ? 500 : 200 },
  );
}
