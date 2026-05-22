"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetPasswordAction, type ResetFormState } from "../login/actions";

export function ResetForm() {
  const [state, formAction, pending] = useActionState<ResetFormState, FormData>(
    resetPasswordAction,
    null,
  );

  if (state?.ok) {
    return (
      <div className="space-y-4 rounded-md border border-gold/40 bg-gold/5 p-4 text-center">
        <p className="font-display text-lg text-gold">Senha atualizada</p>
        <p className="text-sm text-gray-soft">
          Já dá pra entrar com a nova senha.
        </p>
        <Link
          href="/admin/login"
          className="inline-flex h-11 items-center rounded-md bg-gold px-5 text-sm font-medium text-ink hover:bg-gold/90"
        >
          Entrar
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <Label
          htmlFor="password"
          className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-soft"
        >
          Nova senha
        </Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={6}
          required
          className="h-12 bg-ink text-paper"
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
        {pending ? "Salvando…" : "Salvar senha"}
      </Button>
    </form>
  );
}
