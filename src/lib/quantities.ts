import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { shoppingListItems, shoppingLists } from "@/db/schema";

export type Quantity = { value: string; unit: string };

const HISTORY_DEPTH = 3;

/**
 * Devuelve la moda (value+unit) más frecuente para cada productId en las
 * últimas HISTORY_DEPTH listas archivadas. Empate -> el más reciente.
 * Si el producto no aparece en histórico, no figura en el Map (el caller
 * debe caer al default del maestro).
 */
export async function getSuggestedQuantities(
  productIds: number[],
): Promise<Map<number, Quantity>> {
  const out = new Map<number, Quantity>();
  if (productIds.length === 0) return out;

  const recentLists = await db
    .select({ id: shoppingLists.id, createdAt: shoppingLists.createdAt })
    .from(shoppingLists)
    .where(eq(shoppingLists.status, "archived"))
    .orderBy(desc(shoppingLists.createdAt))
    .limit(HISTORY_DEPTH);

  if (recentLists.length === 0) return out;
  const listIds = recentLists.map((l) => l.id);
  const listOrder = new Map(recentLists.map((l, idx) => [l.id, idx]));

  const items = await db
    .select({
      productId: shoppingListItems.productId,
      listId: shoppingListItems.listId,
      value: shoppingListItems.quantityValue,
      unit: shoppingListItems.quantityUnit,
    })
    .from(shoppingListItems)
    .where(
      and(
        inArray(shoppingListItems.listId, listIds),
        inArray(shoppingListItems.productId, productIds),
      ),
    );

  type Bucket = { count: number; mostRecentListIdx: number; value: string; unit: string };
  const grouped = new Map<number, Map<string, Bucket>>();

  for (const row of items) {
    if (row.productId == null) continue;
    const key = `${row.value}__${row.unit}`;
    let perProduct = grouped.get(row.productId);
    if (!perProduct) {
      perProduct = new Map();
      grouped.set(row.productId, perProduct);
    }
    const idx = listOrder.get(row.listId) ?? Number.MAX_SAFE_INTEGER;
    const existing = perProduct.get(key);
    if (existing) {
      existing.count += 1;
      existing.mostRecentListIdx = Math.min(existing.mostRecentListIdx, idx);
    } else {
      perProduct.set(key, {
        count: 1,
        mostRecentListIdx: idx,
        value: row.value,
        unit: row.unit,
      });
    }
  }

  for (const [productId, buckets] of grouped) {
    let winner: Bucket | null = null;
    for (const b of buckets.values()) {
      if (
        !winner ||
        b.count > winner.count ||
        (b.count === winner.count && b.mostRecentListIdx < winner.mostRecentListIdx)
      ) {
        winner = b;
      }
    }
    if (winner) {
      out.set(productId, { value: winner.value, unit: winner.unit });
    }
  }

  return out;
}
