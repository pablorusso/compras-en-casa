"use client";

import { ChevronUp, ChevronDown } from "lucide-react";

/**
 * Par de flechas subir/baja para reordenar un ítem de una lista. La lógica de
 * reordenamiento vive en el caller; este componente sólo dispara `onUp`/`onDown`.
 */
export function ReorderControl({
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
        title={`Subir ${label}`}
        className="inline-flex h-4 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent/40 transition-colors disabled:opacity-25 disabled:hover:bg-transparent"
      >
        <ChevronUp className="size-3.5" />
      </button>
      <button
        type="button"
        onClick={onDown}
        disabled={disabled || isLast}
        aria-label={`Bajar ${label}`}
        title={`Bajar ${label}`}
        className="inline-flex h-4 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent/40 transition-colors disabled:opacity-25 disabled:hover:bg-transparent"
      >
        <ChevronDown className="size-3.5" />
      </button>
    </div>
  );
}
