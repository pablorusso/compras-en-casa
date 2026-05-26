import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { stores, products, categories } from "@/db/schema";
import { PageHeader } from "@/components/page-header";
import { ProductsManager } from "@/components/products-manager";

export default async function ProductsPage() {
  const [rows, storeRows, catRows] = await Promise.all([
    db
      .select({
        product: products,
        category: categories,
        store: stores,
      })
      .from(products)
      .innerJoin(stores, eq(products.storeId, stores.id))
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(eq(products.archived, false))
      .orderBy(asc(products.name)),
    db.select().from(stores).orderBy(asc(stores.sortOrder), asc(stores.name)),
    db
      .select()
      .from(categories)
      .orderBy(asc(categories.sortOrder), asc(categories.name)),
  ]);

  const data = rows.map((r) => ({
    ...r.product,
    seasonMonths: (r.product.seasonMonths ?? []) as number[],
    category: r.category
      ? { id: r.category.id, name: r.category.name, emoji: r.category.emoji }
      : null,
    store: { id: r.store.id, name: r.store.name, emoji: r.store.emoji },
  }));

  const storeOptions = storeRows.map((s) => ({ id: s.id, name: s.name, emoji: s.emoji }));

  const categoryOptions = catRows.map((c) => ({
    id: c.id,
    name: c.name,
    emoji: c.emoji,
    storeId: c.storeId,
    storeName: storeRows.find((s) => s.id === c.storeId)?.name ?? "—",
    storeEmoji: storeRows.find((s) => s.id === c.storeId)?.emoji ?? "🛒",
  }));

  return (
    <div className="px-4 md:px-8 pt-4 md:pt-8 pb-8 max-w-3xl mx-auto w-full">
      <PageHeader
        eyebrow="Maestro"
        title="Productos"
        subtitle="Catálogo de productos que se pueden comprar, con su cantidad habitual."
      />
      <ProductsManager
        products={data}
        stores={storeOptions}
        categories={categoryOptions}
      />
    </div>
  );
}
