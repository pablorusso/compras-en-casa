import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isLoggedIn } from "@/lib/session";
import { isFirstRun } from "@/actions/auth";
import { LoginForm } from "@/components/login-form";
import { BlobBackground, HeroBasket } from "@/components/illustrations";
import { PwaInstaller } from "@/components/pwa-installer";

export const metadata: Metadata = {
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Compras",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export default async function LoginPage() {
  if (await isLoggedIn()) redirect("/admin");
  const firstRun = await isFirstRun();
  return (
    <main className="relative isolate flex flex-1 items-center justify-center px-6 py-12 overflow-hidden">
      <BlobBackground />
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center gap-4 text-center mb-8">
          <HeroBasket className="w-40 h-32 md:w-48 md:h-40 drop-shadow-[0_18px_24px_oklch(0.265_0.020_155/0.18)]" />
          <div className="space-y-2">
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-primary">
              Mercado en familia
            </p>
            <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight leading-[1.05]">
              Compras en Casa
            </h1>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              {firstRun
                ? "Bienvenido. Definí el password de administración para empezar."
                : "Ingresá el password para administrar la lista."}
            </p>
          </div>
        </div>
        <div className="rounded-3xl border border-border/70 bg-card/80 backdrop-blur-sm shadow-soft p-6 md:p-7">
          <LoginForm firstRun={firstRun} />
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Hecho con cariño para coordinar la compra semanal.
        </p>
        <div className="mt-4 flex justify-center">
          <PwaInstaller className="text-muted-foreground hover:text-foreground" />
        </div>
      </div>
    </main>
  );
}
