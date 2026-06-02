"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { createAndAddProductAction } from "@/actions/lists";
import { Button } from "@/components/ui/button";
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
import {
  ProductFormFields,
  type StoreOption,
  type CategoryOption,
} from "@/components/product-form-fields";

// Crea un producto nuevo en el maestro y lo inserta en la lista vigente. Para
// sumar productos que YA existen en el maestro, la vista de edición los muestra
// inline con un botón "+", así que este drawer es solo de alta.
//
// Usa los mismos campos que el maestro (ProductFormFields), incluyendo temporada
// y "no agregar automáticamente a listas nuevas". Los `initial*` se leen del
// buscador y los filtros del editor: lo que el usuario tenía tipeado/filtrado se
// copia al formulario de alta al abrir.
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
        <ProductFormFields
          stores={stores}
          categories={categories}
          initialName={initialName}
          initialStoreId={initialStoreId}
          initialCategoryId={initialCategoryId}
          autoFocusName
        />
        <Button type="submit" size="lg" disabled={pending} className="w-full rounded-xl">
          {pending ? "Creando…" : "Crear y agregar"}
        </Button>
      </DrawerBody>
    </form>
  );
}
