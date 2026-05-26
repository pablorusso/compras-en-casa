import type { SVGProps } from "react";

export function Squiggle({
  className,
  color = "var(--highlight)",
  ...props
}: SVGProps<SVGSVGElement> & { color?: string }) {
  return (
    <svg
      viewBox="0 0 120 12"
      fill="none"
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
      {...props}
    >
      <path
        d="M2 8c8-7 16-7 24 0s16 7 24 0 16-7 24 0 16 7 24 0 16-7 22-2"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
