import { cn } from "@/lib/utils";

export function ListIcon({
  size = "lg",
  className,
}: {
  size?: "lg" | "md" | "sm";
  className?: string;
}) {
  const containerSize =
    size === "lg"
      ? "size-16 rounded-2xl"
      : size === "md"
        ? "size-12 rounded-xl"
        : "size-10 rounded-xl";
  const emojiSize =
    size === "lg" ? "text-5xl" : size === "md" ? "text-3xl" : "text-2xl";

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center bg-muted/40 border border-border/70",
        containerSize,
        className,
      )}
      aria-hidden
    >
      <span className={cn("leading-none", emojiSize)}>🛒</span>
    </span>
  );
}
