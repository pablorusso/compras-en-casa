import { resolveShareLink } from "@/lib/share";
import { getListItems } from "@/lib/lists";
import { renderListPdf, pdfFileName } from "@/lib/pdf/render-list-pdf";

// renderToBuffer es API de Node; igual que el HTML/JSON, se chequea expiración por request.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { token: string };

export async function GET(_req: Request, ctx: { params: Promise<Params> }) {
  const { token } = await ctx.params;
  const res = await resolveShareLink(token);

  if (res.kind === "not_found") {
    return new Response("Not found", { status: 404 });
  }
  if (res.kind === "expired") {
    // Igual que el endpoint JSON: expirado = 410 Gone, sin bypass de admin.
    return new Response("Gone", { status: 410 });
  }

  const items = await getListItems(res.list.id);
  const pdf = await renderListPdf(res.list, items);

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(pdfFileName(res.list.name))}`,
      "Cache-Control": "no-store",
    },
  });
}
