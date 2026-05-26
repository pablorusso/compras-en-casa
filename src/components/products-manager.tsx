"use client";

import { useMemo, useState, useTransition } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Trash2, Search, Leaf } from "lucide-react";
import { toast } from "sonner";
import { deleteProductAction } from "@/actions/products";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ProductFormDrawer,
  type StoreOption,
  type CategoryOption,
} from "@/components/product-form-drawer";
import { MONTHS_SHORT_ES } from "@/lib/seasonality";
import { QuantityBadge } from "@/components/quantity-badge";
import { MotionList } from "@/components/motion-card";
import { listItem, tiltHover } from "@/lib/motion";

export type ProductRow = {
  id: number;
  name: string;
  storeId: number;
  categoryId: number | null;
  defaultQuantityValue: string;
  defaultQuantityUnit: string;
  isSeasonal: boolean;
  seasonMonths: number[];
  archived: boolean;
  category: { id: number; name: string; emoji: string } | null;
  store: { id: number; name: string; emoji: string };
};

export function ProductsManager({
  products,
  stores,
  categories,
}: {
  products: ProductRow[];
  stores: StoreOption[];
  categories: CategoryOption[];
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.category?.name.toLowerCase().includes(q) ||
        p.store.name.toLowerCase().includes(q),
    );
  }, [products, query]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-2.5">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-primary" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar producto…"
            className="pl-10 h-11 rounded-2xl"
          />
        </div>
        <ProductFormDrawer
          mode="create"
          stores={stores}
          categories={categories}
        />
      </div>

      {stores.length === 0 ? (
        <Card tone="warm" className="border-dashed p-8 text-center text-muted-foreground">
          <p>Necesitás crear al menos un comercio antes de cargar productos.</p>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed p-8 text-center text-muted-foreground">
          <div className="text-4xl mb-2">📦</div>
          <p>
            {products.length === 0
              ? "Todavía no cargaste productos."
              : "No hay productos que coincidan."}
          </p>
        </Card>
      ) : (
        <MotionList className="space-y-2" staggerChildren={0.025}>
          <AnimatePresence initial={false}>
            {filtered.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                stores={stores}
                categories={categories}
              />
            ))}
          </AnimatePresence>
        </MotionList>
      )}
    </div>
  );
}

function ProductCard({
  product,
  stores,
  categories,
}: {
  product: ProductRow;
  stores: StoreOption[];
  categories: CategoryOption[];
}) {
  const reduced = useReducedMotion();
  return (
    <motion.li
      layout
      variants={listItem}
      initial="hidden"
      animate="show"
      exit={{ opacity: 0, height: 0, scale: 0.96 }}
      whileHover={reduced ? undefined : tiltHover.whileHover}
      transition={{ duration: 0.2 }}
    >
      <Card className="flex flex-row items-center gap-3 px-4 py-3">
        <QuantityBadge
          value={product.defaultQuantityValue}
          unit={product.defaultQuantityUnit}
        />
        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <Badge
              variant="secondary"
              className="h-9 rounded-xl px-3 text-sm font-medium flex-1 min-w-0 justify-start"
            >
              <span className="truncate">{product.name}</span>
            </Badge>
            {product.isSeasonal && (
              <Badge variant="secondary" className="gap-1 shrink-0">
                <Leaf className="size-3" />
                {product.seasonMonths.map((m) => MONTHS_SHORT_ES[m - 1]).join("·")}
              </Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
            <Badge variant="outline" className="gap-1">
              <span className="text-base leading-none">{product.store.emoji}</span>
              {product.store.name}
            </Badge>
            {product.category && (
              <span className="truncate inline-flex items-center gap-1">
                <span className="text-base leading-none">{product.category.emoji}</span>
                {product.category.name}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <ProductFormDrawer
            mode="edit"
            product={product}
            stores={stores}
            categories={categories}
          />
          <DeleteProductButton id={product.id} name={product.name} />
        </div>
      </Card>
    </motion.li>
  );
}

function DeleteProductButton({ id, name }: { id: number; name: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!confirm(`Eliminar "${name}"?`)) return;
        const fd = new FormData();
        fd.set("id", String(id));
        startTransition(async () => {
          try {
            await deleteProductAction(fd);
            toast.success("Producto eliminado");
          } catch (err) {
            toast.error((err as Error).message);
          }
        });
      }}
    >
      <Button
        type="submit"
        variant="ghost"
        size="icon-sm"
        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        disabled={pending}
        aria-label="Eliminar"
      >
        <Trash2 className="size-4" />
      </Button>
    </form>
  );
}
