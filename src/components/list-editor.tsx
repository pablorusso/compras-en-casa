"use client";

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Minus,
  Trash2,
  Search,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  X,
  MessageSquare,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";
import {
  addExistingProductAction,
  removeItemAction,
  updateItemNotesAction,
  updateItemQuantityAction,
} from "@/actions/lists";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { QuantityBadge } from "@/components/quantity-badge";
import { SectionHeading } from "@/components/section-heading";
import { SwipeableRow, type SwipeAction } from "@/components/swipeable-row";
import { EmptyList } from "@/components/illustrations";
import { useIsTouch } from "@/lib/use-is-touch";
import { playSound, preloadSound } from "@/lib/play-sound";
import { AddProductDrawer } from "@/components/add-product-drawer";
import {
  QuantityEditDrawer,
  type QuantityTarget,
} from "@/components/quantity-edit-drawer";
import { DeleteProductConfirmDialog } from "@/components/delete-product-dialog";
import { getStoreStyle } from "@/lib/store-style";
import {
  filterItems,
  groupItems,
  normalizeDecimal,
  sanitizeQuantityInput,
  toEditQuantity,
} from "@/lib/format";
import {
  ListFilterSelects,
  type InclusionFilter,
} from "@/components/list-filter-selects";
import { useListFilters } from "@/lib/use-list-filters";
import { isCanonicalUnit, stepQuantity, UNIT_PICKER_GRID, unitDisplay, type CanonicalUnit } from "@/lib/units";
import type { ShoppingListItem } from "@/db/schema";
import type {
  StoreOption,
  CategoryOption,
} from "@/components/product-form-drawer";
import { cn } from "@/lib/utils";

type EditorKind = "qty" | "notes";
type ActiveEditor = { id: number; kind: EditorKind } | null;

// Producto del maestro que NO está en la lista. Trae los campos desnormalizados
// completos para poder agruparlo/filtrarlo igual que un ítem de la lista.
export type ExcludedProduct = {
  productId: number;
  productName: string;
  categoryId: number | null;
  categoryName: string | null;
  categoryEmoji: string | null;
  categorySortOrder: number;
  storeId: number | null;
  storeName: string | null;
  storeEmoji: string | null;
  storeAddress: string | null;
  storeSortOrder: number;
  defaultQuantityValue: string;
  defaultQuantityUnit: string;
};

// Fila unificada del editor: un ítem de la lista (inList) o un producto del
// maestro disponible para agregar (no inList).
type EditorItem = ShoppingListItem & { inList: boolean };

// Sintetiza un producto disponible como ShoppingListItem para reusar todo el
// pipeline de agrupado/filtrado. El id es negativo (`-productId`) para no
// colisionar con ids reales (serial positivo); nunca llega a una server action.
function toEditorItem(p: ExcludedProduct, listId: number): EditorItem {
  return {
    id: -p.productId,
    listId,
    productId: p.productId,
    productName: p.productName,
    categoryId: p.categoryId,
    categoryName: p.categoryName,
    categoryEmoji: p.categoryEmoji,
    categorySortOrder: p.categorySortOrder,
    storeId: p.storeId,
    storeName: p.storeName,
    storeEmoji: p.storeEmoji,
    storeAddress: p.storeAddress,
    storeSortOrder: p.storeSortOrder,
    quantityValue: p.defaultQuantityValue,
    quantityUnit: p.defaultQuantityUnit,
    notes: null,
    sortOrder: 0,
    inList: false,
  };
}

// Key estable por producto (continuidad de animación al alternar incluido↔
// disponible). Cae al id sólo para ítems huérfanos sin productId.
function keyFor(item: EditorItem): string {
  return item.productId != null ? `p-${item.productId}` : `i-${item.id}`;
}

