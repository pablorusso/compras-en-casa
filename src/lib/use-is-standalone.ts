import { useSyncExternalStore } from "react";

const QUERY = "(display-mode: standalone)";

export function isStandaloneNow(): boolean {
  if (typeof window === "undefined") return false;
  const mql = window.matchMedia(QUERY).matches;
  const iosStandalone =
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return mql || iosStandalone;
}

function subscribe(callback: () => void): () => void {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", callback);
  window.addEventListener("appinstalled", callback);
  return () => {
    mql.removeEventListener("change", callback);
    window.removeEventListener("appinstalled", callback);
  };
}

/**
 * `true` cuando la app corre como PWA instalada (display-mode standalone o
 * `navigator.standalone` en iOS). Devuelve `false` en SSR y hasta el primer
 * montaje para evitar mismatch de hidratación.
 */
export function useIsStandalone(): boolean {
  return useSyncExternalStore(subscribe, isStandaloneNow, () => false);
}
