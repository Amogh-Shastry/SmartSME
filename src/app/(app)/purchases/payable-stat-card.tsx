"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Icon } from "@/components/icons";
import { money } from "@/lib/utils";
import { bulkPayVendorAction } from "./actions";
import type { VendorPayable } from "./payables-dropdown";

export function PayableStatCard({
  payable,
  vendors,
  currency,
}: {
  payable: number;
  vendors: VendorPayable[];
  currency: string;
}) {
  const [selectedVendor, setSelectedVendor] = useState<VendorPayable | null>(null);
  const [payMode, setPayMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function openVendorDetail(vendor: VendorPayable) {
    setSelectedVendor(vendor);
    setPayMode(false);
    setError(null);
  }

  function closeModal() {
    setSelectedVendor(null);
    setPayMode(false);
    setError(null);
  }

  function submitBulkPay(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedVendor) return;
    const fd = new FormData(e.currentTarget);
    setError(null);
    start(async () => {
      const res = await bulkPayVendorAction(fd);
      if (res?.error) {
        setError(res.error);
      } else {
        closeModal();
        router.refresh();
      }
    });
  }

  return (
    <>
      <Card className="flex h-56 flex-col overflow-hidden">
        {/* ── Stat header ── */}
        <div className="flex shrink-0 items-start justify-between gap-3 p-5 pb-3">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">Payables</p>
            <p className="mt-1.5 truncate text-2xl font-semibold tracking-tight">
              {money(payable, currency)}
            </p>
          </div>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-warning/15 text-warning">
            <Icon name="wallet" size={20} />
          </span>
        </div>

        {/* ── Compact vendor list: Name | Amount only ── */}
        <div className="flex-1 overflow-y-auto border-t border-border">
          {vendors.length === 0 ? (
            <p className="px-5 py-3 text-xs text-muted-foreground">All bills settled.</p>
          ) : (
            vendors.map((vendor) => (
              <button
                key={vendor.partyId ?? "__none__"}
                onClick={() => openVendorDetail(vendor)}
                id={`vendor-payable-${vendor.partyId ?? "none"}`}
                className="flex w-full items-center justify-between border-b border-border px-5 py-2.5 text-left transition-colors hover:bg-muted/60 last:border-b-0 group"
              >
                <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground group-hover:text-foreground">
                  {vendor.partyName}
                </p>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-semibold tabular-nums text-foreground">
                    {money(vendor.totalDue, currency)}
                  </span>
                  <Icon name="chevronRight" size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>
            ))
          )}
        </div>
      </Card>

      {/* ── Vendor detail / pay modal ── */}
      {selectedVendor && (
        <Modal
          open
          onClose={closeModal}
          title={selectedVendor.partyName}
          description={`${selectedVendor.purchases.length} outstanding invoice${selectedVendor.purchases.length !== 1 ? "s" : ""}`}
          className="max-w-md"
        >
          <div className="flex flex-col gap-4">
            {/* Invoice breakup table */}
            <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
              <div className="flex items-center justify-between bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <span>Invoice</span>
                <span>Amount Due</span>
              </div>
              {selectedVendor.purchases.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between px-3 py-2.5 text-sm"
                >
                  <span className="font-mono text-muted-foreground">{p.ref}</span>
                  <span className="tabular-nums font-medium">{money(p.due, currency)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between bg-muted/50 px-3 py-2.5 text-sm font-semibold">
                <span>Total due</span>
                <span className="tabular-nums text-warning">{money(selectedVendor.totalDue, currency)}</span>
              </div>
            </div>

            {/* Pay form (toggled) */}
            {!payMode ? (
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={closeModal}>
                  Close
                </Button>
                <Button
                  type="button"
                  onClick={() => setPayMode(true)}
                  id={`pay-vendor-${selectedVendor.partyId ?? "none"}`}
                >
                  Pay All
                </Button>
              </div>
            ) : (
              <form onSubmit={submitBulkPay} className="flex flex-col gap-3">
                <input
                  type="hidden"
                  name="purchasesData"
                  value={JSON.stringify(
                    selectedVendor.purchases.map((p) => ({ id: p.id, due: p.due })),
                  )}
                />
                <Field label="Amount to pay">
                  <Input
                    name="amount"
                    type="number"
                    min={0.01}
                    step="0.01"
                    defaultValue={selectedVendor.totalDue}
                    autoFocus
                    id="bulk-pay-amount"
                  />
                </Field>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setPayMode(false)}
                    disabled={pending}
                  >
                    Back
                  </Button>
                  <Button type="submit" disabled={pending} id="confirm-bulk-pay">
                    {pending ? "Processing…" : "Confirm payment"}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