export function ListEditor({
  list,
  items,
  excluded,
  stores,
  categories,
  header,
}: {
  list: { id: number; name: string };
  items: ShoppingListItem[];
  excluded: ExcludedProduct[];
  stores: StoreOption[];
  categories: CategoryOption[];
  header?: React.ReactNode;
}) {
  // Borrado optimista con opción de deshacer: el ítem se oculta de inmediato y
  // el borrado real en el servidor se ejecuta tras un breve margen.
  const [hiddenIds, setHiddenIds] = useState<Set<number>>(new Set());
  const deleteTimers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  // Espejo del flag `isSearching` accesible desde callbacks estables, sin
  // meter `isSearching` en deps y romper la memoización de las filas. Se
  // actualiza inline más abajo, una vez computado el valor reactivo.
  const isSearchingRef = useRef(false);

  const searchRef = useRef<HTMLInputElement>(null);

  // Tras una acción desde el buscador (agregar/quitar) volvemos al input con
  // todo el texto seleccionado. Así el usuario ve cómo el producto cambia de
  // estado en pantalla y, si quiere otra búsqueda, basta con empezar a tipear
  // y el texto seleccionado se reemplaza.
  const focusAndSelectSearch = useCallback(() => {
    const input = searchRef.current;
    if (!input) return;
    input.focus();
    input.select();
  }, []);

  const commitDelete = useCallback((id: number) => {
    deleteTimers.current.delete(id);
    const fd = new FormData();
    fd.set("id", String(id));
    removeItemAction(fd).catch((err) => toast.error((err as Error).message));
  }, []);

  // Cancela un borrado pendiente: limpia el timer, descarta el toast y vuelve
  // a hacer visible el ítem como "en la lista".
  const undoDelete = useCallback(
    (id: number) => {
      const t = deleteTimers.current.get(id);
      if (t) clearTimeout(t);
      deleteTimers.current.delete(id);
      toast.dismiss(`delete-${id}`);
      setHiddenIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      if (isSearchingRef.current) focusAndSelectSearch();
    },
    [focusAndSelectSearch],
  );

  const requestDelete = useCallback(
    (item: ShoppingListItem) => {
      playSound("/sounds/ehnop.mp4");
      setHiddenIds((prev) => new Set(prev).add(item.id));
      const timer = setTimeout(() => commitDelete(item.id), 5000);
      deleteTimers.current.set(item.id, timer);
      toast.success(`"${item.productName}" borrado`, {
        id: `delete-${item.id}`,
        duration: 5000,
        action: {
          label: "Deshacer",
          onClick: () => undoDelete(item.id),
        },
      });
      if (isSearchingRef.current) focusAndSelectSearch();
    },
    [commitDelete, undoDelete, focusAndSelectSearch],
  );

  // Precarga el sonido de borrado para que el primer uso no tenga lag.
  useEffect(() => {
    preloadSound("/sounds/ehnop.mp4");
  }, []);

  // Al desmontar, confirmar de inmediato los borrados pendientes.
  useEffect(() => {
    const timers = deleteTimers.current;
    return () => {
      timers.forEach((timer, id) => {
        clearTimeout(timer);
        const fd = new FormData();
        fd.set("id", String(id));
        removeItemAction(fd).catch(() => {});
      });
      timers.clear();
    };
  }, []);

  // Agrega un producto existente del maestro a la lista. La revalidación del
  // server mueve el producto de "disponible" a "en la lista". Devuelve el id
  // del nuevo shoppingListItem (o null si ya estaba por una race).
  const addProductRequest = useCallback(
    async (productId: number): Promise<number | null> => {
      const fd = new FormData();
      fd.set("listId", String(list.id));
      fd.set("productId", String(productId));
      const res = await addExistingProductAction(fd);
      return res?.itemId ?? null;
    },
    [list.id],
  );

  // Productos en la lista (sin los ocultos por borrado optimista) + disponibles.
  const visibleIncluded = useMemo<EditorItem[]>(
    () =>
      items
        .filter((i) => !hiddenIds.has(i.id))
        .map((i) => ({ ...i, inList: true })),
    [items, hiddenIds],
  );
  // Ítems en ventana de borrado optimista (5s antes del commit): se sintetizan
  // como "excluidos pendientes" para que sigan visibles en pantalla (grisados)
  // en vez de desaparecer. Cuando el commit se confirma y revalida, el server
  // los devuelve en `excluded` y la transición es transparente.
  const pendingExcludedItems = useMemo<EditorItem[]>(
    () =>
      items
        .filter((i) => hiddenIds.has(i.id))
        .map((i) => ({ ...i, inList: false })),
    [items, hiddenIds],
  );
  // Mapa productId → itemId pendiente, para que el click en "+" sobre un
  // pendiente cancele el borrado en curso en vez de mandar un add que choca
  // con el remove encolado.
  const pendingByProductId = useMemo(() => {
    const map = new Map<number, number>();
    for (const i of items) {
      if (i.productId != null && hiddenIds.has(i.id)) {
        map.set(i.productId, i.id);
      }
    }
    return map;
  }, [items, hiddenIds]);
  // Borrado optimista del maestro (sin undo, la confirmación del dialog ya
  // cumple ese rol). Si el server action falla, la revalidación termina
  // devolviendo la fila visible.
  const [hiddenProductIds, setHiddenProductIds] = useState<Set<number>>(
    new Set(),
  );
  const excludedItems = useMemo<EditorItem[]>(
    () =>
      excluded
        .filter((p) => !hiddenProductIds.has(p.productId))
        .map((p) => toEditorItem(p, list.id)),
    [excluded, list.id, hiddenProductIds],
  );

  // Add que detecta el caso "deshacer un borrado pendiente": en lugar de
  // pegarle al server (que entraría en race con el remove encolado), cancela
  // el borrado y deja el ítem como estaba.
  const handleAddOrUndo = useCallback(
    async (productId: number): Promise<number | null> => {
      const pendingItemId = pendingByProductId.get(productId);
      if (pendingItemId != null) {
        undoDelete(pendingItemId);
        return null;
      }
      // Foco inmediato: el server tarda y queremos que el siguiente tipeo
      // reemplace el texto sin esperar la respuesta.
      if (isSearchingRef.current) focusAndSelectSearch();
      return addProductRequest(productId);
    },
    [pendingByProductId, undoDelete, addProductRequest, focusAndSelectSearch],
  );

  // Target del dialog de confirmación. Un solo dialog a nivel editor atiende
  // las tres entradas (swipe, botón de fila, botón del buscador).
  const [deleteProductTarget, setDeleteProductTarget] = useState<{
    productId: number;
    productName: string;
  } | null>(null);
  const requestProductDelete = useCallback(
    (productId: number, productName: string) => {
      setDeleteProductTarget({ productId, productName });
    },
    [],
  );
  const combined = useMemo(
    () => [...visibleIncluded, ...pendingExcludedItems, ...excludedItems],
    [visibleIncluded, pendingExcludedItems, excludedItems],
  );

  const {
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
  } = useListFilters(combined);

  const [inclusion, setInclusion] = useState<InclusionFilter>("all");

  // Filtro de inclusión aplicado sobre el resultado de los filtros de texto/
  // comercio/categoría.
  const finalItems = useMemo(() => {
    if (inclusion === "all") return filteredItems;
    const wantIn = inclusion === "included";
    return filteredItems.filter((i) => i.inList === wantIn);
  }, [filteredItems, inclusion]);

  // `isSearching` instantáneo: lo usa el header (que se oculta al tipear) y el
  // chip con el contador. El cómputo del primary y de la acción se hace en
  // base al `debouncedQuery` (alineado con `finalItems` visibles), o al
  // `query` en vivo cuando se dispara una acción por ENTER/click.
  const isSearching = query.trim().length > 0;
  useEffect(() => {
    isSearchingRef.current = isSearching;
  }, [isSearching]);
  // En touch, colapsamos header + combos cuando el buscador toma foco (teclado
  // abierto) para reclamar espacio vertical, aún sin texto. En desktop se
  // conserva el comportamiento previo: colapsa solo al tipear.
  //
  // El colapso por foco se DIFIERE ~300ms: si reflowea el layout en simultáneo
  // con la apertura del teclado / resize del viewport, el navegador móvil
  // suelta el foco del input. Esperar a que el teclado termine de abrir evita
  // ese "efecto raro". El colapso por texto (isSearching) es inmediato porque
  // al tipear el teclado ya está abierto y el foco asentado.
  const isTouch = useIsTouch();
  const [searchFocused, setSearchFocused] = useState(false);
  const focusCollapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchFocus = useCallback(() => {
    if (focusCollapseTimer.current) clearTimeout(focusCollapseTimer.current);
    focusCollapseTimer.current = setTimeout(() => setSearchFocused(true), 300);
  }, []);
  const handleSearchBlur = useCallback(() => {
    if (focusCollapseTimer.current) clearTimeout(focusCollapseTimer.current);
    setSearchFocused(false);
  }, []);
  useEffect(
    () => () => {
      if (focusCollapseTimer.current) clearTimeout(focusCollapseTimer.current);
    },
    [],
  );
  const searchActive = isSearching || (isTouch && searchFocused);
  const grouped = useMemo(() => groupItems(finalItems), [finalItems]);
  const combinedTotal = combined.length;
  const filteredCount = finalItems.length;

  type SearchAction = "idle" | "create" | "add" | "remove";
  type ActionState = { action: SearchAction; primary: EditorItem | null };

  const firstVisibleItem = useCallback(
    (items: EditorItem[]): ActionState => {
      const firstOf = (xs: EditorItem[]) =>
        xs.find((i) => i.inList) ?? xs.find((i) => !i.inList) ?? null;
      const groups = groupItems(items);
      for (const store of groups) {
        if (store.directItems.length > 0) {
          const found = firstOf(store.directItems);
          if (found) {
            return { action: found.inList ? "remove" : "add", primary: found };
          }
        }
        for (const cat of store.categories) {
          const found = firstOf(cat.items);
          if (found) {
            return { action: found.inList ? "remove" : "add", primary: found };
          }
        }
      }
      return { action: "create", primary: null };
    },
    [],
  );

  // Aplica la pipeline de filtros (texto + comercio + categoría + inclusion)
  // sobre un query dado y devuelve la acción/primary que correspondería. Se
  // usa con `debouncedQuery` para el render y con `query` para ejecutar ENTER
  // sin esperar al debounce.
  const computeAction = useCallback(
    (q: string): ActionState => {
      if (!q.trim()) return { action: "idle", primary: null };
      const filtered = filterItems(combined, {
        query: q,
        storeId: storeFilter ? Number(storeFilter) : null,
        categoryId: categoryFilter ? Number(categoryFilter) : null,
      });
      const applied =
        inclusion === "all"
          ? filtered
          : filtered.filter((i) => i.inList === (inclusion === "included"));
      return firstVisibleItem(applied);
    },
    [combined, storeFilter, categoryFilter, inclusion, firstVisibleItem],
  );

  const { action: searchAction, primary: primaryItem } = useMemo(
    () => computeAction(debouncedQuery),
    [computeAction, debouncedQuery],
  );
  const primaryKey = primaryItem ? keyFor(primaryItem) : null;

  const [, startAdd] = useTransition();
  const [qtyPopupItem, setQtyPopupItem] = useState<QuantityTarget | null>(null);
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false);

  // Agrega un producto al hacer un match exitoso desde el buscador (Enter o
  // botón contextual). Abre el popup de cantidad apenas el server confirma el
  // insert para que el usuario pueda ajustar la cantidad si quiere. Si el
  // producto está en ventana de borrado pendiente, cancela el borrado en lugar
  // de mandar un add (evita el race con el remove encolado).
  const addFromSearch = useCallback(
    (item: EditorItem) => {
      if (item.productId == null) return;
      const productId = item.productId;
      const pendingItemId = pendingByProductId.get(productId);
      if (pendingItemId != null) {
        undoDelete(pendingItemId);
        return;
      }
      startAdd(async () => {
        try {
          const itemId = await addProductRequest(productId);
          toast.success("Agregado a la lista");
          if (itemId != null) {
            setQtyPopupItem({
              kind: "list-item",
              id: itemId,
              productName: item.productName,
              quantityValue: item.quantityValue,
              quantityUnit: item.quantityUnit,
            });
          }
        } catch (err) {
          toast.error((err as Error).message);
        }
      });
    },
    [addProductRequest, pendingByProductId, undoDelete],
  );

  // Click sobre el badge de cantidad de un producto disponible (no en lista):
  // abre el drawer en modo "product" para editar el default del maestro.
  const startEditExcludedQty = useCallback((item: EditorItem) => {
    if (item.productId == null) return;
    setQtyPopupItem({
      kind: "product",
      productId: item.productId,
      productName: item.productName,
      quantityValue: item.quantityValue,
      quantityUnit: item.quantityUnit,
    });
  }, []);

  // Ejecuta la acción contextual del buscador. Si `useLiveQuery` es true
  // bypasea el debounce y re-evalúa con el texto que está actualmente en el
  // input (ENTER rápido). Si es false usa el estado ya computado por el render
  // (click sobre el botón, que refleja lo visible).
  function executeSearchAction(useLiveQuery: boolean) {
    const { action, primary } = useLiveQuery
      ? computeAction(query)
      : { action: searchAction, primary: primaryItem };
    if (action === "idle" || action === "create") {
      setCreateDrawerOpen(true);
      return;
    }
    if (!primary) return;
    if (action === "remove") {
      requestDelete(primary);
    } else {
      addFromSearch(primary);
    }
    focusAndSelectSearch();
  }

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      setQuery("");
      searchRef.current?.blur();
      return;
    }
    if (e.key !== "Enter" || !isSearching) return;
    e.preventDefault();
    executeSearchAction(true);
  }

  const [activeEditor, setActiveEditor] = useState<ActiveEditor>(null);
  const commitFns = useRef(new Map<string, () => void>());

  const requestEdit = useCallback((id: number, kind: EditorKind) => {
    setActiveEditor((prev) => {
      if (prev && (prev.id !== id || prev.kind !== kind)) {
        commitFns.current.get(`${prev.id}:${prev.kind}`)?.();
      }
      if (prev && prev.id === id && prev.kind === kind) return prev;
      return { id, kind };
    });
  }, []);

  const clearEditor = useCallback(() => {
    setActiveEditor(null);
  }, []);

  const registerCommit = useCallback((key: string, fn: () => void) => {
    commitFns.current.set(key, fn);
    return () => {
      if (commitFns.current.get(key) === fn) {
        commitFns.current.delete(key);
      }
    };
  }, []);

  const [collapsedStores, setCollapsedStores] = useState<Set<string>>(new Set());
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set());

  const toggleStore = useCallback((key: string) => {
    setCollapsedStores((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const toggleCat = useCallback((key: string) => {
    setCollapsedCats((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // Renderiza una lista de filas: incluidos primero, disponibles después (cada
  // grupo ya viene alfabético desde groupItems).
  const renderRows = (rows: EditorItem[]) => {
    const ordered = [
      ...rows.filter((r) => r.inList),
      ...rows.filter((r) => !r.inList),
    ];
    return (
      <ul className="flex flex-col gap-1.5">
        <AnimatePresence initial={false}>
          {ordered.map((item) => {
            const isPrimary = primaryKey !== null && keyFor(item) === primaryKey;
            return (
              <motion.li
                key={keyFor(item)}
                layout
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0, scale: 0.96 }}
                transition={{ duration: 0.2 }}
              >
                {item.inList ? (
                  <ListItemRow
                    item={item}
                    activeEditor={activeEditor}
                    requestEdit={requestEdit}
                    clearEditor={clearEditor}
                    registerCommit={registerCommit}
                    onRequestDelete={requestDelete}
                    isPrimary={isPrimary}
                    showCategory={searchActive}
                  />
                ) : (
                  <ExcludedItemRow
                    item={item}
                    onAdd={handleAddOrUndo}
                    onRequestDelete={requestProductDelete}
                    onEditQuantity={startEditExcludedQty}
                    isPrimary={isPrimary}
                    showCategory={searchActive}
                  />
                )}
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>
    );
  };

  return (
    <div className="space-y-4">
      {(header || combinedTotal > 0) && (
        <div className={cn("space-y-4", searchActive && "hidden")}>
          {header}
          {combinedTotal > 0 && (
            <ListFilterSelects
              storeOptions={storeOptions}
              filterCats={filterCats}
              storeFilter={storeFilter}
              categoryFilter={categoryFilter}
              onStoreChange={selectStore}
              onCategoryChange={setCategoryFilter}
              inclusion={inclusion}
              onInclusionChange={setInclusion}
            />
          )}
        </div>
      )}
      {combinedTotal > 0 && (
        <div className="sticky top-[49px] md:top-14 z-20 -mx-2 px-2 py-1.5 bg-background/90 backdrop-blur-sm rounded-xl flex items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-primary" />
            <Input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              onFocus={handleSearchFocus}
              onBlur={handleSearchBlur}
              placeholder="Buscar producto…"
              className={cn("h-9 rounded-2xl pl-9", isSearching ? "pr-20" : "pr-3")}
            />
            {isSearching && (
              <div className="pointer-events-auto absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                <span className="text-xs tabular-nums text-muted-foreground">
                  {filteredCount}/{combinedTotal}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-6 rounded-full text-muted-foreground hover:text-foreground"
                  onClick={() => setQuery("")}
                  aria-label="Limpiar búsqueda"
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            )}
          </div>
          <ContextualSearchButton
            action={searchAction}
            onClick={() => executeSearchAction(false)}
          />
          {searchAction === "add" && primaryItem?.productId != null && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-9 shrink-0 rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => {
                if (primaryItem?.productId == null) return;
                // No limpiamos el query: el usuario sigue viendo el match
                // mientras decide en el popup. Al confirmar, la fila
                // desaparece por `hiddenProductIds` aunque el filtro siga
                // activo; al cancelar, todo queda intacto.
                requestProductDelete(
                  primaryItem.productId,
                  primaryItem.productName,
                );
              }}
              aria-label={`Borrar ${primaryItem.productName} del maestro`}
              title="Borrar del maestro"
            >
              <Trash2 className="size-4" />
            </Button>
          )}
        </div>
      )}
      <AddProductDrawer
        listId={list.id}
        stores={stores}
        categories={categories}
        initialName={query.trim() || undefined}
        initialStoreId={storeFilter ? Number(storeFilter) : undefined}
        initialCategoryId={categoryFilter ? Number(categoryFilter) : undefined}
        open={createDrawerOpen}
        onOpenChange={(open) => {
          setCreateDrawerOpen(open);
        }}
        onCloseAutoFocus={(e) => {
          // Cancelamos la restauración default de Radix (que volvería al
          // trigger anterior) y devolvemos el foco al buscador con todo el
          // texto seleccionado para encadenar otra búsqueda.
          e.preventDefault();
          focusAndSelectSearch();
        }}
      />
      <QuantityEditDrawer
        open={qtyPopupItem !== null}
        onOpenChange={(open) => {
          if (!open) setQtyPopupItem(null);
        }}
        onCloseAutoFocus={(e) => {
          // Vaul/Radix por default re-enfoca el elemento previo y eso pisa
          // nuestro focus+select. Cancelamos su default y aplicamos el foco
          // nosotros para que el texto del buscador quede seleccionado.
          e.preventDefault();
          focusAndSelectSearch();
        }}
        item={qtyPopupItem}
      />
      {deleteProductTarget && (
        <DeleteProductConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open) setDeleteProductTarget(null);
          }}
          productId={deleteProductTarget.productId}
          productName={deleteProductTarget.productName}
          onConfirmed={() => {
            setHiddenProductIds((prev) =>
              new Set(prev).add(deleteProductTarget.productId),
            );
          }}
        />
      )}

      {combinedTotal === 0 ? (
        <Card tone="warm" className="border-dashed py-8">
          <div className="flex flex-col items-center gap-3 text-center">
            <EmptyList className="w-32 h-28" />
            <div>
              <p className="font-display text-xl font-semibold tracking-tight">
                No hay productos
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Creá un producto nuevo para empezar a armar la lista.
              </p>
            </div>
            <AddProductDrawer
              listId={list.id}
              stores={stores}
              categories={categories}
            />
          </div>
        </Card>
      ) : grouped.length === 0 ? (
        <Card className="border-dashed p-8 text-center text-muted-foreground">
          <div className="text-4xl mb-2">🔍</div>
          <p>
            {isSearching
              ? `No hay productos que coincidan con “${query}”.`
              : "No hay productos que coincidan con el filtro."}
          </p>
        </Card>
      ) : (
        <ul className="-mt-2 space-y-4">
          {grouped.map((store) => {
            const sKey = String(store.storeId ?? store.storeName);
            const storeCollapsed = isFiltering ? false : collapsedStores.has(sKey);
            const style = getStoreStyle(store.storeId ?? store.storeName);
            const storeCount =
              store.directItems.length +
              store.categories.reduce((acc, c) => acc + c.items.length, 0);
            return (
              <li key={`store-${store.storeId ?? store.storeName}`}>
                <div
                  className={cn(
                    "sticky top-[101px] md:top-[112px] bg-background/90 backdrop-blur-sm z-10 -mx-2 px-2 rounded-xl",
                    searchActive ? "py-1" : "py-1.5",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => toggleStore(sKey)}
                    aria-expanded={!storeCollapsed}
                    className="group flex w-full min-w-0 items-center gap-2 rounded-xl -mx-1 px-1 py-0.5 text-left outline-none hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-primary/40 transition"
                  >
                    <ChevronDown
                      className={cn(
                        "size-4 shrink-0 text-muted-foreground group-hover:text-foreground transition-transform",
                        storeCollapsed && "-rotate-90",
                      )}
                      aria-hidden
                    />
                    <SectionHeading
                      title={store.storeName}
                      size="sm"
                      illustration={
                        <div
                          className={cn(
                            "flex items-center justify-center rounded-xl ring-1",
                            searchActive ? "size-6" : "size-8",
                            style.tint,
                            style.ring,
                          )}
                        >
                          <span
                            className={cn("leading-none", searchActive ? "text-base" : "text-xl")}
                          >
                            {store.storeEmoji}
                          </span>
                        </div>
                      }
                      meta={
                        searchActive ? undefined : (
                          <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-primary">
                            {storeCount} {storeCount === 1 ? "producto" : "productos"}
                          </span>
                        )
                      }
                      className="flex-1"
                    />
                  </button>
                </div>
                {store.storeAddress && !storeCollapsed && (
                  <p className="mt-2 mb-3 ml-[60px] flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="size-3.5 shrink-0" aria-hidden />
                    <span>{store.storeAddress}</span>
                  </p>
                )}
                {!storeCollapsed && (
                  <div className={cn("mt-3 pl-1", !searchActive && "space-y-5")}>
                    {searchActive ? (
                      // Modo búsqueda: aplanamos las categorías; cada producto
                      // muestra su categoría en el card (CategoryTag) y se gana
                      // alto vertical para ver más resultados con el teclado.
                      renderRows([
                        ...store.directItems,
                        ...store.categories.flatMap((c) => c.items),
                      ])
                    ) : (
                      // Vista normal: categorías como nodos colapsables.
                      <>
                        {store.directItems.length > 0 && renderRows(store.directItems)}
                        {store.categories.map((cat) => {
                          const cKey = `${sKey}::${cat.categoryId ?? cat.categoryName}`;
                          const catCollapsed = isFiltering
                            ? false
                            : collapsedCats.has(cKey);
                          return (
                            <div key={`cat-${cat.categoryId ?? cat.categoryName}`}>
                              <button
                                type="button"
                                onClick={() => toggleCat(cKey)}
                                aria-expanded={!catCollapsed}
                                className="flex w-full items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground font-semibold mb-2 pl-1 outline-none focus-visible:text-foreground transition"
                              >
                                {catCollapsed ? (
                                  <ChevronRight className="size-3 shrink-0" aria-hidden />
                                ) : (
                                  <ChevronDown className="size-3 shrink-0" aria-hidden />
                                )}
                                <span className="text-base">{cat.categoryEmoji}</span>
                                <span>{cat.categoryName}</span>
                                <span className="ml-1 normal-case tracking-normal text-muted-foreground/70 font-normal">
                                  ({cat.items.length})
                                </span>
                              </button>
                              {!catCollapsed && renderRows(cat.items)}
                            </div>
                          );
                        })}
                      </>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

    </div>
  );
}

// Categoría del producto en la esquina inferior derecha del card. En modo
// búsqueda las categorías se aplanan (sin nodos), así que cada producto muestra
// su propia categoría acá. Posición absoluta para no crecer en alto más allá
// del padding inferior reservado en el card.
function CategoryTag({
  emoji,
  name,
}: {
  emoji: string | null;
  name: string | null;
}) {
  if (!name) return null;
  return (
    <span className="pointer-events-none absolute bottom-1 right-4 flex max-w-[55%] items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
      {emoji && <span className="text-[11px] leading-none">{emoji}</span>}
      <span className="truncate">{name}</span>
    </span>
  );
}

const ExcludedItemRow = memo(function ExcludedItemRow({
  item,
  onAdd,
  onRequestDelete,
  onEditQuantity,
  isPrimary,
  showCategory,
}: {
  item: EditorItem;
  onAdd: (productId: number) => Promise<number | null>;
  onRequestDelete: (productId: number, productName: string) => void;
  onEditQuantity: (item: EditorItem) => void;
  isPrimary?: boolean;
  showCategory?: boolean;
}) {
  const isTouch = useIsTouch();
  const [pending, startTransition] = useTransition();

  function add() {
    if (item.productId == null) return;
    const productId = item.productId;
    startTransition(async () => {
      try {
        await onAdd(productId);
        toast.success("Agregado a la lista");
      } catch (err) {
        toast.error((err as Error).message);
      }
    });
  }

  function requestDeleteProduct() {
    if (item.productId == null) return;
    onRequestDelete(item.productId, item.productName);
  }

  const swipeAction: SwipeAction = {
    label: "Agregar",
    icon: <Plus className="size-5 shrink-0" />,
    className: "bg-primary text-primary-foreground",
    onTrigger: add,
  };

  // Swipe a la derecha (opuesto a "agregar"): pide borrado del maestro,
  // siempre detrás de una confirmación.
  const rightSwipeAction: SwipeAction | undefined =
    item.productId != null
      ? {
          label: "Borrar",
          icon: <Trash2 className="size-5 shrink-0" />,
          className: "bg-destructive text-destructive-foreground",
          onTrigger: requestDeleteProduct,
        }
      : undefined;

  return (
    <SwipeableRow
      enabled={isTouch}
      action={swipeAction}
      rightAction={rightSwipeAction}
    >
      <Card
        className={cn(
          "relative flex flex-row items-center gap-3 px-3 bg-muted border-dashed",
          showCategory ? "pt-2 pb-5" : "py-2",
          pending && "opacity-60",
          isPrimary && "border-2 border-primary",
        )}
      >
        {isTouch && (
          <>
            {/* Pista de swipe: rojo a la izq (arrastrar → borrar del maestro),
                verde a la der (arrastrar → agregar a la lista). */}
            {rightSwipeAction && (
              <span
                aria-hidden
                className="pointer-events-none absolute left-0.5 top-2 bottom-2 w-1 rounded-full bg-destructive/40"
              />
            )}
            <span
              aria-hidden
              className="pointer-events-none absolute right-0.5 top-2 bottom-2 w-1 rounded-full bg-primary/50"
            />
          </>
        )}
        <button
          type="button"
          onClick={() => onEditQuantity(item)}
          disabled={pending || item.productId == null}
          className="shrink-0 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          aria-label={`Editar cantidad por defecto de ${item.productName}`}
        >
          <QuantityBadge value={item.quantityValue} unit={item.quantityUnit} dimmed />
        </button>
        <div className="flex-1 min-w-0 font-medium break-words text-muted-foreground">
          {item.productName}
        </div>
        {!isTouch && (
          <div className="flex items-center gap-0.5 shrink-0">
            {item.productId != null && (
              <Button
                size="icon"
                variant="ghost"
                className="size-9 rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={requestDeleteProduct}
                disabled={pending}
                aria-label={`Borrar ${item.productName} del maestro`}
              >
                <Trash2 className="size-4" />
              </Button>
            )}
            <Button
              size="icon"
              variant="ghost"
              className="size-9 rounded-full text-primary hover:bg-primary/10"
              onClick={add}
              disabled={pending}
              aria-label={`Agregar ${item.productName} a la lista`}
            >
              <Plus className="size-5" />
            </Button>
          </div>
        )}
        {showCategory && (
          <CategoryTag emoji={item.categoryEmoji} name={item.categoryName} />
        )}
      </Card>
    </SwipeableRow>
  );
});

type SearchActionKind = "idle" | "create" | "add" | "remove";

function ContextualSearchButton({
  action,
  onClick,
}: {
  action: SearchActionKind;
  onClick: () => void;
}) {
  // El estado idle (sin búsqueda) actúa como "crear nuevo" igual que el create,
  // para mantener el comportamiento previo del botón "+" del header.
  const isRemove = action === "remove";
  const label =
    action === "remove"
      ? "Quitar"
      : action === "add"
        ? "Agregar"
        : "Crear";
  const ariaLabel =
    action === "remove"
      ? "Quitar primer match de la lista"
      : action === "add"
        ? "Agregar primer match a la lista"
        : action === "create"
          ? "Crear producto nuevo con el nombre buscado"
          : "Crear producto nuevo";
  return (
    <Button
      type="button"
      onClick={onClick}
      variant={isRemove ? "destructive" : "default"}
      className="h-9 shrink-0 rounded-xl px-3"
      aria-label={ariaLabel}
      title={ariaLabel}
    >
      {isRemove ? <Minus className="size-4" /> : <Plus className="size-4" />}
      <span className="text-sm">{label}</span>
    </Button>
  );
}

const ListItemRow = memo(function ListItemRow({
  item,
  activeEditor,
  requestEdit,
  clearEditor,
  registerCommit,
  onRequestDelete,
  isPrimary,
  showCategory,
}: {
  item: ShoppingListItem;
  activeEditor: ActiveEditor;
  requestEdit: (id: number, kind: EditorKind) => void;
  clearEditor: () => void;
  registerCommit: (key: string, fn: () => void) => () => void;
  onRequestDelete: (item: ShoppingListItem) => void;
  isPrimary?: boolean;
  showCategory?: boolean;
}) {
  const isTouch = useIsTouch();
  const isEditingQty = activeEditor?.id === item.id && activeEditor.kind === "qty";
  const isEditingNotes = activeEditor?.id === item.id && activeEditor.kind === "notes";

  const initialUnit: CanonicalUnit = isCanonicalUnit(item.quantityUnit)
    ? (item.quantityUnit as CanonicalUnit)
    : "unidad";
  const initialNotes = item.notes ?? "";

  const [value, setValue] = useState(toEditQuantity(item.quantityValue));
  const [unit, setUnit] = useState<CanonicalUnit>(initialUnit);
  const [notesDraft, setNotesDraft] = useState(initialNotes);
  const [pending, startTransition] = useTransition();

  const valueRef = useRef(value);
  const unitRef = useRef(unit);
  const notesDraftRef = useRef(notesDraft);
  const qtyInputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (isEditingQty) {
      qtyInputRef.current?.focus();
      qtyInputRef.current?.select();
    }
  }, [isEditingQty]);
  useEffect(() => {
    valueRef.current = value;
  }, [value]);
  useEffect(() => {
    unitRef.current = unit;
  }, [unit]);
  useEffect(() => {
    notesDraftRef.current = notesDraft;
  }, [notesDraft]);

  function step(delta: number) {
    const base = Number(normalizeDecimal(value)) || 0;
    const next = stepQuantity(base, unit, delta > 0 ? 1 : -1, item.productName);
    setValue(String(next));
    const fd = new FormData();
    fd.set("id", String(item.id));
    fd.set("quantityValue", String(next));
    fd.set("quantityUnit", unit);
    startTransition(async () => {
      try {
        await updateItemQuantityAction(fd);
      } catch (err) {
        toast.error((err as Error).message);
        setValue(item.quantityValue);
      }
    });
  }

  function save() {
    const fd = new FormData();
    fd.set("id", String(item.id));
    fd.set("quantityValue", toEditQuantity(value));
    fd.set("quantityUnit", unit);
    startTransition(async () => {
      try {
        await updateItemQuantityAction(fd);
        clearEditor();
      } catch (err) {
        toast.error((err as Error).message);
      }
    });
  }

  function remove() {
    onRequestDelete(item);
  }

  function saveNotes(raw: string) {
    const fd = new FormData();
    fd.set("id", String(item.id));
    fd.set("notes", raw);
    startTransition(async () => {
      try {
        await updateItemNotesAction(fd);
        clearEditor();
      } catch (err) {
        toast.error((err as Error).message);
      }
    });
  }

  function clearNotes() {
    setNotesDraft("");
    saveNotes("");
  }

  function cancelQtyEdit() {
    setValue(toEditQuantity(item.quantityValue));
    setUnit(initialUnit);
    clearEditor();
  }

  function cancelNotesEdit() {
    setNotesDraft(initialNotes);
    clearEditor();
  }

  function startQtyEdit() {
    setValue(toEditQuantity(item.quantityValue));
    setUnit(initialUnit);
    requestEdit(item.id, "qty");
  }

  function startNotesEdit(initial: string) {
    setNotesDraft(initial);
    requestEdit(item.id, "notes");
  }

  // Register a "commit current draft" so the parent can flush this row
  // when the user switches edition to another one.
  useEffect(() => {
    const key = `${item.id}:qty`;
    return registerCommit(key, () => {
      const v = valueRef.current;
      const u = unitRef.current;
      if (v === toEditQuantity(item.quantityValue) && u === initialUnit) return;
      const fd = new FormData();
      fd.set("id", String(item.id));
      fd.set("quantityValue", v);
      fd.set("quantityUnit", u);
      startTransition(async () => {
        try {
          await updateItemQuantityAction(fd);
        } catch (err) {
          toast.error((err as Error).message);
        }
      });
    });
  }, [item.id, item.quantityValue, initialUnit, registerCommit]);

  useEffect(() => {
    const key = `${item.id}:notes`;
    return registerCommit(key, () => {
      const raw = notesDraftRef.current;
      if (raw === initialNotes) return;
      const fd = new FormData();
      fd.set("id", String(item.id));
      fd.set("notes", raw);
      startTransition(async () => {
        try {
          await updateItemNotesAction(fd);
        } catch (err) {
          toast.error((err as Error).message);
        }
      });
    });
  }, [item.id, initialNotes, registerCommit]);

  const quantityActions = (
    <>
      <button
        type="button"
        onClick={() => step(-1)}
        disabled={pending}
        aria-label="Menos"
        className="flex size-10 items-center justify-center rounded-full bg-background text-foreground shadow-sm transition active:scale-95 disabled:opacity-50"
      >
        <ChevronDown className="size-5" />
      </button>
      <button
        type="button"
        onClick={() => step(1)}
        disabled={pending}
        aria-label="Más"
        className="flex size-10 items-center justify-center rounded-full bg-background text-primary shadow-sm transition active:scale-95 disabled:opacity-50"
      >
        <ChevronUp className="size-5" />
      </button>
    </>
  );

  return (
    <SwipeableRow
      enabled={isTouch && !isEditingQty && !isEditingNotes}
      action={{
        label: "Borrar",
        icon: <Trash2 className="size-5 shrink-0" />,
        className: "bg-destructive text-destructive-foreground",
        onTrigger: () => onRequestDelete(item),
      }}
      quantityActions={quantityActions}
    >
    <Card
      className={cn(
        "relative flex flex-col gap-1 px-3 pt-2",
        // Reserva espacio para el tag de categoría (esquina inf. der.) solo en
        // modo búsqueda, y nunca mientras se edita cantidad/nota (la UI
        // expandida ocupa el fondo del card).
        showCategory && !isEditingQty && !isEditingNotes ? "pb-5" : "pb-2",
        pending && "opacity-70",
        isPrimary && "border-2 border-dashed border-primary",
      )}
    >
      {isTouch && !isEditingQty && !isEditingNotes && (
        <>
          {/* Pista de swipe: verde a la izq (arrastrar → cantidad), rojo a la der (arrastrar → borrar). */}
          <span
            aria-hidden
            className="pointer-events-none absolute left-0.5 top-2 bottom-2 w-1 rounded-full bg-primary/50"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute right-0.5 top-2 bottom-2 w-1 rounded-full bg-destructive/40"
          />
        </>
      )}
      <div className="flex flex-row items-center gap-3">
        {isEditingQty ? (
          <QuantityBadge value={value} unit={unit} />
        ) : (
          <button
            type="button"
            onClick={startQtyEdit}
            className="shrink-0 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            aria-label="Editar cantidad"
          >
            <QuantityBadge value={item.quantityValue} unit={item.quantityUnit} />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <div className="font-medium break-words">{item.productName}</div>
          {isEditingQty && (
            <div className="mt-1 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Input
                  ref={qtyInputRef}
                  value={value}
                  onChange={(e) => setValue(sanitizeQuantityInput(e.target.value))}
                  type="text"
                  inputMode="decimal"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      save();
                    } else if (e.key === "Escape") {
                      e.preventDefault();
                      cancelQtyEdit();
                    }
                  }}
                  className="h-8 flex-1 text-sm"
                />
                <Button size="sm" className="h-8" onClick={save} disabled={pending}>
                  OK
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8"
                  onClick={cancelQtyEdit}
                >
                  <X className="size-4" />
                </Button>
              </div>
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
                        "h-8 w-full rounded-full px-2.5 text-[11px] border transition",
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
          )}
        </div>
        {!isEditingQty && (
          <div className="flex items-center gap-0.5 shrink-0">
            {!item.notes && !isEditingNotes && (
              <Button
                size="icon"
                variant="ghost"
                className="size-8 text-muted-foreground hover:text-foreground"
                onClick={() => startNotesEdit("")}
                disabled={pending}
                aria-label="Agregar nota"
              >
                <MessageSquare className="size-4" />
              </Button>
            )}
            {!isTouch && (
              <>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8"
                  onClick={() => step(-1)}
                  disabled={pending}
                  aria-label="Menos"
                >
                  <ChevronDown className="size-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8"
                  onClick={() => step(1)}
                  disabled={pending}
                  aria-label="Más"
                >
                  <ChevronUp className="size-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8 text-destructive hover:text-destructive"
                  onClick={remove}
                  disabled={pending}
                  aria-label="Quitar"
                >
                  <Trash2 className="size-4" />
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {item.notes && !isEditingNotes && (
        <div className="ml-[60px] flex items-start gap-1.5">
          <button
            type="button"
            onClick={() => startNotesEdit(item.notes ?? "")}
            className="flex-1 text-left text-xs italic text-muted-foreground rounded-lg bg-muted/60 px-2 py-1 hover:bg-muted transition"
            title="Editar nota"
          >
            💬 {item.notes}
          </button>
          <Button
            size="icon"
            variant="ghost"
            className="size-6 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={clearNotes}
            disabled={pending}
            aria-label="Borrar nota"
          >
            <X className="size-3.5" />
          </Button>
        </div>
      )}

      {isEditingNotes && (
        <div className="ml-[60px] flex items-center gap-1.5">
          <Input
            value={notesDraft}
            onChange={(e) => setNotesDraft(e.target.value)}
            placeholder="Aclaración para este ítem…"
            autoFocus
            maxLength={500}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                saveNotes(notesDraft);
              } else if (e.key === "Escape") {
                e.preventDefault();
                cancelNotesEdit();
              }
            }}
            className="h-8 text-sm"
          />
          <Button
            size="sm"
            className="h-8"
            onClick={() => saveNotes(notesDraft)}
            disabled={pending}
          >
            OK
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="size-8"
            onClick={cancelNotesEdit}
          >
            <X className="size-4" />
          </Button>
        </div>
      )}
      {showCategory && !isEditingQty && !isEditingNotes && (
        <CategoryTag emoji={item.categoryEmoji} name={item.categoryName} />
      )}
    </Card>
    </SwipeableRow>
  );
});
