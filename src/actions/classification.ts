"use server";

import { revalidatePath } from "next/cache";
import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { stores, categories, products, shoppingListItems } from "@/db/schema";
import { classifyProducts } from "@/lib/classify";
import { getCurrentList } from "@/lib/lists";
import { requireAdmin } from "@/lib/session";

export type ClassificationScope = "uncategorized" | "all";

export type SuggestedAssignment = {
  productId: number;
  suggestedCategoryId: number | null;
};

/**
 * Pide a la IA una clasificación tentativa de los productos de un comercio
 * dentro de sus categorías. NO persiste nada: devuelve sólo las sugerencias
 * para que la UI las muestre como borrador. `scope` decide si se clasifican
 * sólo los productos sin categoría o todos.
 */
export async function suggestClassificationAction(
  storeId: number,
  scope: ClassificationScope,
): Promise<SuggestedAssignment[]> {
  await requireAdmin();
  if (!storeId) throw new Error("Comercio requerido");

  const [store] = await db
    .select({ name: stores.name })
    .from(stores)
    .where(eq(stores.id, storeId))
    .limit(1);
  if (!store) throw new Error("Comercio no encontrado");

  const cats = await db
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .where(eq(categories.storeId, storeId))
    .orderBy(asc(categories.sortOrder), asc(categories.name));
  if (cats.length === 0) return [];

  const where =
    scope === "uncategorized"
      ? and(
          eq(products.storeId, storeId),
          eq(products.archived, false),
          isNull(products.categoryId),
        )
      : and(eq(products.storeId, storeId), eq(products.archived, false));

  const prods = await db
    .select({ id: products.id, name: products.name })
    .from(products)
    .where(where)
    .orderBy(asc(products.name));
  if (prods.length === 0) return [];

  const map = await classifyProducts(store.name, cats, prods);
  return prods.map((p) => ({
    productId: p.id,
    suggestedCategoryId: map.get(p.id) ?? null,
  }));
}

export type ApplyAssignment = { productId: number; categoryId: number | null };

/**
 * Aplica la clasificación aprobada por el usuario: actualiza
 * `products.categoryId` y re-sincroniza el snapshot de la lista vigente (las
 * históricas quedan congeladas), igual que `reorderCategoriesAction`.
 */
export async function applyClassificationAction(
  storeId: number,
  assignments: ApplyAssignment[],
): Promise<void> {
  await requireAdmin();
  if (!storeId) throw new Error("Comercio requerido");
  if (!Array.isArray(assignments) || assignments.length === 0) return;

  // Categorías válidas del comercio, con sus datos para el snapshot de lista.
  const cats = await db
    .select({
      id: categories.id,
      name: categories.name,
      emoji: categories.emoji,
      sortOrder: categories.sortOrder,
    })
    .from(categories)
    .where(eq(categories.storeId, storeId));
  const catById = new Map(cats.map((c) => [c.id, c]));

  // Productos del comercio (para validar pertenencia).
  const storeProducts = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.storeId, storeId));
  const productIds = new Set(storeProducts.map((p) => p.id));

  const current = await getCurrentList();

  for (const a of assignments) {
    if (!productIds.has(a.productId)) {
      throw new Error("Un producto no pertenece al comercio elegido");
    }
    if (a.categoryId != null && !catById.has(a.categoryId)) {
      throw new Error("Una categoría no pertenece al comercio elegido");
    }

    await db
      .update(products)
      .set({ categoryId: a.categoryId })
      .where(eq(products.id, a.productId));

    if (current) {
      const cat = a.categoryId != null ? catById.get(a.categoryId)! : null;
      await db
        .update(shoppingListItems)
        .set({
          categoryId: cat?.id ?? null,
          categoryName: cat?.name ?? null,
          categoryEmoji: cat?.emoji ?? null,
          categorySortOrder: cat?.sortOrder ?? 0,
        })
        .where(
          and(
            eq(shoppingListItems.listId, current.id),
            eq(shoppingListItems.productId, a.productId),
          ),
        );
    }
  }

  revalidatePath("/admin/products");
  revalidatePath("/admin/stores");
  revalidatePath("/admin");
  revalidatePath("/admin/list");
}
