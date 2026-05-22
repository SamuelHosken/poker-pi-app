"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createEventFromForm } from "./actions";

export function NewEventForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [hasRebuy, setHasRebuy] = useState(true);

  async function handleSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        const result = await createEventFromForm(formData);
        toast.success("Evento criado com sucesso");
        router.push(`/admin/events/${result.id}`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro desconhecido");
      }
    });
  }

  return (
    <form action={handleSubmit} className="space-y-5">
      <Field id="name" label="Nome do evento">
        <Input
          id="name"
          name="name"
          required
          maxLength={100}
          className="h-12 bg-ink-2 text-paper"
        />
      </Field>

      <Field id="eventDate" label="Data e hora">
        <Input
          id="eventDate"
          name="eventDate"
          type="datetime-local"
          required
          className="h-12 bg-ink-2 text-paper"
        />
      </Field>

      <Field id="buyIn" label="Buy-in (R$)" hint="Valor de entrada por jogador">
        <Input
          id="buyIn"
          name="buyIn"
          type="number"
          step="0.01"
          min="0"
          required
          defaultValue="25"
          className="h-12 bg-ink-2 text-paper"
        />
      </Field>

      <fieldset className="space-y-4 rounded-lg border border-line bg-ink-2 p-4 sm:p-5">
        <label className="flex items-center gap-3 text-sm text-paper">
          <input
            type="checkbox"
            name="hasRebuy"
            checked={hasRebuy}
            onChange={(e) => setHasRebuy(e.target.checked)}
            className="h-4 w-4 accent-gold"
          />
          <span>Permitir rebuy</span>
        </label>

        {hasRebuy && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field id="rebuy" label="Valor (R$)">
              <Input
                id="rebuy"
                name="rebuy"
                type="number"
                step="0.01"
                min="0"
                defaultValue="45"
                className="h-12 bg-ink text-paper"
              />
            </Field>
            <Field id="rebuyLimit" label="Limite/jogador">
              <Input
                id="rebuyLimit"
                name="rebuyLimit"
                type="number"
                min="0"
                defaultValue="1"
                className="h-12 bg-ink text-paper"
              />
            </Field>
            <Field id="rebuyUntilLevel" label="Até o nível">
              <Input
                id="rebuyUntilLevel"
                name="rebuyUntilLevel"
                type="number"
                min="0"
                defaultValue="3"
                className="h-12 bg-ink text-paper"
              />
            </Field>
          </div>
        )}
      </fieldset>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field id="tableSize" label="Tamanho da mesa">
          <Input
            id="tableSize"
            name="tableSize"
            type="number"
            min="2"
            max="12"
            defaultValue="8"
            className="h-12 bg-ink-2 text-paper"
          />
        </Field>
        <Field id="numberOfTables" label="Mesas físicas">
          <Input
            id="numberOfTables"
            name="numberOfTables"
            type="number"
            min="1"
            max="10"
            defaultValue="2"
            className="h-12 bg-ink-2 text-paper"
          />
        </Field>
      </div>

      <Field id="blindTemplate" label="Estrutura de blinds">
        <select
          id="blindTemplate"
          name="blindTemplate"
          defaultValue="padrao"
          className="h-12 w-full rounded-md border border-line bg-ink-2 px-3 text-sm text-paper"
        >
          <option value="turbo">Turbo (~2h)</option>
          <option value="padrao">Padrão (~3h)</option>
          <option value="lento">Lento (~4-5h)</option>
        </select>
      </Field>

      <Button
        type="submit"
        disabled={pending}
        className="h-12 w-full bg-gold text-ink hover:bg-gold/90 disabled:opacity-50"
      >
        {pending ? "Criando…" : "Criar evento"}
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
