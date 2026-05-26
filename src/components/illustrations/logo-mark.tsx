import type { SVGProps } from "react";

export function LogoMark({
  className,
  ...props
}: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
      {...props}
    >
      {/* Hoja arriba a la derecha */}
      <path
        d="M30 6c-1.4 4 .8 7.4 4.4 9.6 1.2-4.4-1-7.6-4.4-9.6Z"
        fill="var(--primary)"
        opacity="0.95"
      />
      <path
        d="M30 6c-1.4 4 .8 7.4 4.4 9.6"
        stroke="var(--primary)"
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
        opacity="0.5"
      />
      {/* Mango de la cesta */}
      <path
        d="M16 18c.6-4.8 4-8 8-8 4 0 7.4 3.2 8 8"
        stroke="var(--foreground)"
        strokeWidth="2.4"
        strokeLinecap="round"
        fill="none"
      />
      {/* Cesta */}
      <path
        d="M8 18h32l-3.2 18a4 4 0 0 1-4 3.4H15.2a4 4 0 0 1-4-3.4L8 18Z"
        fill="var(--accent)"
      />
      <path
        d="M8 18h32l-3.2 18a4 4 0 0 1-4 3.4H15.2a4 4 0 0 1-4-3.4L8 18Z"
        stroke="var(--foreground)"
        strokeWidth="2"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Líneas de la cesta */}
      <path
        d="M16 22v15M24 22v15M32 22v15"
        stroke="var(--foreground)"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.55"
      />
      <path
        d="M9.5 27h29M10.5 33h27"
        stroke="var(--foreground)"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.55"
      />
    </svg>
  );
}
