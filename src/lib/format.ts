import { MONTHS_SHORT_ES } from "./seasonality";
import { canonicalize, eggNoun } from "./units";
import type { ShoppingList, ShoppingListItem } from "@/db/schema";

export function formatListDateName(date: Date = new Date()): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = MONTHS_SHORT_ES[date.getMonth()];
  const yy = String(date.getFullYear()).slice(-2);
  return `Lista del ${dd}/${mm}/${yy}`;
}

export function prettyNumber(value: string | number): string {
  const num = typeof value === "string" ? Number(value) : value;
  return Number.isInteger(num) ? String(num) : String(num).replace(/\.?0+$/, "");
}

/**
 * Normaliza una cantidad para edición: máximo 2 decimales y sin ceros finales.
 * Ej.: "1.000" → "1", "0.50" → "0.5", "0.125" → "0.13".
 */
export function toEditQuantity(value: string | number): string {
  const num = Number(value);
  if (!Number.isFinite(num)) return String(value);
  return prettyNumber(num.toFixed(2));
}

export function formatQuantity(value: string | number, unit: string): string {
  return `${prettyNumber(value)} ${unit}`;
}

export type GroupedItems = {
  storeId: number | null;
  storeName: string;
  storeEmoji: string;
  storeAddress: string | null;
  directItems: ShoppingListItem[];
  categories: {
    categoryId: number | null;
    categoryName: string;
    categoryEmoji: string;
    items: ShoppingListItem[];
  }[];
}[];

function sortItems(items: ShoppingListItem[]): ShoppingListItem[] {
  return items.sort((a, b) => a.productName.localeCompare(b.productName, "es"));
}

export type ListFilterValues = {
  query: string;
  storeId: number | null;
  categoryId: number | null;
};

export function filterItems(
  items: ShoppingListItem[],
  f: ListFilterValues,
): ShoppingListItem[] {
  const q = f.query.trim().toLowerCase();
  return items.filter((item) => {
    if (f.storeId != null && item.storeId !== f.storeId) return false;
    if (f.categoryId != null && item.categoryId !== f.categoryId) return false;
    if (!q) return true;
    return item.productName.toLowerCase().includes(q);
  });
}

export type ListStoreOption = { id: number; name: string; emoji: string };
export type ListCategoryOption = {
  id: number;
  name: string;
  emoji: string;
  storeId: number;
};

/**
 * Deriva las opciones de filtro (comercios y categorías) a partir de los propios
 * ítems de una lista: solo los que tienen id, ordenados por sortOrder y luego nombre
 * (mismo criterio que groupItems). Aprovecha los campos desnormalizados del ítem,
 * así que sirve para cualquier vista de lista sin cargar las tablas maestras.
 */
export function deriveListFilterOptions(items: ShoppingListItem[]): {
  storeOptions: ListStoreOption[];
  categoryOptions: ListCategoryOption[];
} {
  const stores = new Map<number, ListStoreOption & { sortOrder: number }>();
  const categories = new Map<number, ListCategoryOption & { sortOrder: number }>();

  for (const item of items) {
    if (item.storeId != null && !stores.has(item.storeId)) {
      stores.set(item.storeId, {
        id: item.storeId,
        name: item.storeName ?? "Sin comercio",
        emoji: item.storeEmoji ?? "🛒",
        sortOrder: item.storeSortOrder,
      });
    }
    if (
      item.categoryId != null &&
      item.storeId != null &&
      !categories.has(item.categoryId)
    ) {
      categories.set(item.categoryId, {
        id: item.categoryId,
        name: item.categoryName ?? "Sin categoría",
        emoji: item.categoryEmoji ?? "🛒",
        storeId: item.storeId,
        sortOrder: item.categorySortOrder,
      });
    }
  }

  const byOrderThenName = <T extends { name: string; sortOrder: number }>(
    a: T,
    b: T,
  ) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "es");

  const storeOptions = Array.from(stores.values())
    .sort(byOrderThenName)
    .map((s) => ({ id: s.id, name: s.name, emoji: s.emoji }));
  const categoryOptions = Array.from(categories.values())
    .sort(byOrderThenName)
    .map((c) => ({ id: c.id, name: c.name, emoji: c.emoji, storeId: c.storeId }));

  return { storeOptions, categoryOptions };
}

