"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { Icon } from "@/components/icons";
import { createExpenseAction } from "./actions";

const CATEGORIES = ["Rent", "Utilities", "Salary", "Transport", "Supplies", "Marketing", "Maintenance", "General"];

export function NewExpenseDialog() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setError(null);
    start(async () => {
      const res = await createExpenseAction(fd);
      if (res.error) setError(res.error);
      else {
        setOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Icon name="plus" size={16} /> New expense
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="New expense">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              <Select name="category" defaultValue="General">
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Amount ₹">
              <Input name="amount" type="number" min={0} step="0.01" required autoFocus />
            </Field>
          </div>
          <Field label="Description">
            <Input name="description" placeholder="Electricity bill for March" required />
          </Field>
          <Field label="Date" hint="Defaults to today.">
            <Input name="date" type="date" />
          </Field>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Add expense"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
