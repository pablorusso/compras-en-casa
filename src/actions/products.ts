"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { products, categories } from "@/db/schema";
import { requireAdmin } from "@/lib/session";
import { canonicalize } from "@/lib/units";

function parseSeasonMonths(formData: FormData): number[] {
  const raw = formData.getAll("seasonMonths");
  const months: number[] = [];
  for (const r of raw) {
    const n = Number(r);
    if (Number.isInteger(n) && n >= 1 && n <= 12) months.push(n);
  }
  return Array.from(new Set(months)).sort((a, b) => a - b);
}

function parseQuantityNumber(raw: string): number {
  const n = Number(String(raw).replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) throw new Error("Cantidad inválida");
  return n;
}

type CreateInput = {
  name: string;
  storeId: number;
  categoryId: number | null;
  defaultQuantityValue: string;
  defaultQuantityUnit: string;
  isSeasonal: boolean;
  seasonMonths: number[];
  excludeFromAutoAdd: boolean;
};

async function fromForm(formData: FormData): Promise<CreateInput> {
  const name = String(formData.get("name") ?? "").trim();
  const storeId = Number(formData.get("storeId"));
  const catRaw = String(formData.get("categoryId") ?? "").trim();
  const categoryId = catRaw ? Number(catRaw) : null;
  const qtyNumber = parseQuantityNumber(String(formData.get("defaultQuantityValue") ?? ""));
  const rawUnit = String(formData.get("defaultQuantityUnit") ?? "").trim();
  if (!rawUnit) throw new Error("Unidad requerida");
  const canon = canonicalize(qtyNumber, rawUnit);
  const defaultQuantityValue = String(canon.value);
  const defaultQuantityUnit = canon.unit;
  const isSeasonal = formData.get("isSeasonal") === "on" || formData.get("isSeasonal") === "true";
  const seasonMonths = isSeasonal ? parseSeasonMonths(formData) : [];
  const excludeFromAutoAdd =
    formData.get("excludeFromAutoAdd") === "on" ||
    formData.get("excludeFromAutoAdd") === "true";
  if (!name) throw new Error("Nombre requerido");
  if (!storeId) throw new Error("Comercio requerido");
  if (isSeasonal && seasonMonths.length === 0) {
    throw new Error("Si es de temporada, seleccioná al menos un mes");
  }
  if (categoryId) {
    const [cat] = await db
      .select({ id: categories.id, storeId: categories.storeId })
      .from(categories)
      .where(and(eq(categories.id, categoryId), eq(categories.storeId, storeId)))
      .limit(1);
    if (!cat) throw new Error("La categoría no pertenece al comercio elegido");
  }
  return {
    name,
    storeId,
    categoryId,
    defaultQuantityValue,
    defaultQuantityUnit,
    isSeasonal,
    seasonMonths,
    excludeFromAutoAdd,
  };
}

export async function createProductAction(formData: FormData) {
  await requireAdmin();
  const input = await fromForm(formData);
  await db.insert(products).values(input);
  revalidatePath("/admin/products");
  revalidatePath("/admin");
}

export async function updateProductAction(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!id) throw new Error("ID requerido");
  const input = await fromForm(formData);
  await db.update(products).set(input).where(eq(products.id, id));
  revalidatePath("/admin/products");
}

export async function setProductExcludeFromAutoAddAction(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!id) throw new Error("ID requerido");
  const excludeFromAutoAdd = formData.get("excludeFromAutoAdd") === "on";
  await db.update(products).set({ excludeFromAutoAdd }).where(eq(products.id, id));
  revalidatePath("/admin/products");
}

export async function deleteProductAction(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!id) throw new Error("ID requerido");
  await db.delete(products).where(eq(products.id, id));
  revalidatePath("/admin/products");
  revalidatePath("/admin");
}
