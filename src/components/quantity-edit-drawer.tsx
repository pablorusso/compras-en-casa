"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { updateItemQuantityAction } from "@/actions/lists";
import { updateProductDefaultQuantityAction } from "@/actions/products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Drawer,
  DrawerContent,
  DrawerBody,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";
import { toEditQuantity } from "@/lib/format";
import {
  isCanonicalUnit,
  UNIT_PICKER_GRID,
  unitDisplay,
  type CanonicalUnit,
} from "@/lib/units";
import { cn } from "@/lib/utils";

// Objetivo del drawer: o un ítem de lista (edita la cantidad de ese ítem) o un
// producto del maestro (edita el default que se usará al agregarlo a una
// lista). El kind define qué server action se llama al confirmar.
export type QuantityTarget =
  | {
      kind: "list-item";
      id: number;
      productName: string;
      quantityValue: string;
      quantityUnit: string;
    }
  | {
      kind: "product";
      productId: number;
      productName: string;
      quantityValue: string;
      quantityUnit: string;
    };

function targetKey(target: QuantityTarget): string {
  return target.kind === "list-item"
    ? `i-${target.id}`
    : `p-${target.productId}`;
}

// Drawer reutilizable para editar cantidad. Aparece tras agregar un producto a
// la lista (modo "list-item") o al tocar el badge de un producto disponible en
// el editor de lista (modo "product", edita el maestro).
export function QuantityEditDrawer({
  open,
  onOpenChange,
  onCloseAutoFocus,
  item,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Hook que dispara Radix al cerrar para restaurar foco; el padre puede
  // preventDefault y manejarlo a mano (p. ej. devolver al buscador con el
  // texto seleccionado).
  onCloseAutoFocus?: (event: Event) => void;
  item: QuantityTarget | null;
}) {
  const isProduct = item?.kind === "product";
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent onCloseAutoFocus={onCloseAutoFocus}>
        <div className="mx-auto w-full max-w-md flex-1 min-h-0 flex flex-col">
          <DrawerHeader>
            <DrawerTitle>
              {isProduct ? "Cantidad por defecto" : "Cantidad"}
            </DrawerTitle>
            <DrawerDescription>
              {item
                ? isProduct
                  ? `Ajustá la cantidad por defecto de "${item.productName}" en el maestro.`
                  : `Ajustá la cantidad de "${item.productName}".`
                : ""}
            </DrawerDescription>
          </DrawerHeader>
          {item && (
            <QuantityForm
              key={targetKey(item)}
              target={item}
              onDone={() => onOpenChange(false)}
            />
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function QuantityForm({
  target,
  onDone,
}: {
  target: QuantityTarget;
  onDone: () => void;
}) {
  const initialUnit: CanonicalUnit = isCanonicalUnit(target.quantityUnit)
    ? (target.quantityUnit as CanonicalUnit)
    : "unidad";

  const [value, setValue] = useState(toEditQuantity(target.quantityValue));
  const [unit, setUnit] = useState<CanonicalUnit>(initialUnit);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 50);
    return () => window.clearTimeout(id);
  }, []);

  function save() {
    const fd = new FormData();
    fd.set(
      "id",
      String(target.kind === "list-item" ? target.id : target.productId),
    );
    fd.set("quantityValue", toEditQuantity(value));
    fd.set("quantityUnit", unit);
    const action =
      target.kind === "list-item"
        ? updateItemQuantityAction
        : updateProductDefaultQuantityAction;
    startTransition(async () => {
      try {
        await action(fd);
        onDone();
      } catch (err) {
        toast.error((err as Error).message);
      }
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      className="flex-1 min-h-0 flex flex-col"
    >
      <DrawerBody className="space-y-4 pb-2">
        <div className="space-y-2">
          <Input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            type="number"
            inputMode="decimal"
            step="0.01"
            className="h-11 text-base"
            aria-label="Cantidad"
          />
          <div className="grid grid-cols-3 gap-1">
            {UNIT_PICKER_GRID.map((u, i) =>
              u === null ? (
                <div key={`empty-${i}`} aria-hidden />
              ) : (
                <button
                  key={u}
                  type="button"
                  onClick={() => setUnit(u)}
                  className={cn(
                    "h-10 w-full rounded-full px-2.5 text-xs border transition",
                    unit === u
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {unitDisplay(u)}
                </button>
              ),
            )}
          </div>
        </div>
      </DrawerBody>
      <DrawerFooter className="pt-2 flex-row gap-2">
        <Button
          type="button"
          variant="ghost"
          size="lg"
          className="flex-1"
          onClick={onDone}
          disabled={pending}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          variant="lime"
          size="lg"
          className="flex-1 rounded-xl"
          disabled={pending}
        >
          {pending ? "Guardando…" : "OK"}
        </Button>
      </DrawerFooter>
    </form>
  );
}
