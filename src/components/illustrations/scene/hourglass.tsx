import type { SVGProps } from "react";

export function Hourglass({
  className,
  ...props
}: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 160 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
      {...props}
    >
      <ellipse cx="80" cy="184" rx="56" ry="6" fill="var(--foreground)" opacity="0.08" />
      {/* Tapa superior */}
      <rect x="28" y="18" width="104" height="10" rx="3" fill="var(--foreground)" />
      {/* Tapa inferior */}
      <rect x="28" y="170" width="104" height="10" rx="3" fill="var(--foreground)" />
      {/* Vidrio */}
      <path
        d="M40 28h80c0 28-20 44-32 60 12 16 32 32 32 60H40c0-28 20-44 32-60-12-16-32-32-32-60Z"
        fill="var(--card)"
        stroke="var(--foreground)"
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
      {/* Arena arriba (poca) */}
      <path
        d="M52 32h56c-2 8-12 14-28 22-16-8-26-14-28-22Z"
        fill="var(--highlight)"
        opacity="0.6"
      />
      {/* Cuello / hilo */}
      <line x1="80" y1="86" x2="80" y2="112" stroke="var(--highlight)" strokeWidth="1.6" />
      {/* Arena abajo */}
      <path
        d="M52 166h56c-2-12-12-22-28-30-16 8-26 18-28 30Z"
        fill="var(--highlight)"
      />
      <path
        d="M52 166h56c-2-12-12-22-28-30-16 8-26 18-28 30Z"
        stroke="var(--foreground)"
        strokeWidth="1.6"
        fill="none"
        opacity="0.5"
      />
    </svg>
  );
}