export function groupItems(items: ShoppingListItem[]): GroupedItems {
  const stores = new Map<
    string,
    {
      storeId: number | null;
      storeName: string;
      storeEmoji: string;
      storeAddress: string | null;
      storeSortOrder: number;
      directs: ShoppingListItem[];
      cats: Map<
        string,
        {
          categoryId: number | null;
          categoryName: string;
          categoryEmoji: string;
          categorySortOrder: number;
          items: ShoppingListItem[];
        }
      >;
    }
  >();

  for (const item of items) {
    const storeKey = String(item.storeId ?? `n:${item.storeName ?? "Sin comercio"}`);
    let store = stores.get(storeKey);
    if (!store) {
      store = {
        storeId: item.storeId,
        storeName: item.storeName ?? "Sin comercio",
        storeEmoji: item.storeEmoji ?? "🛒",
        storeAddress: item.storeAddress ?? null,
        storeSortOrder: item.storeSortOrder,
        directs: [],
        cats: new Map(),
      };
      stores.set(storeKey, store);
    }
    if (!item.categoryName) {
      store.directs.push(item);
      continue;
    }
    const catKey = String(item.categoryId ?? `n:${item.categoryName}`);
    let cat = store.cats.get(catKey);
    if (!cat) {
      cat = {
        categoryId: item.categoryId,
        categoryName: item.categoryName,
        categoryEmoji: item.categoryEmoji ?? "🛒",
        categorySortOrder: item.categorySortOrder,
        items: [],
      };
      store.cats.set(catKey, cat);
    }
    cat.items.push(item);
  }

  return Array.from(stores.values())
    .sort(
      (a, b) =>
        a.storeSortOrder - b.storeSortOrder || a.storeName.localeCompare(b.storeName, "es"),
    )
    .map((s) => ({
      storeId: s.storeId,
      storeName: s.storeName,
      storeEmoji: s.storeEmoji,
      storeAddress: s.storeAddress,
      directItems: sortItems(s.directs),
      categories: Array.from(s.cats.values())
        .sort(
          (a, b) =>
            a.categorySortOrder - b.categorySortOrder ||
            a.categoryName.localeCompare(b.categoryName, "es"),
        )
        .map((c) => ({
          categoryId: c.categoryId,
          categoryName: c.categoryName,
          categoryEmoji: c.categoryEmoji,
          items: sortItems(c.items),
        })),
    }));
}

// Packs ordenados de mayor a menor: se prefiere "maple" sobre "docena".
const EGG_PACKS = [
  { count: 30, singular: "maple", plural: "maples" },
  { count: 12, singular: "docena", plural: "docenas" },
] as const;

/**
 * Arma la etiqueta de un ítem para el Markdown: cantidad adelante del producto,
 * sin imprimir la unidad cuando es "unidad", y con lenguaje natural para los huevos.
 */
export function formatItemLabel(item: ShoppingListItem): string {
  const count = Number(item.quantityValue);
  const { unit } = canonicalize(count, item.quantityUnit); // canónica: "unidad", "kg", ...

  // Huevos: lenguaje natural por división exacta (maple > docena)
  const noun = eggNoun(item.productName);
  if (noun && unit === "unidad" && Number.isInteger(count)) {
    for (const pack of EGG_PACKS) {
      if (count > 0 && count % pack.count === 0) {
        const q = count / pack.count;
        return `${q} ${q === 1 ? pack.singular : pack.plural} de ${noun}`;
      }
    }
    // sin división exacta → cae al formato genérico de abajo
  }

  const qty = prettyNumber(item.quantityValue);
  // "unidad" no se imprime; cualquier otra unidad sí (se mantiene la unidad guardada)
  return unit === "unidad"
    ? `${qty} ${item.productName}`
    : `${qty} ${item.quantityUnit} ${item.productName}`;
}

