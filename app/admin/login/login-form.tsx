"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAction, type LoginFormState } from "./actions";

export function LoginForm() {
  const [state, formAction, pending] = useActionState<LoginFormState, FormData>(
    loginAction,
    null,
  );

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="email" className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-soft">
          E-mail
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="h-12 bg-ink-2 text-paper"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password" className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-soft">
          Senha
        </Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="h-12 bg-ink-2 text-paper"
        />
      </div>

      {state?.ok === false && (
        <p
          role="alert"
          className="rounded-md border border-red-poker/40 bg-red-poker/10 px-3 py-2 text-sm text-red-poker"
        >
          {state.error}
        </p>
      )}

      <Button
        type="submit"
        disabled={pending}
        className="h-12 w-full bg-gold text-ink hover:bg-gold/90 disabled:opacity-50"
      >
        {pending ? "Entrando…" : "Entrar"}
      </Button>
    </form>
  );
}
