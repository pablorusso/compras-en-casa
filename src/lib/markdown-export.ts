import { MONTHS_SHORT_ES } from "./seasonality";

export type ExportProduct = {
  name: string;
  defaultQuantityValue: string;
  defaultQuantityUnit: string;
  isSeasonal: boolean;
  seasonMonths: number[];
};

export type ExportCategory = {
  name: string;
  emoji: string;
  products: ExportProduct[];
};

export type ExportStore = {
  name: string;
  emoji: string;
  address: string | null;
  directProducts: ExportProduct[];
  categories: ExportCategory[];
};

function formatQty(raw: string): string {
  const n = Number.parseFloat(raw);
  if (!Number.isFinite(n)) return raw;
  // toString ya elimina ceros a la derecha en decimales ("2.000" → 2, "0.500" → 0.5).
  return n.toString();
}

function formatSeason(months: number[]): string {
  return months
    .filter((m) => m >= 1 && m <= 12)
    .map((m) => MONTHS_SHORT_ES[m - 1].toLowerCase())
    .join(",");
}

function renderProduct(p: ExportProduct): string {
  const qty = formatQty(p.defaultQuantityValue);
  const unit = p.defaultQuantityUnit;
  let line = `- [ ] ${qty} ${unit} ${p.name}`;
  if (p.isSeasonal && p.seasonMonths.length > 0) {
    line += ` *(temporada: ${formatSeason(p.seasonMonths)})*`;
  }
  return line;
}

export function renderMasterMarkdown(stores: ExportStore[]): string {
  const blocks: string[] = [];

  for (const store of stores) {
    const lines: string[] = [];
    lines.push(`## ${store.emoji} ${store.name}`);
    if (store.address && store.address.trim()) {
      lines.push(`> ${store.address.trim()}`);
    }

    // Directos primero: el parser los asignaría a la categoría actual si vinieran después.
    if (store.directProducts.length > 0) {
      lines.push("");
      for (const p of store.directProducts) lines.push(renderProduct(p));
    }

    for (const cat of store.categories) {
      lines.push("");
      lines.push(`**${cat.emoji} ${cat.name}**`);
      lines.push("");
      for (const p of cat.products) lines.push(renderProduct(p));
    }

    blocks.push(lines.join("\n"));
  }

  // Doble salto entre comercios; trailing newline para que el archivo termine en \n.
  return blocks.join("\n\n") + (blocks.length > 0 ? "\n" : "");
}
