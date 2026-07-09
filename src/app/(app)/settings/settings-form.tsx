"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Icon } from "@/components/icons";
import type { Business } from "@/db/schema";
import { updateBusinessAction } from "./actions";

export function SettingsForm({ business }: { business: Business }) {
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setError(null);
    setSaved(false);
    start(async () => {
      const res = await updateBusinessAction(fd);
      if (res.error) setError(res.error);
      else {
        setSaved(true);
        router.refresh();
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Business profile</CardTitle>
        <CardDescription>Used on invoices and across the app.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Field label="Business name">
            <Input name="name" defaultValue={business.name} required />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="GSTIN">
              <Input name="gstNumber" defaultValue={business.gstNumber ?? ""} placeholder="29ABCDE1234F1Z5" />
            </Field>
            <Field label="PAN">
              <Input name="panNumber" defaultValue={business.panNumber ?? ""} placeholder="ABCDE1234F" />
            </Field>
          </div>
          <Field label="Address">
            <Textarea name="address" defaultValue={business.address ?? ""} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Phone">
              <Input name="phone" defaultValue={business.phone ?? ""} />
            </Field>
            <Field label="Email">
              <Input name="email" type="email" defaultValue={business.email ?? ""} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Currency">
              <Select name="currency" defaultValue={business.currency}>
                <option value="INR">₹ INR</option>
                <option value="USD">$ USD</option>
                <option value="EUR">€ EUR</option>
                <option value="GBP">£ GBP</option>
              </Select>
            </Field>
            <Field label="Tax rate (%)">
              <Input name="taxRate" type="number" min={0} step="0.5" defaultValue={business.taxRate} />
            </Field>
            <Field label="Invoice prefix">
              <Input name="invoicePrefix" defaultValue={business.invoicePrefix} />
            </Field>
          </div>

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save changes"}
            </Button>
            {saved && (
              <span className="inline-flex items-center gap-1 text-sm text-success">
                <Icon name="check" size={16} /> Saved
              </span>
            )}
            {error && <span className="text-sm text-destructive">{error}</span>}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
