"use client";

import { useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ListX, TriangleAlert, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getDeleteListsPreviewAction,
  deleteAllListsAction,
  type DeleteListsPreview,
} from "@/actions/danger";

export function DeleteListsDialog({ trigger }: { trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<DeleteListsPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const loadPreview = useCallback(async () => {
    setLoadingPreview(true);
    setError(null);
    try {
      const p = await getDeleteListsPreviewAction();
      setPreview(p);
    } catch (err) {
      setError((err as Error).message || "No se pudo cargar el estado actual.");
      setPreview(null);
    } finally {
      setLoadingPreview(false);
    }
  }, []);

  function handleOpenChange(o: boolean) {
    if (pending) return;
    setOpen(o);
    if (o) {
      setTyped("");
      setError(null);
      void loadPreview();
    }
  }

  function confirm() {
    if (!preview) return;
    setError(null);
    const fd = new FormData();
    fd.set("confirmName", typed);
    startTransition(async () => {
      const result = await deleteAllListsAction(fd);
      if (result.error) {
        setError(result.error);
        toast.error(result.error);
        // Re-leemos el preview: la lista vigente pudo haber cambiado.
        void loadPreview();
        return;
      }
      toast.success("Listas borradas");
      setOpen(false);
      router.refresh();
    });
  }

  const noCurrent = preview ? preview.currentListName === null : false;
  const matches = preview?.currentListName
    ? typed.trim() === preview.currentListName.trim()
    : false;
  const canConfirm =
    !pending && !loadingPreview && preview !== null && !noCurrent && matches;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-highlight">
            <TriangleAlert className="size-5" />
            Borrar todas las listas
          </DialogTitle>
          <DialogDescription>
            Se eliminarán <strong>todas las listas de compras</strong>: la vigente y las
            históricas, junto con sus ítems. Los links compartibles dejarán de funcionar para
            quien los tenga.
          </DialogDescription>
          <DialogDescription>
            <strong>Se conserva</strong> el catálogo completo (comercios, categorías y
            productos) y todas las preferencias. Después podrás crear una lista nueva desde el
            maestro.
          </DialogDescription>
        </DialogHeader>

        {loadingPreview && (
          <div className="flex items-center justify-center py-6 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        )}

        {!loadingPreview && preview && (
          <>
            <div className="rounded-xl border border-border/70 bg-muted/40 p-3 text-sm space-y-1">
              <div className="font-medium text-foreground">Datos que se van a borrar:</div>
              <ul className="text-muted-foreground space-y-0.5">
                <li>📋 Listas: <span className="tabular-nums">{preview.counts.lists}</span></li>
                <li>✅ Ítems en listas: <span className="tabular-nums">{preview.counts.items}</span></li>
                <li>🔗 Links compartibles: <span className="tabular-nums">{preview.counts.shareLinks}</span></li>
              </ul>
            </div>

            {noCurrent ? (
              <p className="text-sm text-muted-foreground">
                No hay lista vigente: no hay nada que borrar.
              </p>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="confirmName" className="text-sm">
                  Para continuar, escribí el nombre de la lista vigente:
                </Label>
                <div className="rounded-xl bg-highlight/15 text-highlight-foreground px-3 py-2 font-mono text-base text-center select-all">
                  {preview.currentListName}
                </div>
                <Input
                  id="confirmName"
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  placeholder="Escribí el nombre exacto"
                  autoComplete="off"
                  spellCheck={false}
                  className="h-11"
                  disabled={pending}
                />
              </div>
            )}
          </>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button variant="honey" onClick={confirm} disabled={!canConfirm}>
            <ListX className="size-4" />
            {pending ? "Borrando…" : "Borrar todas las listas"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
