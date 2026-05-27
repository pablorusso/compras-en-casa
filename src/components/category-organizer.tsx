"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2, Plus, Trash2, Check, X } from "lucide-react";
import { toast } from "sonner";
import {
  suggestCategoryChangesAction,
  addCategoryFromSuggestionAction,
  deleteOrganizerCategoryAction,
  type CategorySuggestion,
} from "@/actions/classification";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { MotionList } from "@/components/motion-card";
import { CategoryReorderList } from "@/components/category-reorder-list";
import { CategoryFormDrawer } from "@/components/category-form-drawer";
import { listItem } from "@/lib/motion";

type OrganizerCategory = {
  id: number;
  name: string;
  emoji: string;
  excludeFromAutoAdd: boolean;
};

type PendingDelete = { id: number; name: string } | null;

// Clave estable por sugerencia para animaciones y borrado local.
function keyOf(s: CategorySuggestion) {
  return s.action === "add" ? `add:${s.name}` : `${s.action}:${s.categoryId}`;
}

const actionMeta: Record<
  CategorySuggestion["action"],
  { label: string; variant: "secondary" | "destructive" | "default" }
> = {
  keep: { label: "Mantener", variant: "secondary" },
  delete: { label: "Eliminar", variant: "destructive" },
  add: { label: "Agregar", variant: "default" },
};

