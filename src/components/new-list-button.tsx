"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Sparkles, ListChecks, CopyPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { cloneListAction, createListFromMasterAction } from "@/actions/lists";

type Props = {
  currentList: { id: number; name: string } | null;
  variant?: "tomato" | "outline" | "default";
  size?: "default" | "lg";
  className?: string;
  label?: string;
  /** Si es true, en mobile esconde label y chevron mostrando solo el ícono. */
  iconOnlyOnMobile?: boolean;
};

export function NewListButton({
  currentList,
  variant = "tomato",
  size = "lg",
  className,
  label = "Nueva lista",
  iconOnlyOnMobile = false,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function confirmIfNeeded(): boolean {
    if (!currentList) return true;
    return confirm(
      `Esto va a archivar la lista vigente "${currentList.name}" y su link compartible se eliminará. ¿Continuar?`,
    );
  }

  function createFromMaster() {
    if (!confirmIfNeeded()) return;
    startTransition(async () => {
      try {
        await createListFromMasterAction();
        toast.success("Nueva lista lista para editar");
        router.push("/admin/list");
        router.refresh();
      } catch (err) {
        toast.error((err as Error).message);
      }
    });
  }

  function cloneCurrent() {
    if (!currentList) return;
    if (!confirmIfNeeded()) return;
    const fd = new FormData();
    fd.set("sourceListId", String(currentList.id));
    startTransition(async () => {
      try {
        await cloneListAction(fd);
        toast.success("Lista clonada");
        router.push("/admin/list");
        router.refresh();
      } catch (err) {
        toast.error((err as Error).message);
      }
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant={variant}
            size={size}
            disabled={pending}
            aria-label={iconOnlyOnMobile ? label : undefined}
            className={cn(
              "rounded-2xl gap-1.5",
              iconOnlyOnMobile && "max-md:size-10 max-md:p-0",
              className,
            )}
          >
            <Sparkles className="size-4" />
            <span className={cn(iconOnlyOnMobile && "hidden md:inline")}>{label}</span>
            <ChevronDown
              className={cn("size-4 opacity-80", iconOnlyOnMobile && "hidden md:inline-block")}
            />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuItem onClick={createFromMaster} disabled={pending}>
          <ListChecks className="size-4 text-primary" />
          <div className="flex flex-col">
            <span>Desde el maestro</span>
            <span className="text-[11px] text-muted-foreground">
              Productos en temporada con cantidades sugeridas
            </span>
          </div>
        </DropdownMenuItem>
        {currentList && (
          <DropdownMenuItem onClick={cloneCurrent} disabled={pending}>
            <CopyPlus className="size-4 text-primary" />
            <div className="flex flex-col">
              <span>Clonar la lista vigente</span>
              <span className="text-[11px] text-muted-foreground">
                Misma lista, vuelta a empezar
              </span>
            </div>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
