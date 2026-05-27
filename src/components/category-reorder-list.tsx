"use client";

import { useRef, useState, useTransition } from "react";
import { Reorder, useDragControls } from "framer-motion";
import { GripVertical, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { reorderCategoriesAction } from "@/actions/stores";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmojiButton } from "@/components/emoji-picker";
import { CategoryFormDrawer } from "@/components/category-form-drawer";
import { cn } from "@/lib/utils";

type OrganizerCategory = {
  id: number;
  name: string;
  emoji: string;
  excludeFromAutoAdd: boolean;
};

/**
 * Lista de categorías reordenable por arrastre. La manija (⠿) de cada fila
 * inicia el drag; el resto del row no arrastra para no pisar el scroll en móvil.
 * El nuevo orden se guarda de forma optimista al soltar; si falla, revierte al
 * estado del servidor.
 */
type Props = {
  storeId: number;
  categories: OrganizerCategory[];
  categoryCounts: Record<number, number>;
  onRequestDelete: (cat: { id: number; name: string }) => void;
  onRefresh: () => void;
};

/**
 * El estado de orden se deriva de las props. En vez de resincronizarlo con un effect
 * (cascada de renders) o de escribir refs en render, se fuerza un remount con `key`
 * cuando cambia el contenido de `categories` (alta/baja/edición/reorder confirmado):
 * así el inner arranca siempre desde las props frescas con un estado limpio.
 */
export function CategoryReorderList(props: Props) {
  const key = props.categories
    .map((c) => `${c.id}-${c.name}-${c.emoji}-${c.excludeFromAutoAdd}`)
    .join("|");
  return <CategoryReorderListInner key={key} {...props} />;
}

function CategoryReorderListInner({
  storeId,
  categories,
  categoryCounts,
  onRequestDelete,
  onRefresh,
}: Props) {
  const [order, setOrder] = useState<OrganizerCategory[]>(categories);
  const [reorderPending, startReorder] = useTransition();
  // Ids ya persistidos: para no guardar si el drop deja todo igual.
  const committedRef = useRef<number[]>(categories.map((c) => c.id));
  // Orden más reciente, para leerlo desde el callback de onDragEnd sin closures stale.
  // Se actualiza en handleReorder (no en render) para no violar la regla de refs.
  const orderRef = useRef(order);

  function handleReorder(next: OrganizerCategory[]) {
    orderRef.current = next;
    setOrder(next);
  }

  function persist() {
    const ids = orderRef.current.map((c) => c.id);
    const prev = committedRef.current;
    const unchanged =
      ids.length === prev.length && ids.every((id, i) => id === prev[i]);
    if (unchanged) return;
    startReorder(async () => {
      try {
        await reorderCategoriesAction(storeId, ids);
        committedRef.current = ids;
        onRefresh();
      } catch (err) {
        toast.error((err as Error).message);
        setOrder(categories); // revert optimista
      }
    });
  }

  return (
    <Reorder.Group
      axis="y"
      values={order}
      onReorder={handleReorder}
      as="div"
      className="space-y-2"
    >
      {order.map((c) => (
        <CategoryRow
          key={c.id}
          category={c}
          count={categoryCounts[c.id] ?? 0}
          disabled={reorderPending}
          onCommit={persist}
          onRequestDelete={onRequestDelete}
          onRefresh={onRefresh}
        />
      ))}
    </Reorder.Group>
  );
}

function CategoryRow({
  category,
  count,
  disabled,
  onCommit,
  onRequestDelete,
  onRefresh,
}: {
  category: OrganizerCategory;
  count: number;
  disabled: boolean;
  onCommit: () => void;
  onRequestDelete: (cat: { id: number; name: string }) => void;
  onRefresh: () => void;
}) {
  const controls = useDragControls();
  return (
    <Reorder.Item
      value={category}
      dragListener={false}
      dragControls={controls}
      onDragEnd={onCommit}
      as="div"
      className="flex items-center gap-2 rounded-xl border border-border/70 bg-card/60 px-3 py-2"
    >
      <button
        type="button"
        aria-label={`Arrastrar para reordenar ${category.name}`}
        title="Arrastrar para reordenar"
        onPointerDown={(e) => {
          if (disabled) return;
          controls.start(e);
        }}
        style={{ touchAction: "none" }}
        className={cn(
          "inline-flex h-8 w-7 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent/40 active:cursor-grabbing",
          disabled && "cursor-default opacity-40",
        )}
      >
        <GripVertical className="size-4" />
      </button>
      <EmojiButton
        kind="category"
        id={category.id}
        emoji={category.emoji}
        onChanged={onRefresh}
      />
      <span className="flex-1 truncate text-sm font-medium">{category.name}</span>
      <Badge variant="outline">
        {count} {count === 1 ? "producto" : "productos"}
      </Badge>
      <CategoryFormDrawer mode="edit" category={category} onSuccess={onRefresh} />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-8 text-destructive hover:text-destructive"
        aria-label={`Eliminar ${category.name}`}
        title="Eliminar categoría"
        onClick={() => onRequestDelete({ id: category.id, name: category.name })}
      >
        <Trash2 className="size-4" />
      </Button>
    </Reorder.Item>
  );
}
