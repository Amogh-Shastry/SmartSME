"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { money } from "@/lib/utils";

export function RecordPaymentButton({
  action,
  idName,
  idValue,
  due,
  currency,
  label = "Record payment",
  variant = "outline",
}: {
  action: (formData: FormData) => Promise<{ error?: string }>;
  idName: string;
  idValue: string;
  due: number;
  currency: string;
  label?: string;
  variant?: "outline" | "primary" | "ghost";
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setError(null);
    start(async () => {
      const res = await action(fd);
      if (res?.error) setError(res.error);
      else {
        setOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <>
      <Button variant={variant} size="sm" onClick={() => setOpen(true)}>
        {label}
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Record payment" className="max-w-md">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Outstanding: <span className="font-medium text-foreground">{money(due, currency)}</span>
          </p>
          <input type="hidden" name={idName} value={idValue} />
          <Field label="Amount">
            <Input name="amount" type="number" min={0} step="0.01" defaultValue={due} autoFocus />
          </Field>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save payment"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
