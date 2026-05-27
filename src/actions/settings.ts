"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { settings } from "@/db/schema";
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

  await db
    .update(settings)
    .set({
      historyLimit,
      shareLinkTtlDays,
      shoppingDays,
      updatedAt: new Date(),
    })
    .where(eq(settings.id, 1));
  revalidatePath("/admin/settings");
}
