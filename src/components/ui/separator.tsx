"use client"

import { Separator as SeparatorPrimitive } from "@base-ui/react/separator"

import { cn } from "@/lib/utils"

function Separator({
  className,
  orientation = "horizontal",
  variant = "default",
  ...props
}: SeparatorPrimitive.Props & { variant?: "default" | "decorative" }) {
  return (
    <SeparatorPrimitive
      data-slot="separator"
      data-variant={variant}
      orientation={orientation}
      className={cn(
        "shrink-0 data-horizontal:w-full data-vertical:self-stretch",
        variant === "default"
          ? "bg-border data-horizontal:h-px data-vertical:w-px"
          : "data-horizontal:h-1.5 data-vertical:w-1.5 bg-[radial-gradient(circle,var(--border)_1.2px,transparent_1.2px)] [background-size:8px_8px] data-horizontal:[background-position:0_50%] data-vertical:[background-position:50%_0]",
        className
      )}
      {...props}
    />
  )
}

export { Separator }
