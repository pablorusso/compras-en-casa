"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import {
  addExistingProductAction,
  createAndAddProductAction,
} from "@/actions/lists";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import type {
  StoreOption,
  CategoryOption,
} from "@/components/product-form-drawer";
import {
  UNIT_PICKER_GRID,
  unitDisplay,
  type CanonicalUnit,
} from "@/lib/units";
import { foldText } from "@/lib/text";
import { cn } from "@/lib/utils";

export type AvailableProduct = {
  id: number;
  name: string;
  storeId: number | null;
  categoryName: string;
  storeName: string;
  defaultQuantityValue: string;
  defaultQuantityUnit: string;
};

export function AddProductDrawer({
  listId,
  available,
  stores,
  categories,
  lockedStoreId,
  trigger,
}: {
  listId: number;
  available: AvailableProduct[];
  stores: StoreOption[];
  categories: CategoryOption[];
  // Si está seteado, el drawer se abre filtrado por este comercio: tab "Del
  // maestro" solo muestra productos de ese comercio, y "Crear nuevo" trae el
  // select de comercio fijo. Sirve para el botón "Agregar a [Comercio]" que
  // aparece en cada sección de la lista.
  lockedStoreId?: number;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"existing" | "new">("existing");
  const [pending, startTransition] = useTransition();

  const lockedStore = lockedStoreId
    ? stores.find((s) => s.id === lockedStoreId) ?? null
    : null;

  const scoped = useMemo(() => {
    if (!lockedStoreId) return available;
    return available.filter((p) => p.storeId === lockedStoreId);
  }, [available, lockedStoreId]);

  const filtered = useMemo(() => {
    const q = foldText(query.trim());
    if (!q) return scoped;
    return scoped.filter(
      (p) =>
        foldText(p.name).includes(q) ||
        foldText(p.categoryName).includes(q) ||
        foldText(p.storeName).includes(q),
    );
  }, [scoped, query]);

  function addExisting(productId: number) {
    const fd = new FormData();
    fd.set("listId", String(listId));
    fd.set("productId", String(productId));
    startTransition(async () => {
      try {
        await addExistingProductAction(fd);
        toast.success("Agregado a la lista");
      } catch (err) {
        toast.error((err as Error).message);
      }
    });
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        {trigger ?? (
          <Button variant="lime" className="rounded-2xl shadow-soft">
            <Plus className="size-4" /> Agregar
          </Button>
        )}
      </DrawerTrigger>
      <DrawerContent>
        <div className="mx-auto w-full max-w-md max-h-[85svh] flex flex-col">
          <DrawerHeader>
            <DrawerTitle>
              {lockedStore
                ? `Agregar a ${lockedStore.name}`
                : "Agregar producto"}
            </DrawerTitle>
            <DrawerDescription>
              {lockedStore
                ? `Sumá productos de ${lockedStore.name} o creá uno nuevo al vuelo.`
                : "Sumá productos del maestro o creá uno nuevo al vuelo."}
            </DrawerDescription>
          </DrawerHeader>

          <div className="px-4 pb-2 grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => setTab("existing")}
              className={cn(
                "rounded-xl px-3 py-2 text-sm font-medium transition",
                tab === "existing"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground",
              )}
            >
              Del maestro
            </button>
            <button
              type="button"
              onClick={() => setTab("new")}
              className={cn(
                "rounded-xl px-3 py-2 text-sm font-medium transition",
                tab === "new"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground",
              )}
            >
              Crear nuevo
            </button>
          </div>

          {tab === "existing" ? (
            <>
              <div className="px-4 py-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar…"
                    autoFocus
                    className="pl-9 h-11"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-4 pb-4">
                {scoped.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    {lockedStore
                      ? `Todos los productos de ${lockedStore.name} ya están en la lista.`
                      : "Todos los productos del maestro ya están en la lista."}
                  </p>
                ) : filtered.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No hay coincidencias.
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {filtered.map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => addExisting(p.id)}
                          disabled={pending}
                          className="w-full flex items-center gap-3 rounded-xl border bg-card px-3 py-2 hover:border-primary/50 transition text-left"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-medium break-words">{p.name}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {p.storeName} · {p.categoryName}
                            </div>
                          </div>
                          <Plus className="size-4 text-primary" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          ) : (
            <CreateNewForm
              listId={listId}
              stores={stores}
              categories={categories}
              lockedStoreId={lockedStoreId}
              onDone={() => setOpen(false)}
            />
          )}

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
  lockedStoreId,
  onDone,
}: {
  listId: number;
  stores: StoreOption[];
  categories: CategoryOption[];
  lockedStoreId?: number;
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [storeId, setStoreId] = useState(
    lockedStoreId ? String(lockedStoreId) : "",
  );
  const [categoryId, setCategoryId] = useState("");
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
      className="flex-1 overflow-y-auto px-4 space-y-4 pb-4"
    >
      <input type="hidden" name="listId" value={listId} />
      <div className="space-y-2">
        <Label htmlFor="new-name">Nombre del producto</Label>
        <Input id="new-name" name="name" required autoFocus className="h-11" />
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
            disabled={lockedStoreId != null}
            className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm disabled:opacity-70 disabled:cursor-not-allowed"
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
            type="number"
            inputMode="decimal"
            min="0"
            step="0.001"
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
      <p className="text-xs text-muted-foreground">
        Se agregará al maestro y a esta lista.
      </p>
      <Button type="submit" size="lg" disabled={pending} className="w-full rounded-xl">
        {pending ? "Creando…" : "Crear y agregar"}
      </Button>
    </form>
  );
}
