import { MONTHS_SHORT_ES } from "./seasonality";
import { canonicalize, eggNoun } from "./units";
import type { ShoppingList, ShoppingListItem } from "@/db/schema";

export function formatListDateName(date: Date = new Date()): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = MONTHS_SHORT_ES[date.getMonth()];
  const yy = String(date.getFullYear()).slice(-2);
  return `Lista del ${dd}/${mm}/${yy}`;
}

function prettyNumber(value: string | number): string {
  const num = typeof value === "string" ? Number(value) : value;
  return Number.isInteger(num) ? String(num) : String(num).replace(/\.?0+$/, "");
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
function formatItemLabel(item: ShoppingListItem): string {
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
