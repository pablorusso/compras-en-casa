"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Copy, MapPin, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ProgressBar } from "@/components/progress-bar";
import { QuantityBadge } from "@/components/quantity-badge";
import { SectionHeading } from "@/components/section-heading";
import { groupItems, buildMarkdownText, filterItemsByQuery } from "@/lib/format";
import { getStoreStyle } from "@/lib/store-style";
import { useHasMounted } from "@/lib/use-has-mounted";
import type { ShoppingListItem } from "@/db/schema";
import { cn } from "@/lib/utils";

const EMPTY_CHECKED: ReadonlySet<number> = new Set<number>();

type Mode = "view" | "shopping";

function progressEmoji(p: number): string {
  if (p >= 100) return "🎉";
  if (p >= 75) return "🛍️";
  if (p >= 50) return "🥖";
  if (p >= 25) return "🥕";
  return "🥬";
}

export function ListView({
  list,
  items,
  mode = "view",
  storageKey,
}: {
  list: { id: number; name: string };
  items: ShoppingListItem[];
  mode?: Mode;
  storageKey?: string;
}) {
  const [query, setQuery] = useState("");
  const isSearching = query.trim().length > 0;
  const filteredItems = useMemo(
    () => filterItemsByQuery(items, query),
    [items, query],
  );
  const grouped = useMemo(() => groupItems(filteredItems), [filteredItems]);
  const filteredCount = filteredItems.length;
  const hasMounted = useHasMounted();
  const [checked, setChecked] = useState<Set<number>>(() => {
    if (typeof window === "undefined") return new Set<number>();
    if (mode !== "shopping" || !storageKey) return new Set<number>();
    try {
      const raw = window.localStorage.getItem(storageKey);
      return raw ? new Set<number>(JSON.parse(raw)) : new Set<number>();
    } catch {
      return new Set<number>();
    }
  });
  const reduced = useReducedMotion();

  useEffect(() => {
    if (mode !== "shopping" || !storageKey || !hasMounted) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(Array.from(checked)));
    } catch {}
  }, [checked, mode, storageKey, hasMounted]);

  const displayedChecked: ReadonlySet<number> = hasMounted ? checked : EMPTY_CHECKED;

  function toggle(id: number) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(8);
  }

  async function copyAll() {
    const text = buildMarkdownText(list, items);
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Lista copiada (Markdown)");
    } catch {
      toast.error("No se pudo copiar");
    }
  }

  const progress = items.length === 0 ? 0 : Math.round((displayedChecked.size / items.length) * 100);

  return (
    <div className="space-y-6">
      {mode === "shopping" && (
        <div className="rounded-2xl border border-border/70 bg-card/80 p-4 shadow-soft backdrop-blur-sm">
          <div className="flex items-center justify-between text-sm mb-2.5">
            <span className="text-muted-foreground">Tu progreso</span>
            <span className="font-medium tabular-nums">
              {displayedChecked.size} / {items.length}
            </span>
          </div>
          <ProgressBar value={progress} emoji={progressEmoji(progress)} variant="default" />
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {isSearching
            ? `${filteredCount} de ${items.length} ${items.length === 1 ? "producto" : "productos"}`
            : `${items.length} ${items.length === 1 ? "producto" : "productos"} en ${grouped.length} ${grouped.length === 1 ? "comercio" : "comercios"}`}
        </p>
        <Button
          onClick={copyAll}
          size="lg"
          className="rounded-2xl gap-2 shadow-soft"
        >
          <Copy className="size-4" /> Copiar todo
        </Button>
      </div>

      {items.length > 0 && (
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

      {isSearching && grouped.length === 0 && (
        <Card className="border-dashed p-8 text-center text-muted-foreground">
          <div className="text-4xl mb-2">🔍</div>
          <p>No hay productos que coincidan con &ldquo;{query}&rdquo;.</p>
        </Card>
      )}

      <ul className="space-y-8">
        {grouped.map((store) => {
          const style = getStoreStyle(store.storeId ?? store.storeName);
          return (
            <li key={`store-${store.storeId ?? store.storeName}`}>
              <SectionHeading
                title={store.storeName}
                eyebrow={`${store.categories.reduce((acc, c) => acc + c.items.length, 0)} productos`}
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
                className={store.storeAddress ? "mb-2" : "mb-4"}
              />
              {store.storeAddress && (
                <p className="mb-4 ml-[60px] flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="size-3.5 shrink-0" aria-hidden />
                  <span>{store.storeAddress}</span>
                </p>
              )}
              <div className="space-y-5 pl-1">
                {store.categories.map((cat) => (
                  <div key={`cat-${cat.categoryId ?? cat.categoryName}`}>
                    <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-2">
                      <span className="text-base">{cat.categoryEmoji}</span>
                      <span>{cat.categoryName}</span>
                    </div>
                    <ul className="space-y-2">
                      <AnimatePresence initial={false}>
                        {cat.items.map((item) => {
                          const isChecked = displayedChecked.has(item.id);
                          const content = (
                            <div className="flex items-center gap-3 w-full">
                              {mode === "shopping" && (
                                <CircleCheck checked={isChecked} reduced={!!reduced} />
                              )}
                              <QuantityBadge
                                value={item.quantityValue}
                                unit={item.quantityUnit}
                                dimmed={isChecked}
                              />
                              <span className="flex-1 min-w-0">
                                <span
                                  className={cn(
                                    "font-medium block truncate transition-all duration-200",
                                    isChecked && "line-through text-muted-foreground",
                                  )}
                                >
                                  {item.productName}
                                </span>
                                {item.notes && (
                                  <span
                                    className={cn(
                                      "block text-xs italic text-muted-foreground/90 mt-0.5",
                                      isChecked && "line-through opacity-70",
                                    )}
                                  >
                                    💬 {item.notes}
                                  </span>
                                )}
                              </span>
                            </div>
                          );

                          return (
                            <motion.li
                              key={item.id}
                              layout
                              initial={reduced ? false : { opacity: 0, y: 4 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              {mode === "shopping" ? (
                                <button
                                  type="button"
                                  onClick={() => toggle(item.id)}
                                  className={cn(
                                    "w-full rounded-2xl border border-border/70 bg-card px-3.5 py-2 text-left shadow-soft transition-all duration-200 hover:border-primary/40 hover:shadow-glow active:scale-[0.99]",
                                    isChecked && "bg-muted/50 border-border/50 shadow-none",
                                  )}
                                >
                                  {content}
                                </button>
                              ) : (
                                <div className="w-full rounded-2xl border border-border/70 bg-card px-3.5 py-2 shadow-soft">
                                  {content}
                                </div>
                              )}
                            </motion.li>
                          );
                        })}
                      </AnimatePresence>
                    </ul>
                  </div>
                ))}
              </div>
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
