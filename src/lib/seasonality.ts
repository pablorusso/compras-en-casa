export const MONTHS_ES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
] as const;

export const MONTHS_SHORT_ES = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
] as const;

export function currentMonth1to12(date: Date = new Date()): number {
  return date.getMonth() + 1;
}

export function isInSeason(
  isSeasonal: boolean,
  seasonMonths: number[] | null | undefined,
  date: Date = new Date(),
): boolean {
  if (!isSeasonal) return true;
  if (!seasonMonths || seasonMonths.length === 0) return false;
  return seasonMonths.includes(currentMonth1to12(date));
}
