import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { ChevronLeft } from "lucide-react";
import { db } from "@/db";
import { stores, categories, products } from "@/db/schema";
import { PageHeader } from "@/components/page-header";
import { LinkButton } from "@/components/ui/link-button";
import { StoreOrganizer } from "@/components/store-organizer";

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
  }));

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
        subtitle="Acomodá los productos en sus categorías. Probá con IA o movelos a mano; los cambios se aplican recién al guardar."
      />

      <StoreOrganizer
        storeId={store.id}
        storeName={store.name}
        storeEmoji={store.emoji}
        categories={categoryList}
        products={prodRows}
      />
    </div>
  );
}
