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

// Devuelve el nombre del producto (en minúsculas) si es un huevo, o null si no.
// Detecta "Huevos", "Huevos blancos", "Huevo de campo", etc. y preserva el calificativo.
export function eggNoun(name: string): string | null {
  const trimmed = name.trim();
  return /^huevos?\b/i.test(trimmed) ? trimmed.toLowerCase() : null;
}

// Huevos: escalones fijos hasta 30 (½ docena, docena, maple) y, a partir de ahí,
// siempre de a 12 (30 → 42 → 54 → ...). El piso es 6.
const EGG_LADDER = [6, 12, 30] as const;
const EGG_ANCHOR = 30; // último escalón fijo; arriba de él se avanza de a EGG_STEP
const EGG_STEP = 12;

function stepEggs(value: number, direction: 1 | -1): number {
  if (direction > 0) {
    for (const rung of EGG_LADDER) {
      if (value < rung) return rung;
    }
    // value >= 30 → siguiente múltiplo de 12 por encima del ancla
    return EGG_ANCHOR + (Math.floor((value - EGG_ANCHOR) / EGG_STEP) + 1) * EGG_STEP;
  }
  if (value > EGG_ANCHOR) {
    return EGG_ANCHOR + (Math.ceil((value - EGG_ANCHOR) / EGG_STEP) - 1) * EGG_STEP;
  }
  // value <= 30 → bajar dentro de la escalera fija, con piso en 6
  let prev: number = EGG_LADDER[0];
  for (const rung of EGG_LADDER) {
    if (rung < value) prev = rung;
    else break;
  }
  return prev;
}

type StepCfg = { big: number; small: number; threshold: number; min: number };

const STEP_CONFIG: Record<CanonicalUnit, StepCfg> = {
  kg: { big: 0.5, small: 0.25, threshold: 1, min: 0.25 },
  litro: { big: 0.5, small: 0.25, threshold: 1, min: 0.25 },
  gr: { big: 250, small: 50, threshold: 250, min: 50 },
  ml: { big: 250, small: 50, threshold: 250, min: 50 },
  unidad: { big: 1, small: 1, threshold: 0, min: 1 },
};

/** Calcula el siguiente valor de cantidad al tocar la flecha (atajo). */
export function stepQuantity(
  value: number,
  unit: string,
  direction: 1 | -1,
  productName = "",
): number {
  const u: CanonicalUnit = isCanonicalUnit(unit) ? unit : "unidad";

  if (u === "unidad") {
    if (eggNoun(productName)) return stepEggs(value, direction);
    // Resto de unidades: enteros completos, incluso desde un valor fraccionario.
    const next = direction > 0 ? Math.floor(value) + 1 : Math.ceil(value) - 1;
    return Math.max(1, next);
  }

  const cfg = STEP_CONFIG[u];
  // En la frontera: subir usa el paso grande, bajar usa el paso chico.
  const inBigZone = direction > 0 ? value >= cfg.threshold : value > cfg.threshold;
  const stepSize = inBigZone ? cfg.big : cfg.small;
  const next = +(value + direction * stepSize).toFixed(2);
  return Math.max(cfg.min, next);
}
