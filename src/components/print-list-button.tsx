"use client";

import { Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { buildPrintDocument } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ShoppingListItem } from "@/db/schema";

type Props = {
  list: { id: number; name: string };
  items: ShoppingListItem[];
  className?: string;
  variant?: "outline" | "ghost";
  size?: "sm" | "default" | "lg";
};

const iconSizeMap = {
  sm: "icon-sm",
  default: "icon",
  lg: "icon-lg",
} as const;

const PX_PER_MM = 96 / 25.4;
// Alto imprimible de A4: 297mm menos 8mm de márgenes arriba y abajo.
const PRINTABLE_HEIGHT = (297 - 16) * PX_PER_MM;
const BASE_FONT = 11; // px; coincide con el font-size del body en buildPrintDocument
const MIN_FONT = 8; // px; piso legible: por debajo no vale la pena achicar más

/**
 * Decide el layout de impresión midiendo el alto real del contenido en el iframe:
 *
 * 1. Si a fuente base entra en 1 hoja con 2 columnas → lo deja así.
 * 2. Si no, busca por bisección la mayor fuente (hasta MIN_FONT) que lo haga entrar en 1
 *    hoja, todavía en 2 columnas.
 * 3. Si ni al mínimo entra, vuelve a fuente base y pasa a 1 columna: con el truco de
 *    thead/tfoot el contenido pagina limpio a N hojas (el multi-columna fragmentado entre
 *    páginas dentro de una celda de tabla es frágil, y en multipágina sobra el ancho).
 */
function preparePrint(doc: Document) {
  const content = doc.querySelector<HTMLElement>(".content");
  const thead = doc.querySelector<HTMLElement>("thead");
  const tfoot = doc.querySelector<HTMLElement>("tfoot");
  if (!content) return;

  // Alto útil por hoja: imprimible menos lo que reservan thead y tfoot (repetidos en cada
  // hoja). Se mide el alto real de las secciones —incluye su padding, el aire alrededor
  // del header/footer— para no depender de constantes.
  const reserved =
    (thead?.getBoundingClientRect().height ?? 0) +
    (tfoot?.getBoundingClientRect().height ?? 0);
  const usable = PRINTABLE_HEIGHT - reserved;

  const body = doc.body;
  const fits = (fontPx: number) => {
    body.style.fontSize = `${fontPx}px`;
    return content.scrollHeight <= usable;
  };

  content.style.columnCount = "2";

  // 1. Fuente base, 2 columnas.
  if (fits(BASE_FONT)) return;

  // 2. Bisección: mayor fuente entera en [MIN_FONT, BASE_FONT] que entre en 1 hoja.
  let lo = MIN_FONT;
  let hi = BASE_FONT;
  let best = 0;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (fits(mid)) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  if (best >= MIN_FONT) {
    body.style.fontSize = `${best}px`;
    return;
  }

  // 3. No entra ni al mínimo: fuente base + 1 columna → multipágina legible.
  body.style.fontSize = `${BASE_FONT}px`;
  content.style.columnCount = "1";
}

export function PrintListButton({
  list,
  items,
  className,
  variant = "outline",
  size = "default",
}: Props) {
  function printList() {
    try {
      const html = buildPrintDocument(list, items);
      const iframe = document.createElement("iframe");
      iframe.setAttribute("aria-hidden", "true");
      // Ancho = área imprimible de A4 (210mm - 16mm de márgenes) a 96dpi, para que el
      // layout en pantalla coincida con el de impresión y la medición sea precisa.
      iframe.style.cssText =
        "position:fixed;left:-9999px;top:0;width:734px;height:1100px;border:0;";

      // srcdoc dispara `load` una sola vez con el contenido ya cargado (evita el
      // doble diálogo: uno vacío de about:blank y otro con contenido).
      iframe.srcdoc = html;
      iframe.onload = () => {
        const win = iframe.contentWindow;
        const doc = iframe.contentDocument;
        if (!win || !doc) {
          iframe.remove();
          toast.error("No se pudo imprimir");
          return;
        }
        preparePrint(doc);
        win.addEventListener(
          "afterprint",
          () => setTimeout(() => iframe.remove(), 500),
          { once: true },
        );
        win.focus();
        win.print();
        // Fallback por si afterprint no dispara (algunos navegadores).
        setTimeout(() => iframe.remove(), 60000);
      };

      document.body.appendChild(iframe);
    } catch {
      toast.error("No se pudo imprimir");
    }
  }

  return (
    <Button
      variant={variant}
      size={iconSizeMap[size]}
      onClick={printList}
      aria-label="Imprimir lista"
      title="Imprimir lista"
      className={cn("rounded-2xl", className)}
    >
      <Printer className="size-4" />
    </Button>
  );
}
