import { useCallback, useMemo, useState } from "react";
import {
  deriveListFilterOptions,
  filterItems,
  type ListCategoryOption,
  type ListStoreOption,
} from "@/lib/format";
import type { ShoppingListItem } from "@/db/schema";

export type ListFiltersState = {
  query: string;
  setQuery: (value: string) => void;
  storeFilter: string;
  selectStore: (value: string) => void;
  categoryFilter: string;
  setCategoryFilter: (value: string) => void;
  storeOptions: ListStoreOption[];
  filterCats: ListCategoryOption[];
  filteredItems: ShoppingListItem[];
  isFiltering: boolean;
};

/**
 * Estado y lógica del filtro de comercio + categoría para las vistas de lista de
 * compras. Las opciones se derivan de los propios ítems (no de las tablas maestras),
 * y la categoría depende del comercio elegido, igual que en el maestro de productos.
 */
export function useListFilters(items: ShoppingListItem[]): ListFiltersState {
  const [query, setQuery] = useState("");
  const [storeFilter, setStoreFilter] = useState(""); // store id como string
  const [categoryFilter, setCategoryFilter] = useState(""); // category id como string

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
        query,
        storeId: storeFilter ? Number(storeFilter) : null,
        categoryId: categoryFilter ? Number(categoryFilter) : null,
      }),
    [items, query, storeFilter, categoryFilter],
  );

  const isFiltering =
    query.trim().length > 0 || storeFilter !== "" || categoryFilter !== "";

  // Al cambiar de comercio se resetea la categoría (como en products-manager).
  const selectStore = useCallback((value: string) => {
    setStoreFilter(value);
    setCategoryFilter("");
  }, []);

  return {
    query,
    setQuery,
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
