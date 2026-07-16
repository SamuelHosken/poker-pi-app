"use client";
import { useMemo, useState } from "react";
import { createTicketOrder } from "@/lib/tickets/orders";
import type { TicketType, OrderInput } from "@/lib/tickets/types";
import { isValidCpf } from "@/lib/tickets/cpf";
import { installmentOptions, type PaymentMethod } from "@/lib/tickets/pricing";
import { getAttribution, getSessionId, trackOnce } from "@/lib/analytics/client";
import { PhoneInputCream } from "./phone-input-cream";
import { TicketCards } from "./ticket-cards";

function formatCpf(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 11);
  if (d.length > 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  if (d.length > 6) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  if (d.length > 3) return `${d.slice(0, 3)}.${d.slice(3)}`;
  return d;
}

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
const brl = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function CheckoutForm({ types, soldOut, eventId }: { types: TicketType[]; soldOut: boolean; eventId: string }) {
  const [selectedId, setSelectedId] = useState<string | null>(types[0]?.id ?? null);
  const [method, setMethod] = useState<PaymentMethod>("PIX");
  const [installments, setInstallments] = useState(1);

  const selectedPlan = useMemo(() => types.find((t) => t.id === selectedId) ?? null, [types, selectedId]);
  const options = useMemo(() => (selectedPlan ? installmentOptions(selectedPlan.priceCents) : []), [selectedPlan]);
  const chosen = options.find((o) => o.installments === installments) ?? options[0];
  const totalCents = method === "PIX" ? (selectedPlan?.priceCents ?? 0) : (chosen?.totalCents ?? 0);

  function handleSelect(id: string) {
    setSelectedId(id);
    const plan = types.find((t) => t.id === id)?.name;
    trackOnce(`plan:${eventId}:${id}`, "plan_select", { plan: plan ?? undefined, eventId });
  }
  function markStart() {
    trackOnce(`checkout:${eventId}`, "checkout_start", { eventId });
  }
  function pickMethod(m: PaymentMethod) {
    markStart();
    setMethod(m);
    if (m === "PIX") setInstallments(1);
  }

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
    const attr = getAttribution();
    const res = await createTicketOrder(
      {
        ticketTypeId: selectedId,
        name: name.trim(),
        email: email.trim(),
        phone: phone.e164,
        cpf,
        method,
        installments: method === "CREDIT_CARD" ? installments : 1,
      },
      { sessionId: getSessionId(), source: attr.ref ?? attr.utmSource ?? null },
    );
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
      <p className="rounded-2xl border-2 border-ink-warm bg-cream-2 p-6 text-center font-condensed text-2xl font-bold uppercase text-ink-warm">
        Ingressos esgotados
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <TicketCards types={types} selectedId={selectedId} onSelect={handleSelect} />

      <div className="grid gap-4 rounded-3xl border border-cream-3 bg-cream p-6 shadow-[0_18px_44px_-22px_rgba(0,0,0,0.6)]">
        <Field label="Nome completo" hint={name && !valid.name ? "Digite seu nome completo." : undefined}>
          <input
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => { markStart(); setName(e.target.value); }}
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
            onChange={(e) => { markStart(); setEmail(e.target.value); }}
            placeholder="voce@email.com"
            className={inputCls(errorField === "email" || (!!email && !valid.email))}
          />
        </Field>

        <Field label="Telefone / WhatsApp">
          <PhoneInputCream invalid={errorField === "phone"} onChange={(v) => { markStart(); setPhone({ e164: v.e164, valid: v.valid }); }} />
        </Field>

        <Field label="CPF" hint={cpf && !valid.cpf ? "CPF inválido." : undefined}>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={cpf}
            onChange={(e) => { markStart(); setCpf(formatCpf(e.target.value)); }}
            placeholder="000.000.000-00"
            maxLength={14}
            className={inputCls(errorField === "cpf" || (!!cpf && !valid.cpf))}
          />
        </Field>

        {/* Forma de pagamento */}
        <div className="space-y-3 border-t border-cream-3 pt-4">
          <span className="font-condensed text-sm font-bold uppercase tracking-[0.12em] text-ink-warm">Forma de pagamento</span>
          <div className="grid grid-cols-2 gap-3">
            <MethodButton
              active={method === "PIX"}
              onClick={() => pickMethod("PIX")}
              title="PIX"
              sub="à vista · sem acréscimo"
            />
            <MethodButton
              active={method === "CREDIT_CARD"}
              onClick={() => pickMethod("CREDIT_CARD")}
              title="Cartão"
              sub="em até 6x"
            />
          </div>

          {method === "CREDIT_CARD" && (
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-2">
                {options.map((o) => (
                  <button
                    key={o.installments}
                    type="button"
                    onClick={() => { markStart(); setInstallments(o.installments); }}
                    className={pillCls(installments === o.installments)}
                  >
                    <span className="font-condensed text-lg font-bold leading-none">{o.installments}x</span>
                    <span className="mt-0.5 block text-[11px] leading-tight opacity-80">{brl(o.perInstallmentCents)}</span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-ink-warm-soft">
                Total no cartão {brl(chosen?.totalCents ?? 0)} · a taxa da operadora está inclusa. No PIX você paga {brl(selectedPlan?.priceCents ?? 0)}, sem acréscimo.
              </p>
            </div>
          )}
        </div>

        {/* Total */}
        <div className="flex items-baseline justify-between border-t border-cream-3 pt-4">
          <span className="font-condensed text-sm font-bold uppercase tracking-[0.12em] text-ink-warm">
            Total {method === "CREDIT_CARD" && installments > 1 ? `· ${installments}x` : "· à vista"}
          </span>
          <span className="font-condensed text-3xl font-extrabold tabular-nums text-ink-warm">{brl(totalCents)}</span>
        </div>

        {serverError && <p className="text-sm font-medium text-red-deep">{serverError}</p>}

        <button
          type="submit"
          disabled={loading || !allValid}
          className="mt-1 inline-flex h-14 w-full items-center justify-center rounded-full bg-red-brand font-condensed text-xl font-bold uppercase tracking-wide text-cream transition-colors hover:bg-red-deep disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? "Gerando pagamento…" : `Pagar ${brl(totalCents)}`}
        </button>
        <p className="text-center text-xs text-ink-warm-soft">
          Pagamento 100% seguro via Asaas. Você recebe o ingresso com QR Code por e-mail.
        </p>
      </div>
    </form>
  );
}

function MethodButton({ active, onClick, title, sub }: { active: boolean; onClick: () => void; title: string; sub: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        "flex flex-col items-start rounded-2xl border-2 px-4 py-3 text-left transition-colors",
        active ? "border-red-brand bg-red-brand/5" : "border-cream-3 bg-cream-2/60 hover:border-ink-warm-soft/40",
      ].join(" ")}
    >
      <span className={["font-condensed text-xl font-bold uppercase tracking-wide", active ? "text-red-brand" : "text-ink-warm"].join(" ")}>
        {title}
      </span>
      <span className="text-[11px] text-ink-warm-soft">{sub}</span>
    </button>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="font-condensed text-sm font-bold uppercase tracking-[0.12em] text-ink-warm">{label}</span>
      {children}
      {hint && <span className="block text-xs text-ink-warm-soft">{hint}</span>}
    </label>
  );
}

function inputCls(invalid: boolean): string {
  return [
    "w-full rounded-xl border-2 bg-cream-2/60 px-4 py-3.5 text-base text-ink-warm placeholder:text-ink-warm-soft/60 transition-colors focus:outline-none",
    invalid ? "border-red-brand" : "border-cream-3 focus:border-red-brand",
  ].join(" ");
}

function pillCls(active: boolean): string {
  return [
    "rounded-xl border-2 px-2 py-2 text-center transition-colors",
    active ? "border-red-brand bg-red-brand/5 text-red-brand" : "border-cream-3 bg-cream-2/60 text-ink-warm hover:border-ink-warm-soft/40",
  ].join(" ");
}
