"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createProfile } from "@/lib/tournament/profiles";

export function NewProfileForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [isAdmin, setIsAdmin] = useState(false);

  async function handleSubmit(formData: FormData) {
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const name = String(formData.get("name") ?? "").trim();
    const nickname = String(formData.get("nickname") ?? "").trim() || null;

    if (!email || !password || !name) {
      toast.error("Preencha e-mail, senha e nome");
      return;
    }

    startTransition(async () => {
      try {
        await createProfile({
          email,
          password,
          name,
          nickname,
          isAdmin,
        });
        toast.success(`${name} cadastrado`);
        router.push("/admin/profiles");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro desconhecido");
      }
    });
  }

  return (
    <form action={handleSubmit} className="space-y-5">
      <Field id="email" label="E-mail" hint="Será o login da pessoa">
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="off"
          className="h-12 bg-ink-2 text-paper"
        />
      </Field>

      <Field id="password" label="Senha inicial" hint="Mínimo 6 caracteres">
        <Input
          id="password"
          name="password"
          type="text"
          required
          minLength={6}
          autoComplete="off"
          className="h-12 bg-ink-2 text-paper"
        />
      </Field>

      <Field id="name" label="Nome">
        <Input
          id="name"
          name="name"
          required
          maxLength={100}
          className="h-12 bg-ink-2 text-paper"
        />
      </Field>

      <Field id="nickname" label="Apelido (opcional)">
        <Input
          id="nickname"
          name="nickname"
          maxLength={50}
          className="h-12 bg-ink-2 text-paper"
        />
      </Field>

      <label className="flex items-center gap-3 rounded-lg border border-line bg-ink-2 px-4 py-3">
        <input
          type="checkbox"
          checked={isAdmin}
          onChange={(e) => setIsAdmin(e.target.checked)}
          className="h-4 w-4 accent-gold"
        />
        <div>
          <div className="text-sm text-paper">Esta pessoa é administrador?</div>
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-mid">
            Admins acessam /admin e gerenciam eventos
          </div>
        </div>
      </label>

      <Button
        type="submit"
        disabled={pending}
        className="h-12 w-full bg-gold text-ink hover:bg-gold/90 disabled:opacity-50"
      >
        {pending ? "Cadastrando…" : "Cadastrar"}
      </Button>
    </form>
  );
}

function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label
        htmlFor={id}
        className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-soft"
      >
        {label}
      </Label>
      {children}
      {hint && <p className="text-xs text-gray-mid">{hint}</p>}
    </div>
  );
}
