"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import { useState } from "react";
import { loginAction, type AuthState } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function SubmitButton({ firstRun }: { firstRun: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="tomato"
      size="lg"
      className="w-full rounded-2xl shadow-soft"
      disabled={pending}
    >
      {pending ? "Entrando…" : firstRun ? "Crear password y entrar" : "Entrar"}
    </Button>
  );
}

export function LoginForm({ firstRun }: { firstRun: boolean }) {
  const [state, formAction] = useActionState<AuthState, FormData>(loginAction, {});
  const [showPwd, setShowPwd] = useState(false);
  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="password" className="text-sm font-medium">
          {firstRun ? "Nuevo password" : "Password"}
        </Label>
        <div className="relative">
          <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-primary" />
          <Input
            id="password"
            name="password"
            type={showPwd ? "text" : "password"}
            autoComplete={firstRun ? "new-password" : "current-password"}
            autoFocus
            required
            minLength={firstRun ? 6 : 1}
            className="pl-11 pr-11 h-12 text-base"
            placeholder={firstRun ? "Mínimo 6 caracteres" : "•••••••"}
          />
          <button
            type="button"
            onClick={() => setShowPwd((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
            aria-label={showPwd ? "Ocultar" : "Mostrar"}
          >
            {showPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>
      {state.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}
      <SubmitButton firstRun={firstRun} />
    </form>
  );
}
