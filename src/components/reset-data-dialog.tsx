"use client";

import { useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Trash2, TriangleAlert, Loader2 } from "lucide-react";
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
  getResetPreviewAction,
  resetAllBusinessDataAction,
  type ResetPreview,
} from "@/actions/danger";

export function ResetDataDialog({ trigger }: { trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<ResetPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const loadPreview = useCallback(async () => {
    setLoadingPreview(true);
    setError(null);
    try {
      const p = await getResetPreviewAction();
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
    fd.set("confirmCode", typed);
    startTransition(async () => {
      const result = await resetAllBusinessDataAction(fd);
      if (result.error) {
        setError(result.error);
        toast.error(result.error);
        // Re-leemos el preview porque probablemente el estado de la DB cambió.
        void loadPreview();
        return;
      }
      toast.success("Datos borrados");
      setOpen(false);
      router.refresh();
    });
  }

  const isEmpty = preview?.total === 0;
  const matches = preview ? typed.trim() === preview.confirmCode : false;
  const canConfirm = !pending && !loadingPreview && preview !== null && !isEmpty && matches;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <TriangleAlert className="size-5" />
            Borrar toda la información
          </DialogTitle>
          <DialogDescription>
            Esta acción es <strong>irreversible</strong>. Se eliminarán de forma definitiva todos los
            datos de negocio que cargaste: comercios, categorías, productos, listas (vigente e
            históricas), ítems y links compartibles. Los links activos dejarán de funcionar para
            quien los tenga.
          </DialogDescription>
          <DialogDescription>
            <strong>Se conservan</strong> únicamente el password de administrador y las
            preferencias generales (zona, ubicación, límite de histórico y vigencia del link
            compartible).
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
                <li>🏪 Comercios: <span className="tabular-nums">{preview.counts.stores}</span></li>
                <li>🗂️ Categorías: <span className="tabular-nums">{preview.counts.categories}</span></li>
                <li>🛒 Productos: <span className="tabular-nums">{preview.counts.products}</span></li>
                <li>📋 Listas: <span className="tabular-nums">{preview.counts.lists}</span></li>
                <li>✅ Ítems en listas: <span className="tabular-nums">{preview.counts.items}</span></li>
                <li>🔗 Links compartibles: <span className="tabular-nums">{preview.counts.shareLinks}</span></li>
              </ul>
              <div className="pt-1 border-t border-border/60 mt-2 font-medium text-foreground">
                Total: <span className="tabular-nums">{preview.total}</span> filas
              </div>
            </div>

            {isEmpty ? (
              <p className="text-sm text-muted-foreground">
                La base ya está vacía: no hay nada que borrar.
              </p>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="confirmCode" className="text-sm">
                  Para continuar, escribí exactamente el siguiente código:
                </Label>
                <div className="rounded-xl bg-destructive/10 text-destructive px-3 py-2 font-mono text-base tracking-wider text-center select-all">
                  {preview.confirmCode}
                </div>
                <Input
                  id="confirmCode"
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  placeholder="Escribí el código exacto"
                  autoComplete="off"
                  spellCheck={false}
                  autoCapitalize="characters"
                  className="h-11 font-mono"
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
          <Button variant="tomato" onClick={confirm} disabled={!canConfirm}>
            <Trash2 className="size-4" />
            {pending ? "Borrando…" : "Borrar definitivamente"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
