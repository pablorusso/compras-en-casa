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
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import {
  addExistingProductAction,
  createAndAddProductAction,
  removeItemAction,
  updateItemNotesAction,
  updateItemQuantityAction,
} from "@/actions/lists";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QuantityBadge } from "@/components/quantity-badge";
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
import { SectionHeading } from "@/components/section-heading";
import { EmptyList } from "@/components/illustrations";
import { getStoreStyle } from "@/lib/store-style";
import { groupItems, buildMarkdownText, filterItemsByQuery } from "@/lib/format";
import { UNIT_PICKER_GRID, isCanonicalUnit, unitDisplay, type CanonicalUnit } from "@/lib/units";
import type { ShoppingListItem } from "@/db/schema";
import type {
  StoreOption,
  CategoryOption,
} from "@/components/product-form-drawer";
import { cn } from "@/lib/utils";

type AvailableProduct = {
  id: number;
  name: string;
  storeId: number | null;
  categoryName: string;
  storeName: string;
  defaultQuantityValue: string;
  defaultQuantityUnit: string;
};

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
  const [query, setQuery] = useState("");
  const isSearching = query.trim().length > 0;
  const filteredItems = useMemo(
    () => filterItemsByQuery(items, query),
    [items, query],
  );
  const grouped = useMemo(() => groupItems(filteredItems), [filteredItems]);
  const totalItems = items.length;
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

  async function copyAll() {
    const text = buildMarkdownText(list, items);
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Lista copiada (Markdown)");
    } catch {
      toast.error("No se pudo copiar");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {isSearching
            ? `${filteredCount} de ${totalItems} ${totalItems === 1 ? "producto" : "productos"}`
            : `${totalItems} ${totalItems === 1 ? "producto" : "productos"} · ${grouped.length} ${grouped.length === 1 ? "comercio" : "comercios"}`}
        </p>
        <div className="flex items-center gap-2">
          {totalItems > 0 && (
            <Button
              variant="outline"
              className="rounded-2xl gap-1.5"
              onClick={copyAll}
            >
              <Copy className="size-4" /> Copiar todo
            </Button>
          )}
          <AddProductDrawer
            listId={list.id}
            available={available}
            stores={stores}
            categories={categories}
          />
        </div>
      </div>

      {totalItems > 0 && (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-primary" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar producto…"
            className="pl-10 h-11 rounded-2xl"
          />
        </div>
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
          </div>
        </Card>
      ) : grouped.length === 0 ? (
        <Card className="border-dashed p-8 text-center text-muted-foreground">
          <div className="text-4xl mb-2">🔍</div>
          <p>No hay productos que coincidan con &ldquo;{query}&rdquo;.</p>
        </Card>
      ) : (
        <ul className="space-y-6">
          {grouped.map((store) => {
            const sKey = String(store.storeId ?? store.storeName);
            const storeCollapsed = isSearching ? false : collapsedStores.has(sKey);
            const style = getStoreStyle(store.storeId ?? store.storeName);
            return (
              <li key={`store-${store.storeId ?? store.storeName}`}>
                <div className="sticky top-[57px] md:top-2 bg-background/90 backdrop-blur-sm py-2 z-10 -mx-2 px-2 rounded-xl flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => toggleStore(sKey)}
                    aria-expanded={!storeCollapsed}
                    className="group flex flex-1 min-w-0 items-center gap-2 rounded-xl -mx-1 px-1 py-1 text-left outline-none hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-primary/40 transition"
                  >
                    {storeCollapsed ? (
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground group-hover:text-foreground" aria-hidden />
                    ) : (
                      <ChevronDown className="size-4 shrink-0 text-muted-foreground group-hover:text-foreground" aria-hidden />
                    )}
                    <SectionHeading
                      title={store.storeName}
                      size="sm"
                      underline={false}
                      illustration={
                        <span
                          className={cn(
                            "flex size-10 items-center justify-center rounded-xl ring-1",
                            style.tint,
                            style.ring,
                          )}
                        >
                          <span className="text-2xl leading-none">{store.storeEmoji}</span>
                        </span>
                      }
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
                          className="shrink-0 rounded-xl text-primary hover:bg-primary/10"
                        >
                          <Plus className="size-4" /> Agregar
                        </Button>
                      }
                    />
                  )}
                </div>
                {!storeCollapsed && (
                  <div className="space-y-3 mt-2">
                    {store.categories.map((cat) => {
                      const cKey = `${sKey}::${cat.categoryId ?? cat.categoryName}`;
                      const catCollapsed = isSearching ? false : collapsedCats.has(cKey);
                      return (
                        <div key={`cat-${cat.categoryId ?? cat.categoryName}`}>
                          <button
                            type="button"
                            onClick={() => toggleCat(cKey)}
                            aria-expanded={!catCollapsed}
                            className="flex w-full items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground font-semibold mb-1.5 pl-1 outline-none focus-visible:text-foreground transition"
                          >
                            {catCollapsed ? (
                              <ChevronRight className="size-3 shrink-0" aria-hidden />
                            ) : (
                              <ChevronDown className="size-3 shrink-0" aria-hidden />
                            )}
                            <span className="text-sm">{cat.categoryEmoji}</span>
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
}: {
  item: ShoppingListItem;
  activeEditor: ActiveEditor;
  requestEdit: (id: number, kind: EditorKind) => void;
  clearEditor: () => void;
  registerCommit: (key: string, fn: () => void) => () => void;
}) {
  const isEditingQty = activeEditor?.id === item.id && activeEditor.kind === "qty";
  const isEditingNotes = activeEditor?.id === item.id && activeEditor.kind === "notes";

  const initialUnit: CanonicalUnit = isCanonicalUnit(item.quantityUnit)
    ? (item.quantityUnit as CanonicalUnit)
    : "unidad";
  const initialNotes = item.notes ?? "";

  const [value, setValue] = useState(item.quantityValue);
  const [unit, setUnit] = useState<CanonicalUnit>(initialUnit);
  const [notesDraft, setNotesDraft] = useState(initialNotes);
  const [pending, startTransition] = useTransition();

  const valueRef = useRef(value);
  const unitRef = useRef(unit);
  const notesDraftRef = useRef(notesDraft);
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
    const stepSize = base >= 10 ? 1 : base >= 1 ? 0.5 : 0.1;
    const next = Math.max(0.1, +(base + delta * stepSize).toFixed(2));
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
    fd.set("quantityValue", value);
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
    if (!confirm(`Quitar "${item.productName}" de la lista?`)) return;
    const fd = new FormData();
    fd.set("id", String(item.id));
    startTransition(async () => {
      try {
        await removeItemAction(fd);
      } catch (err) {
        toast.error((err as Error).message);
      }
    });
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
    setValue(item.quantityValue);
    setUnit(initialUnit);
    clearEditor();
  }

  function cancelNotesEdit() {
    setNotesDraft(initialNotes);
    clearEditor();
  }

  function startQtyEdit() {
    setValue(item.quantityValue);
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
      if (v === item.quantityValue && u === initialUnit) return;
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

  return (
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
          <div className="font-medium truncate">{item.productName}</div>
          {isEditingQty && (
            <div className="mt-1 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Input
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      save();
                    } else if (e.key === "Escape") {
                      e.preventDefault();
                      cancelQtyEdit();
                    }
                  }}
                  className="h-8 w-20 text-sm"
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
  );
}

function AddProductDrawer({
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
    const q = query.trim().toLowerCase();
    if (!q) return scoped;
    return scoped.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.categoryName.toLowerCase().includes(q) ||
        p.storeName.toLowerCase().includes(q),
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
                            <div className="font-medium truncate">{p.name}</div>
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