export function CategoryOrganizer({
  storeId,
  storeName,
  storeEmoji,
  categories,
  categoryCounts,
  uncategorizedCount,
}: {
  storeId: number;
  storeName: string;
  storeEmoji: string;
  categories: OrganizerCategory[];
  categoryCounts: Record<number, number>;
  uncategorizedCount: number;
}) {
  const router = useRouter();
  const [aiPending, startAi] = useTransition();
  const [actionPending, startAction] = useTransition();
  // `null` = todavía no se corrió la IA.
  const [suggestions, setSuggestions] = useState<CategorySuggestion[] | null>(
    null,
  );
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete>(null);

  function refresh() {
    router.refresh();
  }

  function runAi() {
    startAi(async () => {
      try {
        const res = await suggestCategoryChangesAction(storeId);
        setSuggestions(res);
        if (res.length === 0) toast.info("La IA no sugirió cambios.");
        else toast.success("Sugerencias listas. Revisalas una a una.");
      } catch (err) {
        toast.error((err as Error).message);
      }
    });
  }

  function dismiss(s: CategorySuggestion) {
    setSuggestions((prev) =>
      prev ? prev.filter((x) => keyOf(x) !== keyOf(s)) : prev,
    );
  }

  function applyAdd(s: CategorySuggestion) {
    const k = keyOf(s);
    setBusyKey(k);
    startAction(async () => {
      try {
        await addCategoryFromSuggestionAction(storeId, s.name);
        dismiss(s);
        toast.success(`Categoría «${s.name}» creada.`);
        refresh();
      } catch (err) {
        toast.error((err as Error).message);
      } finally {
        setBusyKey(null);
      }
    });
  }

  function confirmDelete() {
    if (!pendingDelete) return;
    const { id, name } = pendingDelete;
    startAction(async () => {
      try {
        await deleteOrganizerCategoryAction(storeId, id);
        // Quita de las sugerencias cualquier tarjeta que apuntara a esta categoría.
        setSuggestions((prev) =>
          prev ? prev.filter((x) => x.categoryId !== id) : prev,
        );
        setPendingDelete(null);
        toast.success(`Categoría «${name}» eliminada.`);
        refresh();
      } catch (err) {
        toast.error((err as Error).message);
      }
    });
  }

  const deleteCount = pendingDelete
    ? (categoryCounts[pendingDelete.id] ?? 0)
    : 0;

  return (
    <div className="space-y-5">
      <AnimatePresence>
        {aiPending && (
          <motion.div
            key="cat-ai-overlay"
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
              <p className="font-medium">Analizando categorías…</p>
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
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-xl"
          disabled={aiPending || actionPending}
          onClick={runAi}
        >
          <Sparkles className="size-4" /> Sugerir categorías con IA
        </Button>
        <p className="text-xs text-muted-foreground">
          La IA mira tus productos y sugiere qué categorías mantener, borrar o
          agregar. Aplicá o descartá cada sugerencia por separado.
        </p>
      </div>

      {/* Sugerencias de la IA */}
      {suggestions && suggestions.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <Sparkles className="size-4 text-primary" />
            <h3 className="text-sm font-semibold tracking-tight">
              Sugerencias de la IA
            </h3>
            <Badge variant="outline" className="ml-auto">
              {suggestions.length}
            </Badge>
          </div>
          <MotionList className="space-y-2" staggerChildren={0.02}>
            <AnimatePresence initial={false}>
              {suggestions.map((s) => {
                const meta = actionMeta[s.action];
                const k = keyOf(s);
                const busy = busyKey === k;
                const count =
                  s.categoryId != null
                    ? (categoryCounts[s.categoryId] ?? 0)
                    : null;
                return (
                  <motion.li
                    key={k}
                    layout
                    variants={listItem}
                    initial="hidden"
                    animate="show"
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.18 }}
                  >
                    <Card className="flex flex-col gap-2.5 px-4 py-3">
                      <div className="flex items-center gap-2">
                        {s.emoji && (
                          <span className="text-base leading-none">
                            {s.emoji}
                          </span>
                        )}
                        <span className="truncate text-sm font-medium">
                          {s.name}
                        </span>
                        <Badge variant={meta.variant}>{meta.label}</Badge>
                        {count != null && (
                          <Badge variant="outline" className="ml-auto">
                            {count} {count === 1 ? "producto" : "productos"}
                          </Badge>
                        )}
                      </div>
                      {s.reason && (
                        <p className="text-xs text-muted-foreground">
                          {s.reason}
                        </p>
                      )}
                      <div className="flex justify-end gap-2">
                        {s.action !== "keep" && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="rounded-xl"
                            disabled={busy || actionPending}
                            onClick={() => dismiss(s)}
                          >
                            <X className="size-4" /> Descartar
                          </Button>
                        )}
                        {s.action === "add" && (
                          <Button
                            type="button"
                            size="sm"
                            className="rounded-xl"
                            disabled={busy || actionPending}
                            onClick={() => applyAdd(s)}
                          >
                            {busy ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Plus className="size-4" />
                            )}
                            Crear
                          </Button>
                        )}
                        {s.action === "delete" && s.categoryId != null && (
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="rounded-xl"
                            disabled={actionPending}
                            onClick={() =>
                              setPendingDelete({
                                id: s.categoryId!,
                                name: s.name,
                              })
                            }
                          >
                            <Trash2 className="size-4" /> Eliminar
                          </Button>
                        )}
                        {s.action === "keep" && (
                          <Badge variant="secondary" className="gap-1">
                            <Check className="size-3" /> Sin cambios
                          </Badge>
                        )}
                      </div>
                    </Card>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </MotionList>
        </section>
      )}

      {/* Categorías actuales: reordenar, editar nombre/emoji, borrar, agregar */}
      <section className="space-y-2">
        <div className="flex items-center gap-2 px-1">
          <h3 className="text-sm font-semibold tracking-tight">
            Categorías actuales
          </h3>
          <Badge variant="outline" className="ml-auto">
            {categories.length}
          </Badge>
        </div>
        {categories.length === 0 ? (
          <Card
            tone="warm"
            className="border-dashed px-4 py-5 text-center text-xs text-muted-foreground"
          >
            Este comercio todavía no tiene categorías.
          </Card>
        ) : (
          <CategoryReorderList
            storeId={storeId}
            categories={categories}
            categoryCounts={categoryCounts}
            onRequestDelete={(cat) => setPendingDelete(cat)}
            onRefresh={refresh}
          />
        )}
        <p className="px-1 pt-1 text-xs text-muted-foreground">
          Sin categoría: {uncategorizedCount}{" "}
          {uncategorizedCount === 1 ? "producto" : "productos"}.
        </p>
        <div className="pt-1">
          <CategoryFormDrawer
            mode="create"
            storeId={storeId}
            onSuccess={refresh}
          />
        </div>
      </section>

      {/* Confirmación de borrado */}
      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(v) => {
          if (!v && !actionPending) setPendingDelete(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar «{pendingDelete?.name}»</DialogTitle>
            <DialogDescription>
              {storeEmoji} {storeName} ·{" "}
              {deleteCount === 0
                ? "No tiene productos asignados."
                : `${deleteCount} ${
                    deleteCount === 1 ? "producto quedará" : "productos quedarán"
                  } sin categoría dentro del comercio.`}{" "}
              La categoría se borra; los productos no.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              disabled={actionPending}
              onClick={() => setPendingDelete(null)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="tomato"
              disabled={actionPending}
              onClick={confirmDelete}
            >
              {actionPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              Eliminar categoría
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
