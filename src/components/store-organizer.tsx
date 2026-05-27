"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Sparkles,
  Wand2,
  ListChecks,
  Save,
  RotateCcw,
  FolderInput,
  ArrowRight,
  Loader2,
  Undo2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  suggestClassificationAction,
  applyClassificationAction,
  type ClassificationScope,
} from "@/actions/classification";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { QuantityBadge } from "@/components/quantity-badge";
import { MotionList } from "@/components/motion-card";
import {
  CategoryPickerDrawer,
  type PickerCategory,
} from "@/components/category-picker-drawer";
import { listItem } from "@/lib/motion";
import { foldText } from "@/lib/text";
import { cn } from "@/lib/utils";

type OrganizerCategory = { id: number; name: string; emoji: string };
type OrganizerProduct = {
  id: number;
  name: string;
  categoryId: number | null;
  defaultQuantityValue: string;
  defaultQuantityUnit: string;
};

// Picker apuntando a un solo producto o a la selección múltiple.
type PickerTarget =
  | { kind: "single"; productId: number }
  | { kind: "bulk" }
  | null;

export function StoreOrganizer({
  storeId,
  storeName,
  storeEmoji,
  categories,
  products,
}: {
  storeId: number;
  storeName: string;
  storeEmoji: string;
  categories: OrganizerCategory[];
  products: OrganizerProduct[];
}) {
  const router = useRouter();
  const hasCategories = categories.length > 0;

  // Estado borrador: productId -> categoryId | null. `baseline` es lo guardado.
  const initial = useMemo(() => {
    const m: Record<number, number | null> = {};
    for (const p of products) m[p.id] = p.categoryId;
    return m;
  }, [products]);

  const [assignments, setAssignments] =
    useState<Record<number, number | null>>(initial);
  const [baseline, setBaseline] =
    useState<Record<number, number | null>>(initial);

  const [query, setQuery] = useState("");
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [pickerTarget, setPickerTarget] = useState<PickerTarget>(null);
  const [onlyChanged, setOnlyChanged] = useState(true);

  const [aiPending, startAi] = useTransition();
  const [savePending, startSave] = useTransition();

  const productById = useMemo(() => {
    const m = new Map<number, OrganizerProduct>();
    for (const p of products) m.set(p.id, p);
    return m;
  }, [products]);

  const catById = useMemo(() => {
    const m = new Map<number, OrganizerCategory>();
    for (const c of categories) m.set(c.id, c);
    return m;
  }, [categories]);

  // Cambios pendientes respecto a lo guardado.
  const changed = useMemo(
    () => products.filter((p) => assignments[p.id] !== baseline[p.id]),
    [products, assignments, baseline],
  );
  const dirty = changed.length > 0;

  // Para cada producto movido, de qué categoría venía (etiqueta legible). Sirve
  // para resaltar y explicar en la UI exactamente qué movimiento se hizo.
  const movedFrom = useMemo(() => {
    const m = new Map<number, string>();
    for (const p of products) {
      const cur = assignments[p.id] ?? null;
      const prev = baseline[p.id] ?? null;
      if (cur === prev) continue;
      if (prev == null) {
        m.set(p.id, "Sin categoría");
      } else {
        const c = catById.get(prev);
        m.set(p.id, c ? `${c.emoji} ${c.name}` : "otra categoría");
      }
    }
    return m;
  }, [products, assignments, baseline, catById]);

  // Agrupación derivada: cada categoría con sus productos + bucket sin categoría.
  const q = foldText(query.trim());
  // Con cambios pendientes podemos ocultar lo que no se modificó para revisar
  // de un vistazo qué hizo la IA (o uno mismo).
  const showOnlyChanged = onlyChanged && movedFrom.size > 0;
  const matches = (p: OrganizerProduct) => {
    if (showOnlyChanged && !movedFrom.has(p.id)) return false;
    return !q || foldText(p.name).includes(q);
  };

  const buckets = useMemo(() => {
    const byCat = new Map<number | null, OrganizerProduct[]>();
    byCat.set(null, []);
    for (const c of categories) byCat.set(c.id, []);
    for (const p of products) {
      const cid = assignments[p.id] ?? null;
      const arr = byCat.get(cid) ?? byCat.get(null)!;
      arr.push(p);
    }
    return byCat;
  }, [categories, products, assignments]);

  function reassign(productIds: number[], categoryId: number | null) {
    setAssignments((prev) => {
      const next = { ...prev };
      for (const id of productIds) next[id] = categoryId;
      return next;
    });
  }

  // Revierte un solo producto a la categoría que tenía guardada, sin tocar el
  // resto de los cambios pendientes.
  function revertOne(id: number) {
    setAssignments((prev) => ({ ...prev, [id]: baseline[id] ?? null }));
  }

  function toggleSelected(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function onPickerPick(categoryId: number | null) {
    if (!pickerTarget) return;
    if (pickerTarget.kind === "single") {
      reassign([pickerTarget.productId], categoryId);
    } else {
      reassign([...selected], categoryId);
      setSelected(new Set());
    }
    setPickerTarget(null);
  }

  function runAi(scope: ClassificationScope) {
    startAi(async () => {
      try {
        const res = await suggestClassificationAction(storeId, scope);
        if (res.length === 0) {
          toast.info("La IA no sugirió cambios.");
          return;
        }
        setAssignments((prev) => {
          const next = { ...prev };
          for (const r of res) next[r.productId] = r.suggestedCategoryId;
          return next;
        });
        toast.success("Clasificación tentativa lista. Revisala y guardá.");
      } catch (err) {
        toast.error((err as Error).message);
      }
    });
  }

  function save() {
    if (!dirty) return;
    startSave(async () => {
      try {
        await applyClassificationAction(
          storeId,
          changed.map((p) => ({
            productId: p.id,
            categoryId: assignments[p.id] ?? null,
          })),
        );
        setBaseline({ ...assignments });
        setSelectMode(false);
        setSelected(new Set());
        toast.success("Clasificación aplicada.");
        router.refresh();
      } catch (err) {
        toast.error((err as Error).message);
      }
    });
  }

  function discard() {
    setAssignments({ ...baseline });
    setSelected(new Set());
    toast.info("Cambios descartados.");
  }

  const pickerCategories: PickerCategory[] = categories;
  const pickerCurrent =
    pickerTarget?.kind === "single"
      ? (assignments[pickerTarget.productId] ?? null)
      : undefined;

  if (products.length === 0) {
    return (
      <Card tone="warm" className="border-dashed p-8 text-center text-muted-foreground">
        <div className="text-4xl mb-2">📦</div>
        <p>Este comercio todavía no tiene productos.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <AnimatePresence>
        {aiPending && (
          <motion.div
            key="ai-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, y: 8 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.97, opacity: 0 }}
              className="w-full max-w-xs rounded-2xl border bg-popover p-6 text-center shadow-xl"
            >
              <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10">
                <Loader2 className="size-6 animate-spin text-primary" />
              </div>
              <p className="font-medium">Clasificando con IA…</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Esto puede tardar unos segundos.
              </p>
              <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <motion.div
                  className="h-full w-1/3 rounded-full bg-primary"
                  animate={{ x: ["-100%", "300%"] }}
                  transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controles */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-primary" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar producto…"
            className="pl-10 h-11 rounded-2xl"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl"
            disabled={!hasCategories || aiPending || savePending}
            onClick={() => runAi("uncategorized")}
          >
            <Sparkles className="size-4" /> Clasificar sin categoría
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl"
            disabled={!hasCategories || aiPending || savePending}
            onClick={() => runAi("all")}
          >
            <Wand2 className="size-4" /> Reorganizar todo
          </Button>
          <Button
            type="button"
            variant={selectMode ? "secondary" : "ghost"}
            size="sm"
            className="rounded-xl ml-auto"
            onClick={() => {
              setSelectMode((v) => !v);
              setSelected(new Set());
            }}
          >
            <ListChecks className="size-4" />
            {selectMode ? "Listo" : "Seleccionar"}
          </Button>
        </div>

        {!hasCategories && (
          <p className="text-xs text-muted-foreground">
            Este comercio no tiene categorías. Creá categorías para poder
            clasificar productos.
          </p>
        )}

        {dirty && (
          <div className="flex flex-col gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">
                {changed.length}{" "}
                {changed.length === 1 ? "cambio sin guardar" : "cambios sin guardar"}
                <span className="font-normal text-muted-foreground">
                  {" "}· resaltados con su categoría anterior
                </span>
              </span>
              <div className="ml-auto flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="rounded-xl"
                  onClick={discard}
                  disabled={savePending}
                >
                  <RotateCcw className="size-4" /> Descartar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="rounded-xl"
                  onClick={save}
                  disabled={savePending}
                >
                  <Save className="size-4" />
                  {savePending ? "Guardando…" : "Guardar"}
                </Button>
              </div>
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <Switch checked={onlyChanged} onCheckedChange={setOnlyChanged} />
              <span>Mostrar solo los modificados</span>
            </label>
          </div>
        )}
      </div>

      {/* Buckets: sin categoría primero (destacado), luego categorías */}
      <Bucket
        title="Sin categoría"
        emoji="🚫"
        tone="warm"
        products={(buckets.get(null) ?? []).filter(matches)}
        total={(buckets.get(null) ?? []).length}
        hideWhenEmpty={!!q || showOnlyChanged}
        selectMode={selectMode}
        selected={selected}
        movedFrom={movedFrom}
        onToggleSelected={toggleSelected}
        onMove={(id) => setPickerTarget({ kind: "single", productId: id })}
        onRevert={revertOne}
      />

      {categories.map((c) => (
        <Bucket
          key={c.id}
          title={c.name}
          emoji={c.emoji}
          products={(buckets.get(c.id) ?? []).filter(matches)}
          total={(buckets.get(c.id) ?? []).length}
          hideWhenEmpty={!!q || showOnlyChanged}
          selectMode={selectMode}
          selected={selected}
          movedFrom={movedFrom}
          onToggleSelected={toggleSelected}
          onMove={(id) => setPickerTarget({ kind: "single", productId: id })}
          onRevert={revertOne}
        />
      ))}

      {/* Barra de movimiento múltiple */}
      {selectMode && selected.size > 0 && (
        <div className="sticky bottom-4 z-10 flex items-center gap-2 rounded-2xl border bg-popover/95 p-3 shadow-lg backdrop-blur">
          <span className="text-sm font-medium">
            {selected.size} seleccionado{selected.size === 1 ? "" : "s"}
          </span>
          <div className="ml-auto flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="rounded-xl"
              onClick={() => setSelected(new Set())}
            >
              <X className="size-4" /> Limpiar
            </Button>
            <Button
              type="button"
              size="sm"
              className="rounded-xl"
              disabled={!hasCategories}
              onClick={() => setPickerTarget({ kind: "bulk" })}
            >
              <FolderInput className="size-4" /> Mover a…
            </Button>
          </div>
        </div>
      )}

      <CategoryPickerDrawer
        open={pickerTarget !== null}
        onOpenChange={(v) => {
          if (!v) setPickerTarget(null);
        }}
        categories={pickerCategories}
        currentCategoryId={pickerCurrent}
        title={
          pickerTarget?.kind === "single"
            ? `Mover «${productById.get(pickerTarget.productId)?.name ?? ""}»`
            : `Mover ${selected.size} producto${selected.size === 1 ? "" : "s"}`
        }
        description={`${storeEmoji} ${storeName}`}
        onPick={onPickerPick}
      />
    </div>
  );
}

function Bucket({
  title,
  emoji,
  tone,
  products,
  total,
  hideWhenEmpty,
  selectMode,
  selected,
  movedFrom,
  onToggleSelected,
  onMove,
  onRevert,
}: {
  title: string;
  emoji: string;
  tone?: "warm";
  products: OrganizerProduct[];
  total: number;
  hideWhenEmpty: boolean;
  selectMode: boolean;
  selected: Set<number>;
  movedFrom: Map<number, string>;
  onToggleSelected: (id: number) => void;
  onMove: (id: number) => void;
  onRevert: (id: number) => void;
}) {
  if (hideWhenEmpty && products.length === 0) return null;

  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2 px-1">
        <span className="text-base leading-none">{emoji}</span>
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        <Badge variant="outline" className="ml-auto">
          {total}
        </Badge>
      </div>

      {products.length === 0 ? (
        <Card
          tone={tone}
          className="border-dashed px-4 py-5 text-center text-xs text-muted-foreground"
        >
          Vacía
        </Card>
      ) : (
        <MotionList className="space-y-2" staggerChildren={0.02}>
          <AnimatePresence initial={false}>
            {products.map((p) => {
              const isSel = selected.has(p.id);
              const prevLabel = movedFrom.get(p.id);
              const moved = prevLabel !== undefined;
              return (
                <motion.li
                  key={p.id}
                  layout
                  variants={listItem}
                  initial="hidden"
                  animate="show"
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.18 }}
                >
                  <Card
                    tone={tone}
                    interactive={!selectMode}
                    className={cn(
                      "flex flex-row items-center gap-3 px-4 py-3 cursor-pointer",
                      isSel && "ring-2 ring-primary",
                      moved && !isSel && "ring-1 ring-primary/40 bg-primary/5",
                    )}
                    onClick={() =>
                      selectMode ? onToggleSelected(p.id) : onMove(p.id)
                    }
                  >
                    {selectMode && (
                      <Checkbox
                        checked={isSel}
                        onCheckedChange={() => onToggleSelected(p.id)}
                        aria-hidden
                        tabIndex={-1}
                        className="pointer-events-none"
                      />
                    )}
                    <QuantityBadge
                      value={p.defaultQuantityValue}
                      unit={p.defaultQuantityUnit}
                    />
                    <div className="flex-1 min-w-0 flex flex-col gap-1">
                      <span className="truncate text-sm font-medium">
                        {p.name}
                      </span>
                      {moved && (
                        <Badge
                          variant="secondary"
                          className="w-fit max-w-full gap-1 text-[11px]"
                          title={`Movido desde ${prevLabel}`}
                        >
                          <ArrowRight className="size-3 shrink-0" />
                          <span className="truncate">antes: {prevLabel}</span>
                        </Badge>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5">
                      {moved && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="text-muted-foreground hover:text-foreground"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRevert(p.id);
                          }}
                          aria-label={`Revertir ${p.name}`}
                          title="Revertir a su categoría anterior"
                        >
                          <Undo2 className="size-4" />
                        </Button>
                      )}
                      {!selectMode && (
                        <FolderInput className="size-4 text-muted-foreground" />
                      )}
                    </div>
                  </Card>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </MotionList>
      )}
    </section>
  );
}
