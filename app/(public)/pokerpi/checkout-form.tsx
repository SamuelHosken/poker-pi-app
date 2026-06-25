"use client";
import { useMemo, useState } from "react";
import { createTicketOrder } from "@/lib/tickets/orders";
import type { TicketType, OrderInput } from "@/lib/tickets/types";
import { isValidCpf } from "@/lib/tickets/cpf";
import { PhoneInput } from "@/app/(public)/inscrever/phone-input";
import { TicketCards } from "./ticket-cards";

/** Formata dígitos de CPF como 000.000.000-00 enquanto digita. */
function formatCpf(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 11);
  if (d.length > 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  if (d.length > 6) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  if (d.length > 3) return `${d.slice(0, 3)}.${d.slice(3)}`;
  return d;
}

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

export function CheckoutForm({ types, soldOut }: { types: TicketType[]; soldOut: boolean }) {
  const [selectedId, setSelectedId] = useState<string | null>(types[0]?.id ?? null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState({ e164: "", valid: false });
  const [cpf, setCpf] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);
  const [errorField, setErrorField] = useState<keyof OrderInput | null>(null);
  const [loading, setLoading] = useState(false);

  const valid = useMemo(
    () => ({
      name: name.trim().length >= 2,
      email: isEmail(email),
      phone: phone.valid,
      cpf: isValidCpf(cpf),
    }),
    [name, email, phone, cpf],
  );
  const allValid = valid.name && valid.email && valid.phone && valid.cpf && !!selectedId;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId || !allValid) return;
    setLoading(true);
    setServerError(null);
    setErrorField(null);
    const res = await createTicketOrder({
      ticketTypeId: selectedId,
      name: name.trim(),
      email: email.trim(),
      phone: phone.e164,
      cpf,
    });
    if (res.ok) {
      window.location.href = res.invoiceUrl;
    } else {
      setServerError(res.error);
      setErrorField(res.field ?? null);
      setLoading(false);
    }
  }

  if (soldOut) {
    return (
      <p className="rounded-xl border border-line bg-ink-2 p-4 text-center text-gold">
        Ingressos esgotados.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <TicketCards types={types} selectedId={selectedId} onSelect={setSelectedId} />

      <Field label="Nome completo" hint={name && !valid.name ? "Digite seu nome completo." : undefined}>
        <input
          type="text"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Como está no seu documento"
          className={inputCls(errorField === "name" || (!!name && !valid.name))}
        />
      </Field>

      <Field label="E-mail" hint={email && !valid.email ? "E-mail inválido." : "O ingresso vai pra esse e-mail."}>
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="voce@email.com"
          className={inputCls(errorField === "email" || (!!email && !valid.email))}
        />
      </Field>

      <Field label="Telefone / WhatsApp">
        <PhoneInput
          invalid={errorField === "phone"}
          onChange={(v) => setPhone({ e164: v.e164, valid: v.valid })}
        />
      </Field>

      <Field label="CPF" hint={cpf && !valid.cpf ? "CPF inválido." : undefined}>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={cpf}
          onChange={(e) => setCpf(formatCpf(e.target.value))}
          placeholder="000.000.000-00"
          maxLength={14}
          className={inputCls(errorField === "cpf" || (!!cpf && !valid.cpf))}
        />
      </Field>

      {serverError && <p className="text-sm text-red-poker">{serverError}</p>}

      <button
        type="submit"
        disabled={loading || !allValid}
        className="w-full rounded-full bg-gold px-6 py-3.5 font-bold text-ink transition disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Gerando pagamento…" : "Garantir meu ingresso"}
      </button>
      <p className="text-center text-xs text-gray-soft">
        Pagamento via PIX ou cartão (Asaas). Você recebe o ingresso com QR na hora.
      </p>
    </form>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium uppercase tracking-wide text-gray-soft">{label}</span>
      {children}
      {hint && <span className="block text-xs text-gray-mid">{hint}</span>}
    </label>
  );
}

function inputCls(invalid: boolean): string {
  return [
    "w-full rounded-xl border bg-ink-2/60 px-4 py-3.5 text-base text-paper placeholder:text-gray-mid transition-colors focus:outline-none focus:ring-1",
    invalid
      ? "border-red-poker/70 focus:border-red-poker focus:ring-red-poker/40"
      : "border-line focus:border-gold focus:ring-gold/40",
  ].join(" ");
}
