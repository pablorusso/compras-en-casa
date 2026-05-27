import type { Metadata } from "next";

// Este layout cubre todo `/admin`, incluido `/admin/login`. Su única
// responsabilidad es declarar la metadata de la PWA: el manifest tiene
// `scope: "/admin"`, así que login y app instalada quedan dentro del scope
// (clave en iOS, donde el primer login ocurre dentro del WebView de la PWA).
// La autenticación y el chrome de navegación viven en el route group (app).
export const metadata: Metadata = {
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Compras",
  },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
