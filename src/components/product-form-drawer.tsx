"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil } from "lucide-react";
import { toast } from "sonner";
import { createProductAction, updateProductAction } from "@/actions/products";
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
import type { ProductRow } from "@/components/products-manager";

// Re-exportados para no romper los imports existentes (list-editor,
// products-manager, add-product-drawer los toman desde acá históricamente).
export type { StoreOption, CategoryOption };

export function ProductFormDrawer({
  mode,
  product,
  stores,
  categories,
  defaultStoreId,
}: {
  mode: "create" | "edit";
  product?: ProductRow;
  stores: StoreOption[];
  categories: CategoryOption[];
  defaultStoreId?: number | null;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  // Cambia con cada apertura para re-montar los campos y que tomen los valores
  // iniciales frescos: en create limpia todo (incluido temporada/exclude), en
  // edit descarta cambios sin guardar de una apertura previa.
  const [openSeed, setOpenSeed] = useState(0);

  function handleOpenChange(next: boolean) {
    if (next) setOpenSeed((s) => s + 1);
    setOpen(next);
  }

  // En create precargamos el comercio default de settings (si hay); en edit
  // usamos el comercio que ya tiene el producto.
  const initialStoreId =
    product?.storeId ?? (mode === "create" ? defaultStoreId ?? null : null);

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerTrigger asChild>
        {mode === "create" ? (
          <Button className="rounded-xl shrink-0">
            <Plus className="size-4" /> Producto
          </Button>
        ) : (
          <Button variant="ghost" size="icon" className="size-8" aria-label="Editar producto">
            <Pencil className="size-4" />
          </Button>
        )}
      </DrawerTrigger>
      <DrawerContent>
        <form
          action={(fd) => {
            startTransition(async () => {
              try {
                if (mode === "create") await createProductAction(fd);
                else await updateProductAction(fd);
                toast.success(mode === "create" ? "Producto creado" : "Producto actualizado");
                setOpen(false);
              } catch (err) {
                toast.error((err as Error).message);
              }
            });
          }}
          className="mx-auto w-full max-w-md flex-1 min-h-0 flex flex-col"
        >
          <DrawerHeader>
            <DrawerTitle>{mode === "create" ? "Nuevo producto" : "Editar producto"}</DrawerTitle>
            <DrawerDescription>
              Para productos de temporada elegí los meses.
            </DrawerDescription>
          </DrawerHeader>
          <DrawerBody className="space-y-5 pb-4">
            {mode === "edit" && <input type="hidden" name="id" value={product!.id} />}
            <ProductFormFields
              key={openSeed}
              stores={stores}
              categories={categories}
              initialName={product?.name}
              initialStoreId={initialStoreId}
              initialCategoryId={product?.categoryId}
              initialQuantityValue={product?.defaultQuantityValue}
              initialUnit={product?.defaultQuantityUnit}
              initialIsSeasonal={product?.isSeasonal}
              initialSeasonMonths={product?.seasonMonths}
              initialExcludeFromAutoAdd={product?.excludeFromAutoAdd}
              autoFocusName
            />
          </DrawerBody>
          <DrawerFooter>
            <Button type="submit" size="lg" disabled={pending} className="rounded-xl">
              {pending ? "Guardando…" : mode === "create" ? "Crear" : "Guardar"}
            </Button>
            <DrawerClose asChild>
              <Button type="button" variant="ghost" size="lg">
                Cancelar
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
