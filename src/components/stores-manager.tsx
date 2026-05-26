"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, Sparkles, EyeOff } from "lucide-react";
import { toast } from "sonner";
import {
  createStoreAction,
  updateStoreAction,
  deleteStoreAction,
  createCategoryAction,
  updateCategoryAction,
  deleteCategoryAction,
  regenerateEmojiAction,
  reorderStoresAction,
  reorderCategoriesAction,
} from "@/actions/stores";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import { MotionList } from "@/components/motion-card";
import { EmojiButton } from "@/components/emoji-picker";
import { getStoreStyle } from "@/lib/store-style";
import { listItem } from "@/lib/motion";
import { cn } from "@/lib/utils";

type Cat = {
  id: number;
  name: string;
  emoji: string;
  storeId: number;
  excludeFromAutoAdd: boolean;
};
type Store = {
  id: number;
  name: string;
  emoji: string;
  address: string | null;
  excludeFromAutoAdd: boolean;
  categories: Cat[];
};

export function StoresManager({ data }: { data: Store[] }) {
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set(data.map((s) => s.id)));
  const [reorderPending, startReorder] = useTransition();

  function toggle(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function moveStore(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= data.length) return;
    const ids = data.map((s) => s.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    startReorder(async () => {
      try {
        await reorderStoresAction(ids);
      } catch (err) {
        toast.error((err as Error).message);
      }
    });
  }

  function moveCategory(store: Store, index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= store.categories.length) return;
    const ids = store.categories.map((c) => c.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    startReorder(async () => {
      try {
        await reorderCategoriesAction(store.id, ids);
      } catch (err) {
        toast.error((err as Error).message);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <StoreFormDrawer mode="create" />
      </div>

      {data.length === 0 ? (
        <Card tone="warm" className="border-dashed">
          <CardContent className="p-8 text-center text-muted-foreground">
            <div className="text-4xl mb-2">📂</div>
            <p>Todavía no creaste comercios.</p>
            <p className="text-sm mt-1">Empezá con &quot;Supermercado&quot;, &quot;Verdulería&quot;…</p>
          </CardContent>
        </Card>
      ) : (
        <MotionList className="space-y-3" staggerChildren={0.05}>
          {data.map((store, storeIndex) => {
            const isOpen = expanded.has(store.id);
            const style = getStoreStyle(store.id);
            return (
              <motion.li key={store.id} variants={listItem}>
                <Card className="overflow-hidden">
                  <div className="flex items-center gap-3.5 px-4 py-3.5">
                    <EmojiButton
                      kind="store"
                      id={store.id}
                      emoji={store.emoji}
                      size="lg"
                      className={cn("rounded-2xl ring-1", style.tint, style.ring)}
                    />
                    <button
                      type="button"
                      onClick={() => toggle(store.id)}
                      className="flex-1 flex items-center gap-3 min-w-0 text-left rounded-lg py-0.5 -mx-1 px-1 hover:bg-accent/30 transition-colors"
                      aria-expanded={isOpen}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-display text-xl font-semibold tracking-tight truncate">
                          {store.name}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary">
                            {store.categories.length}{" "}
                            {store.categories.length === 1 ? "categoría" : "categorías"}
                          </Badge>
                          {store.excludeFromAutoAdd && (
                            <Badge
                              variant="secondary"
                              className="gap-1"
                              title="No se agrega automáticamente a listas nuevas"
                            >
                              <EyeOff className="size-3" /> Manual
                            </Badge>
                          )}
                        </div>
                      </div>
                    </button>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <ReorderControl
                        onUp={() => moveStore(storeIndex, -1)}
                        onDown={() => moveStore(storeIndex, 1)}
                        isFirst={storeIndex === 0}
                        isLast={storeIndex === data.length - 1}
                        disabled={reorderPending}
                        label="comercio"
                      />
                      <RegenerateEmojiButton
                        kind="store"
                        id={store.id}
                        name={store.name}
                      />
                      <StoreFormDrawer mode="edit" store={store} />
                      <DeleteButton
                        action={deleteStoreAction}
                        id={store.id}
                        label={`Eliminar "${store.name}"? Sus categorías y productos también pueden verse afectados.`}
                      />
                      <button
                        type="button"
                        onClick={() => toggle(store.id)}
                        aria-label={isOpen ? "Colapsar" : "Expandir"}
                        className="size-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent/40 transition-colors"
                      >
                        <ChevronDown
                          className={cn(
                            "size-4 transition-transform",
                            isOpen && "rotate-180",
                          )}
                        />
                      </button>
                    </div>
                  </div>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        key="content"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 240, damping: 28 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 pt-3 space-y-2.5 border-t border-border/60">
                          {store.categories.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-2">
                              Aún no agregaste categorías.
                            </p>
                          ) : (
                            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {store.categories.map((cat, catIndex) => (
                                <li
                                  key={cat.id}
                                  className="flex items-center gap-2 rounded-xl border border-border/70 bg-card/60 px-3 py-2"
                                >
                                  <ReorderControl
                                    onUp={() => moveCategory(store, catIndex, -1)}
                                    onDown={() => moveCategory(store, catIndex, 1)}
                                    isFirst={catIndex === 0}
                                    isLast={catIndex === store.categories.length - 1}
                                    disabled={reorderPending}
                                    label="categoría"
                                  />
                                  <EmojiButton
                                    kind="category"
                                    id={cat.id}
                                    emoji={cat.emoji}
                                  />
                                  <span className="flex-1 truncate text-sm font-medium">
                                    {cat.name}
                                  </span>
                                  {cat.excludeFromAutoAdd && (
                                    <EyeOff
                                      className="size-3.5 shrink-0 text-muted-foreground"
                                      aria-label="No se agrega automáticamente a listas nuevas"
                                    />
                                  )}
                                  <RegenerateEmojiButton
                                    kind="category"
                                    id={cat.id}
                                    name={cat.name}
                                  />
                                  <CategoryFormDrawer mode="edit" category={cat} />
                                  <DeleteButton
                                    action={deleteCategoryAction}
                                    id={cat.id}
                                    label={`Eliminar categoría "${cat.name}"?`}
                                    iconOnly
                                  />
                                </li>
                              ))}
                            </ul>
                          )}

                          <div className="pt-2">
                            <CategoryFormDrawer mode="create" storeId={store.id} />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              </motion.li>
            );
          })}
        </MotionList>
      )}
    </div>
  );
}

function StoreFormDrawer({
  mode,
  store,
}: {
  mode: "create" | "edit";
  store?: Store;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [excludeFromAutoAdd, setExcludeFromAutoAdd] = useState(
    store?.excludeFromAutoAdd ?? false,
  );

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        {mode === "create" ? (
          <Button className="rounded-xl">
            <Plus className="size-4" /> Nuevo comercio
          </Button>
        ) : (
          <Button variant="ghost" size="icon" className="size-8" aria-label="Editar comercio">
            <Pencil className="size-4" />
          </Button>
        )}
      </DrawerTrigger>
      <DrawerContent>
        <form
          action={(fd) => {
            if (excludeFromAutoAdd) fd.set("excludeFromAutoAdd", "on");
            startTransition(async () => {
              try {
                if (mode === "create") await createStoreAction(fd);
                else await updateStoreAction(fd);
                toast.success(mode === "create" ? "Comercio creado" : "Comercio actualizado");
                setOpen(false);
              } catch (err) {
                toast.error((err as Error).message);
              }
            });
          }}
          className="mx-auto w-full max-w-md"
        >
          <DrawerHeader>
            <DrawerTitle>{mode === "create" ? "Nuevo comercio" : "Editar comercio"}</DrawerTitle>
            <DrawerDescription>
              Lugar donde se compra. El emoji se autogenera si lo dejás vacío.
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 space-y-4">
            {mode === "edit" && <input type="hidden" name="id" value={store!.id} />}
            <div className="space-y-2">
              <Label htmlFor="store-name">Nombre</Label>
              <Input
                id="store-name"
                name="name"
                defaultValue={store?.name ?? ""}
                placeholder="Supermercado, Verdulería, Carnicería…"
                required
                autoFocus
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="store-emoji">Emoji</Label>
              <div className="flex gap-2">
                <Input
                  id="store-emoji"
                  name="emoji"
                  defaultValue={store?.emoji ?? ""}
                  placeholder={mode === "create" ? "Auto ✨" : "🛒"}
                  className="h-11 text-2xl text-center w-20"
                  maxLength={4}
                />
                <p className="text-sm text-muted-foreground self-center">
                  Vacío = autogen con IA
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="store-address">Dirección</Label>
              <Input
                id="store-address"
                name="address"
                defaultValue={store?.address ?? ""}
                placeholder="Av. Cabildo 1234 (opcional)"
                className="h-11"
              />
              <p className="text-xs text-muted-foreground">
                Si la completás, el comprador la ve en la lista compartida.
              </p>
            </div>
            <div className="rounded-xl border p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <EyeOff className="size-4 text-primary" />
                  <Label htmlFor="store-exclude" className="cursor-pointer">
                    No agregar automáticamente a listas nuevas
                  </Label>
                </div>
                <Switch
                  id="store-exclude"
                  name="excludeFromAutoAdd-switch"
                  checked={excludeFromAutoAdd}
                  onCheckedChange={setExcludeFromAutoAdd}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Ningún producto de este comercio se suma solo al crear una lista. Los productos
                siguen en el maestro y se pueden agregar a mano.
              </p>
            </div>
          </div>
          <DrawerFooter>
            <Button type="submit" size="lg" disabled={pending} className="rounded-xl">
              {pending ? "Guardando…" : mode === "create" ? "Crear" : "Guardar"}
            </Button>
            <DrawerClose asChild>
              <Button type="button" variant="ghost" size="lg">
                Cancelar
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
}

function CategoryFormDrawer({
  mode,
  storeId,
  category,
}: {
  mode: "create" | "edit";
  storeId?: number;
  category?: Cat;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [excludeFromAutoAdd, setExcludeFromAutoAdd] = useState(
    category?.excludeFromAutoAdd ?? false,
  );
  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        {mode === "create" ? (
          <Button variant="outline" className="w-full sm:flex-1 rounded-xl">
            <Plus className="size-4" /> Agregar categoría
          </Button>
        ) : (
          <Button variant="ghost" size="icon" className="size-8" aria-label="Editar categoría">
            <Pencil className="size-4" />
          </Button>
        )}
      </DrawerTrigger>
      <DrawerContent>
        <form
          action={(fd) => {
            if (excludeFromAutoAdd) fd.set("excludeFromAutoAdd", "on");
            startTransition(async () => {
              try {
                if (mode === "create") await createCategoryAction(fd);
                else await updateCategoryAction(fd);
                toast.success(mode === "create" ? "Categoría creada" : "Categoría actualizada");
                setOpen(false);
              } catch (err) {
                toast.error((err as Error).message);
              }
            });
          }}
          className="mx-auto w-full max-w-md"
        >
          <DrawerHeader>
            <DrawerTitle>
              {mode === "create" ? "Nueva categoría" : "Editar categoría"}
            </DrawerTitle>
            <DrawerDescription>Carne, pollo, limpieza, frutas, lácteos…</DrawerDescription>
          </DrawerHeader>
          <div className="px-4 space-y-4">
            {mode === "edit" && <input type="hidden" name="id" value={category!.id} />}
            {mode === "create" && (
              <input type="hidden" name="storeId" value={storeId} />
            )}
            <div className="space-y-2">
              <Label htmlFor="cat-name">Nombre</Label>
              <Input
                id="cat-name"
                name="name"
                defaultValue={category?.name ?? ""}
                placeholder="Carne, Limpieza…"
                required
                autoFocus
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-emoji">Emoji</Label>
              <Input
                id="cat-emoji"
                name="emoji"
                defaultValue={category?.emoji ?? ""}
                placeholder="Auto ✨"
                className="h-11 text-2xl text-center w-20"
                maxLength={4}
              />
            </div>
            <div className="rounded-xl border p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <EyeOff className="size-4 text-primary" />
                  <Label htmlFor="cat-exclude" className="cursor-pointer">
                    No agregar automáticamente a listas nuevas
                  </Label>
                </div>
                <Switch
                  id="cat-exclude"
                  name="excludeFromAutoAdd-switch"
                  checked={excludeFromAutoAdd}
                  onCheckedChange={setExcludeFromAutoAdd}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Ningún producto de esta categoría se suma solo al crear una lista. Siguen en el
                maestro y se pueden agregar a mano.
              </p>
            </div>
          </div>
          <DrawerFooter>
            <Button type="submit" size="lg" disabled={pending} className="rounded-xl">
              {pending ? "Guardando…" : mode === "create" ? "Crear" : "Guardar"}
            </Button>
            <DrawerClose asChild>
              <Button type="button" variant="ghost" size="lg">
                Cancelar
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
}

function RegenerateEmojiButton({
  kind,
  id,
  name,
}: {
  kind: "store" | "category";
  id: number;
  name: string;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn("size-8", pending && "opacity-50")}
      disabled={pending}
      aria-label="Regenerar emoji con IA"
      onClick={() => {
        const fd = new FormData();
        fd.set("kind", kind);
        fd.set("id", String(id));
        fd.set("name", name);
        startTransition(async () => {
          try {
            await regenerateEmojiAction(fd);
            toast.success("Emoji regenerado ✨");
          } catch (err) {
            toast.error((err as Error).message);
          }
        });
      }}
    >
      <Sparkles className="size-4" />
    </Button>
  );
}

function ReorderControl({
  onUp,
  onDown,
  isFirst,
  isLast,
  disabled,
  label,
}: {
  onUp: () => void;
  onDown: () => void;
  isFirst: boolean;
  isLast: boolean;
  disabled: boolean;
  label: string;
}) {
  return (
    <div className="flex flex-col -my-1">
      <button
        type="button"
        onClick={onUp}
        disabled={disabled || isFirst}
        aria-label={`Subir ${label}`}
        className="inline-flex h-4 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent/40 transition-colors disabled:opacity-25 disabled:hover:bg-transparent"
      >
        <ChevronUp className="size-3.5" />
      </button>
      <button
        type="button"
        onClick={onDown}
        disabled={disabled || isLast}
        aria-label={`Bajar ${label}`}
        className="inline-flex h-4 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent/40 transition-colors disabled:opacity-25 disabled:hover:bg-transparent"
      >
        <ChevronDown className="size-3.5" />
      </button>
    </div>
  );
}

function DeleteButton({
  action,
  id,
  label,
  iconOnly,
}: {
  action: (fd: FormData) => Promise<void>;
  id: number;
  label: string;
  iconOnly?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!confirm(label)) return;
        const fd = new FormData();
        fd.set("id", String(id));
        startTransition(async () => {
          try {
            await action(fd);
            toast.success("Eliminado");
          } catch (err) {
            toast.error((err as Error).message);
          }
        });
      }}
      className="inline-flex"
    >
      <Button
        type="submit"
        variant="ghost"
        size="icon"
        className={cn("size-8 text-destructive hover:text-destructive", pending && "opacity-50")}
        disabled={pending}
        aria-label="Eliminar"
      >
        <Trash2 className="size-4" />
      </Button>
      {!iconOnly && null}
    </form>
  );
}
