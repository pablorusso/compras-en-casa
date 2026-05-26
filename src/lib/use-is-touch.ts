import { useSyncExternalStore } from "react";

const QUERY = "(pointer: coarse)";

function subscribe(callback: () => void): () => void {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function getSnapshot(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia(QUERY).matches;
}

/**
 * `true` en dispositivos de puntero grueso (touch). Devuelve `false` en SSR y
 * hasta el primer montaje, por lo que el render inicial corresponde a escritorio
 * (botones visibles) y luego conmuta a swipe en móvil sin mismatch de hidratación.
 */
export function useIsTouch(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
