import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { ChevronLeft } from "lucide-react";
import { db } from "@/db";
import { shoppingLists } from "@/db/schema";
import { getCurrentList, getListItems } from "@/lib/lists";
import { ListView } from "@/components/list-view";
import { ListIcon } from "@/components/list-icon";
import { LinkButton } from "@/components/ui/link-button";
import { CloneListButton } from "@/components/clone-list-button";

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
    <div className="px-4 md:px-8 pt-4 md:pt-8 pb-8 max-w-2xl mx-auto w-full">
      <LinkButton href="/admin/history" variant="ghost" size="sm" className="mb-3 -ml-2 rounded-xl">
        <ChevronLeft className="size-4" /> Histórico
      </LinkButton>
      <header className="mb-6">
        <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
          Lista archivada
        </p>
        <div className="flex items-start gap-3 mt-2">
          <ListIcon size="md" className="shrink-0" />
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight leading-tight min-w-0 break-words flex-1">
            {list.name}
          </h1>
          <CloneListButton
            sourceListId={list.id}
            sourceName={list.name}
            hasCurrent={!!current}
            variant="button"
            className="shrink-0"
          />
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Creada el {list.createdAt.toLocaleString("es-AR", dateFmt)}
        </p>
      </header>
      <ListView list={list} items={items} mode="view" />
    </div>
  );
}
