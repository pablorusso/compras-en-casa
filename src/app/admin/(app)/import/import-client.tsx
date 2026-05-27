"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, AlertTriangle, ArrowLeft, RefreshCw, Leaf, Copy, FileDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  confirmImportAction,
  previewImportAction,
  type PreviewResult,
} from "@/actions/import";
import { exportMasterMarkdownAction } from "@/actions/export";
import { MONTHS_SHORT_ES } from "@/lib/seasonality";
import { formatQuantity } from "@/lib/format";
import { cn } from "@/lib/utils";

const SAMPLE_TEMPLATE = `# Lista Completa

## 🥬 Verdulería
> Av. Cabildo 1234, Belgrano

**🍎 Frutas**

- [ ] 2 kg banana
- [ ] 1 kg de frutillas *(temporada: sep-nov)*

## 🍝 Multipasta

- [ ] 2 cajas de ravioles
`;

type Stage =
  | { kind: "edit" }
  | { kind: "preview"; data: Extract<PreviewResult, { ok: true }> }
  | { kind: "errors"; errors: Extract<PreviewResult, { ok: false }>["errors"] };

export function ImportClient() {
  const router = useRouter();
  const [markdown, setMarkdown] = useState("");
  const [stage, setStage] = useState<Stage>({ kind: "edit" });
  const [confirmText, setConfirmText] = useState("");
  const [pending, startTransition] = useTransition();

  function doPreview() {
    startTransition(async () => {
      try {
        const result = await previewImportAction(markdown);
        if (result.ok) {
          setStage({ kind: "preview", data: result });
        } else {
          setStage({ kind: "errors", errors: result.errors });
        }
      } catch (err) {
        toast.error((err as Error).message);
      }
    });
  }

  function doExport(target: "clipboard" | "editor") {
    startTransition(async () => {
      try {
        const md = await exportMasterMarkdownAction();
        if (!md.trim()) {
          toast.info("El maestro está vacío: no hay nada para exportar.");
          return;
        }
        if (target === "clipboard") {
          await navigator.clipboard.writeText(md);
          toast.success("Markdown copiado al portapapeles");
        } else {
          setMarkdown(md);
          setStage({ kind: "edit" });
          toast.success("Markdown cargado en el editor");
        }
      } catch (err) {
        toast.error((err as Error).message);
      }
    });
  }

  function doConfirm() {
    if (confirmText.trim().toUpperCase() !== "REEMPLAZAR") {
      toast.error('Escribí "REEMPLAZAR" para confirmar');
      return;
    }
    startTransition(async () => {
      try {
        const result = await confirmImportAction(markdown);
        if (result.ok) {
          toast.success(
            `Import OK: ${result.inserted.stores} comercios, ${result.inserted.categories} cats, ${result.inserted.products} productos`,
          );
          router.push("/admin/products");
        } else {
          setStage({ kind: "errors", errors: result.errors });
        }
      } catch (err) {
        toast.error((err as Error).message);
      }
    });
  }

  if (stage.kind === "edit" || stage.kind === "errors") {
    const errors = stage.kind === "errors" ? stage.errors : null;
    return (
      <div className="space-y-4">
        <Card className="p-4 space-y-3">
          <div className="space-y-1">
            <Label>Exportar catálogo</Label>
            <p className="text-xs text-muted-foreground">
              Genera el markdown del maestro actual en el formato que entiende el importer.
              Sirve para hacer backup o para clonar y editar antes de re-importar.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => doExport("clipboard")}
              disabled={pending}
              className="rounded-xl"
            >
              <Copy className="size-4" />
              Copiar al portapapeles
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => doExport("editor")}
              disabled={pending}
              className="rounded-xl"
            >
              <FileDown className="size-4" />
              Cargar en el editor
            </Button>
          </div>
        </Card>

        <Card className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="space-y-1">
              <Label htmlFor="md">Markdown</Label>
              <p className="text-xs text-muted-foreground">
                Formato: <code>## emoji Comercio</code>, <code>**emoji Categoría**</code>,{" "}
                <code>- [ ] cantidad unidad nombre</code>. Temporada al final con{" "}
                <code>*(temporada: sep-nov)*</code>. Dirección opcional del comercio en una
                línea con prefijo <code>&gt; </code> debajo del <code>##</code>.
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setMarkdown(SAMPLE_TEMPLATE)}
              disabled={pending}
            >
              Insertar ejemplo
            </Button>
          </div>
          <textarea
            id="md"
            value={markdown}
            onChange={(e) => {
              setMarkdown(e.target.value);
              if (stage.kind === "errors") setStage({ kind: "edit" });
            }}
            rows={20}
            placeholder="Pegá acá la lista en markdown…"
            className="w-full rounded-md border bg-background px-3 py-2 font-mono text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/40 min-h-[300px]"
          />
          <div className="flex justify-end">
            <Button
              type="button"
              onClick={doPreview}
              disabled={pending || markdown.trim().length === 0}
              className="rounded-xl"
            >
              <Eye className="size-4" />
              {pending ? "Procesando…" : "Previsualizar"}
            </Button>
          </div>
        </Card>

        {errors && errors.length > 0 && (
          <Card className="border-destructive/40 bg-destructive/5 p-4 space-y-2">
            <div className="flex items-center gap-2 text-destructive font-medium">
              <AlertTriangle className="size-4" />
              <span>El parser encontró errores:</span>
            </div>
            <ul className="text-sm space-y-1 list-disc list-inside text-destructive">
              {errors.map((e, i) => (
                <li key={i}>
                  {e.line > 0 ? <span className="font-mono">línea {e.line}:</span> : null} {e.message}
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    );
  }

  // Preview stage
  const { parsed, currentCounts, newCounts } = stage.data;

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm flex-wrap">
          <Badge variant="secondary" className="text-xs">
            {newCounts.stores} comercios
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {newCounts.categories} categorías
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {newCounts.products} productos
          </Badge>
        </div>
        <div className="text-sm text-muted-foreground">
          Catálogo actual:{" "}
          <span className="font-medium text-foreground">{currentCounts.stores}</span> comercios,{" "}
          <span className="font-medium text-foreground">{currentCounts.categories}</span> cats,{" "}
          <span className="font-medium text-foreground">{currentCounts.products}</span> productos
          (se van a borrar).
        </div>
      </Card>

      <Card className="p-4">
        <ul className="space-y-3 text-sm">
          {parsed.map((store) => (
            <li key={store.name} className="space-y-1">
              <div className="font-semibold flex items-center gap-2">
                <span className="text-lg leading-none">{store.emoji}</span>
                <span>{store.name}</span>
                <Badge variant="outline" className="text-[10px] ml-auto">
                  {store.categories.reduce((acc, c) => acc + c.products.length, 0) +
                    store.directProducts.length}{" "}
                  prods
                </Badge>
              </div>
              {store.address && (
                <div className="ml-7 text-xs text-muted-foreground">📍 {store.address}</div>
              )}
              {store.categories.map((cat) => (
                <div key={cat.name} className="ml-3 mt-1">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium flex items-center gap-1.5">
                    <span className="text-sm leading-none">{cat.emoji}</span>
                    <span>{cat.name}</span>
                    <span className="opacity-60">({cat.products.length})</span>
                  </div>
                  <ul className="ml-4 mt-0.5 space-y-0.5">
                    {cat.products.map((p) => (
                      <li key={p.name} className="flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground">•</span>
                        <span>{p.name}</span>
                        <span className="text-muted-foreground">
                          {formatQuantity(p.defaultQuantityValue, p.defaultQuantityUnit)}
                        </span>
                        {p.isSeasonal && (
                          <Badge variant="outline" className="gap-1 text-[10px]">
                            <Leaf className="size-3" />
                            {p.seasonMonths.map((m) => MONTHS_SHORT_ES[m - 1]).join("·")}
                          </Badge>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              {store.directProducts.length > 0 && (
                <div className="ml-3 mt-1">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
                    (sin categoría)
                  </div>
                  <ul className="ml-4 mt-0.5 space-y-0.5">
                    {store.directProducts.map((p) => (
                      <li key={p.name} className="flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground">•</span>
                        <span>{p.name}</span>
                        <span className="text-muted-foreground">
                          {formatQuantity(p.defaultQuantityValue, p.defaultQuantityUnit)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          ))}
        </ul>
      </Card>

      <Card className="border-destructive/40 bg-destructive/5 p-4 space-y-3">
        <div className="flex items-start gap-2">
          <AlertTriangle className="size-5 text-destructive shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-destructive">Reemplazo destructivo</p>
            <p className="text-muted-foreground mt-1">
              Esto borra <strong>todos</strong> los comercios, categorías y productos
              existentes y los reemplaza por los del markdown. Las listas viejas conservan los
              nombres y emojis denormalizados pero pierden el link al producto del catálogo.
            </p>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm-txt" className="text-sm">
            Escribí <span className="font-mono font-semibold">REEMPLAZAR</span> para habilitar
            el botón:
          </Label>
          <Input
            id="confirm-txt"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="REEMPLAZAR"
            className="h-11 font-mono uppercase"
            autoComplete="off"
          />
        </div>
        <div className="flex justify-between gap-2 pt-1">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setStage({ kind: "edit" })}
            disabled={pending}
          >
            <ArrowLeft className="size-4" /> Volver
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={doConfirm}
            disabled={pending || confirmText.trim().toUpperCase() !== "REEMPLAZAR"}
            className={cn("rounded-xl", "bg-destructive text-destructive-foreground")}
          >
            <RefreshCw className={cn("size-4", pending && "animate-spin")} />
            {pending ? "Reemplazando…" : "Reemplazar catálogo"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
