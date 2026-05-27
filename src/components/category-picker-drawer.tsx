"use client";

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type PickerCategory = { id: number; name: string; emoji: string };

/**
 * Drawer controlado para elegir una categoría (o "Sin categoría"). Lo usa el
 * editor de comercio tanto para mover un producto suelto como un grupo.
 */
export function CategoryPickerDrawer({
  open,
  onOpenChange,
  categories,
  currentCategoryId,
  title,
  description,
  onPick,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  categories: PickerCategory[];
  currentCategoryId?: number | null;
  title: string;
  description?: string;
  onPick: (categoryId: number | null) => void;
}) {
  const optionClass = (selected: boolean) =>
    cn(
      "flex w-full items-center gap-2.5 rounded-xl border px-3.5 py-3 text-left text-sm transition",
      selected
        ? "border-primary bg-primary/10 text-primary"
        : "border-border hover:border-primary/40",
    );

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-md max-h-[85svh] overflow-y-auto">
          <DrawerHeader>
            <DrawerTitle>{title}</DrawerTitle>
            {description && <DrawerDescription>{description}</DrawerDescription>}
          </DrawerHeader>
          <div className="px-4 pb-4 space-y-2">
            <button
              type="button"
              onClick={() => onPick(null)}
              className={optionClass(currentCategoryId === null)}
            >
              <span className="text-base leading-none">🚫</span>
              <span className="text-muted-foreground">— Sin categoría —</span>
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => onPick(c.id)}
                className={optionClass(currentCategoryId === c.id)}
              >
                <span className="text-base leading-none">{c.emoji}</span>
                <span className="truncate">{c.name}</span>
              </button>
            ))}
          </div>
          <DrawerFooter>
            <DrawerClose asChild>
              <Button type="button" variant="ghost" size="lg">
                Cancelar
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
