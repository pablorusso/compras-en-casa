"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { buildMarkdownText } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ShoppingListItem } from "@/db/schema";

type Props = {
  list: { id: number; name: string };
  items: ShoppingListItem[];
  className?: string;
  variant?: "outline" | "ghost";
  size?: "sm" | "default" | "lg";
};

export function CopyListButton({
  list,
  items,
  className,
  variant = "outline",
  size = "default",
}: Props) {
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
    <Button
      variant={variant}
      size={size}
      onClick={copyAll}
      className={cn("rounded-2xl gap-1.5", className)}
    >
      <Copy className="size-4" /> Copiar contenido
    </Button>
  );
}
