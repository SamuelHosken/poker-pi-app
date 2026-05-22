"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { forgotPasswordAction, type ForgotFormState } from "../login/actions";

export function ForgotForm() {
  const [state, formAction, pending] = useActionState<ForgotFormState, FormData>(
    forgotPasswordAction,
    null,
  );

  if (state?.ok) {
    return (
      <div className="space-y-3 rounded-md border border-gold/40 bg-gold/5 p-4 text-center">
        <p className="font-display text-lg text-gold">Link enviado</p>
        <p className="text-sm text-gray-soft">
          Se <span className="text-paper">{state.email}</span> tiver conta,
          chega um e-mail com link pra resetar.
        </p>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-mid">
          Confere também o spam.
        </p>
      </div>
    );
  }

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
        {pending ? "Enviando…" : "Enviar link"}
      </Button>
    </form>
  );
}
