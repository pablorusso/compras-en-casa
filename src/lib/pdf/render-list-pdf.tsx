import { renderToBuffer } from "@react-pdf/renderer";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { ListPdfDocument } from "./list-document";
import type { ShoppingList, ShoppingListItem } from "@/db/schema";

const FOOTER_SIZE = 8;
const FOOTER_MARGIN = 32; // coincide con el paddingHorizontal del documento
const FOOTER_Y = 16; // desde el borde inferior (origen abajo-izquierda en pdf-lib)
const FOOTER_GRAY = rgb(0.33, 0.33, 0.33);

/**
 * Estampa el footer (fecha de impresión a la izquierda, "Página N de M" a la derecha) en
 * cada hoja con pdf-lib. Se hace en post-proceso porque el prop `render` de @react-pdf 4.5
 * —la única vía para el número de página— no se pinta en los visores.
 */
async function stampFooter(pdf: Buffer, printedAt: string): Promise<Buffer> {
  const doc = await PDFDocument.load(pdf);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const pages = doc.getPages();
  const total = pages.length;
  pages.forEach((page, i) => {
    const { width } = page.getSize();
    const left = `Impreso el ${printedAt}`;
    const right = `Página ${i + 1} de ${total}`;
    page.drawText(left, {
      x: FOOTER_MARGIN,
      y: FOOTER_Y,
      size: FOOTER_SIZE,
      font,
      color: FOOTER_GRAY,
    });
    const rightWidth = font.widthOfTextAtSize(right, FOOTER_SIZE);
    page.drawText(right, {
      x: width - FOOTER_MARGIN - rightWidth,
      y: FOOTER_Y,
      size: FOOTER_SIZE,
      font,
      color: FOOTER_GRAY,
    });
  });
  return Buffer.from(await doc.save());
}

/**
 * Genera el PDF de una lista en el servidor (API de Node de @react-pdf/renderer) y le
 * estampa el footer. La fecha de impresión se calcula acá, en el render.
 */
export async function renderListPdf(
  list: Pick<ShoppingList, "name">,
  items: ShoppingListItem[],
): Promise<Buffer> {
  const printedAt = new Date().toLocaleString("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  });
  const base = await renderToBuffer(<ListPdfDocument list={list} items={items} />);
  return stampFooter(base, printedAt);
}

/**
 * Nombre de archivo sugerido al guardar/imprimir el PDF, sin caracteres inválidos para
 * nombres de archivo (p. ej. "Lista 29/May" → "Lista 29-May").
 */
export function pdfFileName(listName: string): string {
  return `Compras en Casa - ${listName.replace(/[\\/:*?"<>|]/g, "-")}.pdf`;
}
