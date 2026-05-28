import type { Metadata } from "next";
import { asc, count, eq } from "drizzle-orm";
import { Sparkles } from "lucide-react";
import { db } from "@/db";
import { stores, products, categories } from "@/db/schema";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";
import { ListEditor } from "@/components/list-editor";
import { NewListButton } from "@/components/new-list-button";
import { EditableListTitle } from "@/components/editable-list-title";
import { CopyListButton } from "@/components/copy-list-button";
import { PrintListButton } from "@/components/print-list-button";
import { HeroBasket } from "@/components/illustrations";
import { getCurrentList, getListItems, getProductsNotInList } from "@/lib/lists";
import { derivePrintStores } from "@/lib/format";

export const dynamic = "force-dynamic";

const dateFmt: Intl.DateTimeFormatOptions = { dateStyle: "medium" };

export async function generateMetadata(): Promise<Metadata> {
  const current = await getCurrentList();
  return {
    title: current ? `Compras en Casa - ${current.name}` : "Compras en Casa",
  };
}

export default async function ListPage() {
  const current = await getCurrentList();
  const [{ value: productCount }] = await db
    .select({ value: count() })
    .from(products)
    .where(eq(products.archived, false));

  if (!current) {
    return (
      <div className="px-4 md:px-8 pt-4 md:pt-8 pb-8 max-w-3xl mx-auto w-full">
        <PageHeader
          eyebrow="Lista"
          title="Lista semanal"
          subtitle="No hay lista vigente — creá una nueva para empezar."
        />
        <Card tone="warm">
          <CardContent className="p-8 text-center space-y-4">
            <div className="text-5xl">📝</div>
            <h2 className="font-display text-2xl font-semibold tracking-tight">
              No hay lista vigente
            </h2>
            <p className="text-muted-foreground max-w-sm mx-auto">
              {productCount > 0
                ? "Creá una nueva — se cargan los productos del maestro con cantidades sugeridas según tus últimas compras."
                : "Primero cargá productos en el maestro y después vas a poder crear una lista."}
            </p>
            <div className="flex justify-center">
              {productCount > 0 ? (
                <NewListButton currentList={null} />
              ) : (
                <LinkButton href="/admin/products" className="rounded-xl">
                  <Sparkles className="size-4" /> Ir a Productos
                </LinkButton>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const [items, notInList, storeRows, catsRows] = await Promise.all([
    getListItems(current.id),
    getProductsNotInList(current.id),
    db.select().from(stores).orderBy(asc(stores.sortOrder), asc(stores.name)),
    db
      .select({ cat: categories, store: stores })
      .from(categories)
      .leftJoin(stores, eq(categories.storeId, stores.id))
      .orderBy(asc(stores.name), asc(categories.sortOrder), asc(categories.name)),
  ]);

  const storeOptions = storeRows.map((s) => ({ id: s.id, name: s.name, emoji: s.emoji }));
  const categoryOptions = catsRows.map((r) => ({
    id: r.cat.id,
    name: r.cat.name,
    emoji: r.cat.emoji,
    storeId: r.cat.storeId,
    storeName: r.store?.name ?? "—",
    storeEmoji: r.store?.emoji ?? "🛒",
  }));
  const excluded = notInList.map((r) => ({
    productId: r.product.id,
    productName: r.product.name,
    categoryId: r.category?.id ?? null,
    categoryName: r.category?.name ?? null,
    categoryEmoji: r.category?.emoji ?? null,
    categorySortOrder: r.category?.sortOrder ?? 0,
    storeId: r.store?.id ?? null,
    storeName: r.store?.name ?? null,
    storeEmoji: r.store?.emoji ?? null,
    storeAddress: r.store?.address ?? null,
    storeSortOrder: r.store?.sortOrder ?? 0,
    defaultQuantityValue: r.product.defaultQuantityValue,
    defaultQuantityUnit: r.product.defaultQuantityUnit,
  }));

  const header = (
    <>
      <div className="md:hidden flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-primary">
            Lista vigente
          </p>
          <div className="mt-0.5">
            <EditableListTitle listId={current.id} initialName={current.name} size="md" />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {items.length} {items.length === 1 ? "producto" : "productos"} ·{" "}
            {current.createdAt.toLocaleDateString("es-AR", dateFmt)}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <CopyListButton list={current} items={items} />
          <PrintListButton
            pdfUrl={`/admin/lists/${current.id}/pdf`}
            stores={derivePrintStores(items)}
          />
          <NewListButton
            currentList={{ id: current.id, name: current.name }}
            variant="outline"
            size="default"
            iconOnlyOnMobile
          />
        </div>
      </div>

      <Card className="hidden md:block relative overflow-hidden">
        <HeroBasket
          aria-hidden
          className="absolute -right-4 -top-4 w-44 h-36 md:w-56 md:h-44 opacity-50 pointer-events-none"
        />
        <CardContent className="relative p-6 md:p-7 pb-4 md:pb-5 flex flex-col gap-6">
          <div className="pr-32 md:pr-48">
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-primary">
              Lista vigente
            </p>
            <div className="mt-1.5">
              <EditableListTitle listId={current.id} initialName={current.name} size="md" />
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {items.length} {items.length === 1 ? "producto" : "productos"} · creada el{" "}
              {current.createdAt.toLocaleDateString("es-AR", dateFmt)}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              <CopyListButton list={current} items={items} size="lg" />
              <PrintListButton
                pdfUrl={`/admin/lists/${current.id}/pdf`}
                stores={derivePrintStores(items)}
                size="lg"
              />
            </div>
            <NewListButton
              currentList={{ id: current.id, name: current.name }}
              variant="outline"
              size="lg"
            />
          </div>
        </CardContent>
      </Card>
    </>
  );

  return (
    <div className="px-4 md:px-8 pt-4 md:pt-8 pb-8 max-w-3xl mx-auto w-full">
      <ListEditor
        list={{ id: current.id, name: current.name }}
        items={items}
        excluded={excluded}
        stores={storeOptions}
        categories={categoryOptions}
        header={header}
      />
    </div>
  );
}
