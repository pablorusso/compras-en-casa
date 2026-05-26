"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { stores, categories, shoppingListItems } from "@/db/schema";
import { generateEmoji } from "@/lib/emoji";
import { getCurrentList } from "@/lib/lists";
import { requireAdmin } from "@/lib/session";

export async function createStoreAction(formData: FormData) {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const emojiInput = String(formData.get("emoji") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim() || null;
  const excludeFromAutoAdd = formData.get("excludeFromAutoAdd") === "on";
  if (!name) throw new Error("Nombre requerido");
  const emoji = emojiInput || (await generateEmoji("store", name)) || "🛒";
  await db.insert(stores).values({ name, emoji, address, excludeFromAutoAdd });
  revalidatePath("/admin/stores");
  revalidatePath("/admin");
}

export async function updateStoreAction(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const name = String(formData.get("name") ?? "").trim();
  const emoji = String(formData.get("emoji") ?? "").trim() || "🛒";
  const address = String(formData.get("address") ?? "").trim() || null;
  const excludeFromAutoAdd = formData.get("excludeFromAutoAdd") === "on";
  if (!id || !name) throw new Error("Datos inválidos");
  await db
    .update(stores)
    .set({ name, emoji, address, excludeFromAutoAdd })
    .where(eq(stores.id, id));
  revalidatePath("/admin/stores");
}

export async function deleteStoreAction(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!id) throw new Error("ID requerido");
  await db.delete(stores).where(eq(stores.id, id));
  revalidatePath("/admin/stores");
  revalidatePath("/admin");
}

/**
 * Persiste el orden de los comercios: el `sortOrder` de cada uno pasa a ser su
 * índice en `orderedIds`. Además re-sincroniza el snapshot de la lista vigente
 * para que el nuevo orden se vea de inmediato (las históricas quedan congeladas).
 */
export async function reorderStoresAction(orderedIds: number[]) {
  await requireAdmin();
  if (!Array.isArray(orderedIds) || orderedIds.length === 0) return;

  const current = await getCurrentList();
  for (let i = 0; i < orderedIds.length; i++) {
    const id = orderedIds[i];
    await db.update(stores).set({ sortOrder: i }).where(eq(stores.id, id));
    if (current) {
      await db
        .update(shoppingListItems)
        .set({ storeSortOrder: i })
        .where(
          and(eq(shoppingListItems.listId, current.id), eq(shoppingListItems.storeId, id)),
        );
    }
  }

  revalidatePath("/admin/stores");
  revalidatePath("/admin");
  revalidatePath("/admin/list");
}

export async function createCategoryAction(formData: FormData) {
  await requireAdmin();
  const storeId = Number(formData.get("storeId"));
  const name = String(formData.get("name") ?? "").trim();
  const emojiInput = String(formData.get("emoji") ?? "").trim();
  const excludeFromAutoAdd = formData.get("excludeFromAutoAdd") === "on";
  if (!storeId || !name) throw new Error("Datos inválidos");
  const emoji = emojiInput || (await generateEmoji("category", name)) || "🛒";
  await db.insert(categories).values({ storeId, name, emoji, excludeFromAutoAdd });
  revalidatePath("/admin/stores");
}

export async function updateCategoryAction(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const name = String(formData.get("name") ?? "").trim();
  const emoji = String(formData.get("emoji") ?? "").trim() || "🛒";
  const excludeFromAutoAdd = formData.get("excludeFromAutoAdd") === "on";
  if (!id || !name) throw new Error("Datos inválidos");
  await db
    .update(categories)
    .set({ name, emoji, excludeFromAutoAdd })
    .where(eq(categories.id, id));
  revalidatePath("/admin/stores");
}

export async function deleteCategoryAction(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!id) throw new Error("ID requerido");
  await db.delete(categories).where(eq(categories.id, id));
  revalidatePath("/admin/stores");
}

/**
 * Persiste el orden de las categorías de un comercio: el `sortOrder` de cada
 * una pasa a ser su índice en `orderedIds`. Re-sincroniza el snapshot de la
 * lista vigente (las históricas quedan congeladas).
 */
export async function reorderCategoriesAction(storeId: number, orderedIds: number[]) {
  await requireAdmin();
  if (!storeId || !Array.isArray(orderedIds) || orderedIds.length === 0) return;

  const current = await getCurrentList();
  for (let i = 0; i < orderedIds.length; i++) {
    const id = orderedIds[i];
    await db
      .update(categories)
      .set({ sortOrder: i })
      .where(and(eq(categories.id, id), eq(categories.storeId, storeId)));
    if (current) {
      await db
        .update(shoppingListItems)
        .set({ categorySortOrder: i })
        .where(
          and(
            eq(shoppingListItems.listId, current.id),
            eq(shoppingListItems.categoryId, id),
          ),
        );
    }
  }

  revalidatePath("/admin/stores");
  revalidatePath("/admin");
  revalidatePath("/admin/list");
}

export async function regenerateEmojiAction(formData: FormData) {
  await requireAdmin();
  const kind = String(formData.get("kind") ?? "") as "store" | "category";
  const id = Number(formData.get("id"));
  const name = String(formData.get("name") ?? "").trim();
  if (!id || !name || !["store", "category"].includes(kind)) {
    throw new Error("Datos inválidos");
  }
  const emoji = await generateEmoji(kind, name);
  if (!emoji) {
    // La llamada al proveedor falló: preservamos el emoji existente y
    // dejamos que el caller muestre el error en la UI.
    throw new Error("No se pudo generar el emoji. Intentá de nuevo.");
  }
  if (kind === "store") {
    await db.update(stores).set({ emoji }).where(eq(stores.id, id));
  } else {
    await db.update(categories).set({ emoji }).where(eq(categories.id, id));
  }
  revalidatePath("/admin/stores");
  revalidatePath("/admin");
  return emoji;
}

const EMOJI_PICTOGRAPHIC = /\p{Extended_Pictographic}/u;

export async function setEmojiAction(formData: FormData) {
  await requireAdmin();
  const kind = String(formData.get("kind") ?? "") as "store" | "category";
  const id = Number(formData.get("id"));
  const emoji = String(formData.get("emoji") ?? "").trim();
  if (!id || !["store", "category"].includes(kind)) {
    throw new Error("Datos inválidos");
  }
  if (!emoji || emoji.length > 8 || !EMOJI_PICTOGRAPHIC.test(emoji)) {
    throw new Error("Emoji inválido");
  }
  if (kind === "store") {
    await db.update(stores).set({ emoji }).where(eq(stores.id, id));
  } else {
    await db.update(categories).set({ emoji }).where(eq(categories.id, id));
  }
  revalidatePath("/admin/stores");
  revalidatePath("/admin");
}
