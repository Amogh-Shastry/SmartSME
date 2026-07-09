"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { requireUser } from "@/lib/auth/current-user";
import { errMsg } from "@/lib/utils";

export interface ActionResult {
  error?: string;
}

export async function markReadAction(id: string): Promise<ActionResult> {
  const { business } = await requireUser();
  try {
    await db
      .update(notifications)
      .set({ read: true })
      .where(and(eq(notifications.id, id), eq(notifications.businessId, business.id)));
    revalidatePath("/notifications");
    return {};
  } catch (e) {
    return { error: errMsg(e) };
  }
}

export async function markAllReadAction(): Promise<ActionResult> {
  const { business } = await requireUser();
  try {
    await db
      .update(notifications)
      .set({ read: true })
      .where(and(eq(notifications.businessId, business.id), eq(notifications.read, false)));
    revalidatePath("/notifications");
    return {};
  } catch (e) {
    return { error: errMsg(e) };
  }
}

export async function deleteNotificationAction(id: string): Promise<ActionResult> {
  const { business } = await requireUser();
  try {
    await db
      .delete(notifications)
      .where(and(eq(notifications.id, id), eq(notifications.businessId, business.id)));
    revalidatePath("/notifications");
    return {};
  } catch (e) {
    return { error: errMsg(e) };
  }
}
