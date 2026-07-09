"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/current-user";
import {
  createProduct,
  updateProduct,
  adjustStock,
  deleteProduct,
  type ProductInput,
} from "@/lib/domain/products";
import { errMsg } from "@/lib/utils";

export interface ActionResult {
  error?: string;
}

function readProduct(formData: FormData): ProductInput {
  return {
    name: String(formData.get("name") ?? ""),
    sku: String(formData.get("sku") ?? "") || null,
    hsn: String(formData.get("hsn") ?? "") || null,
    unit: String(formData.get("unit") ?? "pcs"),
    purchasePrice: Number(formData.get("purchasePrice") ?? 0),
    sellingPrice: Number(formData.get("sellingPrice") ?? 0),
    stock: Number(formData.get("stock") ?? 0),
    lowStockThreshold: Number(formData.get("lowStockThreshold") ?? 10),
  };
}

export async function createProductAction(formData: FormData): Promise<ActionResult> {
  const { business } = await requireUser();
  try {
    await createProduct(business.id, readProduct(formData));
    revalidatePath("/products");
    return {};
  } catch (e) {
    return { error: errMsg(e) };
  }
}

export async function updateProductAction(
  productId: string,
  formData: FormData,
): Promise<ActionResult> {
  const { business } = await requireUser();
  try {
    await updateProduct(business.id, productId, readProduct(formData));
    revalidatePath("/products");
    return {};
  } catch (e) {
    return { error: errMsg(e) };
  }
}

export async function adjustStockAction(
  productId: string,
  formData: FormData,
): Promise<ActionResult> {
  const { business } = await requireUser();
  try {
    const delta = Number(formData.get("delta") ?? 0);
    const note = String(formData.get("note") ?? "");
    await adjustStock(business.id, productId, delta, note);
    revalidatePath("/products");
    return {};
  } catch (e) {
    return { error: errMsg(e) };
  }
}

export async function deleteProductAction(productId: string): Promise<ActionResult> {
  const { business } = await requireUser();
  try {
    await deleteProduct(business.id, productId);
    revalidatePath("/products");
    return {};
  } catch (e) {
    return { error: errMsg(e) };
  }
}
