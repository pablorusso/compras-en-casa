"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateListNameAction } from "@/actions/lists";
import { cn } from "@/lib/utils";

export function EditableListTitle({
  listId,
  initialName,
  className,
  size = "lg",
}: {
  listId: number;
  initialName: string;
  className?: string;
  size?: "lg" | "md";
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initialName);
  const [name, setName] = useState(initialName);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  function commit() {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === name) {
      setDraft(name);
      setEditing(false);
      return;
    }
    const previous = name;
    setName(trimmed);
    setEditing(false);
    const fd = new FormData();
    fd.set("listId", String(listId));
    fd.set("name", trimmed);
    startTransition(async () => {
      try {
        await updateListNameAction(fd);
        toast.success("Nombre actualizado");
      } catch (err) {
        // Rollback optimista
        setName(previous);
        setDraft(previous);
        toast.error((err as Error).message);
      }
    });
  }

  function cancel() {
    setDraft(name);
    setEditing(false);
  }

  const titleClass =
    size === "lg"
      ? "font-display text-3xl md:text-4xl font-semibold tracking-tight leading-tight"
      : "font-display text-2xl md:text-3xl font-semibold tracking-tight leading-tight";

  if (editing) {
    return (
      <div className={cn("flex items-center gap-2 flex-wrap", className)}>
        <Input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            } else if (e.key === "Escape") {
              e.preventDefault();
              cancel();
            }
          }}
          maxLength={80}
          className={cn("flex-1 min-w-0", titleClass, "h-auto py-1.5")}
          disabled={pending}
        />
        <div className="flex gap-1">
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            onClick={commit}
            disabled={pending}
            aria-label="Guardar"
          >
            <Check className="size-4" />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            onClick={cancel}
            disabled={pending}
            aria-label="Cancelar"
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2 group", className)}>
      <h1 className={cn(titleClass, "min-w-0 break-words")}>{name}</h1>
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        className="opacity-60 group-hover:opacity-100 transition-opacity"
        onClick={() => setEditing(true)}
        aria-label="Editar nombre"
      >
        <Pencil className="size-4" />
      </Button>
    </div>
  );
}
