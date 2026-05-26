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

  await db
    .update(settings)
    .set({
      historyLimit,
      shareLinkTtlDays,
      updatedAt: new Date(),
    })
    .where(eq(settings.id, 1));
  revalidatePath("/admin/settings");
}
