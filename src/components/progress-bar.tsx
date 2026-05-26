"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

type ProgressBarProps = {
  value: number; // 0..100
  className?: string;
  showLabel?: boolean;
  emoji?: string;
  label?: string;
  variant?: "default" | "tomato" | "lime";
};

export function ProgressBar({
  value,
  className,
  showLabel = true,
  emoji,
  label,
  variant = "default",
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const reduced = useReducedMotion();

  const fillColor =
    variant === "tomato"
      ? "var(--destructive)"
      : variant === "lime"
        ? "var(--accent)"
        : "var(--primary)";

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="relative flex-1 h-3 overflow-hidden rounded-full bg-muted shadow-[inset_0_1px_0_oklch(0_0_0_/_0.05)]">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ background: fillColor }}
          initial={reduced ? { width: `${clamped}%` } : { width: 0 }}
          animate={{ width: `${clamped}%` }}
          transition={
            reduced
              ? { duration: 0 }
              : { type: "spring", stiffness: 110, damping: 22 }
          }
        >
          {!reduced && clamped > 0 && clamped < 100 && (
            <motion.div
              className="absolute inset-y-0 -inset-x-1 bg-[linear-gradient(90deg,transparent,oklch(1_0_0/0.5),transparent)] [mask-image:linear-gradient(90deg,transparent,black,transparent)]"
              animate={{ x: ["-100%", "200%"] }}
              transition={{
                duration: 1.8,
                repeat: Infinity,
                ease: "linear",
              }}
            />
          )}
        </motion.div>
      </div>
      {showLabel && (
        <div className="flex shrink-0 items-baseline gap-1.5">
          {emoji && <span className="text-base leading-none">{emoji}</span>}
          <span className="font-display text-xl font-semibold tabular-nums leading-none">
            {Math.round(clamped)}
            <span className="text-sm text-muted-foreground">%</span>
          </span>
          {label && (
            <span className="text-xs text-muted-foreground">{label}</span>
          )}
        </div>
      )}
    </div>
  );
}
