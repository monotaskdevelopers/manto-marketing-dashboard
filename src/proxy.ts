/*
File description:
This Next.js proxy wires Supabase session refresh into requests that can touch the authenticated app.
Static assets are excluded so the proxy stays lightweight and does not slow down framework or image files.
*/

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isDemoMode } from "@/lib/env";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  if (isDemoMode()) {
    return NextResponse.next();
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
