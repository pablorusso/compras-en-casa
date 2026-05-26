import type { SVGProps } from "react";

export function EmptyList({
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
      <ellipse cx="100" cy="166" rx="68" ry="6" fill="var(--foreground)" opacity="0.08" />
      {/* Tablero/clipboard */}
      <rect x="50" y="30" width="100" height="130" rx="10" fill="var(--card)" stroke="var(--foreground)" strokeWidth="2.4" />
      {/* Clip */}
      <rect x="80" y="20" width="40" height="20" rx="6" fill="var(--highlight)" stroke="var(--foreground)" strokeWidth="2" />
      {/* Líneas de lista */}
      <line x1="64" y1="62" x2="124" y2="62" stroke="var(--muted-foreground)" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
      <line x1="64" y1="80" x2="116" y2="80" stroke="var(--muted-foreground)" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
      <line x1="64" y1="98" x2="130" y2="98" stroke="var(--muted-foreground)" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
      <line x1="64" y1="116" x2="110" y2="116" stroke="var(--muted-foreground)" strokeWidth="2" strokeLinecap="round" opacity="0.3" />
      <line x1="64" y1="134" x2="125" y2="134" stroke="var(--muted-foreground)" strokeWidth="2" strokeLinecap="round" opacity="0.3" />
      {/* Lápiz */}
      <g transform="rotate(-25 150 110)">
        <rect x="138" y="100" width="36" height="10" rx="2" fill="var(--accent)" stroke="var(--foreground)" strokeWidth="1.8" />
        <path d="M174 100l10 5-10 5z" fill="var(--foreground)" />
        <rect x="138" y="100" width="6" height="10" fill="var(--destructive)" stroke="var(--foreground)" strokeWidth="1.8" />
      </g>
      {/* Hoja decorativa */}
      <path
        d="M40 50c2-8 8-12 18-12-1 8-7 12-18 12Z"
        fill="var(--primary)"
        opacity="0.7"
      />
    </svg>
  );
}
