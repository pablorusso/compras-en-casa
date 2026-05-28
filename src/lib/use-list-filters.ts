import { useCallback, useEffect, useMemo, useState } from "react";
import {
  deriveListFilterOptions,
  filterItems,
  type ListCategoryOption,
  type ListStoreOption,
} from "@/lib/format";
import type { ShoppingListItem } from "@/db/schema";

export type ListFiltersState<T extends ShoppingListItem = ShoppingListItem> = {
  query: string;
  setQuery: (value: string) => void;
  /** Texto del buscador con debounce aplicado: lo que efectivamente filtra. */
  debouncedQuery: string;
  storeFilter: string;
  selectStore: (value: string) => void;
  categoryFilter: string;
  setCategoryFilter: (value: string) => void;
  storeOptions: ListStoreOption[];
  filterCats: ListCategoryOption[];
  filteredItems: T[];
  isFiltering: boolean;
};

const QUERY_DEBOUNCE_MS = 350;

/**
 * Estado y lógica del filtro de comercio + categoría para las vistas de lista de
 * compras. Las opciones se derivan de los propios ítems (no de las tablas maestras),
 * y la categoría depende del comercio elegido, igual que en el maestro de productos.
 */
export function useListFilters<T extends ShoppingListItem = ShoppingListItem>(
  items: T[],
): ListFiltersState<T> {
  const [query, setQueryState] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [storeFilter, setStoreFilter] = useState(""); // store id como string
  const [categoryFilter, setCategoryFilter] = useState(""); // category id como string

  // Al limpiar el buscador, sincronizamos el debounced al instante para que la
  // lista vuelva a su estado completo sin esperar el delay (ej. tras ENTER).
  const setQuery = useCallback((value: string) => {
    setQueryState(value);
    if (value === "") setDebouncedQuery("");
  }, []);

  useEffect(() => {
    if (query === debouncedQuery) return;
    const t = setTimeout(() => setDebouncedQuery(query), QUERY_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query, debouncedQuery]);

  const { storeOptions, categoryOptions } = useMemo(
    () => deriveListFilterOptions(items),
    [items],
  );

  const filterCats = useMemo(
    () =>
      storeFilter
        ? categoryOptions.filter((c) => c.storeId === Number(storeFilter))
        : [],
    [storeFilter, categoryOptions],
  );

  const filteredItems = useMemo(
    () =>
      filterItems(items, {
        query: debouncedQuery,
        storeId: storeFilter ? Number(storeFilter) : null,
        categoryId: categoryFilter ? Number(categoryFilter) : null,
      }),
    [items, debouncedQuery, storeFilter, categoryFilter],
  );

  const isFiltering =
    debouncedQuery.trim().length > 0 ||
    storeFilter !== "" ||
    categoryFilter !== "";

  // Al cambiar de comercio se resetea la categoría (como en products-manager).
  const selectStore = useCallback((value: string) => {
    setStoreFilter(value);
    setCategoryFilter("");
  }, []);

  return {
    query,
    setQuery,
    debouncedQuery,
    storeFilter,
    selectStore,
    categoryFilter,
    setCategoryFilter,
    storeOptions,
    filterCats,
    filteredItems,
    isFiltering,
  };
}
