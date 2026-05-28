"use client";

import { useTransition } from "react";
import { Trash2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { deleteProductAction } from "@/actions/products";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Confirma el borrado de un producto del maestro desde fuera del admin de
// productos. Controlado por el caller para que un solo dialog atienda varias
// entradas (swipe, botón de fila, botón del buscador).
//
// `onConfirmed` se dispara al iniciar la transición — pensado para que el
// caller oculte la fila de forma optimista; ante un error, el toast informa y
// la revalidación del server termina mostrando la fila de nuevo si el delete
// falló.
export function DeleteProductConfirmDialog({
  open,
  onOpenChange,
  productId,
  productName,
  onConfirmed,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: number;
  productName: string;
  onConfirmed?: () => void;
}) {
  const [pending, startTransition] = useTransition();

  function confirm() {
    onConfirmed?.();
    const fd = new FormData();
    fd.set("id", String(productId));
    startTransition(async () => {
      try {
        await deleteProductAction(fd);
        toast.success("Producto eliminado");
        onOpenChange(false);
      } catch (err) {
        toast.error((err as Error).message);
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (pending) return;
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-highlight">
            <TriangleAlert className="size-5" />
            Eliminar «{productName}»?
          </DialogTitle>
          <DialogDescription>
            Se borra del maestro de productos. No vas a poder agregarlo a listas
            nuevas hasta volver a crearlo.
          </DialogDescription>
          <DialogDescription>
            Las listas anteriores conservan el ítem con su nombre y comercio,
            pero quedan desvinculadas del maestro.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancelar
          </Button>
          <Button variant="destructive" onClick={confirm} disabled={pending}>
            <Trash2 className="size-4" />
            {pending ? "Eliminando…" : "Eliminar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
