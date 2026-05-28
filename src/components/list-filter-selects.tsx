"use client";

import type {
  ListCategoryOption,
  ListStoreOption,
} from "@/lib/format";

export type InclusionFilter = "all" | "included" | "excluded";

export function ListFilterSelects({
  storeOptions,
  filterCats,
  storeFilter,
  categoryFilter,
  onStoreChange,
  onCategoryChange,
  inclusion,
  onInclusionChange,
}: {
  storeOptions: ListStoreOption[];
  filterCats: ListCategoryOption[];
  storeFilter: string;
  categoryFilter: string;
  onStoreChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  inclusion?: InclusionFilter;
  onInclusionChange?: (value: InclusionFilter) => void;
}) {
  const showInclusion = inclusion !== undefined && onInclusionChange;
  return (
    <div className="flex items-center gap-2">
      {showInclusion && (
        <select
          aria-label="Filtrar por inclusión"
          value={inclusion}
          onChange={(e) => onInclusionChange(e.target.value as InclusionFilter)}
          className="h-9 shrink-0 rounded-2xl border border-input bg-background px-2 text-xs"
        >
          <option value="all">Productos</option>
          <option value="included">Incluidos</option>
          <option value="excluded">Excluidos</option>
        </select>
      )}
      <select
        aria-label="Filtrar por comercio"
        value={storeFilter}
        onChange={(e) => onStoreChange(e.target.value)}
        className="h-9 flex-1 min-w-0 rounded-2xl border border-input bg-background px-2 text-xs"
      >
        <option value="">Comercios</option>
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
        className="h-9 flex-1 min-w-0 rounded-2xl border border-input bg-background px-2 text-xs disabled:opacity-50"
      >
        <option value="">Categorías</option>
        {filterCats.map((c) => (
          <option key={c.id} value={c.id}>
            {c.emoji} {c.name}
          </option>
        ))}
      </select>
    </div>
  );
}
