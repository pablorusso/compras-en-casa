"use client";

import { motion, useReducedMotion } from "framer-motion";

type BlobBackgroundProps = {
  className?: string;
  variant?: "default" | "soft" | "warm";
};

export function BlobBackground({
  className,
  variant = "default",
}: BlobBackgroundProps) {
  const prefersReduced = useReducedMotion();

  const colors =
    variant === "warm"
      ? { a: "var(--highlight)", b: "var(--destructive)" }
      : variant === "soft"
        ? { a: "var(--secondary)", b: "var(--accent)" }
        : { a: "var(--primary)", b: "var(--accent)" };

  const float = prefersReduced
    ? {}
    : {
        animate: {
          x: [0, 10, -5, 0],
          y: [0, -8, 6, 0],
          scale: [1, 1.05, 0.98, 1],
        },
        transition: {
          duration: 18,
          repeat: Infinity,
          ease: "easeInOut" as const,
        },
      };

  const floatAlt = prefersReduced
    ? {}
    : {
        animate: {
          x: [0, -12, 8, 0],
          y: [0, 10, -6, 0],
          scale: [1, 0.96, 1.06, 1],
        },
        transition: {
          duration: 22,
          repeat: Infinity,
          ease: "easeInOut" as const,
        },
      };

  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 overflow-hidden -z-10 ${className ?? ""}`}
    >
      <motion.div
        className="absolute -top-24 -left-24 size-[420px] rounded-full opacity-50 blur-3xl"
        style={{ background: colors.a }}
        {...float}
      />
      <motion.div
        className="absolute -bottom-32 -right-24 size-[460px] rounded-full opacity-45 blur-3xl"
        style={{ background: colors.b }}
        {...floatAlt}
      />
      <motion.div
        className="absolute top-1/3 right-1/4 size-[260px] rounded-full opacity-25 blur-3xl"
        style={{ background: "var(--highlight)" }}
        animate={prefersReduced ? undefined : { scale: [1, 1.08, 1] }}
        transition={
          prefersReduced
            ? undefined
            : { duration: 14, repeat: Infinity, ease: "easeInOut" }
        }
      />
    </div>
  );
}
