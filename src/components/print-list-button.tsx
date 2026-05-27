"use client";

import { useState } from "react";
import { Printer } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { PrintStoreOption } from "@/lib/format";

type Props = {
  /** Endpoint que devuelve el PDF de la lista (admin: /admin/lists/[id]/pdf, share: /share/[token]/pdf). */
  pdfUrl: string;
  /** Comercios presentes en la lista, derivados de los ítems. Si hay ≤1 se imprime directo. */
  stores: PrintStoreOption[];
  className?: string;
  variant?: "outline" | "ghost";
  size?: "sm" | "default" | "lg";
};

const iconSizeMap = {
  sm: "icon-sm",
  default: "icon",
  lg: "icon-lg",
} as const;

/** Abre el PDF (con la selección de comercios) en una pestaña nueva. */
function openPdf(pdfUrl: string, keys: string[], total: number) {
  // Sin filtro si están todos seleccionados: la URL queda limpia y el endpoint sirve la lista completa.
  const url = keys.length === total ? pdfUrl : `${pdfUrl}?stores=${keys.join(",")}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

/**
 * Imprime la lista (PDF generado en el servidor) abriéndolo en una pestaña nueva, donde el
 * usuario imprime desde el visor nativo —así sale igual en desktop, iOS Safari y la PWA.
 *
 * Con 2+ comercios abre primero un popup para elegir cuáles incluir (todos tildados por
 * defecto, al menos uno obligatorio). Con 0 o 1 comercio imprime directo, sin popup.
 */
export function PrintListButton({
  pdfUrl,
  stores,
  className,
  variant = "outline",
  size = "default",
}: Props) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const trigger = (
    <Button
      type="button"
      variant={variant}
      size={iconSizeMap[size]}
      aria-label="Imprimir lista"
      title="Imprimir lista"
      className={cn("rounded-2xl", className)}
      onClick={() => {
        if (stores.length <= 1) {
          openPdf(pdfUrl, stores.map((s) => s.key), stores.length);
          return;
        }
        setSelected(new Set(stores.map((s) => s.key)));
        setOpen(true);
      }}
    >
      <Printer className="size-4" />
    </Button>
  );

  if (stores.length <= 1) return trigger;

  const allSelected = selected.size === stores.length;

  function toggle(key: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(key);
      else next.delete(key);
      return next;
    });
  }

  function confirm() {
    openPdf(pdfUrl, [...selected], stores.length);
    setOpen(false);
  }

  return (
    <>
      {trigger}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Imprimir lista</DialogTitle>
            <DialogDescription>Elegí qué comercios incluir.</DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {selected.size} de {stores.length} seleccionados
            </span>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() =>
                setSelected(allSelected ? new Set() : new Set(stores.map((s) => s.key)))
              }
            >
              {allSelected ? "Ninguno" : "Todos"}
            </Button>
          </div>

          <div className="flex flex-col gap-1">
            {stores.map((store) => (
              <label
                key={store.key}
                className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2 hover:bg-muted/50"
              >
                <Checkbox
                  checked={selected.has(store.key)}
                  onCheckedChange={(checked) => toggle(store.key, checked)}
                />
                <span className="flex min-w-0 items-center gap-2">
                  <span aria-hidden>{store.emoji}</span>
                  <span className="truncate">{store.name}</span>
                </span>
              </label>
            ))}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button variant="tomato" onClick={confirm} disabled={selected.size === 0}>
              <Printer className="size-4" />
              Imprimir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
