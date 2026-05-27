"use client";

import { motion } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { useHasMounted } from "@/lib/use-has-mounted";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const mounted = useHasMounted();
  if (!mounted)
    return <Button variant="ghost" size="icon" className="size-9" aria-label="Tema" />;
  const isDark = (theme === "system" ? resolvedTheme : theme) === "dark";
  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-9 hover:bg-accent/40"
      aria-label={isDark ? "Modo claro" : "Modo oscuro"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      <motion.span
        key={isDark ? "sun" : "moon"}
        initial={{ rotate: -90, opacity: 0 }}
        animate={{ rotate: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 280, damping: 20 }}
        className="inline-flex"
      >
        {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
      </motion.span>
    </Button>
  );
}
