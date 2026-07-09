"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { Icon } from "@/components/icons";
import { EVENT_LABELS, ALL_EVENT_TYPES } from "@/lib/events/types";
import { createRuleAction } from "./actions";

export function NewRuleDialog() {
  const [open, setOpen] = useState(false);
  const [actionType, setActionType] = useState("notify");
  const [withCondition, setWithCondition] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (!withCondition) {
      fd.delete("conditionField");
      fd.delete("conditionOp");
      fd.delete("conditionValue");
    }
    setError(null);
    start(async () => {
      const res = await createRuleAction(fd);
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
        <Icon name="plus" size={16} /> New rule
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New workflow rule"
        description="WHEN an event happens (and a condition holds) THEN run an action."
      >
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Field label="Rule name">
            <Input name="name" placeholder="Alert on large sale" required autoFocus />
          </Field>
          <Field label="WHEN this event">
            <Select name="eventType" defaultValue="SALE_CREATED">
              {ALL_EVENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {EVENT_LABELS[t]}
                </option>
              ))}
            </Select>
          </Field>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={withCondition}
              onChange={(e) => setWithCondition(e.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            Only when a condition holds
          </label>
          {withCondition && (
            <div className="grid grid-cols-[1fr_5rem_1fr] gap-2">
              <Field label="Field">
                <Input name="conditionField" placeholder="amount" defaultValue="amount" />
              </Field>
              <Field label="Op">
                <Select name="conditionOp" defaultValue="gt">
                  <option value="gt">&gt;</option>
                  <option value="gte">≥</option>
                  <option value="lt">&lt;</option>
                  <option value="lte">≤</option>
                  <option value="eq">=</option>
                  <option value="neq">≠</option>
                </Select>
              </Field>
              <Field label="Value">
                <Input name="conditionValue" placeholder="5000" defaultValue="5000" />
              </Field>
            </div>
          )}
          <p className="-mt-2 text-xs text-muted-foreground">
            Fields you can use: <code>amount</code>, <code>total</code>, <code>paymentStatus</code>,{" "}
            <code>source</code>, <code>category</code>, <code>stock</code>.
          </p>

          <Field label="THEN">
            <Select name="actionType" value={actionType} onChange={(e) => setActionType(e.target.value)}>
              <option value="notify">Create a notification</option>
              <option value="flag_expense">Flag the expense</option>
            </Select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Alert title">
              <Input name="title" placeholder="e.g. Large sale" />
            </Field>
            {actionType === "notify" ? (
              <Field label="Severity">
                <Select name="severity" defaultValue="info">
                  <option value="info">Info</option>
                  <option value="success">Success</option>
                  <option value="warning">Warning</option>
                  <option value="error">Error</option>
                </Select>
              </Field>
            ) : (
              <Field label="Flag label">
                <Input name="label" placeholder="Needs review" />
              </Field>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Create rule"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
