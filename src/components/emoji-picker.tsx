"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { setEmojiAction } from "@/actions/stores";
import { searchEmojis } from "@/lib/emoji-catalog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Props = {
  kind: "store" | "category";
  id: number;
  emoji: string;
  size?: "sm" | "lg";
  className?: string;
};

export function EmojiButton({ kind, id, emoji, size = "sm", className }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();

  const results = useMemo(() => searchEmojis(query), [query]);

  const triggerClass = cn(
    "inline-flex items-center justify-center rounded-xl leading-none transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    size === "lg" ? "text-3xl size-14" : "text-xl size-9",
    pending && "opacity-50",
    className,
  );

  function applyEmoji(char: string) {
    if (pending) return;
    const fd = new FormData();
    fd.set("kind", kind);
    fd.set("id", String(id));
    fd.set("emoji", char);
    startTransition(async () => {
      try {
        await setEmojiAction(fd);
        toast.success("Emoji actualizado");
        setOpen(false);
        setQuery("");
      } catch (err) {
        toast.error((err as Error).message);
      }
    });
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <PopoverTrigger
        type="button"
        aria-label="Cambiar emoji"
        title="Cambiar emoji"
        className={triggerClass}
        disabled={pending}
      >
        <span>{emoji}</span>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-3">
        <div className="space-y-2">
          <Input
            autoFocus
            placeholder="Buscar emoji…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-9"
          />
          {results.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Sin resultados
            </p>
          ) : (
            <div className="grid grid-cols-8 gap-1 max-h-60 overflow-y-auto pr-1">
              {results.map((entry) => (
                <button
                  key={`${entry.char}-${entry.name}`}
                  type="button"
                  title={entry.name}
                  aria-label={entry.name}
                  disabled={pending}
                  onClick={() => applyEmoji(entry.char)}
                  className={cn(
                    "size-8 inline-flex items-center justify-center rounded-md text-xl leading-none hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    entry.char === emoji && "bg-accent ring-1 ring-ring",
                  )}
                >
                  {entry.char}
                </button>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
