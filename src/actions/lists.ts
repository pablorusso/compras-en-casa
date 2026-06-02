"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray, ne } from "drizzle-orm";
import { db } from "@/db";
import {
  stores,
  products,
  shoppingListItems,
  shoppingLists,
  categories,
  settings,
  shareLinks,
} from "@/db/schema";
import { requireAdmin } from "@/lib/session";
import {
  cloneListToCurrent,
  createListFromMaster,
} from "@/lib/lists";
import { createShareLink } from "@/lib/share";
import { canonicalize } from "@/lib/units";
import { resolveAutoCategoryId } from "@/lib/classify";
import { parseProductFlags } from "@/lib/product-form";

function revalidateListPaths() {
  revalidatePath("/admin");
  revalidatePath("/admin/list");
  revalidatePath("/admin/history");
}

// Confirma que la lista exista y esté en un estado editable (vigente).
// Las archivadas son sólo lectura.
async function requireEditableList(listId: number) {
  if (!Number.isInteger(listId) || listId <= 0) {
    throw new Error("Lista inválida");
  }
  const [list] = await db
    .select({ id: shoppingLists.id, status: shoppingLists.status })
    .from(shoppingLists)
    .where(eq(shoppingLists.id, listId))
    .limit(1);
  if (!list) throw new Error("Lista no encontrada");
  if (list.status === "archived") {
    throw new Error("No se puede modificar una lista archivada");
  }
  return list;
}

// Recupera el listId del ítem y valida que la lista sea editable.
async function requireEditableItem(itemId: number) {
  if (!Number.isInteger(itemId) || itemId <= 0) {
    throw new Error("Ítem inválido");
  }
  const [row] = await db
    .select({ listId: shoppingListItems.listId, status: shoppingLists.status })
    .from(shoppingListItems)
    .innerJoin(shoppingLists, eq(shoppingListItems.listId, shoppingLists.id))
    .where(eq(shoppingListItems.id, itemId))
    .limit(1);
  if (!row) throw new Error("Ítem no encontrado");
  if (row.status === "archived") {
    throw new Error("No se puede modificar una lista archivada");
  }
  return row;
}

export async function createListFromMasterAction() {
  await requireAdmin();
  await createListFromMaster();
  revalidateListPaths();
}

export async function updateItemQuantityAction(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const value = String(formData.get("quantityValue") ?? "").trim();
  const rawUnit = String(formData.get("quantityUnit") ?? "").trim();
  if (!id || !value || !rawUnit) throw new Error("Datos inválidos");
  await requireEditableItem(id);
  const numeric = Number(value.replace(",", "."));
  if (!Number.isFinite(numeric) || numeric <= 0) throw new Error("Cantidad inválida");
  const canon = canonicalize(numeric, rawUnit);
  await db
    .update(shoppingListItems)
    .set({ quantityValue: String(canon.value), quantityUnit: canon.unit })
    .where(eq(shoppingListItems.id, id));
  revalidateListPaths();
}

export async function updateItemNotesAction(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!id) throw new Error("ID requerido");
  await requireEditableItem(id);
  const raw = String(formData.get("notes") ?? "").trim();
  const notes = raw.length === 0 ? null : raw.slice(0, 500);
  await db
    .update(shoppingListItems)
    .set({ notes })
    .where(eq(shoppingListItems.id, id));
  revalidateListPaths();
}

