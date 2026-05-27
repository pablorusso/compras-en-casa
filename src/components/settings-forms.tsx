"use client";

import { useActionState, useState, useTransition } from "react";
import { SlidersHorizontal, KeyRound, TriangleAlert, Trash2, Upload, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changePasswordAction, type AuthState } from "@/actions/auth";
import { updateSettingsAction } from "@/actions/settings";
import { ResetDataDialog } from "@/components/reset-data-dialog";
import { cn } from "@/lib/utils";

type SettingsValues = {
  historyLimit: number;
  shareLinkTtlDays: number;
  shoppingDays: number[];
};

// Convención Date.getDay(): 0 = Domingo … 6 = Sábado. Mostrados Lun→Dom.
const WEEK_DAYS = [
  { value: 1, label: "Lun" },
  { value: 2, label: "Mar" },
  { value: 3, label: "Mié" },
  { value: 4, label: "Jue" },
  { value: 5, label: "Vie" },
  { value: 6, label: "Sáb" },
  { value: 0, label: "Dom" },
] as const;

export function SettingsForms({ settings }: { settings: SettingsValues }) {
  const [pending, startTransition] = useTransition();
  const [shoppingDays, setShoppingDays] = useState<number[]>(settings.shoppingDays);

  const toggleDay = (value: number) =>
    setShoppingDays((prev) =>
      prev.includes(value) ? prev.filter((d) => d !== value) : [...prev, value],
    );

  const [pwdState, pwdAction] = useActionState<AuthState, FormData>(
    async (prev, fd) => {
      const result = await changePasswordAction(prev, fd);
      if (!result.error) toast.success("Password actualizado");
      return result;
    },
    {},
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="size-4 text-primary" />
            <h2 className="font-semibold">Preferencias</h2>
          </div>
          <form
            action={(fd) => {
              startTransition(async () => {
                try {
                  await updateSettingsAction(fd);
                  toast.success("Ajustes guardados");
                } catch (err) {
                  toast.error((err as Error).message);
                }
              });
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="historyLimit">Listas históricas a guardar</Label>
              <Input
                id="historyLimit"
                name="historyLimit"
                type="number"
                min={1}
                max={50}
                defaultValue={settings.historyLimit}
                className="h-11"
              />
              <p className="text-xs text-muted-foreground">
                Al crear una nueva lista vigente, se borrarán las archivadas más viejas que excedan este límite.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="shareLinkTtlDays">Días de vigencia del link compartible</Label>
              <Input
                id="shareLinkTtlDays"
                name="shareLinkTtlDays"
                type="number"
                min={1}
                max={365}
                defaultValue={settings.shareLinkTtlDays}
                className="h-11"
              />
              <p className="text-xs text-muted-foreground">
                Cuántos días dura el link compartible que generás para la lista vigente.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Días de compra</Label>
              <div className="flex flex-wrap gap-2">
                {WEEK_DAYS.map((day) => {
                  const selected = shoppingDays.includes(day.value);
                  return (
                    <button
                      key={day.value}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => toggleDay(day.value)}
                      className={cn(
                        "h-11 min-w-12 flex-1 rounded-xl border text-sm font-medium transition-colors",
                        selected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input bg-background text-foreground hover:bg-accent",
                      )}
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
              {shoppingDays.map((d) => (
                <input key={d} type="hidden" name="shoppingDays" value={d} />
              ))}
              <p className="text-xs text-muted-foreground">
                Días en que hacés la compra. El nombre de cada lista nueva usará la fecha del
                próximo día de compra (hoy incluido si coincide).
              </p>
            </div>
            <Button type="submit" size="lg" className="rounded-xl w-full" disabled={pending}>
              {pending ? "Guardando…" : "Guardar ajustes"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <KeyRound className="size-4 text-primary" />
            <h2 className="font-semibold">Cambiar password</h2>
          </div>
          <form action={pwdAction} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Password actual</Label>
              <Input
                id="currentPassword"
                name="currentPassword"
                type="password"
                required
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nuevo password</Label>
              <Input
                id="newPassword"
                name="newPassword"
                type="password"
                required
                minLength={6}
                className="h-11"
              />
            </div>
            {pwdState.error && (
              <p className="text-sm text-destructive">{pwdState.error}</p>
            )}
            <Button type="submit" size="lg" className="rounded-xl w-full">
              Actualizar password
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Upload className="size-4 text-primary" />
            <h2 className="font-semibold">Importar / Exportar catálogo</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Exportá el maestro a markdown o reemplazalo con un import.
          </p>
          <LinkButton
            href="/admin/import"
            variant="outline"
            size="lg"
            className="rounded-xl w-full"
          >
            Abrir Importar / Exportar
            <ArrowRight className="size-4" />
          </LinkButton>
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <TriangleAlert className="size-4 text-destructive" />
            <h2 className="font-semibold text-destructive">Zona peligrosa</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Borrá todos los datos de negocio: comercios, categorías, productos, listas (vigente e
            históricas), ítems y links compartibles. Se conservan únicamente el password y las
            preferencias generales. Esta acción es irreversible.
          </p>
          <ResetDataDialog
            trigger={
              <Button type="button" variant="tomato" size="lg" className="rounded-xl w-full">
                <Trash2 className="size-4" />
                Borrar todos los datos
              </Button>
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
