"use client";

import { useState, useTransition } from "react";
import { RefreshCw, Ban, Clock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CopyableLink } from "@/components/copyable-link";
import {
  createShareLinkAction,
  expireShareLinkAction,
} from "@/actions/lists";

type ShareInfo = { token: string; expiresAt: string } | null;

export function ShareLinkSection({
  listId,
  origin,
  initial,
}: {
  listId: number;
  origin: string;
  initial: ShareInfo;
}) {
  const [info, setInfo] = useState<ShareInfo>(initial);
  const [pending, startTransition] = useTransition();

  function regenerate() {
    const fd = new FormData();
    fd.set("listId", String(listId));
    startTransition(async () => {
      try {
        const res = await createShareLinkAction(fd);
        setInfo(res);
        toast.success(info ? "Link regenerado" : "Link generado");
      } catch (err) {
        toast.error((err as Error).message);
      }
    });
  }

  function expire() {
    if (!confirm("¿Eliminar el link compartible? Quien lo tenga dejará de poder acceder.")) return;
    const fd = new FormData();
    fd.set("listId", String(listId));
    startTransition(async () => {
      try {
        await expireShareLinkAction(fd);
        setInfo(null);
        toast.success("Link eliminado");
      } catch (err) {
        toast.error((err as Error).message);
      }
    });
  }

  const url = info ? `${origin}/share/${info.token}` : "";
  const expiresLabel = info
    ? new Date(info.expiresAt).toLocaleString("es-AR", {
        dateStyle: "medium",
        timeStyle: "short",
      } as Intl.DateTimeFormatOptions)
    : null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
          Link compartible
        </p>
        <div className="flex items-center gap-1">
          {info && (
            <Button
              size="xs"
              variant="ghost"
              onClick={expire}
              disabled={pending}
              aria-label="Eliminar link"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Ban className="size-3.5" />
              Eliminar
            </Button>
          )}
          <Button
            size="xs"
            variant="ghost"
            onClick={regenerate}
            disabled={pending}
            aria-label={info ? "Regenerar link" : "Generar link"}
          >
            <RefreshCw className={pending ? "size-3.5 animate-spin" : "size-3.5"} />
            {info ? "Regenerar" : "Generar"}
          </Button>
        </div>
      </div>
      {info ? (
        <CopyableLink
          url={url}
          footer={
            expiresLabel ? (
              <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Clock className="size-3" />
                Expira el {expiresLabel}
              </p>
            ) : undefined
          }
        />
      ) : (
        <p className="rounded-xl border border-dashed bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground">
          Sin link activo. Generá uno para compartir esta lista por un período acotado.
        </p>
      )}
    </div>
  );
}
