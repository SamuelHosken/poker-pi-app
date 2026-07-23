"use client";
import { useState, useTransition } from "react";
import { confirmPixTicket, addTicketManually } from "./actions";

export function ConfirmPixButton({ eventId, ticketId }: { eventId: string; ticketId: string }) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setErr(null);
            const r = await confirmPixTicket(eventId, ticketId);
            if (!r.ok) setErr(r.error ?? "Falhou");
          })
        }
        className="rounded-full bg-gold px-3 py-1.5 text-sm font-bold text-ink disabled:opacity-50"
      >
        {pending ? "Confirmando..." : "Confirmar pago"}
      </button>
      {err && <span className="text-xs text-red-400">{err}</span>}
    </span>
  );
}

export function AddTicketForm({
  eventId,
  ticketTypes,
}: {
  eventId: string;
  ticketTypes: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [form, setForm] = useState({
    ticketTypeId: ticketTypes[0]?.id ?? "",
    name: "",
    email: "",
    phone: "",
    cpf: "",
  });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 rounded-full border border-line px-4 py-2 text-sm font-bold text-gold"
      >
        + Adicionar ingresso
      </button>
    );
  }
  return (
    <div className="mt-3 grid gap-2 rounded-2xl border border-line bg-ink-2 p-4">
      <select value={form.ticketTypeId} onChange={set("ticketTypeId")} className="rounded-lg bg-ink px-3 py-2 text-sm text-white">
        {ticketTypes.map((t) => (
          <option key={t.id} value={t.id}>{t.name}</option>
        ))}
      </select>
      <input value={form.name} onChange={set("name")} placeholder="Nome completo" className="rounded-lg bg-ink px-3 py-2 text-sm text-white" />
      <input value={form.email} onChange={set("email")} placeholder="E-mail" className="rounded-lg bg-ink px-3 py-2 text-sm text-white" />
      <input value={form.phone} onChange={set("phone")} placeholder="Telefone (+55...)" className="rounded-lg bg-ink px-3 py-2 text-sm text-white" />
      <input value={form.cpf} onChange={set("cpf")} placeholder="CPF" className="rounded-lg bg-ink px-3 py-2 text-sm text-white" />
      {msg && <span className="text-xs text-gray-soft">{msg}</span>}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              setMsg(null);
              const r = await addTicketManually({ eventId, ...form });
              if (r.ok) {
                setMsg("Ingresso adicionado + e-mail enviado.");
                setForm((f) => ({ ...f, name: "", email: "", phone: "", cpf: "" }));
              } else {
                setMsg(r.error ?? "Falhou");
              }
            })
          }
          className="rounded-full bg-gold px-4 py-2 text-sm font-bold text-ink disabled:opacity-50"
        >
          {pending ? "Salvando..." : "Salvar pago"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-full border border-line px-4 py-2 text-sm text-gray-soft">
          Fechar
        </button>
      </div>
    </div>
  );
}
