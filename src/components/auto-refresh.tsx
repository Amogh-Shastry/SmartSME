"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Periodically re-fetches server components so event-driven changes (processed
// by the background worker) appear without a manual reload.
export function AutoRefresh({ intervalMs = 3000 }: { intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);
  return null;
}
