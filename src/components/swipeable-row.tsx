"use client";

import { type ReactNode, useRef, useState } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { Trash2 } from "lucide-react";

// Ancho del panel de acciones de cantidad que queda abierto al swipe derecho.
const OPEN_OFFSET = 96;
// Mínimo arrastre a la derecha para que quede abierto al soltar.
const OPEN_THRESHOLD = 48;
// Arrastre a la izquierda (px) que dispara el borrado al soltar.
const DELETE_THRESHOLD = 120;

const SPRING = { type: "spring", stiffness: 500, damping: 40 } as const;

/**
 * Fila con gestos de swipe (solo cuando `enabled`):
 * - Arrastrar a la derecha revela `quantityActions` a la izquierda (lado del
 *   número), persistentes y tocables.
 * - Arrastrar a la izquierda revela "Borrar" a la derecha; pasado el umbral,
 *   dispara `onDelete`.
 * Con `enabled` en `false` renderiza el contenido tal cual (camino escritorio).
 */
export function SwipeableRow({
  enabled,
  onDelete,
  quantityActions,
  children,
}: {
  enabled: boolean;
  onDelete: () => void;
  quantityActions: ReactNode;
  children: ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const [open, setOpen] = useState(false);

  const deleteOpacity = useTransform(x, [-DELETE_THRESHOLD, 0], [1, 0.6]);

  if (!enabled) {
    return <>{children}</>;
  }

  function close() {
    animate(x, 0, SPRING);
    setOpen(false);
  }

  function handleDragEnd() {
    const offset = x.get();
    const width = containerRef.current?.offsetWidth ?? 320;
    const deleteThreshold = Math.min(DELETE_THRESHOLD, width * 0.4);

    if (offset < -deleteThreshold) {
      animate(x, -width, { type: "tween", duration: 0.2, onComplete: onDelete });
      return;
    }
    if (offset > OPEN_THRESHOLD) {
      animate(x, OPEN_OFFSET, SPRING);
      setOpen(true);
      return;
    }
    close();
  }

  return (
    <div ref={containerRef} className="relative overflow-hidden rounded-2xl">
      {/* Fondo de borrado: se revela al arrastrar a la izquierda */}
      <motion.div
        aria-hidden
        style={{ opacity: deleteOpacity }}
        className="absolute inset-y-0 left-0 right-0 flex items-center justify-end bg-destructive px-4 text-destructive-foreground"
      >
        <span className="mr-2 font-medium">Borrar</span>
        <Trash2 className="size-5 shrink-0" />
      </motion.div>

      {/* Acciones de cantidad: se revelan al arrastrar a la derecha
          (encima del fondo de borrado, sobre el lado izquierdo) */}
      <div
        className="absolute inset-y-0 left-0 flex items-center justify-start gap-1 pl-1"
        style={{ width: OPEN_OFFSET }}
      >
        {quantityActions}
      </div>

      {/* Primer plano arrastrable */}
      <motion.div
        drag="x"
        style={{ x }}
        dragConstraints={{ left: -600, right: OPEN_OFFSET }}
        dragElastic={{ left: 0.6, right: 0.04 }}
        dragDirectionLock
        onDragEnd={handleDragEnd}
        onClickCapture={(e) => {
          // Si está abierto, el primer tap solo cierra (no activa lo de adentro).
          if (open) {
            e.preventDefault();
            e.stopPropagation();
            close();
          }
        }}
        className="relative"
      >
        {children}
      </motion.div>
    </div>
  );
}
