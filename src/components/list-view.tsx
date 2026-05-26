"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Ban, Check, ChevronDown, ChevronRight, MapPin, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ProgressBar } from "@/components/progress-bar";
import { QuantityBadge } from "@/components/quantity-badge";
import { SectionHeading } from "@/components/section-heading";
import { groupItems } from "@/lib/format";
import { ListFilterSelects } from "@/components/list-filter-selects";
import { useListFilters } from "@/lib/use-list-filters";
import { getStoreStyle } from "@/lib/store-style";
import { useHasMounted } from "@/lib/use-has-mounted";
import type { ShoppingListItem } from "@/db/schema";
import { cn } from "@/lib/utils";

type Mode = "view" | "shopping";
type ItemStatus = "bought" | "missing";
type StatusFilter = "pending" | "bought" | "missing" | "all";

const EMPTY_MARKS: ReadonlyMap<number, ItemStatus> = new Map<number, ItemStatus>();

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: "pending", label: "Pendientes" },
  { value: "bought", label: "Comprados" },
  { value: "missing", label: "No hay" },
  { value: "all", label: "Todos" },
];

function progressEmoji(p: number): string {
  if (p >= 100) return "🎉";
  if (p >= 75) return "🛍️";
  if (p >= 50) return "🥖";
  if (p >= 25) return "🥕";
  return "🥬";
}

/**
 * Carga las marcas desde localStorage. Formato nuevo: `{ bought: number[], missing: number[] }`.
 * Migración hacia atrás: si el JSON guardado es un array (formato viejo solo-comprados),
 * se interpretan todos esos ids como "comprados".
 */
function loadMarks(storageKey?: string, mode?: Mode): Map<number, ItemStatus> {
  const empty = new Map<number, ItemStatus>();
  if (typeof window === "undefined" || mode !== "shopping" || !storageKey) return empty;
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return empty;
    const data = JSON.parse(raw);
    if (Array.isArray(data)) {
      for (const id of data) empty.set(Number(id), "bought");
    } else {
      for (const id of data.bought ?? []) empty.set(Number(id), "bought");
      for (const id of data.missing ?? []) empty.set(Number(id), "missing");
    }
    return empty;
  } catch {
    return empty;
  }
}

