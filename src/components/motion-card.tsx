"use client";

import { motion, useReducedMotion } from "framer-motion";
import { listItem, tiltHover } from "@/lib/motion";
import { cn } from "@/lib/utils";

type MotionCardProps = React.ComponentProps<typeof motion.div> & {
  hover?: boolean;
};

export function MotionCard({
  className,
  hover = true,
  children,
  ...props
}: MotionCardProps) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      variants={listItem}
      whileHover={!reduced && hover ? tiltHover.whileHover : undefined}
      whileTap={!reduced && hover ? tiltHover.whileTap : undefined}
      className={cn(
        "group/motion-card relative overflow-hidden rounded-2xl border border-border/70 bg-card shadow-soft transition-shadow",
        hover && "hover:shadow-glow",
        className,
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function MotionList({
  className,
  children,
  staggerChildren = 0.04,
  ...props
}: React.ComponentProps<typeof motion.ul> & { staggerChildren?: number }) {
  return (
    <motion.ul
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren, delayChildren: 0.03 } },
      }}
      className={cn("list-none p-0", className)}
      {...props}
    >
      {children}
    </motion.ul>
  );
}
