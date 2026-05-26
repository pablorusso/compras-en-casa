"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { getSession } from "@/lib/session";

export type AuthState = { error?: string };

async function getOrInitSettingsRow() {
  const [existing] = await db.select().from(settings).where(eq(settings.id, 1)).limit(1);
  if (existing) return existing;
  const [created] = await db.insert(settings).values({ id: 1 }).returning();
  return created;
}

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const password = String(formData.get("password") ?? "");
  if (!password) return { error: "Ingresá un password" };

  const row = await getOrInitSettingsRow();

  if (!row.adminPasswordHash) {
    if (password.length < 6) return { error: "El password debe tener al menos 6 caracteres" };
    const hash = await bcrypt.hash(password, 10);
    await db.update(settings).set({ adminPasswordHash: hash }).where(eq(settings.id, 1));
  } else {
    const ok = await bcrypt.compare(password, row.adminPasswordHash);
    if (!ok) return { error: "Password incorrecto" };
  }

  const session = await getSession();
  session.isAdmin = true;
  session.loggedInAt = Date.now();
  await session.save();
  redirect("/admin");
}

export async function logoutAction() {
  const session = await getSession();
  session.destroy();
  redirect("/login");
}

export async function changePasswordAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const current = String(formData.get("currentPassword") ?? "");
  const next = String(formData.get("newPassword") ?? "");
  if (next.length < 6) return { error: "El nuevo password debe tener al menos 6 caracteres" };
  const row = await getOrInitSettingsRow();
  if (!row.adminPasswordHash) return { error: "No hay password configurado todavía" };
  const ok = await bcrypt.compare(current, row.adminPasswordHash);
  if (!ok) return { error: "Password actual incorrecto" };
  const hash = await bcrypt.hash(next, 10);
  await db.update(settings).set({ adminPasswordHash: hash }).where(eq(settings.id, 1));
  return {};
}

export async function isFirstRun(): Promise<boolean> {
  const row = await getOrInitSettingsRow();
  return !row.adminPasswordHash;
}
