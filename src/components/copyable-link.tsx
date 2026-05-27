"use client";

import type { ReactNode } from "react";
import { Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useIsStandalone } from "@/lib/use-is-standalone";

export function CopyableLinkRow({
  url,
  external = true,
  highlight = false,
}: {
  url: string;
  external?: boolean;
  highlight?: boolean;
}) {
  const standalone = useIsStandalone();

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
    <div className="flex items-center gap-2">
      <code
        className={cn(
          "flex-1 truncate text-xs px-2 py-1.5 rounded",
          highlight
            ? "bg-primary/15 text-primary font-semibold ring-2 ring-inset ring-primary/50"
            : "bg-muted text-muted-foreground",
        )}
      >
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
          rel="noopener noreferrer"
          onClick={(e) => {
            // En PWA standalone forzamos la apertura en el navegador por defecto:
            // la página compartible no forma parte de la app instalada.
            if (standalone) {
              e.preventDefault();
              window.open(url, "_blank", "noopener,noreferrer");
            }
          }}
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Abrir en nueva pestaña"
        >
          <ExternalLink className="size-4" />
        </a>
      )}
    </div>
  );
}

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
  return (
    <div className={cn("rounded-xl border bg-card p-3", className)}>
      {label && (
        <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-1">
          {label}
        </p>
      )}
      <CopyableLinkRow url={url} external={external} />
      {footer && <div className="mt-2 pt-2 border-t">{footer}</div>}
    </div>
  );
}
