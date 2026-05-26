"use client";

import type { ReactNode } from "react";
import { Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CopyableLink({
  url,
  label,
  className,
  external = true,
  footer,
}: {
  url: string;
  label?: string;
  className?: string;
  external?: boolean;
  footer?: ReactNode;
}) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado");
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate?.(10);
      }
    } catch {
      toast.error("No se pudo copiar");
    }
  }

  return (
    <div className={cn("rounded-xl border bg-card p-3", className)}>
      {label && (
        <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-1">
          {label}
        </p>
      )}
      <div className="flex items-center gap-2">
        <code className="flex-1 truncate text-xs bg-muted px-2 py-1.5 rounded">
          {url}
        </code>
        <Button
          size="icon"
          variant="ghost"
          className="size-8 shrink-0"
          onClick={copy}
          aria-label="Copiar link"
        >
          <Copy className="size-4" />
        </Button>
        {external && (
          <a
            href={url}
            target="_blank"
            rel="noopener"
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Abrir en nueva pestaña"
          >
            <ExternalLink className="size-4" />
          </a>
        )}
      </div>
      {footer && <div className="mt-2 pt-2 border-t">{footer}</div>}
    </div>
  );
}
