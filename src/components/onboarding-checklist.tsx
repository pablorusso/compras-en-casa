import {
  CalendarDays,
  Check,
  LayoutGrid,
  Package,
  Store as StoreIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";
import { NewListButton } from "@/components/new-list-button";
import { cn } from "@/lib/utils";

type Props = {
  shoppingDaysSet: boolean;
  hasStores: boolean;
  hasProducts: boolean;
  hasCategories: boolean;
};

type Step = {
  title: string;
  description: React.ReactNode;
  done: boolean;
  action: React.ReactNode;
};

export function OnboardingChecklist({
  shoppingDaysSet,
  hasStores,
  hasProducts,
  hasCategories,
}: Props) {
  const steps: Step[] = [
    {
      title: "Configurá los días de compra",
      description: "Definí en qué días de la semana salís a comprar.",
      done: shoppingDaysSet,
      action: (
        <LinkButton
          href="/admin/settings"
          variant="outline"
          size="sm"
          className="rounded-xl"
        >
          <CalendarDays className="size-4" /> Ir a Ajustes
        </LinkButton>
      ),
    },
    {
      title: "Creá los comercios",
      description: "Supermercado, verdulería, carnicería… dónde comprás.",
      done: hasStores,
      action: (
        <LinkButton
          href="/admin/stores"
          variant="outline"
          size="sm"
          className="rounded-xl"
        >
          <StoreIcon className="size-4" /> Ir a Comercios
        </LinkButton>
      ),
    },
    {
      title: "Creá los productos",
      description: "Cargá lo que solés comprar en cada comercio.",
      done: hasProducts,
      action: (
        <LinkButton
          href="/admin/products"
          variant="outline"
          size="sm"
          className="rounded-xl"
        >
          <Package className="size-4" /> Ir a Productos
        </LinkButton>
      ),
    },
    {
      title: "Organizá los comercios con categorías",
      description: (
        <>
          Entrá a un comercio y tocá el ícono{" "}
          <LayoutGrid className="inline size-4 -translate-y-px text-primary" />{" "}
          para organizar sus categorías.
        </>
      ),
      done: hasCategories,
      action: (
        <LinkButton
          href="/admin/stores"
          variant="outline"
          size="sm"
          className="rounded-xl"
        >
          <LayoutGrid className="size-4" /> Ir a Comercios
        </LinkButton>
      ),
    },
    {
      title: "Creá tu primera lista",
      description: hasProducts
        ? "Armá una lista desde el maestro con cantidades sugeridas."
        : "Disponible cuando hayas cargado productos.",
      done: false,
      action: hasProducts ? (
        <NewListButton currentList={null} size="default" />
      ) : (
        <span className="text-xs text-muted-foreground">
          Completá los pasos anteriores
        </span>
      ),
    },
  ];

  return (
    <Card tone="warm" className="mb-7 border-dashed">
      <CardContent className="p-6">
        <h2 className="font-display text-xl font-semibold tracking-tight">
          Configurá tu sistema
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Seguí estos pasos para empezar a armar listas de compras.
        </p>

        <ol className="mt-5 flex flex-col gap-4">
          {steps.map((step, i) => (
            <li key={i} className="flex items-start gap-3">
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full border text-sm font-medium",
                  step.done
                    ? "border-transparent bg-primary text-primary-foreground"
                    : "border-border/70 bg-card text-muted-foreground",
                )}
                aria-hidden
              >
                {step.done ? <Check className="size-4" /> : i + 1}
              </span>

              <div className="flex flex-1 flex-col gap-2 pt-0.5 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h3
                    className={cn(
                      "font-medium leading-snug",
                      step.done && "text-muted-foreground line-through",
                    )}
                  >
                    {step.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {step.description}
                  </p>
                </div>
                {!step.done && (
                  <div className="shrink-0 sm:pt-0.5">{step.action}</div>
                )}
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
