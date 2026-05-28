"use client";

import { type ReactNode, useRef, useState } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";

// Ancho del panel de acciones de cantidad que queda abierto al swipe derecho.
const OPEN_OFFSET = 96;
// Mínimo arrastre a la derecha para que el panel de cantidad quede abierto al soltar.
const OPEN_THRESHOLD = 48;
// Arrastre a la izquierda (px) que dispara la acción al soltar.
const SWIPE_THRESHOLD = 120;

const SPRING = { type: "spring", stiffness: 500, damping: 40 } as const;

export type SwipeAction = {
  label: string;
  icon: ReactNode;
  // Clases de fondo + texto del panel revelado (ej. "bg-destructive text-destructive-foreground").
  className: string;
  onTrigger: () => void;
};

/**
 * Fila con gestos de swipe (solo cuando `enabled`):
 * - Arrastrar a la izquierda revela `action` (borrar o agregar según el uso)
 *   sobre el borde derecho; pasado el umbral, dispara `action.onTrigger`.
 * - Si se pasan `quantityActions`, arrastrar a la derecha las revela a la
 *   izquierda (lado del número), persistentes y tocables.
 * - Como alternativa a `quantityActions`, `rightAction` reusa el lado derecho
 *   como un segundo gatillo simétrico al izquierdo (no persistente). Útil para
 *   filas excluidas: izquierda = agregar, derecha = borrar del maestro.
 *   `rightAction` y `quantityActions` son mutuamente excluyentes.
 * Con `enabled` en `false` renderiza el contenido tal cual (camino escritorio).
 */
export function SwipeableRow({
  enabled,
  action,
  rightAction,
  quantityActions,
  children,
}: {
  enabled: boolean;
  action: SwipeAction;
  rightAction?: SwipeAction;
  quantityActions?: ReactNode;
  children: ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const [open, setOpen] = useState(false);
  const hasQuantityActions = quantityActions != null;
  const hasRightAction = rightAction != null && !hasQuantityActions;

  const actionOpacity = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0]);
  const quantityOpacity = useTransform(x, [0, OPEN_THRESHOLD], [0, 1]);
  const rightActionOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1]);

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
    const threshold = Math.min(SWIPE_THRESHOLD, width * 0.4);

    if (offset < -threshold) {
      animate(x, -width, { type: "tween", duration: 0.2, onComplete: action.onTrigger });
      return;
    }
    if (hasRightAction && offset > threshold) {
      // Para no dejar la fila "volada" si el handler abre un dialog (cancelar
      // debería restaurar la posición), volvemos a 0 y disparamos el trigger.
      animate(x, 0, SPRING);
      rightAction!.onTrigger();
      return;
    }
    if (hasQuantityActions && offset > OPEN_THRESHOLD) {
      animate(x, OPEN_OFFSET, SPRING);
      setOpen(true);
      return;
    }
    close();
  }

  return (
    <div ref={containerRef} className="relative overflow-hidden rounded-2xl">
      {/* Fondo de la acción: se revela al arrastrar a la izquierda */}
      <motion.div
        aria-hidden
        style={{ opacity: actionOpacity }}
        className={`absolute inset-y-0 left-0 right-0 flex items-center justify-end px-4 ${action.className}`}
      >
        <span className="mr-2 font-medium">{action.label}</span>
        {action.icon}
      </motion.div>

      {/* Swipe derecho (cambiar cantidad): fondo verde + acciones, sobre el
          borde izquierdo. */}
      {hasQuantityActions && (
        <>
          <motion.div
            aria-hidden
            style={{ opacity: quantityOpacity }}
            className="absolute inset-y-0 left-0 right-0 bg-primary"
          />
          <div
            className="absolute inset-y-0 left-0 flex items-center justify-start gap-1 pl-1"
            style={{ width: OPEN_OFFSET }}
          >
            {quantityActions}
          </div>
        </>
      )}

      {/* Swipe derecho (acción simétrica): se revela al arrastrar a la derecha,
          espejado del fondo de `action`. */}
      {hasRightAction && (
        <motion.div
          aria-hidden
          style={{ opacity: rightActionOpacity }}
          className={`absolute inset-y-0 left-0 right-0 flex items-center justify-start px-4 ${rightAction!.className}`}
        >
          {rightAction!.icon}
          <span className="ml-2 font-medium">{rightAction!.label}</span>
        </motion.div>
      )}

      {/* Primer plano arrastrable */}
      <motion.div
        drag="x"
        style={{ x }}
        dragConstraints={{
          left: -600,
          right: hasQuantityActions ? OPEN_OFFSET : hasRightAction ? 600 : 0,
        }}
        dragElastic={{
          left: 0.6,
          right: hasQuantityActions ? 0.04 : hasRightAction ? 0.6 : 0,
        }}
        dragDirectionLock
        onDragEnd={handleDragEnd}
        onClickCapture={(e) => {
          // Si el panel de cantidad está abierto, el primer tap solo cierra.
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
