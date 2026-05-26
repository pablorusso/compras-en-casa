import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { ChevronLeft } from "lucide-react";
import { db } from "@/db";
import { shoppingLists } from "@/db/schema";
import { getCurrentList, getListItems } from "@/lib/lists";
import { ListView } from "@/components/list-view";
import { Card, CardContent } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";
import { CloneListButton } from "@/components/clone-list-button";
import { CopyListButton } from "@/components/copy-list-button";
import { HeroBasket } from "@/components/illustrations";

const dateFmt: Intl.DateTimeFormatOptions = {
  dateStyle: "medium",
  timeStyle: "short",
};

type Params = { id: string };

export default async function HistoryDetailPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const listId = Number(id);
  if (!Number.isInteger(listId)) notFound();

  const [list] = await db.select().from(shoppingLists).where(eq(shoppingLists.id, listId)).limit(1);
  if (!list) notFound();
  const [items, current] = await Promise.all([getListItems(list.id), getCurrentList()]);

  return (
    <div className="px-4 md:px-8 pt-4 md:pt-8 pb-8 max-w-3xl mx-auto w-full">
      <LinkButton href="/admin/history" variant="ghost" size="sm" className="mb-3 -ml-2 rounded-xl">
        <ChevronLeft className="size-4" /> Histórico
      </LinkButton>

      <Card className="relative mb-7 overflow-hidden">
        <HeroBasket
          aria-hidden
          className="absolute -right-4 -top-4 w-44 h-36 md:w-56 md:h-44 opacity-50 pointer-events-none"
        />
        <CardContent className="relative p-6 md:p-7 pb-4 md:pb-5 flex flex-col gap-6 min-h-[220px] md:min-h-[244px]">
          <div className="pr-32 md:pr-48">
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-primary">
              Lista archivada
            </p>
            <h2 className="font-display text-2xl md:text-3xl font-semibold tracking-tight leading-tight mt-1.5 break-words">
              {list.name}
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              {items.length} {items.length === 1 ? "producto" : "productos"} · creada el{" "}
              {list.createdAt.toLocaleString("es-AR", dateFmt)}
            </p>
          </div>

          <div className="mt-auto flex flex-wrap items-center justify-between gap-2">
            <CopyListButton list={list} items={items} size="lg" />
            <CloneListButton
              sourceListId={list.id}
              sourceName={list.name}
              hasCurrent={!!current}
              variant="button"
              size="lg"
            />
          </div>
        </CardContent>
      </Card>

      <ListView list={list} items={items} mode="view" actionsHeader={false} />
    </div>
  );
}
