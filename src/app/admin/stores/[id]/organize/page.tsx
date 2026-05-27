import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { ChevronLeft } from "lucide-react";
import { db } from "@/db";
import { stores, categories, products } from "@/db/schema";
import { PageHeader } from "@/components/page-header";
import { LinkButton } from "@/components/ui/link-button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { StoreOrganizer } from "@/components/store-organizer";
import { CategoryOrganizer } from "@/components/category-organizer";

type Params = { id: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { id } = await params;
  const storeId = Number(id);
  if (!Number.isInteger(storeId)) return { title: "Compras en Casa" };
  const [store] = await db
    .select({ name: stores.name })
    .from(stores)
    .where(eq(stores.id, storeId))
    .limit(1);
  return {
    title: store ? `Organizar ${store.name}` : "Compras en Casa",
  };
}

export default async function OrganizeStorePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;
  const storeId = Number(id);
  if (!Number.isInteger(storeId)) notFound();

  const [store] = await db
    .select()
    .from(stores)
    .where(eq(stores.id, storeId))
    .limit(1);
  if (!store) notFound();

  const [catRows, prodRows] = await Promise.all([
    db
      .select()
      .from(categories)
      .where(eq(categories.storeId, storeId))
      .orderBy(asc(categories.sortOrder), asc(categories.name)),
    db
      .select({
        id: products.id,
        name: products.name,
        categoryId: products.categoryId,
        defaultQuantityValue: products.defaultQuantityValue,
        defaultQuantityUnit: products.defaultQuantityUnit,
      })
      .from(products)
      .where(eq(products.storeId, storeId))
      .orderBy(asc(products.name)),
  ]);

  const categoryList = catRows.map((c) => ({
    id: c.id,
    name: c.name,
    emoji: c.emoji,
    excludeFromAutoAdd: c.excludeFromAutoAdd,
  }));

  // Conteo de productos por categoría (estado guardado), derivado de los
  // productos ya cargados — sin queries extra.
  const categoryCounts: Record<number, number> = {};
  let uncategorizedCount = 0;
  for (const p of prodRows) {
    if (p.categoryId == null) uncategorizedCount++;
    else categoryCounts[p.categoryId] = (categoryCounts[p.categoryId] ?? 0) + 1;
  }

  return (
    <div className="px-4 md:px-8 pt-4 md:pt-8 pb-8 max-w-3xl mx-auto w-full">
      <LinkButton
        href="/admin/stores"
        variant="ghost"
        size="sm"
        className="mb-3 -ml-2 rounded-xl"
      >
        <ChevronLeft className="size-4" /> Comercios
      </LinkButton>

      <PageHeader
        eyebrow={`${store.emoji} ${store.name}`}
        title="Organizar comercio"
        subtitle="Acomodá los productos en sus categorías o revisá la estructura de categorías del comercio."
      />

      <Tabs defaultValue="categories">
        <TabsList className="w-full">
          <TabsTrigger value="categories">Categorías</TabsTrigger>
          <TabsTrigger value="products">Productos</TabsTrigger>
        </TabsList>
        <TabsContent value="categories" className="mt-4">
          <CategoryOrganizer
            storeId={store.id}
            storeName={store.name}
            storeEmoji={store.emoji}
            categories={categoryList}
            categoryCounts={categoryCounts}
            uncategorizedCount={uncategorizedCount}
          />
        </TabsContent>
        <TabsContent value="products" keepMounted className="mt-4">
          <StoreOrganizer
            storeId={store.id}
            storeName={store.name}
            storeEmoji={store.emoji}
            categories={categoryList}
            products={prodRows}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
