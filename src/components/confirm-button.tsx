"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ConfirmButton({
  action,
  title,
  message,
  confirmLabel = "Confirm",
  children,
  className,
  danger,
}: {
  action: () => Promise<{ error?: string }>;
  title: string;
  message: string;
  confirmLabel?: string;
  children: React.ReactNode;
  className?: string;
  danger?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function run() {
    setError(null);
    start(async () => {
      const res = await action();
      if (res?.error) setError(res.error);
      else {
        setOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn("inline-flex items-center gap-1.5", className)}
      >
        {children}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={title} className="max-w-md">
        <p className="text-sm text-muted-foreground">{message}</p>
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button variant={danger ? "destructive" : "primary"} onClick={run} disabled={pending}>
            {pending ? "Working…" : confirmLabel}
          </Button>
        </div>
      </Modal>
    </>
  );
}
