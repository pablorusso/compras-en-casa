import { Printer } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  /** Endpoint que devuelve el PDF de la lista (admin: /admin/lists/[id]/pdf, share: /share/[token]/pdf). */
  pdfUrl: string;
  className?: string;
  variant?: "outline" | "ghost";
  size?: "sm" | "default" | "lg";
};

const iconSizeMap = {
  sm: "icon-sm",
  default: "icon",
  lg: "icon-lg",
} as const;

/**
 * Abre el PDF de la lista (generado en el servidor) en una pestaña nueva. El usuario imprime
 * desde el visor nativo, así la impresión sale igual en desktop, iOS Safari y la PWA instalada
 * —sin depender del motor de impresión del dispositivo.
 */
export function PrintListButton({ pdfUrl, className, variant = "outline", size = "default" }: Props) {
  return (
    <a
      href={pdfUrl}
      target="_blank"
      rel="noopener"
      aria-label="Imprimir lista"
      title="Imprimir lista"
      className={cn(
        buttonVariants({ variant, size: iconSizeMap[size] }),
        "rounded-2xl",
        className,
      )}
    >
      <Printer className="size-4" />
    </a>
  );
}
