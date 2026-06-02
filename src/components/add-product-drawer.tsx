"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { createAndAddProductAction } from "@/actions/lists";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Drawer,
  DrawerContent,
  DrawerBody,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerTrigger,
  DrawerClose,
} from "@/components/ui/drawer";
import type {
  StoreOption,
  CategoryOption,
} from "@/components/product-form-drawer";
import {
  UNIT_PICKER_GRID,
  unitDisplay,
  type CanonicalUnit,
} from "@/lib/units";
import { cn } from "@/lib/utils";

// Crea un producto nuevo en el maestro y lo inserta en la lista vigente. Para
// sumar productos que YA existen en el maestro, la vista de edición los muestra
// inline con un botón "+", así que este drawer es solo de alta.
//
// Los `initial*` se leen del buscador y los filtros del editor: lo que el
// usuario tenía tipeado/filtrado se copia al formulario de alta al abrir.
export function AddProductDrawer({
  listId,
  stores,
  categories,
  trigger,
  initialName,
  initialStoreId,
  initialCategoryId,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  onCloseAutoFocus,
}: {
  listId: number;
  stores: StoreOption[];
  categories: CategoryOption[];
  trigger?: React.ReactNode;
  initialName?: string;
  initialStoreId?: number;
  initialCategoryId?: number;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  // Hook que dispara Radix al cerrar para restaurar foco; el padre puede
  // preventDefault y manejarlo a mano (p. ej. devolver al buscador con texto
  // seleccionado).
  onCloseAutoFocus?: (event: Event) => void;
}) {
  const isControlled = controlledOpen !== undefined;
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  // Cambia con cada apertura para forzar un re-mount del formulario y que tome
  // los initial* actuales (lo que el usuario tenga tipeado/filtrado en ese momento).
  const [openSeed, setOpenSeed] = useState(0);

  function handleOpenChange(v: boolean) {
    if (!isControlled) setUncontrolledOpen(v);
    controlledOnOpenChange?.(v);
    if (v) setOpenSeed((s) => s + 1);
  }

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      {(trigger || !isControlled) && (
        <DrawerTrigger asChild>
          {trigger ?? (
            <Button variant="lime" className="rounded-2xl shadow-soft">
              <Plus className="size-4" /> Agregar
            </Button>
          )}
        </DrawerTrigger>
      )}
      <DrawerContent onCloseAutoFocus={onCloseAutoFocus}>
        <div className="mx-auto w-full max-w-md flex-1 min-h-0 flex flex-col">
          <DrawerHeader>
            <DrawerTitle>Crear producto</DrawerTitle>
            <DrawerDescription>
              Se agrega al maestro y a esta lista al vuelo.
            </DrawerDescription>
          </DrawerHeader>

          <CreateNewForm
            key={openSeed}
            listId={listId}
            stores={stores}
            categories={categories}
            initialName={initialName}
            initialStoreId={initialStoreId}
            initialCategoryId={initialCategoryId}
            onDone={() => handleOpenChange(false)}
          />

          <DrawerFooter className="pt-2">
            <DrawerClose asChild>
              <Button variant="ghost" size="lg">
                Cerrar
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function CreateNewForm({
  listId,
  stores,
  categories,
  initialName,
  initialStoreId,
  initialCategoryId,
  onDone,
}: {
  listId: number;
  stores: StoreOption[];
  categories: CategoryOption[];
  initialName?: string;
  initialStoreId?: number;
  initialCategoryId?: number;
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [storeId, setStoreId] = useState(
    initialStoreId ? String(initialStoreId) : "",
  );
  const [categoryId, setCategoryId] = useState(
    initialStoreId && initialCategoryId ? String(initialCategoryId) : "",
  );
  const [unit, setUnit] = useState<CanonicalUnit>("unidad");
  const filteredCats = useMemo(() => {
    if (!storeId) return [];
    return categories.filter((c) => c.storeId === Number(storeId));
  }, [storeId, categories]);
  return (
    <form
      action={(fd) =>
        startTransition(async () => {
          try {
            await createAndAddProductAction(fd);
            toast.success("Producto creado y agregado");
            onDone();
          } catch (err) {
            toast.error((err as Error).message);
          }
        })
      }
      className="flex-1 min-h-0 flex flex-col"
    >
      <DrawerBody className="space-y-4 pb-4">
      <input type="hidden" name="listId" value={listId} />
      <div className="space-y-2">
        <Label htmlFor="new-name">Nombre del producto</Label>
        <Input
          id="new-name"
          name="name"
          required
          autoFocus
          defaultValue={initialName}
          className="h-11"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="new-store">Comercio</Label>
          <select
            id="new-store"
            name="storeId"
            value={storeId}
            onChange={(e) => {
              setStoreId(e.target.value);
              setCategoryId("");
            }}
            required
            className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="" disabled>
              Elegí…
            </option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.emoji} {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="new-cat">Categoría</Label>
          <select
            id="new-cat"
            name="categoryId"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            disabled={!storeId}
            className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm disabled:opacity-50"
          >
            <option value="">— Sin categoría —</option>
            {filteredCats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.emoji} {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="new-qty">Cantidad</Label>
          <Input
            id="new-qty"
            name="defaultQuantityValue"
            type="text"
            inputMode="decimal"
            defaultValue="1"
            required
            className="h-11"
          />
        </div>
        <div className="space-y-2">
          <Label>Unidad</Label>
          <input type="hidden" name="defaultQuantityUnit" value={unit} />
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
                    "h-11 w-full rounded-full px-2.5 text-xs border transition",
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
      </div>
      <Button type="submit" size="lg" disabled={pending} className="w-full rounded-xl">
        {pending ? "Creando…" : "Crear y agregar"}
      </Button>
      </DrawerBody>
    </form>
  );
}
