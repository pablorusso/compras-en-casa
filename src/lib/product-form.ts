// Helpers puros para parsear el alta/edición de un producto desde un FormData.
// Viven acá (y no en `actions/products.ts`) porque ese archivo es "use server"
// y todos sus exports se tratan como server actions: no puede exportar helpers
// sincrónicos. Al centralizarlos, el maestro (`actions/products.ts`) y el alta
// desde la lista (`actions/lists.ts`) validan los mismos campos de la misma forma.

export function parseSeasonMonths(formData: FormData): number[] {
  const raw = formData.getAll("seasonMonths");
  const months: number[] = [];
  for (const r of raw) {
    const n = Number(r);
    if (Number.isInteger(n) && n >= 1 && n <= 12) months.push(n);
  }
  return Array.from(new Set(months)).sort((a, b) => a - b);
}

export function parseQuantityNumber(raw: string): number {
  const n = Number(String(raw).replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) throw new Error("Cantidad inválida");
  return n;
}

export type ProductFlags = {
  isSeasonal: boolean;
  seasonMonths: number[];
  excludeFromAutoAdd: boolean;
};

export function parseProductFlags(formData: FormData): ProductFlags {
  const isSeasonal =
    formData.get("isSeasonal") === "on" || formData.get("isSeasonal") === "true";
  const seasonMonths = isSeasonal ? parseSeasonMonths(formData) : [];
  const excludeFromAutoAdd =
    formData.get("excludeFromAutoAdd") === "on" ||
    formData.get("excludeFromAutoAdd") === "true";
  if (isSeasonal && seasonMonths.length === 0) {
    throw new Error("Si es de temporada, seleccioná al menos un mes");
  }
  return { isSeasonal, seasonMonths, excludeFromAutoAdd };
}
