"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAction, type LoginFormState } from "./actions";

const REMEMBER_KEY = "pokerpi.rememberedEmail";

export function LoginForm() {
  const [state, formAction, pending] = useActionState<LoginFormState, FormData>(
    loginAction,
    null,
  );
  const [email, setEmail] = useState("");
  const [remember, setRemember] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Carrega email lembrado do localStorage no mount. setState dentro de effect
  // é o padrão pra ler client-only storage sem mismatch de hidratação SSR.
  useEffect(() => {
    const saved = localStorage.getItem(REMEMBER_KEY);
    if (saved) {
      setEmail(saved);
      setRemember(true);
    }
    setHydrated(true);
  }, []);

  // Salva/limpa quando o usuário troca o estado do checkbox ou edita o email
  useEffect(() => {
    if (!hydrated) return;
    if (remember && email) {
      localStorage.setItem(REMEMBER_KEY, email);
    } else if (!remember) {
      localStorage.removeItem(REMEMBER_KEY);
    }
  }, [remember, email, hydrated]);

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <Label
          htmlFor="email"
          className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-soft"
        >
          E-mail
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-12 bg-ink text-paper"
        />
      </div>

      <div className="space-y-2">
        <Label
          htmlFor="password"
          className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-soft"
        >
          Senha
        </Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="h-12 bg-ink text-paper"
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        <label className="flex items-center gap-2.5 select-none cursor-pointer">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="size-4 accent-gold"
          />
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-gray-soft">
            Manter conectado
          </span>
        </label>
        <a
          href="/admin/forgot-password"
          className="font-mono text-[11px] uppercase tracking-[0.18em] text-gold hover:text-paper"
        >
          Esqueci
        </a>
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
