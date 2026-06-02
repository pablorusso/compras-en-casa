"use client";

import { useMemo, useState } from "react";
import { Leaf, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { MONTHS_SHORT_ES } from "@/lib/seasonality";
import {
  UNIT_PICKER_GRID,
  isCanonicalUnit,
  unitDisplay,
  type CanonicalUnit,
} from "@/lib/units";
import { cn } from "@/lib/utils";

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

// Campos compartidos del alta/edición de producto. Lo usan tanto el maestro
// (ProductFormDrawer) como el alta al vuelo desde la lista (AddProductDrawer):
// así el formulario es idéntico en ambas vistas. El estado vive acá y se emite
// vía inputs ocultos, de modo que el <form action> padre lee el FormData nativo
// sin appends manuales. Cada vista mantiene su propia acción de submit.
export function ProductFormFields({
  stores,
  categories,
  initialName,
  initialStoreId,
  initialCategoryId,
  initialQuantityValue,
  initialUnit,
  initialIsSeasonal,
  initialSeasonMonths,
  initialExcludeFromAutoAdd,
  autoFocusName,
}: {
  stores: StoreOption[];
  categories: CategoryOption[];
  initialName?: string;
  initialStoreId?: number | null;
  initialCategoryId?: number | null;
  initialQuantityValue?: string;
  initialUnit?: string;
  initialIsSeasonal?: boolean;
  initialSeasonMonths?: number[];
  initialExcludeFromAutoAdd?: boolean;
  autoFocusName?: boolean;
}) {
  const [storeId, setStoreId] = useState<string>(
    initialStoreId ? String(initialStoreId) : "",
  );
  // La categoría solo tiene sentido si vino con un comercio: si no, la limpiamos.
  const [categoryId, setCategoryId] = useState<string>(
    initialStoreId && initialCategoryId ? String(initialCategoryId) : "",
  );
  const [unit, setUnit] = useState<CanonicalUnit>(
    isCanonicalUnit(initialUnit ?? "") ? (initialUnit as CanonicalUnit) : "unidad",
  );
  const [isSeasonal, setIsSeasonal] = useState(initialIsSeasonal ?? false);
  const [selectedMonths, setSelectedMonths] = useState<number[]>(
    initialSeasonMonths ?? [],
  );
  const [excludeFromAutoAdd, setExcludeFromAutoAdd] = useState(
    initialExcludeFromAutoAdd ?? false,
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
    <>
      <div className="space-y-2">
        <Label htmlFor="p-name">Nombre</Label>
        <Input
          id="p-name"
          name="name"
          defaultValue={initialName ?? ""}
          placeholder="Banana, Detergente…"
          required
          autoFocus={autoFocusName}
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
            type="text"
            inputMode="decimal"
            defaultValue={initialQuantityValue ?? "1"}
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
            checked={excludeFromAutoAdd}
            onCheckedChange={setExcludeFromAutoAdd}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Queda en el maestro pero no se suma solo al crear una lista. Si clonás una
          lista que ya lo tiene, se mantiene; y podés agregarlo a mano cuando quieras.
        </p>
      </div>

      {/* Valores controlados que se envían con el form nativo del padre. Van al
          final para no contar como primer hijo en los `space-y-*` del padre
          (los input[type=hidden] son siblings visibles para ese selector). */}
      <input type="hidden" name="defaultQuantityUnit" value={unit} />
      <input type="hidden" name="isSeasonal" value={isSeasonal ? "on" : ""} />
      {selectedMonths.map((m) => (
        <input key={m} type="hidden" name="seasonMonths" value={m} />
      ))}
      <input
        type="hidden"
        name="excludeFromAutoAdd"
        value={excludeFromAutoAdd ? "on" : ""}
      />
    </>
  );
}
