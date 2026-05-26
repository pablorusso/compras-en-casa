"use server";

import { revalidatePath } from "next/cache";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { stores, products, categories } from "@/db/schema";
import { requireAdmin } from "@/lib/session";
import {
  countParsed,
  parseMarkdown,
  type ParseError,
  type ParsedStore,
} from "@/lib/import-parser";

export type PreviewResult =
  | {
      ok: true;
      parsed: ParsedStore[];
      newCounts: { stores: number; categories: number; products: number };
      currentCounts: { stores: number; categories: number; products: number };
    }
  | { ok: false; errors: ParseError[] };

export async function previewImportAction(markdown: string): Promise<PreviewResult> {
  await requireAdmin();
  const result = parseMarkdown(markdown);
  if (!result.ok) return { ok: false, errors: result.errors };

  const [storeRow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(stores);
  const [catRow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(categories);
  const [prodRow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(products);

  return {
    ok: true,
    parsed: result.stores,
    newCounts: countParsed(result.stores),
    currentCounts: {
      stores: storeRow?.n ?? 0,
      categories: catRow?.n ?? 0,
      products: prodRow?.n ?? 0,
    },
  };
}

export type ConfirmResult =
  | { ok: true; inserted: { stores: number; categories: number; products: number } }
  | { ok: false; errors: ParseError[] };

export async function confirmImportAction(markdown: string): Promise<ConfirmResult> {
  await requireAdmin();
  const result = parseMarkdown(markdown);
  if (!result.ok) return { ok: false, errors: result.errors };

  // Wipe del catálogo. DELETE (no TRUNCATE) respeta ON DELETE de las FKs:
  //   stores DELETE → cascade a categories y products
  //                → shopping_list_items.product_id pasa a NULL (FK SET NULL),
  //                  preservando los datos denormalizados de listas viejas.
  // TRUNCATE CASCADE, en cambio, vaciaría también shopping_list_items.
  await db.delete(stores);
  await db.execute(sql`ALTER SEQUENCE "stores_id_seq" RESTART WITH 1`);
  await db.execute(sql`ALTER SEQUENCE "categories_id_seq" RESTART WITH 1`);
  await db.execute(sql`ALTER SEQUENCE "products_id_seq" RESTART WITH 1`);

  // 1) Comercios.
  const insertedStores = await db
    .insert(stores)
    .values(
      result.stores.map((s, i) => ({
        name: s.name,
        emoji: s.emoji,
        address: s.address ?? null,
        sortOrder: i + 1,
      })),
    )
    .returning();
  const storeIdByName = new Map(insertedStores.map((s) => [s.name, s.id]));

  // 2) Categorías.
  const catsToInsert = result.stores.flatMap((s) => {
    const storeId = storeIdByName.get(s.name)!;
    return s.categories.map((c, i) => ({
      storeId,
      name: c.name,
      emoji: c.emoji,
      sortOrder: i + 1,
    }));
  });

  let insertedCatsCount = 0;
  const catIdByKey = new Map<string, number>();
  if (catsToInsert.length > 0) {
    const insertedCats = await db
      .insert(categories)
      .values(catsToInsert)
      .returning({
        id: categories.id,
        storeId: categories.storeId,
        name: categories.name,
      });
    insertedCatsCount = insertedCats.length;
    for (const c of insertedCats) {
      catIdByKey.set(`${c.storeId}__${c.name}`, c.id);
    }
  }

  // 3) Productos (en categoría + directos).
  type DraftProduct = {
    name: string;
    storeId: number;
    categoryId: number | null;
    defaultQuantityValue: string;
    defaultQuantityUnit: string;
    isSeasonal: boolean;
    seasonMonths: number[];
  };

  const productsToInsert: DraftProduct[] = result.stores.flatMap((s) => {
    const storeId = storeIdByName.get(s.name)!;
    const inCats = s.categories.flatMap((c) =>
      c.products.map<DraftProduct>((p) => ({
        name: p.name,
        storeId,
        categoryId: catIdByKey.get(`${storeId}__${c.name}`) ?? null,
        defaultQuantityValue: p.defaultQuantityValue,
        defaultQuantityUnit: p.defaultQuantityUnit,
        isSeasonal: p.isSeasonal,
        seasonMonths: p.seasonMonths,
      })),
    );
    const direct = s.directProducts.map<DraftProduct>((p) => ({
      name: p.name,
      storeId,
      categoryId: null,
      defaultQuantityValue: p.defaultQuantityValue,
      defaultQuantityUnit: p.defaultQuantityUnit,
      isSeasonal: p.isSeasonal,
      seasonMonths: p.seasonMonths,
    }));
    return [...inCats, ...direct];
  });

  let insertedProductsCount = 0;
  if (productsToInsert.length > 0) {
    const insertedProducts = await db
      .insert(products)
      .values(productsToInsert)
      .returning({ id: products.id });
    insertedProductsCount = insertedProducts.length;
  }

  revalidatePath("/admin");
  revalidatePath("/admin/stores");
  revalidatePath("/admin/products");
  revalidatePath("/admin/list");
  revalidatePath("/admin/import");

  return {
    ok: true,
    inserted: {
      stores: insertedStores.length,
      categories: insertedCatsCount,
      products: insertedProductsCount,
    },
  };
}
