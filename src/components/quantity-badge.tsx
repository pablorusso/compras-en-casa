import { cn } from "@/lib/utils";
import { shortUnit } from "@/lib/units";

function formatNumber(value: string | number): string {
  const num = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(num)) return String(value);
  return Number.isInteger(num) ? String(num) : String(num).replace(/\.?0+$/, "");
}

export function QuantityBadge({
  value,
  unit,
  dimmed,
  className,
}: {
  value: string | number;
  unit: string;
  dimmed?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex size-12 shrink-0 flex-col items-center justify-center rounded-2xl bg-muted/60 border border-border/70 px-1 transition-all duration-200",
        dimmed && "opacity-50",
        className,
      )}
      aria-label={`${formatNumber(value)} ${unit}`}
    >
      <span className="text-xl font-bold leading-none tabular-nums">
        {formatNumber(value)}
      </span>
      <span className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide leading-none text-muted-foreground">
        {shortUnit(unit)}
      </span>
    </span>
  );
}
