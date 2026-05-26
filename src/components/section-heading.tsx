import { cn } from "@/lib/utils";
import { Squiggle } from "@/components/illustrations/decorative/squiggle";

export function SectionHeading({
  title,
  eyebrow,
  illustration,
  meta,
  className,
  size = "default",
  underline = true,
}: {
  title: string;
  eyebrow?: string;
  illustration?: React.ReactNode;
  meta?: React.ReactNode;
  className?: string;
  size?: "default" | "sm" | "lg";
  underline?: boolean;
}) {
  const titleSize =
    size === "lg"
      ? "text-3xl md:text-4xl"
      : size === "sm"
        ? "text-lg md:text-xl"
        : "text-2xl md:text-3xl";

  return (
    <div className={cn("flex items-end justify-between gap-3", className)}>
      <div className="flex min-w-0 items-center gap-3">
        {illustration && (
          <div className="shrink-0 [&>svg]:size-9 md:[&>svg]:size-11">{illustration}</div>
        )}
        <div className="min-w-0">
          {eyebrow && (
            <p className="mb-0.5 text-[11px] font-medium uppercase tracking-[0.18em] text-primary">
              {eyebrow}
            </p>
          )}
          <div className="relative inline-block">
            <h2
              className={cn(
                "font-display font-semibold tracking-tight leading-[1.05]",
                titleSize,
              )}
            >
              {title}
            </h2>
            {underline && (
              <Squiggle
                className="absolute -bottom-1.5 left-0 h-2 w-[calc(100%-0.5rem)] opacity-70"
                color="var(--highlight)"
              />
            )}
          </div>
        </div>
      </div>
      {meta && <div className="shrink-0">{meta}</div>}
    </div>
  );
}
