"use server";

import { requireUser } from "@/lib/auth/current-user";
import { getRevenueSeries, type RevenuePoint } from "@/lib/analytics";

const ALLOWED = new Set([7, 30, 90, 180, 365]);

export async function getRevenueSeriesAction(days: number): Promise<RevenuePoint[]> {
  const { business } = await requireUser();
  const d = ALLOWED.has(days) ? days : 30;
  return getRevenueSeries(business.id, d);
}
