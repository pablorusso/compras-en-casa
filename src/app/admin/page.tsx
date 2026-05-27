import { count, eq } from "drizzle-orm";
import {
  ArrowRight,
  ListChecks,
  Package,
  Store as StoreIcon,
  Tags,
} from "lucide-react";
import { db } from "@/db";
import { stores, categories, products, settings, shoppingListItems } from "@/db/schema";
import { LinkButton } from "@/components/ui/link-button";
import { Card, CardContent } from "@/components/ui/card";
import { CopyListButton } from "@/components/copy-list-button";
import { PrintListButton } from "@/components/print-list-button";
import { NewListButton } from "@/components/new-list-button";
import { OnboardingChecklist } from "@/components/onboarding-checklist";
import { ShareLinkSection } from "@/components/share-link-section";
import { getCurrentList, getListItems } from "@/lib/lists";
import { derivePrintStores } from "@/lib/format";
import { getActiveShareLink } from "@/lib/share";
import { getRequestOrigin } from "@/lib/origin";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { MotionList } from "@/components/motion-card";
import { HeroBasket } from "@/components/illustrations";

const dateFmt: Intl.DateTimeFormatOptions = { dateStyle: "medium" };

export default async function AdminDashboard() {
  const [current, origin] = await Promise.all([
    getCurrentList(),
    getRequestOrigin(),
  ]);
  const [{ value: storeCount }] = await db.select({ value: count() }).from(stores);
  const [{ value: catCount }] = await db.select({ value: count() }).from(categories);
  const [{ value: prodCount }] = await db
    .select({ value: count() })
    .from(products)
    .where(eq(products.archived, false));
  const [settingsRow] = await db
    .select()
    .from(settings)
    .where(eq(settings.id, 1))
    .limit(1);
  const shoppingDaysSet = (settingsRow?.shoppingDays?.length ?? 0) > 0;

  const currentItems = current ? await getListItems(current.id) : [];
  const currentItemsCount = current
    ? (
        await db
          .select({ value: count() })
          .from(shoppingListItems)
          .where(eq(shoppingListItems.listId, current.id))
      )[0].value
    : 0;

  const activeShare = current ? await getActiveShareLink(current.id) : null;

  const hasMaster = prodCount > 0;

  return (
    <div className="px-4 md:px-8 pt-6 md:pt-10 pb-10 max-w-3xl mx-auto w-full">
      <PageHeader
        eyebrow="Inicio"
        title="Compras en Casa"
        subtitle="¿Qué vamos a comprar esta semana?"
      />

      {!current ? (
        <OnboardingChecklist
          shoppingDaysSet={shoppingDaysSet}
          hasStores={storeCount > 0}
          hasProducts={hasMaster}
          hasCategories={catCount > 0}
        />
      ) : (
        <Card className="relative mb-7 overflow-hidden">
          <HeroBasket
            aria-hidden
            className="absolute -right-4 -top-4 w-44 h-36 md:w-56 md:h-44 opacity-50 pointer-events-none"
          />
          <CardContent className="relative p-6 md:p-7 pb-4 md:pb-5 flex flex-col gap-6">
            <div className="pr-32 md:pr-48">
              <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-primary">
                Lista
              </p>
              <h2 className="font-display text-2xl md:text-3xl font-semibold tracking-tight leading-tight mt-1.5 break-words">
                {current.name}
              </h2>
              <p className="text-sm text-muted-foreground mt-2">
                {currentItemsCount}{" "}
                {currentItemsCount === 1 ? "producto" : "productos"} · creada el{" "}
                {current.createdAt.toLocaleDateString("es-AR", dateFmt)}
              </p>
            </div>

            <ShareLinkSection
              key={current.id}
              listId={current.id}
              origin={origin}
              initial={
                activeShare
                  ? {
                      token: activeShare.token,
                      expiresAt: activeShare.expiresAt.toISOString(),
                    }
                  : null
              }
            />

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-2">
                <LinkButton
                  href="/admin/list"
                  size="lg"
                  variant="tomato"
                  className="rounded-2xl"
                >
                  <ListChecks className="size-4" /> Editar
                  <ArrowRight className="size-4" />
                </LinkButton>
                <CopyListButton list={current} items={currentItems} size="lg" />
                <PrintListButton
                  pdfUrl={`/admin/lists/${current.id}/pdf`}
                  stores={derivePrintStores(currentItems)}
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
      )}

      <MotionList className="grid grid-cols-3 gap-3">
        <StatCard
          href="/admin/products"
          icon={<Package className="size-5" />}
          label="Productos"
          value={prodCount}
          tone="default"
          index={0}
        />
        <StatCard
          href="/admin/stores"
          icon={<StoreIcon className="size-5" />}
          label="Comercios"
          value={storeCount}
          tone="fresh"
          index={1}
        />
        <StatCard
          href="/admin/stores"
          icon={<Tags className="size-5" />}
          label="Categorías"
          value={catCount}
          tone="warm"
          index={2}
        />
      </MotionList>
    </div>
  );
}
