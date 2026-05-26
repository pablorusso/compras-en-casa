import type { SVGProps } from "react";

export function LeafCorner({
  className,
  ...props
}: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
      {...props}
    >
      <path
        d="M10 110c2-40 22-78 100-100-2 60-30 96-100 100Z"
        fill="var(--accent)"
        opacity="0.55"
      />
      <path
        d="M10 110c2-40 22-78 100-100"
        stroke="var(--primary)"
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
        opacity="0.7"
      />
      <path
        d="M28 96c14-12 30-22 52-30M22 102c20-18 44-30 70-38"
        stroke="var(--primary)"
        strokeWidth="1.1"
        strokeLinecap="round"
        opacity="0.55"
      />
    </svg>
  );
}