export async function updateItemNameAction(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const name = String(formData.get("name") ?? "").trim();
  if (!id) throw new Error("ID requerido");
  if (!name) throw new Error("Nombre requerido");
  if (name.length > 120) throw new Error("Nombre demasiado largo");
  await requireEditableItem(id);

  // Necesitamos el productId del ítem para decidir si tocamos el maestro.
  const [item] = await db
    .select({ productId: shoppingListItems.productId })
    .from(shoppingListItems)
    .where(eq(shoppingListItems.id, id))
    .limit(1);
  if (!item) throw new Error("Ítem no encontrado");

  if (item.productId != null) {
    // 1) Renombrar el maestro (es el que tiene la constraint UNIQUE). Si choca
    //    con otro producto devolvemos un error claro y NO tocamos los snapshots.
    //    Sin transacción (neon-http no las soporta): el maestro va primero para
    //    abortar antes de sincronizar si el nombre está repetido.
    try {
      await db
        .update(products)
        .set({ name })
        .where(eq(products.id, item.productId));
    } catch (err) {
      if ((err as { code?: string }).code === "23505") {
        throw new Error("Ya existe un producto con ese nombre");
      }
      throw err;
    }
    // 2) Sincronizar el snapshot del nombre en los ítems de listas vigentes
    //    (las archivadas son registros históricos y quedan intactas).
    await db
      .update(shoppingListItems)
      .set({ productName: name })
      .where(
        and(
          eq(shoppingListItems.productId, item.productId),
          inArray(
            shoppingListItems.listId,
            db
              .select({ id: shoppingLists.id })
              .from(shoppingLists)
              .where(ne(shoppingLists.status, "archived")),
          ),
        ),
      );
  } else {
    // Ítem huérfano (producto borrado del maestro): renombramos sólo este snapshot.
    await db
      .update(shoppingListItems)
      .set({ productName: name })
      .where(eq(shoppingListItems.id, id));
  }

  revalidateListPaths();
  revalidatePath("/admin/products");
}

export async function removeItemAction(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!id) throw new Error("ID requerido");
  await requireEditableItem(id);
  await db.delete(shoppingListItems).where(eq(shoppingListItems.id, id));
  revalidateListPaths();
}

export async function addExistingProductAction(formData: FormData) {
  await requireAdmin();
  const listId = Number(formData.get("listId"));
  await requireEditableList(listId);
  const productId = Number(formData.get("productId"));
  if (!productId) throw new Error("Producto inválido");

  const [row] = await db
    .select({
      product: products,
      category: categories,
      store: stores,
    })
    .from(products)
    .innerJoin(stores, eq(products.storeId, stores.id))
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(eq(products.id, productId))
    .limit(1);
  if (!row) throw new Error("Producto no encontrado");

  const inserted = await db
    .insert(shoppingListItems)
    .values({
      listId,
      productId: row.product.id,
      productName: row.product.name,
      categoryId: row.category?.id ?? null,
      categoryName: row.category?.name ?? null,
      categoryEmoji: row.category?.emoji ?? null,
      categorySortOrder: row.category?.sortOrder ?? 0,
      storeId: row.store?.id ?? null,
      storeName: row.store?.name ?? null,
      storeEmoji: row.store?.emoji ?? null,
      storeAddress: row.store?.address ?? null,
      storeSortOrder: row.store?.sortOrder ?? 0,
      quantityValue: row.product.defaultQuantityValue,
      quantityUnit: row.product.defaultQuantityUnit,
    })
    .onConflictDoNothing()
    .returning({ id: shoppingListItems.id });
  revalidateListPaths();
  return { itemId: inserted[0]?.id ?? null };
}

export async function createAndAddProductAction(formData: FormData) {
  await requireAdmin();
  const listId = Number(formData.get("listId"));
  await requireEditableList(listId);

  const name = String(formData.get("name") ?? "").trim();
  const storeId = Number(formData.get("storeId"));
  const catRaw = String(formData.get("categoryId") ?? "").trim();
  let categoryId = catRaw ? Number(catRaw) : null;
  const quantityRaw = String(formData.get("defaultQuantityValue") ?? "1");
  const rawUnit = String(formData.get("defaultQuantityUnit") ?? "unidad").trim();
  if (!name || !storeId || !rawUnit) throw new Error("Datos incompletos");
  const qtyRaw = Number(quantityRaw.replace(",", "."));
  if (!Number.isFinite(qtyRaw) || qtyRaw <= 0) throw new Error("Cantidad inválida");
  const canon = canonicalize(qtyRaw, rawUnit);
  const qty = canon.value;
  const unit = canon.unit;
  // Mismos flags que el maestro: temporada (+meses) y "no auto-agregar a listas
  // nuevas". Marcarlos no afecta esta alta (el producto se inserta igual abajo);
  // solo cambia cómo se comporta el producto en listas futuras.
  const { isSeasonal, seasonMonths, excludeFromAutoAdd } = parseProductFlags(formData);

  const [store] = await db
    .select()
    .from(stores)
    .where(eq(stores.id, storeId))
    .limit(1);
  if (!store) throw new Error("Comercio no encontrado");

  // Si no se eligió categoría, intentamos clasificar con IA (igual que en el
  // maestro). El id resuelto se valida más abajo contra el comercio.
  if (categoryId == null) {
    categoryId = await resolveAutoCategoryId(storeId, name, null);
  }

  let cat: typeof categories.$inferSelect | null = null;
  if (categoryId) {
    const [row] = await db
      .select()
      .from(categories)
      .where(and(eq(categories.id, categoryId), eq(categories.storeId, storeId)))
      .limit(1);
    if (!row) throw new Error("La categoría no pertenece al comercio elegido");
    cat = row;
  }

  const [created] = await db
    .insert(products)
    .values({
      name,
      storeId,
      categoryId,
      defaultQuantityValue: String(qty),
      defaultQuantityUnit: unit,
      isSeasonal,
      seasonMonths,
      excludeFromAutoAdd,
    })
    .returning();

  await db.insert(shoppingListItems).values({
    listId,
    productId: created.id,
    productName: created.name,
    categoryId: cat?.id ?? null,
    categoryName: cat?.name ?? null,
    categoryEmoji: cat?.emoji ?? null,
    categorySortOrder: cat?.sortOrder ?? 0,
    storeId: store.id,
    storeName: store.name,
    storeEmoji: store.emoji,
    storeAddress: store.address ?? null,
    storeSortOrder: store.sortOrder,
    quantityValue: created.defaultQuantityValue,
    quantityUnit: created.defaultQuantityUnit,
  });

  revalidateListPaths();
  revalidatePath("/admin/products");
}

