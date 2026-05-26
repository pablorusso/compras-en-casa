"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { deleteArchivedListAction } from "@/actions/lists";

export function DeleteHistoryListButton({ id, name }: { id: number; name: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!confirm(`¿Borrar la lista "${name}"? Esta acción no se puede deshacer.`)) return;
        const fd = new FormData();
        fd.set("id", String(id));
        startTransition(async () => {
          try {
            await deleteArchivedListAction(fd);
            toast.success("Lista eliminada");
          } catch (err) {
            toast.error((err as Error).message);
          }
        });
      }}
      className="inline-flex"
    >
      <Button
        type="submit"
        variant="ghost"
        size="icon"
        className={cn(
          "size-9 rounded-xl text-destructive hover:text-destructive",
          pending && "opacity-50",
        )}
        disabled={pending}
        aria-label={`Eliminar lista ${name}`}
      >
        <Trash2 className="size-4" />
      </Button>
    </form>
  );
}
