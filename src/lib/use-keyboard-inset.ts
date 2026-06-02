import { useSyncExternalStore } from "react";

export type KeyboardInset = {
  /** Alto del teclado virtual (px) que recorta la pantalla desde abajo. 0 si está cerrado. */
  bottom: number;
  /** Alto del área realmente visible (`visualViewport.height`) en px. */
  visibleHeight: number;
  /** `true` cuando el teclado está abierto. Umbral anti-jitter de 100px. */
  isOpen: boolean;
};

const CLOSED: KeyboardInset = { bottom: 0, visibleHeight: 0, isOpen: false };

// `useSyncExternalStore` compara el snapshot por referencia, así que cacheamos el
// último valor a nivel módulo y devolvemos el MISMO objeto mientras los tres
// campos no cambien. Si devolviéramos un objeto nuevo en cada lectura, React
// entraría en un loop de re-render.
let cached: KeyboardInset = CLOSED;

function subscribe(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const vv = window.visualViewport;
  if (!vv) return () => {};
  // `resize` cubre la apertura/cierre del teclado; `scroll` el reposicionamiento
  // del viewport visual en iOS al enfocar inputs; `orientationchange` la rotación.
  vv.addEventListener("resize", callback);
  vv.addEventListener("scroll", callback);
  window.addEventListener("orientationchange", callback);
  return () => {
    vv.removeEventListener("resize", callback);
    vv.removeEventListener("scroll", callback);
    window.removeEventListener("orientationchange", callback);
  };
}

function getSnapshot(): KeyboardInset {
  if (typeof window === "undefined") return CLOSED;
  const vv = window.visualViewport;
  const visibleHeight = vv?.height ?? window.innerHeight;
  // Restar `offsetTop` evita sobreestimar el teclado en iOS, donde el viewport
  // visual puede desplazarse hacia abajo además de achicarse.
  const offsetTop = vv?.offsetTop ?? 0;
  const bottom = Math.max(0, window.innerHeight - visibleHeight - offsetTop);
  const isOpen = bottom > 100;
  if (
    cached.bottom === bottom &&
    cached.visibleHeight === visibleHeight &&
    cached.isOpen === isOpen
  ) {
    return cached;
  }
  cached = { bottom, visibleHeight, isOpen };
  return cached;
}

/**
 * Sigue el teclado virtual vía `window.visualViewport`. Devuelve cuánto recorta
 * la pantalla desde abajo y el alto visible restante, para que los drawers se
 * ajusten a ese espacio en vez de quedar tapados por el teclado.
 *
 * Degrada limpio (todo en 0 / cerrado) en SSR y donde no haya `visualViewport`;
 * en esos navegadores (Chromium) el ajuste lo cubre `interactiveWidget:
 * "resizes-content"` del viewport de la app.
 */
export function useKeyboardInset(): KeyboardInset {
  return useSyncExternalStore(subscribe, getSnapshot, () => CLOSED);
}
