import { History as HistoryIcon, Eye } from "lucide-react";
import { getCurrentList, getHistory } from "@/lib/lists";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";
import { ListIcon } from "@/components/list-icon";
import { DeleteHistoryListButton } from "@/components/delete-history-list-button";
import { CloneListButton } from "@/components/clone-list-button";

const dateFmt: Intl.DateTimeFormatOptions = {
  dateStyle: "medium",
  timeStyle: "short",
};

export default async function HistoryPage() {
  const [lists, current] = await Promise.all([getHistory(50), getCurrentList()]);

  return (
    <div className="px-4 md:px-8 pt-4 md:pt-8 pb-8 max-w-3xl mx-auto w-full">
      <PageHeader
        eyebrow="Archivo"
        title="Histórico"
        subtitle="Listas pasadas — referencia para planificar la próxima."
      />

      {lists.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center text-muted-foreground">
            <HistoryIcon className="size-8 mx-auto mb-2 text-muted-foreground/60" />
            <p>Aún no hay listas archivadas.</p>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-2">
          {lists.map((l) => (
            <li key={l.id}>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <ListIcon size="sm" className="shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{l.name}</div>
                    <div className="text-xs text-muted-foreground">
                      Creada el {l.createdAt.toLocaleString("es-AR", dateFmt)}
                    </div>
                  </div>
                  <LinkButton
                    href={`/admin/history/${l.id}`}
                    variant="ghost"
                    size="icon"
                    className="size-9 rounded-xl"
                    aria-label={`Ver lista ${l.name}`}
                  >
                    <Eye className="size-4" />
                  </LinkButton>
                  <CloneListButton
                    sourceListId={l.id}
                    sourceName={l.name}
                    hasCurrent={!!current}
                    variant="icon"
                    ariaLabel={`Usar "${l.name}" como nueva lista`}
                  />
                  <DeleteHistoryListButton id={l.id} name={l.name} />
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
