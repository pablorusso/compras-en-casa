// Paleta visual genérica para diferenciar comercios entre sí sin asumir cuáles existen.
// El dispatch es determinístico: el mismo seed siempre cae en el mismo color-scheme,
// así un comercio mantiene su tinte aunque cambie el orden de la lista.
//
// Preferí pasar `store.id` (estable, no cambia al renombrar). Caé en `storeName`
// sólo cuando el id no esté disponible (p. ej., snapshot en `shopping_list_items.store_id`
// que puede ser null si el comercio fue borrado después de publicar la lista).

export type StoreStyle = {
  tint: string;
  ring: string;
};

const PALETTE: StoreStyle[] = [
  { tint: "bg-accent/25", ring: "ring-accent/40" },
  { tint: "bg-primary/12", ring: "ring-primary/25" },
  { tint: "bg-destructive/15", ring: "ring-destructive/30" },
  { tint: "bg-highlight/20", ring: "ring-highlight/35" },
  { tint: "bg-secondary/55", ring: "ring-border/60" },
  { tint: "bg-muted/60", ring: "ring-muted-foreground/25" },
];

function hash(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function getStoreStyle(
  seed: string | number | null | undefined,
): StoreStyle {
  if (seed === null || seed === undefined || seed === "") return PALETTE[0];
  const key = typeof seed === "number" ? String(seed) : seed;
  return PALETTE[hash(key) % PALETTE.length];
}
