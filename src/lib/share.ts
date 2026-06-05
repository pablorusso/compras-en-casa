import { nanoid } from "nanoid";
import { and, desc, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { settings, shareLinks, shoppingLists } from "@/db/schema";

const DEFAULT_TTL_HOURS = 24;
const DEFAULT_TTL_DAYS = 30;

export async function createShareLink(listId: number, ttlHours = DEFAULT_TTL_HOURS) {
  const token = nanoid(24);
  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);
  const [row] = await db
    .insert(shareLinks)
    .values({ listId, token, expiresAt })
    .returning();
  return row;
}

/** Días de vigencia configurados para los share-links (default 30). */
export async function getShareLinkTtlDays(): Promise<number> {
  const [cfg] = await db
    .select({ ttl: settings.shareLinkTtlDays })
    .from(settings)
    .where(eq(settings.id, 1))
    .limit(1);
  return cfg?.ttl ?? DEFAULT_TTL_DAYS;
}

/** Crea un share-link para `listId` usando el TTL configurado en settings. */
export async function createShareLinkForList(listId: number) {
  const ttlDays = await getShareLinkTtlDays();
  return createShareLink(listId, ttlDays * 24);
}

export async function resolveShareLink(token: string) {
  const [row] = await db.select().from(shareLinks).where(eq(shareLinks.token, token)).limit(1);
  if (!row) return { kind: "not_found" as const };
  const [list] = await db
    .select()
    .from(shoppingLists)
    .where(eq(shoppingLists.id, row.listId))
    .limit(1);
  if (!list) return { kind: "not_found" as const };
  if (row.expiresAt.getTime() < Date.now()) {
    return { kind: "expired" as const, link: row, list };
  }
  return { kind: "ok" as const, link: row, list };
}

/**
 * Último share-link activo (no expirado) para una lista. Permite mostrar el link
 * vigente en la home y en la página post-publicación sin tener que regenerarlo.
 */
export async function getActiveShareLink(listId: number, now: Date = new Date()) {
  const [row] = await db
    .select()
    .from(shareLinks)
    .where(and(eq(shareLinks.listId, listId), gt(shareLinks.expiresAt, now)))
    .orderBy(desc(shareLinks.createdAt))
    .limit(1);
  return row ?? null;
}
