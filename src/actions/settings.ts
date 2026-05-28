"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { settings, stores } from "@/db/schema";
import { requireAdmin } from "@/lib/session";

export async function updateSettingsAction(formData: FormData) {
  await requireAdmin();
  const historyLimit = Math.max(1, Math.min(50, Number(formData.get("historyLimit")) || 10));
  const shareLinkTtlDays = Math.max(
    1,
    Math.min(365, Number(formData.get("shareLinkTtlDays")) || 30),
  );
  const shoppingDays = [
    ...new Set(
      formData
        .getAll("shoppingDays")
        .map((v) => Number(v))
        .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6),
    ),
  ].sort((a, b) => a - b);

  // Comercio por defecto: vacío → null. Si llega un id, validamos que exista
  // para no guardar una FK colgada (la FK ya rechazaría con onDelete set null,
  // pero acá nos ahorramos un round-trip con error 500).
  const defaultStoreRaw = String(formData.get("defaultStoreId") ?? "").trim();
  let defaultStoreId: number | null = null;
  if (defaultStoreRaw) {
    const parsed = Number(defaultStoreRaw);
    if (Number.isInteger(parsed) && parsed > 0) {
      const [row] = await db
        .select({ id: stores.id })
        .from(stores)
        .where(eq(stores.id, parsed))
        .limit(1);
      if (row) defaultStoreId = row.id;
    }
  }

  await db
    .update(settings)
    .set({
      historyLimit,
      shareLinkTtlDays,
      shoppingDays,
      defaultStoreId,
      updatedAt: new Date(),
    })
    .where(eq(settings.id, 1));
  revalidatePath("/admin/settings");
  revalidatePath("/admin/products");
}
