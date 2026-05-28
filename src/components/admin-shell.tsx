"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, LayoutGroup, useReducedMotion } from "framer-motion";
import {
  Home,
  ListChecks,
  Package,
  Settings as SettingsIcon,
  History as HistoryIcon,
  LogOut,
  Tags,
} from "lucide-react";
import { logoutAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import { LogoMark } from "@/components/illustrations";
import { PwaInstaller } from "@/components/pwa-installer";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: typeof Home;
  exact?: boolean;
};

const NAV: NavItem[] = [
  { href: "/admin", label: "Inicio", icon: Home, exact: true },
  { href: "/admin/list", label: "Lista", icon: ListChecks, exact: true },
  { href: "/admin/products", label: "Productos", icon: Package },
  { href: "/admin/stores", label: "Comercios", icon: Tags },
  { href: "/admin/history", label: "Histórico", icon: HistoryIcon },
];

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(href + "/");
}

function isSettingsActive(pathname: string) {
  return (
    pathname === "/admin/settings" ||
    pathname.startsWith("/admin/settings/") ||
    pathname === "/admin/import" ||
    pathname.startsWith("/admin/import/")
  );
}

function SettingsIconLink() {
  const pathname = usePathname();
  const active = isSettingsActive(pathname);
  return (
    <LinkButton
      href="/admin/settings"
      variant="ghost"
      size="icon"
      className={cn(
        "size-9",
        active
          ? "bg-accent/50 text-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-accent/40",
      )}
      aria-label="Ajustes"
      aria-current={active ? "page" : undefined}
    >
      <SettingsIcon className="size-4" />
    </LinkButton>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduced = useReducedMotion();

  return (
    <div className="flex min-h-svh flex-col md:flex-row">
      <aside className="hidden md:flex md:w-64 md:flex-col border-r border-border/60 bg-card/40 backdrop-blur-sm">
        <div className="px-6 py-6 flex items-center gap-2.5">
          <LogoMark className="size-9 shrink-0" />
          <span className="font-display text-lg font-semibold tracking-tight">
            Compras en Casa
          </span>
        </div>
        <LayoutGroup id="sidebar-nav">
          <nav className="flex flex-col gap-1 px-3">
            {NAV.map((item) => {
              const active = isActive(pathname, item.href, item.exact);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/30",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="sidebar-active"
                      className="absolute inset-0 -z-10 rounded-xl bg-accent/50 shadow-[inset_0_1px_0_oklch(1_0_0_/_0.5)]"
                      transition={
                        reduced
                          ? { duration: 0 }
                          : { type: "spring", stiffness: 380, damping: 30 }
                      }
                    />
                  )}
                  {active && (
                    <span
                      aria-hidden
                      className="absolute -left-3 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-primary"
                    />
                  )}
                  <Icon
                    className={cn(
                      "size-4 transition-colors",
                      active && "text-primary",
                    )}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </LayoutGroup>
      </aside>

      <div className="flex flex-1 flex-col min-w-0">
        <header
          className="sticky top-0 z-30 flex items-center gap-2 border-b border-border/60 bg-background/85 px-4 pb-2 backdrop-blur-md md:px-6"
          style={{ paddingTop: "calc(0.5rem + env(safe-area-inset-top))" }}
        >
          <Link
            href="/admin"
            className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight md:hidden"
          >
            <LogoMark className="size-7" />
            <span>Compras en Casa</span>
          </Link>
          <div className="ml-auto flex items-center gap-1">
            <PwaInstaller iconOnly className="text-muted-foreground hover:text-foreground" />
            <ThemeToggle />
            <SettingsIconLink />
            <form action={logoutAction}>
              <Button
                type="submit"
                variant="ghost"
                size="icon"
                className="size-9 text-muted-foreground hover:text-foreground"
                aria-label="Salir"
              >
                <LogOut className="size-4" />
              </Button>
            </form>
          </div>
        </header>

        <main className="flex-1 pb-[calc(78px+env(safe-area-inset-bottom))] md:pb-0">
          {children}
        </main>

        <LayoutGroup id="mobile-nav">
          <nav
            className="fixed bottom-0 inset-x-0 z-40 grid grid-cols-5 border-t border-border/60 bg-background/95 backdrop-blur-md md:hidden"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            {NAV.map((item) => {
              const active = isActive(pathname, item.href, item.exact);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  <span className="relative inline-flex items-center justify-center size-9">
                    {active && (
                      <motion.span
                        layoutId="mobile-nav-active"
                        className="absolute inset-0 rounded-full bg-accent/60 shadow-[inset_0_1px_0_oklch(1_0_0_/_0.4)]"
                        transition={
                          reduced
                            ? { duration: 0 }
                            : { type: "spring", stiffness: 380, damping: 28 }
                        }
                      />
                    )}
                    <motion.span
                      whileTap={reduced ? undefined : { scale: 0.88 }}
                      className="relative z-10 inline-flex"
                    >
                      <Icon
                        className={cn(
                          "size-5 transition-transform",
                          active && "scale-110",
                        )}
                      />
                    </motion.span>
                  </span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </LayoutGroup>
      </div>
    </div>
  );
}
