"use client";

import { Fragment, useState } from "react";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/icons";
import { ConfirmButton } from "@/components/confirm-button";
import { buttonVariants } from "@/components/ui/button";
import { cn, money, formatDate, round2 } from "@/lib/utils";
import { PartyDialog } from "./party-dialogs";
import { deletePartyAction, settlePartyAction } from "./actions";

export interface OutstandingDoc {
  id: string;
  ref: string;
  date: Date;
  total: number;
  due: number;
}

export interface PartyRow {
  id: string;
  type: string;
  name: string;
  phone: string | null;
  email: string | null;
  gstNumber: string | null;
  address: string | null;
  balance: number;
  outstanding: OutstandingDoc[];
}

export function PartiesTable({ rows, currency }: { rows: PartyRow[]; currency: string }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <Table>
      <THead>
        <TR className="hover:bg-transparent">
          <TH>Name</TH>
          <TH>Type</TH>
          <TH>Contact</TH>
          <TH>GSTIN</TH>
          <TH className="text-right">Balance</TH>
          <TH className="text-right">Actions</TH>
        </TR>
      </THead>
      <TBody>
        {rows.map((p) => {
          const isCustomer = p.type === "customer";
          const dueSum = round2(p.outstanding.reduce((a, d) => a + d.due, 0));
          const canSettle = p.outstanding.length > 0 && dueSum > 0;
          const isOpen = expanded.has(p.id);

          return (
            <Fragment key={p.id}>
              <TR>
                <TD>
                  <div className="flex items-center gap-2">
                    {canSettle ? (
                      <button
                        type="button"
                        onClick={() => toggle(p.id)}
                        aria-label={isOpen ? "Hide bills" : "Show bills"}
                        aria-expanded={isOpen}
                        className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <Icon name="chevronRight" size={15} className={cn("transition-transform", isOpen && "rotate-90")} />
                      </button>
                    ) : (
                      <span className="inline-block h-6 w-6 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="font-medium">{p.name}</div>
                      {p.address && <div className="max-w-xs truncate text-xs text-muted-foreground">{p.address}</div>}
                    </div>
                  </div>
                </TD>
                <TD>
                  <Badge tone={isCustomer ? "info" : "primary"}>{isCustomer ? "Customer" : "Supplier"}</Badge>
                </TD>
                <TD className="text-muted-foreground">{p.phone ?? p.email ?? "-"}</TD>
                <TD className="text-muted-foreground">{p.gstNumber ?? "-"}</TD>
                <TD className="text-right">
                  <span
                    className={cn(
                      "tabular-nums font-medium",
                      p.balance > 0 ? (isCustomer ? "text-success" : "text-warning") : "text-muted-foreground",
                    )}
                  >
                    {money(p.balance, currency)}
                  </span>
                  {canSettle && p.outstanding.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      {p.outstanding.length} open {isCustomer ? "invoice" : "bill"}
                      {p.outstanding.length === 1 ? "" : "s"}
                    </div>
                  )}
                </TD>
                <TD>
                  <div className="flex items-center justify-end gap-1">
                    {canSettle && (
                      <ConfirmButton
                        action={settlePartyAction.bind(null, p.id)}
                        title={isCustomer ? "Mark invoices as paid?" : "Pay all bills?"}
                        message={`${p.outstanding.length} outstanding ${isCustomer ? "invoice" : "bill"}${
                          p.outstanding.length === 1 ? "" : "s"
                        } for ${p.name} (${money(dueSum, currency)}) will be marked fully paid.`}
                        confirmLabel={isCustomer ? "Mark paid" : "Pay all"}
                        className={buttonVariants({ variant: "outline", size: "sm" })}
                      >
                        {isCustomer ? "Mark paid" : "Pay all"}
                      </ConfirmButton>
                    )}
                    <PartyDialog party={p} />
                    <ConfirmButton
                      action={deletePartyAction.bind(null, p.id)}
                      title="Delete party?"
                      message={`"${p.name}" will be removed. Their past transactions are kept but unlinked.`}
                      confirmLabel="Delete"
                      danger
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-destructive"
                    >
                      <Icon name="trash" size={16} />
                    </ConfirmButton>
                  </div>
                </TD>
              </TR>

              {isOpen && (
                <TR className="hover:bg-transparent">
                  <TD colSpan={6} className="bg-muted/30 p-0">
                    <div className="px-5 py-3">
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Outstanding {isCustomer ? "invoices" : "bills"}
                      </div>
                      <ul className="divide-y divide-border rounded-lg border border-border bg-card">
                        {p.outstanding.map((d) => (
                          <li key={d.id} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
                            <div className="min-w-0">
                              <span className="font-medium">{d.ref}</span>
                              <span className="ml-2 text-xs text-muted-foreground">{formatDate(d.date)}</span>
                            </div>
                            <div className="flex items-center gap-6 tabular-nums">
                              <span className="text-muted-foreground">Total {money(d.total, currency)}</span>
                              <span className="font-medium text-warning">Due {money(d.due, currency)}</span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </TD>
                </TR>
              )}
            </Fragment>
          );
        })}
      </TBody>
    </Table>
  );
}
