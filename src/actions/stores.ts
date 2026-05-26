"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { stores, categories } from "@/db/schema";
import { generateEmoji } from "@/lib/emoji";
import { requireAdmin } from "@/lib/session";

export async function createStoreAction(formData: FormData) {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const emojiInput = String(formData.get("emoji") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim() || null;
  if (!name) throw new Error("Nombre requerido");
  const emoji = emojiInput || (await generateEmoji("store", name)) || "🛒";
  await db.insert(stores).values({ name, emoji, address });
  revalidatePath("/admin/stores");
  revalidatePath("/admin");
}

export async function updateStoreAction(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const name = String(formData.get("name") ?? "").trim();
  const emoji = String(formData.get("emoji") ?? "").trim() || "🛒";
  const address = String(formData.get("address") ?? "").trim() || null;
  if (!id || !name) throw new Error("Datos inválidos");
  await db.update(stores).set({ name, emoji, address }).where(eq(stores.id, id));
  revalidatePath("/admin/stores");
}

export async function deleteStoreAction(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!id) throw new Error("ID requerido");
  await db.delete(stores).where(eq(stores.id, id));
  revalidatePath("/admin/stores");
  revalidatePath("/admin");
}

export async function createCategoryAction(formData: FormData) {
  await requireAdmin();
  const storeId = Number(formData.get("storeId"));
  const name = String(formData.get("name") ?? "").trim();
  const emojiInput = String(formData.get("emoji") ?? "").trim();
  if (!storeId || !name) throw new Error("Datos inválidos");
  const emoji = emojiInput || (await generateEmoji("category", name)) || "🛒";
  await db.insert(categories).values({ storeId, name, emoji });
  revalidatePath("/admin/stores");
}

export async function updateCategoryAction(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const name = String(formData.get("name") ?? "").trim();
  const emoji = String(formData.get("emoji") ?? "").trim() || "🛒";
  if (!id || !name) throw new Error("Datos inválidos");
  await db.update(categories).set({ name, emoji }).where(eq(categories.id, id));
  revalidatePath("/admin/stores");
}

export async function deleteCategoryAction(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!id) throw new Error("ID requerido");
  await db.delete(categories).where(eq(categories.id, id));
  revalidatePath("/admin/stores");
}

export async function regenerateEmojiAction(formData: FormData) {
  await requireAdmin();
  const kind = String(formData.get("kind") ?? "") as "store" | "category";
  const id = Number(formData.get("id"));
  const name = String(formData.get("name") ?? "").trim();
  if (!id || !name || !["store", "category"].includes(kind)) {
    throw new Error("Datos inválidos");
  }
  const emoji = await generateEmoji(kind, name);
  if (!emoji) {
    // La llamada al proveedor falló: preservamos el emoji existente y
    // dejamos que el caller muestre el error en la UI.
    throw new Error("No se pudo generar el emoji. Intentá de nuevo.");
  }
  if (kind === "store") {
    await db.update(stores).set({ emoji }).where(eq(stores.id, id));
  } else {
    await db.update(categories).set({ emoji }).where(eq(categories.id, id));
  }
  revalidatePath("/admin/stores");
  revalidatePath("/admin");
  return emoji;
}

const EMOJI_PICTOGRAPHIC = /\p{Extended_Pictographic}/u;

export async function setEmojiAction(formData: FormData) {
  await requireAdmin();
  const kind = String(formData.get("kind") ?? "") as "store" | "category";
  const id = Number(formData.get("id"));
  const emoji = String(formData.get("emoji") ?? "").trim();
  if (!id || !["store", "category"].includes(kind)) {
    throw new Error("Datos inválidos");
  }
  if (!emoji || emoji.length > 8 || !EMOJI_PICTOGRAPHIC.test(emoji)) {
    throw new Error("Emoji inválido");
  }
  if (kind === "store") {
    await db.update(stores).set({ emoji }).where(eq(stores.id, id));
  } else {
    await db.update(categories).set({ emoji }).where(eq(categories.id, id));
  }
  revalidatePath("/admin/stores");
  revalidatePath("/admin");
}
