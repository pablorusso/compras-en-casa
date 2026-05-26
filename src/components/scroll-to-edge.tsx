"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Flecha flotante translúcida para saltar al inicio o al final de la página de un toque.
 * Aparece tras scrollear un poco y alterna su dirección según en qué mitad de la página
 * estés: en la mitad superior baja, en la inferior sube. Pensada para listas largas en mobile.
 */
export function ScrollToEdge() {
  const [visible, setVisible] = useState(false);
  const [goingUp, setGoingUp] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    function onScroll() {
      const scrollY = window.scrollY;
      const viewport = window.innerHeight;
      const full = document.documentElement.scrollHeight;
      setVisible(full - viewport > 200 && scrollY > 200);
      // Si pasaste la mitad del scroll disponible, la próxima acción es subir.
      setGoingUp(scrollY > (full - viewport) / 2);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  function jump() {
    const behavior: ScrollBehavior = reduced ? "auto" : "smooth";
    window.scrollTo({
      top: goingUp ? 0 : document.documentElement.scrollHeight,
      behavior,
    });
  }

  const Icon = goingUp ? ChevronUp : ChevronDown;

  return (
    <button
      type="button"
      onClick={jump}
      aria-label={goingUp ? "Ir al inicio" : "Ir al final"}
      title={goingUp ? "Ir al inicio" : "Ir al final"}
      className={cn(
        "fixed bottom-5 right-4 z-40 flex size-11 items-center justify-center rounded-full border border-border/70 bg-card/70 text-foreground shadow-soft backdrop-blur transition-all duration-200 hover:bg-card active:scale-95",
        visible ? "opacity-80 hover:opacity-100" : "pointer-events-none opacity-0",
      )}
    >
      <Icon className="size-5" />
    </button>
  );
}
