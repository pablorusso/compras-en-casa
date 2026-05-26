import { MONTHS_SHORT_ES } from "./seasonality";
import type { ShoppingList, ShoppingListItem } from "@/db/schema";

export function formatListDateName(date: Date = new Date()): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = MONTHS_SHORT_ES[date.getMonth()];
  const yy = String(date.getFullYear()).slice(-2);
  return `Lista del ${dd}/${mm}/${yy}`;
}

export function formatQuantity(value: string | number, unit: string): string {
  const num = typeof value === "string" ? Number(value) : value;
  const pretty = Number.isInteger(num) ? String(num) : String(num).replace(/\.?0+$/, "");
  return `${pretty} ${unit}`;
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
  return items.sort(
    (a, b) => a.sortOrder - b.sortOrder || a.productName.localeCompare(b.productName, "es"),
  );
}

export function filterItemsByQuery(
  items: ShoppingListItem[],
  query: string,
): ShoppingListItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter((item) => item.productName.toLowerCase().includes(q));
}

export function groupItems(items: ShoppingListItem[]): GroupedItems {
  const stores = new Map<
    string,
    {
      storeId: number | null;
      storeName: string;
      storeEmoji: string;
      storeAddress: string | null;
      directs: ShoppingListItem[];
      cats: Map<
        string,
        {
          categoryId: number | null;
          categoryName: string;
          categoryEmoji: string;
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
        items: [],
      };
      store.cats.set(catKey, cat);
    }
    cat.items.push(item);
  }

  return Array.from(stores.values()).map((s) => ({
    storeId: s.storeId,
    storeName: s.storeName,
    storeEmoji: s.storeEmoji,
    storeAddress: s.storeAddress,
    directItems: sortItems(s.directs),
    categories: Array.from(s.cats.values()).map((c) => ({
      ...c,
      items: sortItems(c.items),
    })),
  }));
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
    lines.push(`## ${store.storeEmoji} ${store.storeName}`);
    if (store.storeAddress) {
      lines.push("");
      lines.push(`📍 ${store.storeAddress}`);
    }
    lines.push("");
    for (const item of store.directItems) {
      const qty = formatQuantity(item.quantityValue, item.quantityUnit);
      const note = item.notes ? ` _(${item.notes})_` : "";
      lines.push(`- [ ] ${item.productName} — ${qty}${note}`);
    }
    if (store.directItems.length > 0) {
      lines.push("");
    }
    for (const cat of store.categories) {
      lines.push(`### ${cat.categoryEmoji} ${cat.categoryName}`);
      lines.push("");
      for (const item of cat.items) {
        const qty = formatQuantity(item.quantityValue, item.quantityUnit);
        const note = item.notes ? ` _(${item.notes})_` : "";
        lines.push(`- [ ] ${item.productName} — ${qty}${note}`);
      }
      lines.push("");
    }
  }
  return lines.join("\n").trimEnd();
}
