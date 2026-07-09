"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { toggleRuleAction } from "./actions";

export function RuleToggle({ ruleId, enabled }: { ruleId: string; enabled: boolean }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  function toggle() {
    start(async () => {
      await toggleRuleAction(ruleId, !enabled);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={toggle}
      disabled={pending}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-60",
        enabled ? "bg-primary" : "bg-muted-foreground/30",
      )}
    >
      <span
        className={cn(
          "inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform",
          enabled ? "translate-x-5" : "translate-x-0.5",
        )}
      />
    </button>
  );
}
