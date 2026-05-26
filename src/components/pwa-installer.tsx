"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Download, Share, Plus } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isIOSSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua);
  // Excluir webviews / Chrome iOS — sólo Safari real soporta "Agregar a pantalla de inicio"
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  return iOS && isSafari;
}

function isStandaloneNow(): boolean {
  if (typeof window === "undefined") return false;
  const mql = window.matchMedia("(display-mode: standalone)").matches;
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return mql || iosStandalone;
}

function subscribeStandalone(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const mql = window.matchMedia("(display-mode: standalone)");
  mql.addEventListener("change", callback);
  window.addEventListener("appinstalled", callback);
  return () => {
    mql.removeEventListener("change", callback);
    window.removeEventListener("appinstalled", callback);
  };
}

const ssrFalse = () => false;

function useIsStandalone(): boolean {
  return useSyncExternalStore(subscribeStandalone, isStandaloneNow, ssrFalse);
}

function useIsIOSSafari(): boolean {
  // El UA no cambia; useSyncExternalStore con un subscribe no-op nos da hidratación segura sin setState-in-effect.
  return useSyncExternalStore(() => () => {}, isIOSSafari, ssrFalse);
}

export function PwaInstaller({
  className,
  iconOnly = false,
}: {
  className?: string;
  iconOnly?: boolean;
}) {
  const installed = useIsStandalone();
  const ios = useIsIOSSafari();
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const swRegistered = useRef(false);

  useEffect(() => {
    if (installed) return;
    if (!swRegistered.current && "serviceWorker" in navigator) {
      swRegistered.current = true;
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch(() => {
          // silencioso: el SW es nice-to-have, no rompe la app si falla
        });
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstallPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [installed]);

  if (installed) return null;

  // Android / Chromium desktop: prompt nativo disponible
  if (installPrompt) {
    return (
      <Button
        type="button"
        variant="ghost"
        size={iconOnly ? "icon" : "sm"}
        aria-label={iconOnly ? "Instalar app" : undefined}
        className={cn(iconOnly ? "size-9" : "gap-2", className)}
        onClick={async () => {
          await installPrompt.prompt();
          const { outcome } = await installPrompt.userChoice;
          if (outcome === "accepted") setInstallPrompt(null);
        }}
      >
        <Download className="size-4" />
        {!iconOnly && <span>Instalar app</span>}
      </Button>
    );
  }

  // iOS Safari: no hay prompt nativo — instrucciones manuales en un popover
  if (ios) {
    return (
      <Popover>
        <PopoverTrigger
          aria-label={iconOnly ? "Instalar app" : undefined}
          className={cn(
            buttonVariants({ variant: "ghost", size: iconOnly ? "icon" : "sm" }),
            iconOnly ? "size-9" : "gap-2",
            className,
          )}
        >
          <Download className="size-4" />
          {!iconOnly && <span>Instalar app</span>}
        </PopoverTrigger>
        <PopoverContent className="w-72 text-sm">
          <p className="font-medium mb-2">Instalar en iPhone / iPad</p>
          <ol className="space-y-1.5 text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="font-medium text-foreground">1.</span>
              <span>
                Tocá el botón <Share className="inline size-4 align-text-bottom" /> Compartir
                en la barra de Safari.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-medium text-foreground">2.</span>
              <span>
                Elegí <Plus className="inline size-4 align-text-bottom" /> &ldquo;Agregar a pantalla de inicio&rdquo;.
              </span>
            </li>
          </ol>
        </PopoverContent>
      </Popover>
    );
  }

  return null;
}
