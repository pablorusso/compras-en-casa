"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CopyPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { cloneListAction } from "@/actions/lists";

type Props = {
  sourceListId: number;
  sourceName?: string;
  hasCurrent: boolean;
  label?: string;
  ariaLabel?: string;
  variant?: "icon" | "button";
  size?: "default" | "lg";
  className?: string;
};

export function CloneListButton({
  sourceListId,
  sourceName,
  hasCurrent,
  label = "Usar como nueva lista",
  ariaLabel,
  variant = "button",
  size = "default",
  className,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onClick() {
    const target = sourceName ? `"${sourceName}"` : "esta lista";
    const message = hasCurrent
      ? `Esto va a archivar la lista vigente actual (y vencer su link compartible) y crear una nueva con los ítems de ${target}. ¿Continuar?`
      : `¿Crear una nueva lista vigente con los ítems de ${target}?`;
    if (!confirm(message)) return;
    const fd = new FormData();
    fd.set("sourceListId", String(sourceListId));
    startTransition(async () => {
      try {
        await cloneListAction(fd);
        toast.success("Lista lista para editar");
        router.push("/admin/list");
        router.refresh();
      } catch (err) {
        toast.error((err as Error).message);
      }
    });
  }

  if (variant === "icon") {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onClick}
        disabled={pending}
        aria-label={ariaLabel ?? label}
        className={cn("size-9 rounded-xl", pending && "opacity-50", className)}
      >
        <CopyPlus className="size-4" />
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      size={size}
      onClick={onClick}
      disabled={pending}
      className={cn("rounded-2xl gap-1.5", className)}
    >
      <CopyPlus className="size-4" /> {label}
    </Button>
  );
}
