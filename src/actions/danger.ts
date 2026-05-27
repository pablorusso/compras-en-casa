"use server";

import { revalidatePath } from "next/cache";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import {
  stores,
  categories,
  products,
  shoppingLists,
  shoppingListItems,
  shareLinks,
} from "@/db/schema";
import { requireAdmin } from "@/lib/session";
import { getCurrentList } from "@/lib/lists";

export type ResetCounts = {
  stores: number;
  categories: number;
  products: number;
  lists: number;
  items: number;
  shareLinks: number;
};

export type ResetPreview = {
  counts: ResetCounts;
  total: number;
  confirmCode: string;
};

// El código de confirmación se deriva del estado real de la DB.
// Cambia cada vez que cambian los conteos, forzando al usuario a leer
// los números antes de tipear (no se puede memorizar de antemano).
function buildConfirmCode(total: number): string {
  return `BORRAR-${total}`;
}

async function countAll(): Promise<ResetCounts> {
  // 6 queries en paralelo: Neon HTTP no soporta pipelining real,
  // pero sí podemos disparar las promises juntas y aprovechar conexiones múltiples.
  const [s, c, p, l, i, sl] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(stores),
    db.select({ n: sql<number>`count(*)::int` }).from(categories),
    db.select({ n: sql<number>`count(*)::int` }).from(products),
    db.select({ n: sql<number>`count(*)::int` }).from(shoppingLists),
    db.select({ n: sql<number>`count(*)::int` }).from(shoppingListItems),
    db.select({ n: sql<number>`count(*)::int` }).from(shareLinks),
  ]);

  return {
    stores: s[0]?.n ?? 0,
    categories: c[0]?.n ?? 0,
    products: p[0]?.n ?? 0,
    lists: l[0]?.n ?? 0,
    items: i[0]?.n ?? 0,
    shareLinks: sl[0]?.n ?? 0,
  };
}

function sumCounts(c: ResetCounts): number {
  return c.stores + c.categories + c.products + c.lists + c.items + c.shareLinks;
}

export async function getResetPreviewAction(): Promise<ResetPreview> {
  await requireAdmin();
  const counts = await countAll();
  const total = sumCounts(counts);
  return { counts, total, confirmCode: buildConfirmCode(total) };
}

export type ResetResult = { error?: string; ok?: true };

export async function resetAllBusinessDataAction(
  formData: FormData,
): Promise<ResetResult> {
  await requireAdmin();

  const typed = String(formData.get("confirmCode") ?? "").trim();
  if (!typed) return { error: "Ingresá el código de confirmación." };

  // Re-cómputo server-side: el cliente no es fuente de verdad.
  const counts = await countAll();
  const total = sumCounts(counts);
  const expected = buildConfirmCode(total);

  if (typed !== expected) {
    return {
      error:
        "El código no coincide con el estado actual de la base. " +
        "Probablemente cambiaron los datos desde que abriste el diálogo — cerralo y volvelo a abrir.",
    };
  }

  if (total === 0) {
    // Nada que borrar; éxito silencioso.
    return { ok: true };
  }

  // Borrar en orden basado en las FKs declaradas en schema.ts:
  //   shopping_lists DELETE → cascade: shopping_list_items + share_links
  //   stores DELETE         → cascade: categories + products
  //                         → set null: shopping_list_items.product_id
  //                           (pero ya están borrados arriba)
  await db.delete(shoppingLists);
  await db.delete(stores);

  // Reset de las id_seq para que la próxima inserción arranque en 1.
  // Mismo patrón que confirmImportAction en actions/import.ts.
  await db.execute(sql`ALTER SEQUENCE "stores_id_seq" RESTART WITH 1`);
  await db.execute(sql`ALTER SEQUENCE "categories_id_seq" RESTART WITH 1`);
  await db.execute(sql`ALTER SEQUENCE "products_id_seq" RESTART WITH 1`);
  await db.execute(sql`ALTER SEQUENCE "shopping_lists_id_seq" RESTART WITH 1`);
  await db.execute(sql`ALTER SEQUENCE "shopping_list_items_id_seq" RESTART WITH 1`);
  await db.execute(sql`ALTER SEQUENCE "share_links_id_seq" RESTART WITH 1`);

  revalidatePath("/admin");
  revalidatePath("/admin/stores");
  revalidatePath("/admin/products");
  revalidatePath("/admin/list");
  revalidatePath("/admin/history");
  revalidatePath("/admin/import");
  revalidatePath("/admin/settings");

  return { ok: true };
}

// ─── Borrar todas las listas (conservando el maestro) ──────────────────────

export type DeleteListsPreview = {
  currentListName: string | null;
  counts: { lists: number; items: number; shareLinks: number };
};

export async function getDeleteListsPreviewAction(): Promise<DeleteListsPreview> {
  await requireAdmin();
  const current = await getCurrentList();
  const [l, i, sl] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(shoppingLists),
    db.select({ n: sql<number>`count(*)::int` }).from(shoppingListItems),
    db.select({ n: sql<number>`count(*)::int` }).from(shareLinks),
  ]);
  return {
    currentListName: current?.name ?? null,
    counts: {
      lists: l[0]?.n ?? 0,
      items: i[0]?.n ?? 0,
      shareLinks: sl[0]?.n ?? 0,
    },
  };
}

export async function deleteAllListsAction(
  formData: FormData,
): Promise<ResetResult> {
  await requireAdmin();

  // La confirmación se valida contra la lista vigente real: si no hay vigente,
  // la acción no tiene sentido (y el botón ni siquiera se muestra).
  const current = await getCurrentList();
  if (!current) return { error: "No hay lista vigente para borrar." };

  const typed = String(formData.get("confirmName") ?? "").trim();
  if (!typed) return { error: "Ingresá el nombre de la lista vigente." };
  if (typed !== current.name.trim()) {
    return {
      error:
        "El nombre no coincide con el de la lista vigente. " +
        "Cerrá el diálogo y volvé a abrirlo si la lista cambió.",
    };
  }

  // DELETE de shopping_lists cascadea a shopping_list_items y share_links
  // (FKs onDelete: cascade en schema.ts) → los links quedan despublicados.
  await db.delete(shoppingLists);

  await db.execute(sql`ALTER SEQUENCE "shopping_lists_id_seq" RESTART WITH 1`);
  await db.execute(sql`ALTER SEQUENCE "shopping_list_items_id_seq" RESTART WITH 1`);
  await db.execute(sql`ALTER SEQUENCE "share_links_id_seq" RESTART WITH 1`);

  revalidatePath("/admin");
  revalidatePath("/admin/list");
  revalidatePath("/admin/history");
  revalidatePath("/admin/settings");

  return { ok: true };
}
