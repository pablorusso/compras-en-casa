"use server";

import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { stores, categories, products } from "@/db/schema";
import { requireAdmin } from "@/lib/session";
import {
  renderMasterMarkdown,
  type ExportCategory,
  type ExportProduct,
  type ExportStore,
} from "@/lib/markdown-export";

export async function exportMasterMarkdownAction(): Promise<string> {
  await requireAdmin();

  const allStores = await db
    .select()
    .from(stores)
    .orderBy(asc(stores.sortOrder), asc(stores.id));

  const allCategories = await db
    .select()
    .from(categories)
    .orderBy(asc(categories.sortOrder), asc(categories.id));

  const allProducts = await db
    .select()
    .from(products)
    .where(eq(products.archived, false))
    .orderBy(asc(products.name));

  const catsByStore = new Map<number, typeof allCategories>();
  for (const c of allCategories) {
    const list = catsByStore.get(c.storeId) ?? [];
    list.push(c);
    catsByStore.set(c.storeId, list);
  }

  const directByStore = new Map<number, typeof allProducts>();
  const productsByCategory = new Map<number, typeof allProducts>();
  for (const p of allProducts) {
    if (p.categoryId == null) {
      const list = directByStore.get(p.storeId) ?? [];
      list.push(p);
      directByStore.set(p.storeId, list);
    } else {
      const list = productsByCategory.get(p.categoryId) ?? [];
      list.push(p);
      productsByCategory.set(p.categoryId, list);
    }
  }

  const toExportProduct = (p: typeof allProducts[number]): ExportProduct => ({
    name: p.name,
    defaultQuantityValue: p.defaultQuantityValue,
    defaultQuantityUnit: p.defaultQuantityUnit,
    isSeasonal: p.isSeasonal,
    seasonMonths: p.seasonMonths ?? [],
  });

  const exportStores: ExportStore[] = allStores.map((s) => {
    const cats: ExportCategory[] = (catsByStore.get(s.id) ?? []).map((c) => ({
      name: c.name,
      emoji: c.emoji,
      products: (productsByCategory.get(c.id) ?? []).map(toExportProduct),
    }));
    const direct = (directByStore.get(s.id) ?? []).map(toExportProduct);
    return {
      name: s.name,
      emoji: s.emoji,
      address: s.address,
      directProducts: direct,
      categories: cats,
    };
  });

  return renderMasterMarkdown(exportStores);
}
