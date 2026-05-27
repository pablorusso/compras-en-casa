"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil } from "lucide-react";
import { toast } from "sonner";
import { createCategoryAction, updateCategoryAction } from "@/actions/stores";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { EyeOff } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerTrigger,
  DrawerClose,
} from "@/components/ui/drawer";

export type CategoryFormValue = {
  id: number;
  name: string;
  emoji: string;
  excludeFromAutoAdd: boolean;
};

/**
 * Drawer para crear o editar una categoría (nombre, emoji y exclusión del
 * auto-add). En modo crear el emoji se autogenera con IA si se deja vacío. Lo
 * usan tanto la gestión de comercios como el organizador de comercio.
 *
 * `onSuccess` se llama tras crear/editar con éxito; el organizador lo usa para
 * `router.refresh()` (su ruta no la cubre el `revalidatePath` de la acción).
 */
export function CategoryFormDrawer({
  mode,
  storeId,
  category,
  onSuccess,
}: {
  mode: "create" | "edit";
  storeId?: number;
  category?: CategoryFormValue;
  onSuccess?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [excludeFromAutoAdd, setExcludeFromAutoAdd] = useState(
    category?.excludeFromAutoAdd ?? false,
  );
  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        {mode === "create" ? (
          <Button variant="outline" className="w-full sm:flex-1 rounded-xl">
            <Plus className="size-4" /> Agregar categoría
          </Button>
        ) : (
          <Button variant="ghost" size="icon" className="size-8" aria-label="Editar categoría" title="Editar categoría">
            <Pencil className="size-4" />
          </Button>
        )}
      </DrawerTrigger>
      <DrawerContent>
        <form
          action={(fd) => {
            if (excludeFromAutoAdd) fd.set("excludeFromAutoAdd", "on");
            startTransition(async () => {
              try {
                if (mode === "create") await createCategoryAction(fd);
                else await updateCategoryAction(fd);
                toast.success(mode === "create" ? "Categoría creada" : "Categoría actualizada");
                setOpen(false);
                onSuccess?.();
              } catch (err) {
                toast.error((err as Error).message);
              }
            });
          }}
          className="mx-auto w-full max-w-md"
        >
          <DrawerHeader>
            <DrawerTitle>
              {mode === "create" ? "Nueva categoría" : "Editar categoría"}
            </DrawerTitle>
            <DrawerDescription>Carne, pollo, limpieza, frutas, lácteos…</DrawerDescription>
          </DrawerHeader>
          <div className="px-4 space-y-4">
            {mode === "edit" && <input type="hidden" name="id" value={category!.id} />}
            {mode === "create" && (
              <input type="hidden" name="storeId" value={storeId} />
            )}
            <div className="space-y-2">
              <Label htmlFor="cat-name">Nombre</Label>
              <Input
                id="cat-name"
                name="name"
                defaultValue={category?.name ?? ""}
                placeholder="Carne, Limpieza…"
                required
                autoFocus
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-emoji">Emoji</Label>
              <Input
                id="cat-emoji"
                name="emoji"
                defaultValue={category?.emoji ?? ""}
                placeholder="Auto ✨"
                className="h-11 text-2xl text-center w-20"
                maxLength={4}
              />
            </div>
            <div className="rounded-xl border p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <EyeOff className="size-4 text-primary" />
                  <Label htmlFor="cat-exclude" className="cursor-pointer">
                    No agregar automáticamente a listas nuevas
                  </Label>
                </div>
                <Switch
                  id="cat-exclude"
                  name="excludeFromAutoAdd-switch"
                  checked={excludeFromAutoAdd}
                  onCheckedChange={setExcludeFromAutoAdd}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Ningún producto de esta categoría se suma solo al crear una lista. Siguen en el
                maestro y se pueden agregar a mano.
              </p>
            </div>
          </div>
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
