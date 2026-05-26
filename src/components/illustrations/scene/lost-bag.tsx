import type { SVGProps } from "react";

export function LostBag({
  className,
  ...props
}: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 200 180"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
      {...props}
    >
      <ellipse cx="100" cy="166" rx="76" ry="6" fill="var(--foreground)" opacity="0.08" />
      {/* Bolsa volcada */}
      <g transform="rotate(-22 100 110)">
        <path
          d="M52 60h96l-10 90a8 8 0 0 1-8 6H70a8 8 0 0 1-8-6L52 60Z"
          fill="var(--highlight)"
          stroke="var(--foreground)"
          strokeWidth="2.6"
          strokeLinejoin="round"
        />
        {/* Asas */}
        <path
          d="M70 60c0-12 8-22 30-22s30 10 30 22"
          stroke="var(--foreground)"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
        {/* Líneas */}
        <path d="M64 80h72M62 100h76" stroke="var(--foreground)" strokeWidth="1.5" opacity="0.4" strokeLinecap="round" />
      </g>
      {/* Items derramados */}
      <circle cx="48" cy="142" r="10" fill="var(--destructive)" stroke="var(--foreground)" strokeWidth="1.6" />
      <path d="M44 132c0-3 2-5 4-5s4 2 4 5" stroke="var(--primary)" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <ellipse cx="36" cy="156" rx="10" ry="5" fill="var(--accent)" stroke="var(--foreground)" strokeWidth="1.6" />
      {/* Signo de pregunta arriba */}
      <text
        x="148"
        y="40"
        fontFamily="var(--font-display), serif"
        fontSize="36"
        fontWeight="700"
        fill="var(--destructive)"
      >
        ?
      </text>
    </svg>
  );
}
