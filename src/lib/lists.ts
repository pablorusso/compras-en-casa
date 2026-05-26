import { and, asc, desc, eq, inArray, lt, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  stores,
  products,
  shoppingListItems,
  shoppingLists,
  categories,
  shareLinks,
  settings,
} from "@/db/schema";
import { isInSeason } from "./seasonality";
import { getSuggestedQuantities } from "./quantities";
import { formatListDateName } from "./format";

export async function getCurrentList() {
  const [current] = await db
    .select()
    .from(shoppingLists)
    .where(eq(shoppingLists.status, "current"))
    .orderBy(desc(shoppingLists.createdAt))
    .limit(1);
  return current ?? null;
}

export async function getListItems(listId: number) {
  return db
    .select()
    .from(shoppingListItems)
    .where(eq(shoppingListItems.listId, listId))
    .orderBy(shoppingListItems.sortOrder, shoppingListItems.id);
}

type ProductWithCtx = {
  product: typeof products.$inferSelect;
  category: typeof categories.$inferSelect | null;
  store: typeof stores.$inferSelect;
};

async function loadProductsWithContext(): Promise<ProductWithCtx[]> {
  const rows = await db
    .select({
      product: products,
      category: categories,
      store: stores,
    })
    .from(products)
    .innerJoin(stores, eq(products.storeId, stores.id))
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(eq(products.archived, false))
    .orderBy(
      asc(stores.sortOrder),
      asc(stores.name),
      asc(categories.sortOrder),
      asc(products.name),
    );
  return rows;
}

// La lista vigente que pasa a archivada pierde sus share-links de inmediato:
// es la regla del workflow (no podés tener un link público apuntando a una
// histórica). Devuelve la lista archivada o null si no había vigente.
async function archiveCurrentList(): Promise<typeof shoppingLists.$inferSelect | null> {
  const existing = await getCurrentList();
  if (!existing) return null;
  await db.delete(shareLinks).where(eq(shareLinks.listId, existing.id));
  await db
    .update(shoppingLists)
    .set({ status: "archived" })
    .where(eq(shoppingLists.id, existing.id));
  return existing;
}

/**
 * Crea una nueva lista vigente, poblada con todos los productos del maestro
 * que estén en temporada. Cantidad sugerida = moda de últimas listas
 * archivadas o default del maestro. Si ya había vigente, la archiva e
 * invalida sus share-links.
 */
export async function createListFromMaster(now: Date = new Date()) {
  await archiveCurrentList();

  const rows = await loadProductsWithContext();
  const eligible = rows.filter(
    (r) =>
      isInSeason(r.product.isSeasonal, r.product.seasonMonths as number[] | null, now) &&
      !r.product.excludeFromAutoAdd &&
      !r.store.excludeFromAutoAdd &&
      !(r.category?.excludeFromAutoAdd ?? false),
  );

  const productIds = eligible.map((r) => r.product.id);
  const suggested = await getSuggestedQuantities(productIds);
  const previousNotes = await getPreviousNotesByProductId(productIds);

  const name = formatListDateName(now);

  const [list] = await db
    .insert(shoppingLists)
    .values({ name, status: "current" })
    .returning();

  if (eligible.length > 0) {
    await db.insert(shoppingListItems).values(
      eligible.map((r, idx) => {
        const sug = suggested.get(r.product.id);
        return {
          listId: list.id,
          productId: r.product.id,
          productName: r.product.name,
          categoryId: r.category?.id ?? null,
          categoryName: r.category?.name ?? null,
          categoryEmoji: r.category?.emoji ?? null,
          categorySortOrder: r.category?.sortOrder ?? 0,
          storeId: r.store.id,
          storeName: r.store.name,
          storeEmoji: r.store.emoji,
          storeAddress: r.store.address ?? null,
          storeSortOrder: r.store.sortOrder,
          quantityValue: sug?.value ?? r.product.defaultQuantityValue,
          quantityUnit: sug?.unit ?? r.product.defaultQuantityUnit,
          notes: previousNotes.get(r.product.id) ?? null,
          sortOrder: idx,
        };
      }),
    );
  }

  await pruneHistory();
  return list;
}

/**
 * Crea una nueva lista vigente clonando los ítems de otra (vigente o
 * archivada). Si ya había vigente, la archiva e invalida sus share-links.
 */
