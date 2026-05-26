import type { SVGProps } from "react";

export function HeroBasket({
  className,
  ...props
}: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 240 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
      {...props}
    >
      {/* Sombra debajo */}
      <ellipse cx="120" cy="184" rx="86" ry="6" fill="var(--foreground)" opacity="0.08" />

      {/* Hojas que asoman */}
      <path
        d="M76 70c-4-16 6-30 22-32 0 12-8 22-22 32Z"
        fill="var(--primary)"
        opacity="0.9"
      />
      <path
        d="M76 70c-4-16 6-30 22-32"
        stroke="var(--foreground)"
        strokeWidth="1.4"
        strokeLinecap="round"
        opacity="0.5"
        fill="none"
      />
      <path
        d="M158 64c-2-14 8-26 22-26 2 12-6 22-22 26Z"
        fill="var(--primary)"
        opacity="0.8"
      />
      {/* Pan */}
      <ellipse
        cx="178"
        cy="78"
        rx="22"
        ry="14"
        fill="var(--highlight)"
        transform="rotate(-12 178 78)"
      />
      <path
        d="M162 76c4-2 8-2 14-2M168 84c4-2 10-2 14-2"
        stroke="var(--foreground)"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.45"
        transform="rotate(-12 178 78)"
      />
      {/* Tomate */}
      <circle cx="92" cy="88" r="16" fill="var(--destructive)" />
      <path
        d="M88 73c-2-4 0-8 4-9 4 0 6 4 4 9"
        stroke="var(--primary)"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      <ellipse cx="86" cy="86" rx="3" ry="2" fill="white" opacity="0.4" />

      {/* Zanahoria asomando atrás */}
      <path
        d="M130 60l-6 32 18 4 4-32-16-4Z"
        fill="var(--highlight)"
        transform="rotate(8 134 76)"
      />
      <path
        d="M126 56l4-12M132 54l2-12M138 56l6-10"
        stroke="var(--primary)"
        strokeWidth="2.4"
        strokeLinecap="round"
      />

      {/* Mango de la cesta */}
      <path
        d="M52 102c4-26 24-44 68-44 44 0 64 18 68 44"
        stroke="var(--foreground)"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Cuerpo de la cesta */}
      <path
        d="M40 102h160l-12 60a8 8 0 0 1-8 6.4H60a8 8 0 0 1-8-6.4l-12-60Z"
        fill="var(--accent)"
      />
      <path
        d="M40 102h160l-12 60a8 8 0 0 1-8 6.4H60a8 8 0 0 1-8-6.4l-12-60Z"
        stroke="var(--foreground)"
        strokeWidth="3"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Tejido */}
      <path
        d="M62 110v54M88 110v56M118 110v58M150 110v56M180 110v54"
        stroke="var(--foreground)"
        strokeWidth="1.4"
        strokeLinecap="round"
        opacity="0.45"
      />
      <path
        d="M44 122h152M48 138h148M52 154h140"
        stroke="var(--foreground)"
        strokeWidth="1.4"
        strokeLinecap="round"
        opacity="0.45"
      />
    </svg>
  );
}
