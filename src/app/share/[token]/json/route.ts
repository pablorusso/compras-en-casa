import { resolveShareLink } from "@/lib/share";
import { getListItems } from "@/lib/lists";
import { buildListJson } from "@/lib/format";

// Igual que la página HTML: chequear expiración en cada request.
export const dynamic = "force-dynamic";

type Params = { token: string };

export async function GET(_req: Request, ctx: { params: Promise<Params> }) {
  const { token } = await ctx.params;
  const res = await resolveShareLink(token);

  if (res.kind === "not_found") {
    return Response.json({ error: "not_found" }, { status: 404 });
  }
  if (res.kind === "expired") {
    // A diferencia del HTML, el endpoint JSON no tiene bypass de admin:
    // expirado = 410 Gone para cualquiera.
    return Response.json(
      { error: "expired", expiredAt: res.link.expiresAt.toISOString() },
      { status: 410 },
    );
  }

  const items = await getListItems(res.list.id);
  return Response.json(buildListJson(res.list, items));
}
