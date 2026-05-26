export const CANONICAL_UNITS = ["kg", "gr", "unidad", "litro", "ml"] as const;
export type CanonicalUnit = (typeof CANONICAL_UNITS)[number];

export const UNIT_SHORT: Record<CanonicalUnit, string> = {
  kg: "KG",
  gr: "GR",
  unidad: "UN",
  litro: "LT",
  ml: "ML",
};

export const UNIT_DISPLAY: Record<CanonicalUnit, string> = {
  kg: "kg",
  gr: "gr",
  unidad: "un",
  litro: "lt",
  ml: "ml",
};

export const UNIT_PICKER_GRID: readonly (CanonicalUnit | null)[] = [
  "kg", "litro", "unidad",
  "gr", "ml", null,
];

const CANONICAL_SET: ReadonlySet<string> = new Set(CANONICAL_UNITS);

export function isCanonicalUnit(u: string): u is CanonicalUnit {
  return CANONICAL_SET.has(u);
}

type Conversion = { unit: CanonicalUnit; factor: number };

const ALIAS_TO_CANONICAL: Record<string, Conversion> = {
  kg: { unit: "kg", factor: 1 },
  kilo: { unit: "kg", factor: 1 },
  kilos: { unit: "kg", factor: 1 },

  g: { unit: "gr", factor: 1 },
  gr: { unit: "gr", factor: 1 },
  gramo: { unit: "gr", factor: 1 },
  gramos: { unit: "gr", factor: 1 },

  litro: { unit: "litro", factor: 1 },
  litros: { unit: "litro", factor: 1 },
  l: { unit: "litro", factor: 1 },

  ml: { unit: "ml", factor: 1 },
  mililitro: { unit: "ml", factor: 1 },
  mililitros: { unit: "ml", factor: 1 },

  unidad: { unit: "unidad", factor: 1 },
  unidades: { unit: "unidad", factor: 1 },
  u: { unit: "unidad", factor: 1 },
  un: { unit: "unidad", factor: 1 },

  docena: { unit: "unidad", factor: 12 },
  docenas: { unit: "unidad", factor: 12 },

  maple: { unit: "unidad", factor: 30 },
  maples: { unit: "unidad", factor: 30 },

  paq: { unit: "unidad", factor: 1 },
  paquete: { unit: "unidad", factor: 1 },
  paquetes: { unit: "unidad", factor: 1 },
  lata: { unit: "unidad", factor: 1 },
  latas: { unit: "unidad", factor: 1 },
  caja: { unit: "unidad", factor: 1 },
  cajas: { unit: "unidad", factor: 1 },
  atado: { unit: "unidad", factor: 1 },
  atados: { unit: "unidad", factor: 1 },
};

function normalizeRaw(raw: string): string {
  return raw.trim().toLowerCase().replace(/\.$/, "");
}

export function canonicalize(
  value: number,
  rawUnit: string,
): { value: number; unit: CanonicalUnit } {
  const key = normalizeRaw(rawUnit);
  const conv = ALIAS_TO_CANONICAL[key] ?? { unit: "unidad" as const, factor: 1 };
  return { value: value * conv.factor, unit: conv.unit };
}

export function shortUnit(unit: string): string {
  if (isCanonicalUnit(unit)) return UNIT_SHORT[unit];
  return unit.toUpperCase().slice(0, 3);
}

export function unitDisplay(unit: string): string {
  if (isCanonicalUnit(unit)) return UNIT_DISPLAY[unit];
  return unit.toLowerCase();
}
