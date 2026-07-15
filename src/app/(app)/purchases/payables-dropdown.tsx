"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Field, Input } from "@/components/ui/input";
import { Icon } from "@/components/icons";
import { cn, money, round2 } from "@/lib/utils";
import { bulkPayVendorAction } from "./actions";

export type VendorPayable = {
  partyId: string | null;
  partyName: string;
  purchases: { id: string; ref: string; due: number }[];
  totalDue: number;
};

export function PayablesDropdown({
  vendors,
  currency,
}: {
  vendors: VendorPayable[];
  currency: string;
}) {
  const [open, setOpen] = useState(false);
  const [payingVendor, setPayingVendor] = useState<VendorPayable | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  const totalPayable = round2(vendors.reduce((a, v) => a + v.totalDue, 0));

  function openPayModal(vendor: VendorPayable) {
    setPayingVendor(vendor);
    setError(null);
    setOpen(false);
  }

  function closePayModal() {
    setPayingVendor(null);
    setError(null);
  }

  function submitBulkPay(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!payingVendor) return;
    const fd = new FormData(e.currentTarget);
    setError(null);
    start(async () => {
      const res = await bulkPayVendorAction(fd);
      if (res?.error) {
        setError(res.error);
      } else {
        closePayModal();
        router.refresh();
      }
    });
  }

  if (vendors.length === 0) return null;

  return (
    <>
      <div ref={containerRef} className="relative">
        {/* Trigger button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setOpen((o) => !o)}
          className="gap-1.5"
          aria-haspopup="true"
          aria-expanded={open}
          id="payables-dropdown-trigger"
        >
          <Icon name="wallet" size={15} />
          Payables
          <span className="rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
            {money(totalPayable, currency)}
          </span>
          <Icon
            name="chevronDown"
            size={14}
            className={cn("transition-transform duration-200", open && "rotate-180")}
          />
        </Button>

        {/* Dropdown panel */}
        {open && (
          <div
            role="menu"
            className="absolute right-0 top-full z-50 mt-2 w-96 rounded-xl border border-border bg-card shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div>
                <p className="text-sm font-semibold">Outstanding Payables</p>
                <p className="text-xs text-muted-foreground">
                  {vendors.length} vendor{vendors.length !== 1 ? "s" : ""} · grouped by supplier
                </p>
              </div>
              <span className="text-sm font-bold tabular-nums">
                {money(totalPayable, currency)}
              </span>
            </div>

            {/* Vendor groups */}
            <div className="max-h-80 divide-y divide-border overflow-y-auto">
              {vendors.map((vendor) => (
                <div
                  key={vendor.partyId ?? "__none__"}
                  className="px-4 py-3 transition-colors hover:bg-muted/40"
                >
                  {/* Vendor row */}
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{vendor.partyName}</p>
                      <p className="text-xs text-muted-foreground">
                        {vendor.purchases.length} unpaid bill
                        {vendor.purchases.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold tabular-nums">
                      {money(vendor.totalDue, currency)}
                    </span>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => openPayModal(vendor)}
                      id={`pay-vendor-${vendor.partyId ?? "none"}`}
                    >
                      Pay All
                    </Button>
                  </div>

                  {/* Individual bill breakdown */}
                  <div className="mt-2 space-y-0.5 pl-0">
                    {vendor.purchases.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between text-xs text-muted-foreground"
                      >
                        <span className="font-mono">{p.ref}</span>
                        <span className="tabular-nums">{money(p.due, currency)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bulk payment modal */}
      {payingVendor && (
        <Modal
          open
          onClose={closePayModal}
          title={`Pay ${payingVendor.partyName}`}
          description={`${payingVendor.purchases.length} bill${payingVendor.purchases.length !== 1 ? "s" : ""} · Total outstanding ${money(payingVendor.totalDue, currency)}`}
          className="max-w-md"
        >
          <form onSubmit={submitBulkPay} className="flex flex-col gap-4">
            {/* Hidden: purchase IDs + individual dues for server-side distribution */}
            <input
              type="hidden"
              name="purchasesData"
              value={JSON.stringify(
                payingVendor.purchases.map((p) => ({ id: p.id, due: p.due })),
              )}
            />

            {/* Bill breakdown */}
            <div className="divide-y divide-border rounded-lg border border-border">
              {payingVendor.purchases.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between px-3 py-2 text-sm"
                >
                  <span className="font-mono text-muted-foreground">{p.ref}</span>
                  <span className="tabular-nums font-medium">{money(p.due, currency)}</span>
                </div>
              ))}
              {/* Total row */}
              <div className="flex items-center justify-between bg-muted/50 px-3 py-2 text-sm font-semibold">
                <span>Total due</span>
                <span className="tabular-nums">{money(payingVendor.totalDue, currency)}</span>
              </div>
            </div>

            <Field label="Amount to pay">
              <Input
                name="amount"
                type="number"
                min={0.01}
                step="0.01"
                defaultValue={payingVendor.totalDue}
                autoFocus
                id="bulk-pay-amount"
              />
            </Field>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={closePayModal}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={pending} id="confirm-bulk-pay">
                {pending ? "Processing…" : "Confirm payment"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
