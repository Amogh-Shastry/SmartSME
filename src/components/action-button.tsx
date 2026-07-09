"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

// Fire-and-refresh button for low-stakes server actions (no confirmation).
export function ActionButton({
  action,
  children,
  className,
  title,
}: {
  action: () => Promise<{ error?: string }>;
  children: React.ReactNode;
  className?: string;
  title?: string;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      type="button"
      title={title}
      disabled={pending}
      onClick={() => start(async () => { await action(); router.refresh(); })}
      className={cn("inline-flex items-center gap-1.5 disabled:opacity-50", className)}
    >
      {children}
    </button>
  );
}
