"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { listItem } from "@/lib/motion";
import { cn } from "@/lib/utils";

export function StatCard({
  href,
  icon,
  label,
  value,
  tone = "default",
  index = 0,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  value: number | string;
  tone?: "default" | "warm" | "fresh";
  index?: number;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      variants={listItem}
      whileHover={reduced ? undefined : { y: -3, rotate: -0.3 }}
      whileTap={reduced ? undefined : { scale: 0.985 }}
      custom={index}
    >
      <Link href={href} className="block focus:outline-none focus-visible:ring-3 focus-visible:ring-ring/30 rounded-2xl">
        <Card
          interactive
          tone="default"
          className="h-full"
        >
          <CardContent className="p-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
                {label}
              </p>
              <p className="font-display text-3xl md:text-4xl font-semibold mt-1 tabular-nums leading-none">
                {value}
              </p>
            </div>
            <div
              className={cn(
                "flex size-12 items-center justify-center rounded-2xl ring-1",
                tone === "warm"
                  ? "bg-highlight/25 ring-highlight/30 text-foreground"
                  : tone === "fresh"
                    ? "bg-accent/30 ring-accent/40 text-foreground"
                    : "bg-primary/12 ring-primary/25 text-primary",
              )}
            >
              {icon}
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}
