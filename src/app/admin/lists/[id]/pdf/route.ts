import { requireAdmin } from "@/lib/session";
import { getListById, getListItems } from "@/lib/lists";
import { renderListPdf, pdfFileName } from "@/lib/pdf/render-list-pdf";

// renderToBuffer es API de Node; el PDF se arma siempre con los datos vigentes en DB.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { id: string };

export async function GET(_req: Request, ctx: { params: Promise<Params> }) {
  await requireAdmin(); // sin sesión, redirige a /login (la pestaña nueva navega al login)

  const { id } = await ctx.params;
  const listId = Number(id);
  if (!Number.isInteger(listId)) {
    return new Response("Not found", { status: 404 });
  }

  const list = await getListById(listId);
  if (!list) {
    return new Response("Not found", { status: 404 });
  }

  const items = await getListItems(list.id);
  const pdf = await renderListPdf(list, items);

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(pdfFileName(list.name))}`,
      "Cache-Control": "no-store",
    },
  });
}
