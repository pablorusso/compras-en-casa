import { asc } from "drizzle-orm";
import { db } from "@/db";
import { stores, categories } from "@/db/schema";
import { PageHeader } from "@/components/page-header";
import { StoresManager } from "@/components/stores-manager";

export default async function StoresPage() {
  const [storeRows, catRows] = await Promise.all([
    db.select().from(stores).orderBy(asc(stores.sortOrder), asc(stores.name)),
    db
      .select()
      .from(categories)
      .orderBy(asc(categories.sortOrder), asc(categories.name)),
  ]);

  const catsByStore = new Map<number, typeof catRows>();
  for (const c of catRows) {
    const list = catsByStore.get(c.storeId) ?? [];
    list.push(c);
    catsByStore.set(c.storeId, list);
  }

  const data = storeRows.map((s) => ({
    ...s,
    categories: catsByStore.get(s.id) ?? [],
  }));

  return (
    <div className="px-4 md:px-8 pt-4 md:pt-8 pb-8 max-w-3xl mx-auto w-full">
      <PageHeader
        eyebrow="Maestro"
        title="Comercios"
        subtitle="Lugares de compra (supermercado, verdulería…) y las categorías de productos que ofrecen."
      />
      <StoresManager data={data} />
    </div>
  );
}