export function ListView({
  items,
  mode = "view",
  storageKey,
}: {
  items: ShoppingListItem[];
  mode?: Mode;
  storageKey?: string;
}) {
  const isShopping = mode === "shopping";
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
  } = useListFilters(items);
  const isSearching = query.trim().length > 0;
  const hasMounted = useHasMounted();
  const reduced = useReducedMotion();
  const searchRef = useRef<HTMLInputElement>(null);

  const [marks, setMarks] = useState<Map<number, ItemStatus>>(() =>
    loadMarks(storageKey, mode),
  );
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");

  useEffect(() => {
    if (mode !== "shopping" || !storageKey || !hasMounted) return;
    const bought: number[] = [];
    const missing: number[] = [];
    marks.forEach((status, id) => {
      if (status === "bought") bought.push(id);
      else missing.push(id);
    });
    try {
      window.localStorage.setItem(storageKey, JSON.stringify({ bought, missing }));
    } catch {}
  }, [marks, mode, storageKey, hasMounted]);

  // Evita mismatch de hidratación: hasta montar, tratamos todo como pendiente.
  const displayedMarks: ReadonlyMap<number, ItemStatus> = hasMounted ? marks : EMPTY_MARKS;

  const displayedItems = useMemo(() => {
    if (!isShopping || statusFilter === "all") return filteredItems;
    return filteredItems.filter((item) => {
      const s = displayedMarks.get(item.id);
      if (statusFilter === "pending") return s === undefined;
      return s === statusFilter;
    });
  }, [filteredItems, statusFilter, displayedMarks, isShopping]);

  const grouped = useMemo(() => groupItems(displayedItems), [displayedItems]);
  const filteredCount = displayedItems.length;
  const singleItem = displayedItems.length === 1 ? displayedItems[0] : null;

  function afterMark() {
    // En la vista de pendientes, al marcar un producto buscado este desaparece;
    // limpiamos el buscador y reenfocamos para encadenar la siguiente búsqueda.
    if (statusFilter === "pending" && query.trim().length > 0) {
      setQuery("");
      searchRef.current?.focus();
    }
  }

  function setStatus(id: number, status: ItemStatus | null) {
    setMarks((prev) => {
      const next = new Map(prev);
      if (status === null) next.delete(id);
      else next.set(id, status);
      return next;
    });
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(8);
  }

  function toggleBought(id: number) {
    const wasBought = marks.get(id) === "bought";
    setStatus(id, wasBought ? null : "bought");
    if (!wasBought) afterMark();
  }

  function toggleMissing(id: number) {
    const wasMissing = marks.get(id) === "missing";
    setStatus(id, wasMissing ? null : "missing");
    if (!wasMissing) afterMark();
  }

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

  const resolvedCount = displayedMarks.size;
  const progress = items.length === 0 ? 0 : Math.round((resolvedCount / items.length) * 100);

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && isShopping && isSearching && singleItem) {
      e.preventDefault();
      toggleBought(singleItem.id);
    }
  }

  function renderItem(item: ShoppingListItem) {
    const status = displayedMarks.get(item.id);
    const isBought = status === "bought";
    const isMissing = status === "missing";
    const dimmed = isBought || isMissing;

    const body = (
      <>
        {isShopping &&
          (isMissing ? (
            <CircleMissing />
          ) : (
            <CircleCheck checked={isBought} reduced={!!reduced} />
          ))}
        <QuantityBadge value={item.quantityValue} unit={item.quantityUnit} dimmed={dimmed} />
        <span className="flex-1 min-w-0">
          <span
            className={cn(
              "font-medium block break-words transition-all duration-200",
              dimmed && "line-through text-muted-foreground",
            )}
          >
            {item.productName}
            {isMissing && (
              <span className="ml-1.5 inline-block rounded-md bg-destructive/15 px-1.5 py-0.5 align-middle text-[10px] font-semibold uppercase tracking-wide text-destructive no-underline">
                no hay
              </span>
            )}
          </span>
          {item.notes && (
            <span
              className={cn(
                "block text-xs italic text-muted-foreground/90 mt-0.5",
                dimmed && "line-through opacity-70",
              )}
            >
              💬 {item.notes}
            </span>
          )}
        </span>
      </>
    );

    return (
      <motion.li
        key={item.id}
        layout
        initial={reduced ? false : { opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {isShopping ? (
          <div
            className={cn(
              "flex items-stretch rounded-2xl border shadow-soft transition-all duration-200",
              !status && "border-border/70 bg-card",
              isBought && "border-border/50 bg-muted/50 shadow-none",
              isMissing && "border-destructive/25 bg-destructive/5 shadow-none",
            )}
          >
            <button
              type="button"
              onClick={() => toggleBought(item.id)}
              className="flex min-w-0 flex-1 items-center gap-3 rounded-l-2xl px-3.5 py-2 text-left transition-colors hover:bg-muted/40 active:scale-[0.99]"
            >
              {body}
            </button>
            <button
              type="button"
              onClick={() => toggleMissing(item.id)}
              aria-label={isMissing ? "Quitar marca de no hay" : "Marcar que no hay"}
              title={isMissing ? "Quitar “no hay”" : "No hay"}
              className={cn(
                "flex shrink-0 items-center justify-center rounded-r-2xl border-l border-border/50 px-3 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive",
                isMissing && "bg-destructive/10 text-destructive",
              )}
            >
              <Ban className="size-4" />
            </button>
          </div>
        ) : (
          <div className="flex w-full items-center gap-3 rounded-2xl border border-border/70 bg-card px-3.5 py-2 shadow-soft">
            {body}
          </div>
        )}
      </motion.li>
    );
  }

  return (
    <div className="space-y-6">
      {isShopping && (
        <div className="rounded-2xl border border-border/70 bg-card/80 p-4 shadow-soft backdrop-blur-sm">
          <div className="flex items-center justify-between text-sm mb-2.5">
            <span className="text-muted-foreground">Tu progreso</span>
            <span className="font-medium tabular-nums">
              {resolvedCount} / {items.length}
            </span>
          </div>
          <ProgressBar value={progress} emoji={progressEmoji(progress)} variant="default" />
        </div>
      )}

      {items.length > 0 && (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-primary" />
          <Input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Buscar producto…"
            className={cn("h-11 rounded-2xl pl-10", isSearching ? "pr-24" : "pr-10")}
          />
          {isSearching && (
            <div className="pointer-events-auto absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <span className="text-xs tabular-nums text-muted-foreground">
                {filteredCount}/{items.length}
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
      )}

      {isShopping && isSearching && singleItem && (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="lime"
            className="flex-1 gap-1.5 rounded-2xl"
            onClick={() => toggleBought(singleItem.id)}
          >
            <Check className="size-4" /> Comprado
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex-1 gap-1.5 rounded-2xl text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => toggleMissing(singleItem.id)}
          >
            <Ban className="size-4" /> No hay
          </Button>
        </div>
      )}

      {isShopping && (
        <div className="grid grid-cols-4 gap-1 rounded-2xl border border-border/70 bg-muted/40 p-1">
          {STATUS_TABS.map((tab) => {
            const active = statusFilter === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setStatusFilter(tab.value)}
                aria-pressed={active}
                className={cn(
                  "rounded-xl px-1 py-1.5 text-xs font-medium transition-colors",
                  active
                    ? "bg-card text-foreground shadow-soft"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      )}

      {items.length > 0 && storeOptions.length > 0 && (
        <ListFilterSelects
          storeOptions={storeOptions}
          filterCats={filterCats}
          storeFilter={storeFilter}
          categoryFilter={categoryFilter}
          onStoreChange={selectStore}
          onCategoryChange={setCategoryFilter}
        />
      )}

      {grouped.length === 0 && items.length > 0 && (
        <Card className="border-dashed p-8 text-center text-muted-foreground">
          <div className="text-4xl mb-2">{isSearching ? "🔍" : "✅"}</div>
          <p>
            {isSearching
              ? `No hay productos que coincidan con “${query}”.`
              : statusFilter === "pending"
                ? "¡No quedan pendientes! 🎉"
                : statusFilter === "bought"
                  ? "Todavía no marcaste nada como comprado."
                  : statusFilter === "missing"
                    ? "No marcaste ningún producto como “no hay”."
                    : "No hay productos que coincidan con el filtro."}
          </p>
        </Card>
      )}

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
              <button
                type="button"
                onClick={() => toggleStore(sKey)}
                aria-expanded={!storeCollapsed}
                className={cn(
                  "group flex w-full items-start gap-2 text-left outline-none rounded-xl -mx-1 px-1 py-1 transition hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-primary/40",
                  store.storeAddress ? "mb-2" : "mb-4",
                )}
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
              {store.storeAddress && !storeCollapsed && (
                <p className="mb-4 ml-[60px] flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="size-3.5 shrink-0" aria-hidden />
                  <span>{store.storeAddress}</span>
                </p>
              )}
              {!storeCollapsed && (
                <div className="space-y-5 pl-1">
                  {store.directItems.length > 0 && (
                    <ul className="space-y-2">
                      <AnimatePresence initial={false}>
                        {store.directItems.map((item) => renderItem(item))}
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
                          <ul className="space-y-2">
                            <AnimatePresence initial={false}>
                              {cat.items.map((item) => renderItem(item))}
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
    </div>
  );
}

function CircleCheck({ checked, reduced }: { checked: boolean; reduced: boolean }) {
  return (
    <span
      className={cn(
        "shrink-0 size-7 rounded-full border-2 flex items-center justify-center transition-all duration-200",
        checked
          ? "border-primary bg-primary text-primary-foreground scale-105"
          : "border-border bg-card",
      )}
      aria-hidden
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <motion.path
          d="M4 12l6 6L20 6"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={false}
          animate={{ pathLength: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
          transition={
            reduced
              ? { duration: 0 }
              : { type: "spring", stiffness: 380, damping: 18 }
          }
        />
      </svg>
    </span>
  );
}

function CircleMissing() {
  return (
    <span
      className="shrink-0 size-7 rounded-full border-2 border-destructive/60 bg-destructive/15 text-destructive flex items-center justify-center"
      aria-hidden
    >
      <X className="size-4" strokeWidth={3} />
    </span>
  );
}
