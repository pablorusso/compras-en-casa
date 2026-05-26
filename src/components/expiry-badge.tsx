"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock, History } from "lucide-react";
import { cn } from "@/lib/utils";

type ExpiryBadgeProps = {
  expiresAt: Date | string;
  totalHours?: number;
  className?: string;
};

function getRemaining(expiresAt: Date): { hours: number; ratio: number } {
  const now = Date.now();
  const exp = expiresAt.getTime();
  const remainMs = Math.max(0, exp - now);
  const totalMs = 24 * 3600 * 1000;
  return {
    hours: Math.max(0, Math.ceil(remainMs / 3600000)),
    ratio: Math.max(0, Math.min(1, remainMs / totalMs)),
  };
}

export function ExpiryBadge({
  expiresAt,
  totalHours = 24,
  className,
}: ExpiryBadgeProps) {
  const expDate = useMemo(
    () => (typeof expiresAt === "string" ? new Date(expiresAt) : expiresAt),
    [expiresAt],
  );
  const [{ hours, ratio }, setState] = useState(() => getRemaining(expDate));

  useEffect(() => {
    const tick = () => setState(getRemaining(expDate));
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, [expDate]);

  const lowTime = ratio < 0.2;
  const fillVar = lowTime ? "var(--destructive)" : "var(--highlight)";

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/80 pl-2.5 pr-3 py-1.5 shadow-soft backdrop-blur-sm",
        className,
      )}
      title={`Expira ${expDate.toLocaleString("es-AR")}`}
    >
      <span
        className="relative inline-flex size-7 items-center justify-center rounded-full"
        style={{
          background: `conic-gradient(${fillVar} ${ratio * 360}deg, color-mix(in oklab, ${fillVar} 15%, var(--muted)) 0)`,
        }}
        aria-hidden
      >
        <span className="absolute inset-[3px] rounded-full bg-card flex items-center justify-center">
          <Clock className="size-3.5 text-foreground" />
        </span>
      </span>
      <span className="text-xs">
        <span className="text-muted-foreground">Expira en</span>{" "}
        <span className="font-semibold tabular-nums">
          ~{hours} h
        </span>
      </span>
      <span className="sr-only">
        Quedan aproximadamente {hours} horas de {totalHours}.
      </span>
    </div>
  );
}

export function ExpiredBadge({
  expiresAt,
  className,
}: {
  expiresAt: Date | string;
  className?: string;
}) {
  const expDate = typeof expiresAt === "string" ? new Date(expiresAt) : expiresAt;
  const label = expDate.toLocaleDateString("es-AR", {
    dateStyle: "medium",
  } as Intl.DateTimeFormatOptions);
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-destructive/40 bg-destructive/10 pl-2.5 pr-3 py-1.5 shadow-soft backdrop-blur-sm",
        className,
      )}
      title={`Expiró el ${expDate.toLocaleString("es-AR")}`}
    >
      <span className="relative inline-flex size-7 items-center justify-center rounded-full bg-destructive/15">
        <History className="size-3.5 text-destructive" />
      </span>
      <span className="text-xs">
        <span className="text-muted-foreground">Expiró el</span>{" "}
        <span className="font-semibold text-destructive">{label}</span>
      </span>
    </div>
  );
}
