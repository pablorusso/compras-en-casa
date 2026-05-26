"use client";

import {
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
  removeItemAction,
  updateItemNotesAction,
  updateItemQuantityAction,
} from "@/actions/lists";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { QuantityBadge } from "@/components/quantity-badge";
import { SectionHeading } from "@/components/section-heading";
import { SwipeableRow } from "@/components/swipeable-row";
import { EmptyList } from "@/components/illustrations";
import { useIsTouch } from "@/lib/use-is-touch";
import {
  AddProductDrawer,
  type AvailableProduct,
} from "@/components/add-product-drawer";
import { getStoreStyle } from "@/lib/store-style";
import { groupItems, toEditQuantity } from "@/lib/format";
import { ListFilterSelects } from "@/components/list-filter-selects";
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

export function ListEditor({
  list,
  items,
  available,
  stores,
  categories,
}: {
  list: { id: number; name: string };
  items: ShoppingListItem[];
  available: AvailableProduct[];
  stores: StoreOption[];
  categories: CategoryOption[];
}) {
  // Borrado optimista con opción de deshacer: el ítem se oculta de inmediato y
  // el borrado real en el servidor se ejecuta tras un breve margen.
  const [hiddenIds, setHiddenIds] = useState<Set<number>>(new Set());
  const deleteTimers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const commitDelete = useCallback((id: number) => {
    deleteTimers.current.delete(id);
    const fd = new FormData();
    fd.set("id", String(id));
    removeItemAction(fd).catch((err) => toast.error((err as Error).message));
  }, []);

  const requestDelete = useCallback(
    (item: ShoppingListItem) => {
      setHiddenIds((prev) => new Set(prev).add(item.id));
      const timer = setTimeout(() => commitDelete(item.id), 5000);
      deleteTimers.current.set(item.id, timer);
      toast.success(`"${item.productName}" borrado`, {
        duration: 5000,
        action: {
          label: "Deshacer",
          onClick: () => {
            const t = deleteTimers.current.get(item.id);
            if (t) clearTimeout(t);
            deleteTimers.current.delete(item.id);
            setHiddenIds((prev) => {
              const next = new Set(prev);
              next.delete(item.id);
              return next;
            });
          },
        },
      });
    },
    [commitDelete],
  );

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

  const visibleItems = useMemo(
    () => items.filter((i) => !hiddenIds.has(i.id)),
    [items, hiddenIds],
  );
  const {
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
  } = useListFilters(visibleItems);
  const isSearching = query.trim().length > 0;
  const grouped = useMemo(() => groupItems(filteredItems), [filteredItems]);
  const totalItems = visibleItems.length;
  const filteredCount = filteredItems.length;

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

  return (
    <div className="space-y-4">
      {totalItems > 0 && (
        <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-2.5">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-primary" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar producto…"
              className={cn("h-11 rounded-2xl pl-10", isSearching ? "pr-24" : "pr-10")}
            />
            {isSearching && (
              <div className="pointer-events-auto absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <span className="text-xs tabular-nums text-muted-foreground">
                  {filteredCount}/{totalItems}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 rounded-full text-muted-foreground hover:text-foreground"
                  onClick={() => setQuery("")}
                  aria-label="Limpiar búsqueda"
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            )}
          </div>
          <AddProductDrawer
            listId={list.id}
            available={available}
            stores={stores}
            categories={categories}
            trigger={
              <Button className="rounded-xl shrink-0">
                <Plus className="size-4" /> Agregar
              </Button>
            }
          />
        </div>
      )}

      {totalItems > 0 && storeOptions.length > 0 && (
        <ListFilterSelects
          storeOptions={storeOptions}
          filterCats={filterCats}
          storeFilter={storeFilter}
          categoryFilter={categoryFilter}
          onStoreChange={selectStore}
          onCategoryChange={setCategoryFilter}
        />
      )}

      {totalItems === 0 ? (
        <Card tone="warm" className="border-dashed py-8">
          <div className="flex flex-col items-center gap-3 text-center">
            <EmptyList className="w-32 h-28" />
            <div>
              <p className="font-display text-xl font-semibold tracking-tight">
                La lista está vacía
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Agregá productos del maestro o creá uno nuevo.
              </p>
            </div>
            <AddProductDrawer
              listId={list.id}
              available={available}
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
        <ul className="space-y-8">
          {grouped.map((store) => {
            const sKey = String(store.storeId ?? store.storeName);
            const storeCollapsed = isFiltering ? false : collapsedStores.has(sKey);
            const style = getStoreStyle(store.storeId ?? store.storeName);
            const storeCount =
              store.directItems.length +
              store.categories.reduce((acc, c) => acc + c.items.length, 0);
            return (
              <li key={`store-${store.storeId ?? store.storeName}`}>
                <div className="sticky top-[57px] md:top-2 bg-background/90 backdrop-blur-sm py-2 z-10 -mx-2 px-2 rounded-xl">
                  <div className="flex items-start gap-2">
                    <button
                      type="button"
                      onClick={() => toggleStore(sKey)}
                      aria-expanded={!storeCollapsed}
                      className="group flex flex-1 min-w-0 items-start gap-2 rounded-xl -mx-1 px-1 py-1 text-left outline-none hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-primary/40 transition"
                    >
                      <ChevronDown
                        className={cn(
                          "mt-4 size-4 shrink-0 text-muted-foreground group-hover:text-foreground transition-transform",
                          storeCollapsed && "-rotate-90",
                        )}
                        aria-hidden
                      />
                      <SectionHeading
                        title={store.storeName}
                        eyebrow={`${storeCount} ${storeCount === 1 ? "producto" : "productos"}`}
                        illustration={
                          <div
                            className={cn(
                              "flex size-12 items-center justify-center rounded-2xl ring-1",
                              style.tint,
                              style.ring,
                            )}
                          >
                            <span className="text-3xl leading-none">{store.storeEmoji}</span>
                          </div>
                        }
                        className="flex-1"
                      />
                    </button>
                    {store.storeId != null && (
                      <AddProductDrawer
                        listId={list.id}
                        available={available}
                        stores={stores}
                        categories={categories}
                        lockedStoreId={store.storeId}
                        trigger={
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mt-3 shrink-0 rounded-xl text-primary hover:bg-primary/10"
                          >
                            <Plus className="size-4" /> Agregar
                          </Button>
                        }
                      />
                    )}
                  </div>
                </div>
                {store.storeAddress && !storeCollapsed && (
                  <p className="mt-2 mb-3 ml-[60px] flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="size-3.5 shrink-0" aria-hidden />
                    <span>{store.storeAddress}</span>
                  </p>
                )}
                {!storeCollapsed && (
                  <div className="space-y-5 mt-3 pl-1">
                    {store.directItems.length > 0 && (
                      <ul className="space-y-1.5">
                        <AnimatePresence initial={false}>
                          {store.directItems.map((item) => (
                            <motion.li
                              key={item.id}
                              layout
                              initial={{ opacity: 0, y: 4 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, height: 0, scale: 0.96 }}
                              transition={{ duration: 0.2 }}
                            >
                              <ListItemRow
                                item={item}
                                activeEditor={activeEditor}
                                requestEdit={requestEdit}
                                clearEditor={clearEditor}
                                registerCommit={registerCommit}
                                onRequestDelete={requestDelete}
                              />
                            </motion.li>
                          ))}
                        </AnimatePresence>
                      </ul>
                    )}
                    {store.categories.map((cat) => {
                      const cKey = `${sKey}::${cat.categoryId ?? cat.categoryName}`;
                      const catCollapsed = isFiltering ? false : collapsedCats.has(cKey);
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
                          {!catCollapsed && (
                            <ul className="space-y-1.5">
                              <AnimatePresence initial={false}>
                                {cat.items.map((item) => (
                                  <motion.li
                                    key={item.id}
                                    layout
                                    initial={{ opacity: 0, y: 4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, height: 0, scale: 0.96 }}
                                    transition={{ duration: 0.2 }}
                                  >
                                    <ListItemRow
                                      item={item}
                                      activeEditor={activeEditor}
                                      requestEdit={requestEdit}
                                      clearEditor={clearEditor}
                                      registerCommit={registerCommit}
                                      onRequestDelete={requestDelete}
                                    />
                                  </motion.li>
                                ))}
                              </AnimatePresence>
                            </ul>
                          )}
                        </div>
                      );
                    })}
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

function ListItemRow({
  item,
  activeEditor,
  requestEdit,
  clearEditor,
  registerCommit,
  onRequestDelete,
}: {
  item: ShoppingListItem;
  activeEditor: ActiveEditor;
  requestEdit: (id: number, kind: EditorKind) => void;
  clearEditor: () => void;
  registerCommit: (key: string, fn: () => void) => () => void;
  onRequestDelete: (item: ShoppingListItem) => void;
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
    const base = Number(value) || 0;
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
        className="flex size-10 items-center justify-center rounded-full bg-muted text-foreground shadow-sm transition active:scale-95 disabled:opacity-50"
      >
        <ChevronDown className="size-5" />
      </button>
      <button
        type="button"
        onClick={() => step(1)}
        disabled={pending}
        aria-label="Más"
        className="flex size-10 items-center justify-center rounded-full bg-primary/15 text-primary shadow-sm transition active:scale-95 disabled:opacity-50"
      >
        <ChevronUp className="size-5" />
      </button>
    </>
  );

  return (
    <SwipeableRow
      enabled={isTouch && !isEditingQty && !isEditingNotes}
      onDelete={() => onRequestDelete(item)}
      quantityActions={quantityActions}
    >
    <Card className={cn("flex flex-col gap-1 px-3 py-2", pending && "opacity-70")}>
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
                  onChange={(e) => setValue(e.target.value)}
                  type="number"
                  inputMode="decimal"
                  step="0.01"
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
    </Card>
    </SwipeableRow>
  );
}
