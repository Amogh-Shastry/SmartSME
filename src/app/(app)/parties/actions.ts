"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/current-user";
import { createParty, updateParty, deleteParty, type PartyInput } from "@/lib/domain/parties";
import { settleParty, settleAllOutstanding } from "@/lib/domain/payments";
import { errMsg } from "@/lib/utils";

export interface ActionResult {
  error?: string;
}

function revalidateLedgers() {
  revalidatePath("/parties");
  revalidatePath("/sales");
  revalidatePath("/purchases");
  revalidatePath("/dashboard");
}

function read(formData: FormData): PartyInput {
  return {
    type: (String(formData.get("type") ?? "customer") as PartyInput["type"]),
    name: String(formData.get("name") ?? ""),
    phone: String(formData.get("phone") ?? "") || null,
    email: String(formData.get("email") ?? "") || null,
    gstNumber: String(formData.get("gstNumber") ?? "") || null,
    address: String(formData.get("address") ?? "") || null,
    openingBalance: Number(formData.get("openingBalance") ?? 0),
  };
}

export async function createPartyAction(formData: FormData): Promise<ActionResult> {
  const { business } = await requireUser();
  try {
    await createParty(business.id, read(formData));
    revalidatePath("/parties");
    return {};
  } catch (e) {
    return { error: errMsg(e) };
  }
}

export async function updatePartyAction(partyId: string, formData: FormData): Promise<ActionResult> {
  const { business } = await requireUser();
  try {
    await updateParty(business.id, partyId, read(formData));
    revalidatePath("/parties");
    return {};
  } catch (e) {
    return { error: errMsg(e) };
  }
}

export async function deletePartyAction(partyId: string): Promise<ActionResult> {
  const { business } = await requireUser();
  try {
    await deleteParty(business.id, partyId);
    revalidatePath("/parties");
    return {};
  } catch (e) {
    return { error: errMsg(e) };
  }
}

/** Settle every outstanding invoice/bill for one party (per-vendor bulk pay). */
export async function settlePartyAction(partyId: string): Promise<ActionResult> {
  const { business } = await requireUser();
  try {
    await settleParty(business.id, partyId);
    revalidateLedgers();
    return {};
  } catch (e) {
    return { error: errMsg(e) };
  }
}

/** Mark every outstanding supplier bill (payables) as paid. */
export async function settleAllPayablesAction(): Promise<ActionResult> {
  const { business } = await requireUser();
  try {
    await settleAllOutstanding(business.id, "payable");
    revalidateLedgers();
    return {};
  } catch (e) {
    return { error: errMsg(e) };
  }
}

/** Mark every outstanding customer invoice (receivables) as paid. */
export async function settleAllReceivablesAction(): Promise<ActionResult> {
  const { business } = await requireUser();
  try {
    await settleAllOutstanding(business.id, "receivable");
    revalidateLedgers();
    return {};
  } catch (e) {
    return { error: errMsg(e) };
  }
}
