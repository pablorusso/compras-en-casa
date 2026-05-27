import { cookies } from "next/headers";
import { getIronSession, type SessionOptions } from "iron-session";

export type SessionData = {
  isAdmin?: boolean;
  loggedInAt?: number;
};

const password = process.env.SESSION_SECRET;

if (!password || password.length < 32) {
  if (process.env.NODE_ENV !== "production") {
    console.warn(
      "[session] SESSION_SECRET vacío o <32 chars. La sesión no firmará correctamente hasta que lo configures.",
    );
  }
}

export const sessionOptions: SessionOptions = {
  password: password ?? "x".repeat(32),
  cookieName: "comprasencasa_session",
  cookieOptions: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  },
};

export async function getSession() {
  const store = await cookies();
  return getIronSession<SessionData>(store, sessionOptions);
}

function devSkipLoginEnabled(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.DEV_SKIP_LOGIN === "true";
}

export async function isLoggedIn(): Promise<boolean> {
  if (devSkipLoginEnabled()) return true;
  const session = await getSession();
  return Boolean(session.isAdmin);
}

export async function requireAdmin(): Promise<void> {
  const ok = await isLoggedIn();
  if (!ok) {
    const { redirect } = await import("next/navigation");
    redirect("/admin/login");
  }
}
