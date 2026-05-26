"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, Pencil, Leaf, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { createProductAction, updateProductAction } from "@/actions/products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { MONTHS_SHORT_ES } from "@/lib/seasonality";
import { UNIT_PICKER_GRID, isCanonicalUnit, unitDisplay, type CanonicalUnit } from "@/lib/units";
import { cn } from "@/lib/utils";
import type { ProductRow } from "@/components/products-manager";

export type StoreOption = {
  id: number;
  name: string;
  emoji: string;
};

export type CategoryOption = {
  id: number;
  name: string;
  emoji: string;
  storeId: number;
  storeName: string;
  storeEmoji: string;
};

export function ProductFormDrawer({
  mode,
  product,
  stores,
  categories,
}: {
  mode: "create" | "edit";
  product?: ProductRow;
  stores: StoreOption[];
  categories: CategoryOption[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [isSeasonal, setIsSeasonal] = useState(product?.isSeasonal ?? false);
  const [selectedMonths, setSelectedMonths] = useState<number[]>(product?.seasonMonths ?? []);
  const [excludeFromAutoAdd, setExcludeFromAutoAdd] = useState(
    product?.excludeFromAutoAdd ?? false,
  );
  const initialUnit = isCanonicalUnit(product?.defaultQuantityUnit ?? "")
    ? (product!.defaultQuantityUnit as CanonicalUnit)
    : ("unidad" as const);
  const [unit, setUnit] = useState<CanonicalUnit>(initialUnit);
  const [storeId, setStoreId] = useState<string>(
    product?.storeId ? String(product.storeId) : "",
  );
  const [categoryId, setCategoryId] = useState<string>(
    product?.categoryId ? String(product.categoryId) : "",
  );

  const filteredCats = useMemo(() => {
    if (!storeId) return [];
    return categories.filter((c) => c.storeId === Number(storeId));
  }, [storeId, categories]);

  function toggleMonth(m: number) {
    setSelectedMonths((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m].sort((a, b) => a - b),
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
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
            for (const m of selectedMonths) fd.append("seasonMonths", String(m));
            if (isSeasonal) fd.set("isSeasonal", "on");
            if (excludeFromAutoAdd) fd.set("excludeFromAutoAdd", "on");
            fd.set("defaultQuantityUnit", unit);
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
          className="mx-auto w-full max-w-md max-h-[85svh] overflow-y-auto"
        >
          <DrawerHeader>
            <DrawerTitle>{mode === "create" ? "Nuevo producto" : "Editar producto"}</DrawerTitle>
            <DrawerDescription>
              Para productos de temporada elegí los meses.
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 space-y-5 pb-4">
            {mode === "edit" && <input type="hidden" name="id" value={product!.id} />}

            <div className="space-y-2">
              <Label htmlFor="p-name">Nombre</Label>
              <Input
                id="p-name"
                name="name"
                defaultValue={product?.name ?? ""}
                placeholder="Banana, Detergente…"
                required
                autoFocus
                className="h-11"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="p-store">Comercio</Label>
                <select
                  id="p-store"
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
                <Label htmlFor="p-cat">Categoría</Label>
                <select
                  id="p-cat"
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
                <Label htmlFor="p-qty">Cantidad habitual</Label>
                <Input
                  id="p-qty"
                  name="defaultQuantityValue"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.001"
                  defaultValue={product?.defaultQuantityValue ?? "1"}
                  required
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label>Unidad</Label>
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

            <div className="rounded-xl border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Leaf className="size-4 text-primary" />
                  <Label htmlFor="p-seasonal" className="cursor-pointer">
                    Producto de temporada
                  </Label>
                </div>
                <Switch
                  id="p-seasonal"
                  name="isSeasonal-switch"
                  checked={isSeasonal}
                  onCheckedChange={(v) => {
                    setIsSeasonal(v);
                    if (!v) setSelectedMonths([]);
                  }}
                />
              </div>
              {isSeasonal && (
                <div className="grid grid-cols-6 gap-1.5">
                  {MONTHS_SHORT_ES.map((m, idx) => {
                    const month = idx + 1;
                    const sel = selectedMonths.includes(month);
                    return (
                      <button
                        type="button"
                        key={m}
                        onClick={() => toggleMonth(month)}
                        className={cn(
                          "rounded-lg py-1.5 text-xs font-medium transition border",
                          sel
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border text-muted-foreground hover:border-primary/40",
                        )}
                      >
                        {m}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="rounded-xl border p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <EyeOff className="size-4 text-primary" />
                  <Label htmlFor="p-exclude" className="cursor-pointer">
                    No agregar automáticamente a listas nuevas
                  </Label>
                </div>
                <Switch
                  id="p-exclude"
                  name="excludeFromAutoAdd-switch"
                  checked={excludeFromAutoAdd}
                  onCheckedChange={setExcludeFromAutoAdd}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Queda en el maestro pero no se suma solo al crear una lista. Si clonás una
                lista que ya lo tiene, se mantiene; y podés agregarlo a mano cuando quieras.
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
