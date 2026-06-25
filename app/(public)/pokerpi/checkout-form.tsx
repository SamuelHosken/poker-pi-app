"use client";
import { useState } from "react";
import { createTicketOrder } from "@/lib/tickets/orders";
import type { TicketType } from "@/lib/tickets/types";
import { TicketCards } from "./ticket-cards";

export function CheckoutForm({ types, soldOut }: { types: TicketType[]; soldOut: boolean }) {
  const [selectedId, setSelectedId] = useState<string | null>(types[0]?.id ?? null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", cpf: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId) return;
    setLoading(true);
    setError(null);
    const res = await createTicketOrder({ ticketTypeId: selectedId, ...form });
    if (res.ok) {
      window.location.href = res.invoiceUrl;
    } else {
      setError(res.error);
      setLoading(false);
    }
  }

  if (soldOut) {
    return <p className="rounded-xl border border-line bg-ink-2 p-4 text-center text-gold">Ingressos esgotados.</p>;
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <TicketCards types={types} selectedId={selectedId} onSelect={setSelectedId} />
      <Input placeholder="Nome completo" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
      <Input placeholder="E-mail" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
      <Input placeholder="Telefone (+55…)" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
      <Input placeholder="CPF" value={form.cpf} onChange={(v) => setForm({ ...form, cpf: v })} />
      {error && <p className="text-sm text-red-poker">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-full bg-gold px-6 py-3.5 font-bold text-ink disabled:opacity-60"
      >
        {loading ? "Gerando pagamento…" : "Garantir meu ingresso"}
      </button>
      <p className="text-center text-xs text-gray-soft">Pagamento via PIX ou cartão (Asaas). Você recebe o QR na hora.</p>
    </form>
  );
}

function Input({ placeholder, value, onChange, type = "text" }: {
  placeholder: string; value: string; onChange: (v: string) => void; type?: string;
}) {
  return (
    <input
      type={type}
      required
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border border-line bg-ink-2 px-4 py-3 text-paper placeholder:text-gray-mid focus:border-gold focus:outline-none"
    />
  );
}
