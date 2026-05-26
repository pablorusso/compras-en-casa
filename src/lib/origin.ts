import { headers } from "next/headers";

/**
 * Devuelve el origin de la request (protocolo + host) en server components.
 * Usa los headers `x-forwarded-*` que setea el proxy de Vercel/Next, con
 * fallback a `host` para entornos sin proxy. Si nada está disponible (caso
 * extremo) devuelve cadena vacía — los callers deben tolerarlo.
 */
export async function getRequestOrigin(): Promise<string> {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host =
    h.get("x-forwarded-host") ?? h.get("host") ?? process.env.NEXT_PUBLIC_APP_URL ?? "";
  if (!host) return "";
  return `${proto}://${host}`;
}
