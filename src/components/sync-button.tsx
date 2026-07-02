/*
File description:
This client component triggers the authenticated manual sync API and refreshes the current page when the
sync request finishes. It keeps user feedback local to the button without exposing any server secrets.
*/

"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PillButton } from "@/components/ui-controls";

export function SyncButton() {
  const router = useRouter();
  const [isSyncing, setIsSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSync() {
    setIsSyncing(true);
    setMessage(null);

    try {
      const response = await fetch("/api/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ rangeDays: 30 }),
      });
      const payload = (await response.json()) as { message?: string; error?: string };

      setMessage(payload.message || payload.error || "Sync request finished.");
      router.refresh();
    } catch {
      setMessage("Sync request failed. Check server logs for details.");
    } finally {
      setIsSyncing(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1 sm:items-end">
      <PillButton
        type="button"
        onClick={handleSync}
        disabled={isSyncing}
        variant="soft"
        size="md"
      >
        <RefreshCw aria-hidden="true" className={isSyncing ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
        {isSyncing ? "Syncing" : "Sync now"}
      </PillButton>
      {message ? <p className="max-w-72 text-xs leading-5 text-slate-500">{message}</p> : null}
    </div>
  );
}
