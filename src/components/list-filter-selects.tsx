"use client";

import type {
  ListCategoryOption,
  ListStoreOption,
} from "@/lib/format";

export function ListFilterSelects({
  storeOptions,
  filterCats,
  storeFilter,
  categoryFilter,
  onStoreChange,
  onCategoryChange,
}: {
  storeOptions: ListStoreOption[];
  filterCats: ListCategoryOption[];
  storeFilter: string;
  categoryFilter: string;
  onStoreChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <select
        aria-label="Filtrar por comercio"
        value={storeFilter}
        onChange={(e) => onStoreChange(e.target.value)}
        className="h-11 w-full rounded-2xl border border-input bg-background px-3.5 text-sm"
      >
        <option value="">Todos los comercios</option>
        {storeOptions.map((s) => (
          <option key={s.id} value={s.id}>
            {s.emoji} {s.name}
          </option>
        ))}
      </select>
      <select
        aria-label="Filtrar por categoría"
        value={categoryFilter}
        onChange={(e) => onCategoryChange(e.target.value)}
        disabled={!storeFilter}
        className="h-11 w-full rounded-2xl border border-input bg-background px-3.5 text-sm disabled:opacity-50"
      >
        <option value="">Todas las categorías</option>
        {filterCats.map((c) => (
          <option key={c.id} value={c.id}>
            {c.emoji} {c.name}
          </option>
        ))}
      </select>
    </div>
  );
}
