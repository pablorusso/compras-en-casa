import Link, { type LinkProps } from "next/link";
import { type ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import type { VariantProps } from "class-variance-authority";

type Props = LinkProps &
  Omit<ComponentProps<"a">, keyof LinkProps> &
  VariantProps<typeof buttonVariants> & {
    className?: string;
    children?: React.ReactNode;
  };

export function LinkButton({ className, variant, size, children, ...props }: Props) {
  return (
    <Link
      {...props}
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
    >
      {children}
    </Link>
  );
}