/**
 * Exporta la lista como Markdown estilo GitHub Task List. Los emojis quedan en los
 * headers de comercio (##) y categoría (###); los productos van sin emoji para que
 * el texto se vea limpio al pegarlo en un editor MD compatible con checkboxes.
 */
export function buildMarkdownText(
  list: Pick<ShoppingList, "name">,
  items: ShoppingListItem[],
): string {
  const grouped = groupItems(items);
  const lines: string[] = [];
  lines.push(`# 🛒 ${list.name}`);
  lines.push("");
  for (const store of grouped) {
    // No imprimir comercios sin productos.
    if (store.directItems.length === 0 && store.categories.length === 0) continue;
    lines.push(`## ${store.storeEmoji} ${store.storeName}`);
    if (store.storeAddress) {
      lines.push("");
      lines.push(`📍 ${store.storeAddress}`);
    }
    lines.push("");
    for (const item of store.directItems) {
      const note = item.notes ? ` _(${item.notes})_` : "";
      lines.push(`- [ ] ${formatItemLabel(item)}${note}`);
    }
    if (store.directItems.length > 0) {
      lines.push("");
    }
    for (const cat of store.categories) {
      // No imprimir categorías sin productos.
      if (cat.items.length === 0) continue;
      lines.push(`### ${cat.categoryEmoji} ${cat.categoryName}`);
      lines.push("");
      for (const item of cat.items) {
        const note = item.notes ? ` _(${item.notes})_` : "";
        lines.push(`- [ ] ${formatItemLabel(item)}${note}`);
      }
      lines.push("");
    }
  }
  return lines.join("\n").trimEnd();
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function itemRow(item: ShoppingListItem): string {
  const label = escapeHtml(formatItemLabel(item));
  const note = item.notes ? ` <span class="note">(${escapeHtml(item.notes)})</span>` : "";
  return `<li><span class="box"></span><span class="label">${label}${note}</span></li>`;
}

/**
 * Documento HTML autocontenido para imprimir la lista en papel: agrupado por comercio y
 * categoría (mismo orden que la app), con una casilla por ítem para tildar lo comprado.
 * Pensado para ser lo más compacto posible (fuente chica, 2 columnas, márgenes mínimos).
 */
export function buildPrintDocument(
  list: Pick<ShoppingList, "name">,
  items: ShoppingListItem[],
): string {
  const grouped = groupItems(items);
  const blocks: string[] = [];

  for (const store of grouped) {
    if (store.directItems.length === 0 && store.categories.length === 0) continue;
    const parts: string[] = [];
    parts.push(
      `<h2>${escapeHtml(store.storeEmoji)} ${escapeHtml(store.storeName)}</h2>`,
    );
    if (store.storeAddress) {
      parts.push(`<p class="addr">📍 ${escapeHtml(store.storeAddress)}</p>`);
    }
    if (store.directItems.length > 0) {
      parts.push(`<ul>${store.directItems.map(itemRow).join("")}</ul>`);
    }
    for (const cat of store.categories) {
      if (cat.items.length === 0) continue;
      parts.push(
        `<h3>${escapeHtml(cat.categoryEmoji)} ${escapeHtml(cat.categoryName)}</h3>`,
      );
      parts.push(`<ul>${cat.items.map(itemRow).join("")}</ul>`);
    }
    blocks.push(`<section class="store">${parts.join("")}</section>`);
  }

  const headerName = escapeHtml(list.name);
  // El <title> es el nombre sugerido al "Guardar como PDF". Se limpian los caracteres
  // no válidos en nombres de archivo (p. ej. "/" → "-": "Lista 29/May" → "Lista 29-May").
  const docTitle = escapeHtml(
    `Compras en Casa - ${list.name.replace(/[\\/:*?"<>|]/g, "-")}`,
  );
  const printedAt = escapeHtml(
    new Date().toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" }),
  );
  // Tamaños en `em` para que el "shrink-to-fit" (escalar la fuente base del body)
  // achique todo proporcionalmente y la lista entre en una sola hoja.
  const styles = `
    * { box-sizing: border-box; }
    @page { size: A4; margin: 8mm; }
    html, body { margin: 0; padding: 0; height: 100%; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 11px;
      line-height: 1.2;
      color: #000;
    }
    /* Header/footer van en thead/tfoot de una tabla: el navegador los repite y RESERVA
       su alto en cada hoja (a diferencia del padding del body, que solo reservaba al
       inicio/fin del flujo y dejaba que el contenido se solapara en las hojas 2+).
       height: 100% hace que la tabla llene la hoja, empujando el footer al pie. */
    table.sheet { width: 100%; height: 100%; border-collapse: collapse; }
    table.sheet th, table.sheet td { padding: 0; text-align: left; font-weight: inherit; vertical-align: top; }
    /* Aire entre el header y los ítems, y entre los ítems y el footer; al ir en el th/td
       del thead/tfoot se repite y se reserva en cada hoja. El prefijo table.sheet es
       necesario para ganarle en especificidad al reset de padding de arriba. */
    table.sheet thead th { padding-bottom: 3.5mm; }
    table.sheet tfoot td { padding-top: 3.5mm; }
    thead { display: table-header-group; }
    tfoot { display: table-footer-group; }
    .page-header {
      display: flex; align-items: center; height: 6mm;
      font-size: 11px; font-weight: 700;
      border-bottom: 0.5pt solid #000;
    }
    .page-footer {
      display: flex; align-items: center; justify-content: space-between; height: 5mm;
      font-size: 8px; color: #444;
      border-top: 0.5pt solid #999;
    }
    /* column-count lo ajusta el script de impresión (2 → 1 en multipágina) según lo que
       entre. Los comercios SÍ pueden partirse entre columnas (no llevan break-inside:
       avoid); solo se evita que un encabezado quede huérfano al pie o que un ítem se corte. */
    .content { column-count: 2; column-gap: 6mm; }
    .store { margin: 0 0 0.55em; }
    h2 {
      font-size: 1.05em; font-weight: 700; margin: 0 0 0.2em;
      padding-bottom: 1px; border-bottom: 1px solid #000;
      break-after: avoid;
    }
    .addr { margin: 0 0 0.2em; font-size: 0.82em; color: #333; break-after: avoid; }
    h3 {
      font-size: 0.74em; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.06em; color: #333; margin: 0.3em 0 0.12em;
      break-after: avoid;
    }
    ul { list-style: none; margin: 0 0 0.15em; padding: 0; }
    li { display: flex; align-items: flex-start; gap: 0.45em; padding: 0.06em 0; break-inside: avoid; }
    .box {
      flex: 0 0 auto; width: 0.82em; height: 0.82em; margin-top: 0.18em;
      border: 1px solid #000; border-radius: 1px;
    }
    .label { flex: 1 1 auto; }
    .note { font-style: italic; color: #444; }
  `;

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>${docTitle}</title>
<style>${styles}</style>
</head>
<body>
<table class="sheet">
<thead><tr><th><div class="page-header">🛒 ${headerName}</div></th></tr></thead>
<tfoot><tr><td><div class="page-footer"><span>Impreso el ${printedAt}</span><span>🛒 ${headerName}</span></div></td></tr></tfoot>
<tbody><tr><td><div class="content">${blocks.join("")}</div></td></tr></tbody>
</table>
</body>
</html>`;
}