export async function cloneListToCurrent(
  sourceListId: number,
  now: Date = new Date(),
) {
  const [source] = await db
    .select()
    .from(shoppingLists)
    .where(eq(shoppingLists.id, sourceListId))
    .limit(1);
  if (!source) throw new Error("Lista origen no encontrada");

  // Leer ítems ANTES de archivar: si el source ES la vigente que se está por
  // reemplazar, después seguirá siendo lectura ok (no se hace cascade delete),
  // pero leerlo antes evita cualquier ambigüedad.
  const sourceItems = await getListItems(sourceListId);

  await archiveCurrentList();

  const base = formatListDateName(now);
  const name = await resolveUniqueListName(base);

  const [created] = await db
    .insert(shoppingLists)
    .values({ name, status: "current" })
    .returning();

  if (sourceItems.length > 0) {
    await db.insert(shoppingListItems).values(
      sourceItems.map((it) => ({
        listId: created.id,
        productId: it.productId,
        productName: it.productName,
        categoryId: it.categoryId,
        categoryName: it.categoryName,
        categoryEmoji: it.categoryEmoji,
        categorySortOrder: it.categorySortOrder,
        storeId: it.storeId,
        storeName: it.storeName,
        storeEmoji: it.storeEmoji,
        storeAddress: it.storeAddress,
        storeSortOrder: it.storeSortOrder,
        quantityValue: it.quantityValue,
        quantityUnit: it.quantityUnit,
        notes: it.notes,
        sortOrder: it.sortOrder,
      })),
    );
  }

  await pruneHistory();
  return created;
}

// Si `base` ya existe, devuelve `base (copia)`, `base (copia 2)`, …
async function resolveUniqueListName(base: string): Promise<string> {
  const likePattern = base + " (copia%";
  const rows = await db
    .select({ name: shoppingLists.name })
    .from(shoppingLists)
    .where(sql`${shoppingLists.name} = ${base} OR ${shoppingLists.name} LIKE ${likePattern}`);
  const taken = new Set(rows.map((r) => r.name));
  if (!taken.has(base)) return base;
  const first = `${base} (copia)`;
  if (!taken.has(first)) return first;
  for (let n = 2; n <= 99; n++) {
    const candidate = `${base} (copia ${n})`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${base} (copia ${Date.now()})`;
}

// Trae las notas que tenían los productos `productIds` en la última lista
// archivada. Permite arrastrar las aclaraciones de la lista anterior a la
// nueva sin tener que reescribirlas.
async function getPreviousNotesByProductId(
  productIds: number[],
): Promise<Map<number, string>> {
  const result = new Map<number, string>();
  if (productIds.length === 0) return result;

  const [previous] = await db
    .select({ id: shoppingLists.id })
    .from(shoppingLists)
    .where(ne(shoppingLists.status, "current"))
    .orderBy(desc(shoppingLists.createdAt))
    .limit(1);
  if (!previous) return result;

  const rows = await db
    .select({
      productId: shoppingListItems.productId,
      notes: shoppingListItems.notes,
    })
    .from(shoppingListItems)
    .where(
      and(
        eq(shoppingListItems.listId, previous.id),
        inArray(shoppingListItems.productId, productIds),
      ),
    );
  for (const row of rows) {
    if (row.productId != null && row.notes) {
      result.set(row.productId, row.notes);
    }
  }
  return result;
}

export async function pruneHistory() {
  const [cfg] = await db.select().from(settings).where(eq(settings.id, 1)).limit(1);
  const limit = cfg?.historyLimit ?? 10;

  const archived = await db
    .select({ id: shoppingLists.id })
    .from(shoppingLists)
    .where(eq(shoppingLists.status, "archived"))
    .orderBy(desc(shoppingLists.createdAt));

  if (archived.length <= limit) return 0;
  const toDelete = archived.slice(limit).map((l) => l.id);
  if (toDelete.length === 0) return 0;
  await db.delete(shoppingLists).where(inArray(shoppingLists.id, toDelete));
  return toDelete.length;
}

export async function deleteExpiredShareLinks(now: Date = new Date()) {
  await db.delete(shareLinks).where(lt(shareLinks.expiresAt, now));
}

export async function getHistory(limit = 10) {
  return db
    .select()
    .from(shoppingLists)
    .where(eq(shoppingLists.status, "archived"))
    .orderBy(desc(shoppingLists.createdAt))
    .limit(limit);
}

/**
 * Productos del maestro que NO están todavía en la lista (para autocomplete).
 */
export async function getProductsNotInList(listId: number) {
  const inList = db
    .select({ pid: shoppingListItems.productId })
    .from(shoppingListItems)
    .where(eq(shoppingListItems.listId, listId));

  return db
    .select({
      product: products,
      category: categories,
      store: stores,
    })
    .from(products)
    .innerJoin(stores, eq(products.storeId, stores.id))
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(
      and(
        eq(products.archived, false),
        sql`${products.id} NOT IN ${inList}`,
      ),
    );
}