/**
 * Crea (o regenera) un share-link para la lista vigente usando la expiración
 * configurada en settings.shareLinkTtlDays. Lo invoca el componente
 * ShareLinkSection.
 */
export async function createShareLinkAction(formData: FormData) {
  await requireAdmin();
  const listId = Number(formData.get("listId"));
  if (!listId) throw new Error("Lista inválida");
  await requireEditableList(listId);
  const [cfg] = await db.select().from(settings).where(eq(settings.id, 1)).limit(1);
  const ttlDays = cfg?.shareLinkTtlDays ?? 30;
  const link = await createShareLink(listId, ttlDays * 24);
  revalidatePath("/admin/list");
  revalidatePath("/admin");
  return { token: link.token, expiresAt: link.expiresAt.toISOString() };
}

/**
 * Borra todos los share-links de la lista vigente (los "vence" inmediatamente).
 * Útil para invalidar un link compartido sin generar uno nuevo.
 */
export async function expireShareLinkAction(formData: FormData) {
  await requireAdmin();
  const listId = Number(formData.get("listId"));
  if (!listId) throw new Error("Lista inválida");
  await requireEditableList(listId);
  await db.delete(shareLinks).where(eq(shareLinks.listId, listId));
  revalidatePath("/admin/list");
  revalidatePath("/admin");
}

export async function deleteArchivedListAction(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) throw new Error("Lista inválida");

  const [list] = await db
    .select()
    .from(shoppingLists)
    .where(eq(shoppingLists.id, id))
    .limit(1);
  if (!list) throw new Error("Lista no encontrada");
  if (list.status !== "archived") {
    throw new Error("Sólo se pueden borrar listas archivadas");
  }

  await db.delete(shoppingLists).where(eq(shoppingLists.id, id));
  revalidatePath("/admin/history");
  revalidatePath("/admin");
}

export async function cloneListAction(formData: FormData) {
  await requireAdmin();
  const sourceListId = Number(formData.get("sourceListId"));
  if (!Number.isInteger(sourceListId) || sourceListId <= 0) {
    throw new Error("Lista inválida");
  }
  const created = await cloneListToCurrent(sourceListId);
  revalidateListPaths();
  return { id: created.id };
}

export async function updateListNameAction(formData: FormData) {
  await requireAdmin();
  const listId = Number(formData.get("listId"));
  const name = String(formData.get("name") ?? "").trim();
  if (!listId || !name) throw new Error("Datos inválidos");
  if (name.length > 80) throw new Error("Nombre demasiado largo");

  const [list] = await db
    .select()
    .from(shoppingLists)
    .where(eq(shoppingLists.id, listId))
    .limit(1);
  if (!list) throw new Error("Lista no encontrada");
  if (list.status === "archived") {
    throw new Error("No se puede renombrar una lista archivada");
  }

  await db.update(shoppingLists).set({ name }).where(eq(shoppingLists.id, listId));
  revalidateListPaths();
}
