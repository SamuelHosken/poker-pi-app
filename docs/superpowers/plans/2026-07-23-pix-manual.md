# PIX manual (fora do Asaas) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tirar o Asaas do fluxo de PIX: a pessoa faz o PIX na chave, manda comprovante no WhatsApp, e o admin confirma na mao (gera QR + e-mail). Cartao continua no Asaas.

**Architecture:** Uma config nova centraliza os valores do PIX. O `createTicketOrder` ganha um ramo PIX que cria o ticket `pending` sem chamar o Asaas e devolve um resultado que a LP usa pra mostrar um painel com a chave + WhatsApp. No admin, um helper reusa o MESMO caminho de confirmacao do webhook (`markPaid` + `sendEmail`) pra marcar pago manualmente e pra adicionar ingressos avulsos.

**Tech Stack:** Next.js 16 (App Router, Server Actions), TypeScript estrito, Supabase (service client), Vitest, Tailwind v4.

## Global Constraints

- **NUNCA usar o caractere em-dash `—`** em UI, copy, codigo ou commits. Usar `-` (hifen). (Ao editar `page.tsx` do admin, trocar os `—` existentes por `-`.)
- Portugues brasileiro em toda UI; codigo em ingles.
- `'use client'` so quando precisa (estado/eventos). Server Components por padrao.
- TypeScript estrito, ZERO `any`.
- Verificacao a cada task: `npx tsc --noEmit -p .` limpo.

---

### Task 1: Config PIX + helper de WhatsApp

**Files:**
- Create: `lib/tickets/pix.ts`
- Test: `lib/tickets/pix.test.ts`

**Interfaces:**
- Produces:
  - `PIX_KEY: string`, `PIX_KEY_TYPE: string`, `PIX_RECEIVER: string`, `PIX_WHATSAPP: string` (digits, ex `5561996631580`), `PIX_WHATSAPP_DISPLAY: string`
  - `pixWhatsappLink(message?: string): string`

- [ ] **Step 1: Write the failing test**

```ts
// lib/tickets/pix.test.ts
import { describe, it, expect } from "vitest";
import { PIX_KEY, PIX_RECEIVER, PIX_WHATSAPP, pixWhatsappLink } from "./pix";

describe("pix config", () => {
  it("expoe a chave e o recebedor", () => {
    expect(PIX_KEY).toBe("pokerpi2026@gmail.com");
    expect(PIX_RECEIVER).toBe("Joao Henrique");
    expect(PIX_WHATSAPP).toBe("5561996631580");
  });
});

describe("pixWhatsappLink", () => {
  it("monta o link wa.me com a mensagem padrao encodada", () => {
    const link = pixWhatsappLink();
    expect(link.startsWith("https://wa.me/5561996631580?text=")).toBe(true);
    expect(link).toContain(encodeURIComponent("comprovante"));
  });
  it("aceita uma mensagem custom", () => {
    expect(pixWhatsappLink("oi mundo")).toBe(
      "https://wa.me/5561996631580?text=" + encodeURIComponent("oi mundo"),
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/tickets/pix.test.ts`
Expected: FAIL (`Cannot find module './pix'`).

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/tickets/pix.ts
/**
 * Config do PIX manual (fora do Asaas). Fonte unica dos valores exibidos na LP.
 * Editavel aqui se a chave / recebedor / WhatsApp mudarem.
 */
export const PIX_KEY = "pokerpi2026@gmail.com";
export const PIX_KEY_TYPE = "E-mail";
export const PIX_RECEIVER = "Joao Henrique";
/** Numero do WhatsApp (so digitos, com DDI) pra onde vai o comprovante. */
export const PIX_WHATSAPP = "5561996631580";
export const PIX_WHATSAPP_DISPLAY = "+55 61 99663-1580";

const DEFAULT_MSG =
  "Oi! Fiz o PIX do meu ingresso Poker Pi, segue o comprovante:";

/** Link wa.me pra mandar o comprovante, com uma mensagem ja preenchida. */
export function pixWhatsappLink(message: string = DEFAULT_MSG): string {
  return `https://wa.me/${PIX_WHATSAPP}?text=${encodeURIComponent(message)}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/tickets/pix.test.ts`
Expected: PASS (5 asserts).

- [ ] **Step 5: Commit**

```bash
git add lib/tickets/pix.ts lib/tickets/pix.test.ts
git commit -m "feat: config do PIX manual + helper wa.me"
```

---

### Task 2: Ramo PIX no createTicketOrder (sem Asaas)

**Files:**
- Modify: `lib/tickets/types.ts:18-20` (OrderResult)
- Modify: `lib/tickets/orders.ts:131-215` (ramo por metodo)

**Interfaces:**
- Consumes: nada de tasks anteriores.
- Produces: `OrderResult` vira `{ ok: true; invoiceUrl: string } | { ok: true; pix: true } | { ok: false; error: string; field?: keyof OrderInput }`.

- [ ] **Step 1: Ampliar OrderResult**

Em `lib/tickets/types.ts`, trocar o bloco:

```ts
export type OrderResult =
  | { ok: true; invoiceUrl: string }
  | { ok: true; pix: true }
  | { ok: false; error: string; field?: keyof OrderInput };
```

- [ ] **Step 2: Ramo PIX em orders.ts**

Em `lib/tickets/orders.ts`, o trecho atual (a partir do `// Pricing:` ~linha 131 ate o `return { ok: true, invoiceUrl: payment.invoiceUrl };` ~linha 202) cria o ticket e SEMPRE chama o Asaas. Reestruturar assim: continua criando o ticket pending igual, mas **para PIX nao chama o Asaas** e retorna cedo.

Substituir o bloco de pricing + insert + Asaas por:

```ts
  // Pricing: PIX = valor cheio, cobrado FORA do Asaas (manual, comprovante por
  // WhatsApp). Cartao = juros do Asaas repassado (gross-up) via a MESMA funcao
  // que a LP usa pra exibir (cardTotalCents) - display e cobranca batem.
  const method = data.method;
  const installments = method === "CREDIT_CARD" ? data.installments : 1;
  const baseCents = tt.price_cents;
  const chargedCents = method === "CREDIT_CARD" ? cardTotalCents(baseCents, installments) : baseCents;

  // 1) cria o ticket pendente (pra ter id como externalReference / registro do PIX)
  const { data: ticket, error: insErr } = await db
    .from("tickets")
    .insert({
      event_id: tt.event_id,
      ticket_type_id: tt.id,
      buyer_name: data.name,
      buyer_email: data.email,
      buyer_phone: data.phone,
      buyer_cpf: onlyDigits(data.cpf),
      amount_cents: baseCents,
      charged_amount_cents: chargedCents,
      installments,
      payment_method: method,
      status: "pending",
    })
    .select("id")
    .single();
  if (insErr || !ticket) return { ok: false, error: "Nao foi possivel iniciar a compra." };

  // Atribuicao (sessao/origem) best-effort, FORA do insert de proposito.
  if (meta?.sessionId || meta?.source) {
    try {
      await db
        .from("tickets")
        .update({ analytics_session_id: meta?.sessionId ?? null, source: meta?.source ?? null })
        .eq("id", ticket.id);
    } catch {
      // colunas ainda nao existem - ignora
    }
  }

  // PIX manual: NAO cria cobranca no Asaas. O ticket fica pending ate o admin
  // confirmar o comprovante (marca pago, gera QR, manda e-mail).
  if (method === "PIX") {
    await trackEvent({
      name: "order_created",
      sessionId: meta?.sessionId,
      ref: meta?.source,
      plan: tt.name,
      eventId: tt.event_id,
      meta: { amountCents: baseCents, chargedCents, method, installments, ticketId: ticket.id },
    });
    return { ok: true, pix: true };
  }

  // 2) cartao: cria customer + cobranca no Asaas
  try {
    const dueDate = new Date().toISOString().slice(0, 10);
    const customer = await createAsaasCustomer({
      name: data.name, email: data.email, phone: data.phone, cpf: onlyDigits(data.cpf),
    });
    const payment = await createAsaasPayment({
      customerId: customer.id,
      valueCents: chargedCents,
      description: `Ingresso ${tt.name} · Poker Pi`,
      externalReference: ticket.id,
      dueDate,
      billingType: method,
      installments,
    });
    await db.from("tickets").update({
      asaas_customer_id: customer.id,
      asaas_payment_id: payment.id,
      asaas_invoice_url: payment.invoiceUrl,
    }).eq("id", ticket.id);

    await trackEvent({
      name: "order_created",
      sessionId: meta?.sessionId,
      ref: meta?.source,
      plan: tt.name,
      eventId: tt.event_id,
      meta: { amountCents: baseCents, chargedCents, method, installments, ticketId: ticket.id },
    });

    return { ok: true, invoiceUrl: payment.invoiceUrl };
  } catch (err) {
    await db.from("tickets").update({ status: "canceled" }).eq("id", ticket.id);
    await trackEvent({
      name: "order_failed",
      sessionId: meta?.sessionId,
      ref: meta?.source,
      plan: tt.name,
      eventId: tt.event_id,
      meta: { error: err instanceof Error ? err.message : "unknown" },
    });
    return { ok: false, error: err instanceof Error ? err.message : "Falha no pagamento." };
  }
```

Nota: `installments` no `createAsaasPayment` era `method === "CREDIT_CARD" ? installments : undefined`; como agora esse bloco so roda pra cartao, passar `installments` direto.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit -p .`
Expected: sem erros. (Se algum caller assumia `res.invoiceUrl` sem checar, o TS vai apontar - resolver no Task 3.)

- [ ] **Step 4: Commit**

```bash
git add lib/tickets/types.ts lib/tickets/orders.ts
git commit -m "feat: PIX cria pending sem chamar o Asaas"
```

---

### Task 3: Painel PIX na LP

**Files:**
- Create: `app/(public)/pokerpi/pix-panel.tsx`
- Modify: `app/(public)/pokerpi/checkout-form.tsx`

**Interfaces:**
- Consumes: `pixWhatsappLink`, `PIX_KEY`, `PIX_KEY_TYPE`, `PIX_RECEIVER` (Task 1); `OrderResult.pix` (Task 2).
- Produces: componente `PixPanel` usado so pela LP.

- [ ] **Step 1: Criar o PixPanel**

```tsx
// app/(public)/pokerpi/pix-panel.tsx
"use client";
import { useState } from "react";
import { Check, Copy, MessageCircle } from "lucide-react";
import { PIX_KEY, PIX_KEY_TYPE, PIX_RECEIVER, pixWhatsappLink } from "@/lib/tickets/pix";

const brl = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function PixPanel({ amountCents, onBack }: { amountCents: number; onBack: () => void }) {
  const [copied, setCopied] = useState(false);
  async function copyKey() {
    try {
      await navigator.clipboard.writeText(PIX_KEY);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard bloqueado - a chave fica visivel pra copiar na mao
    }
  }
  return (
    <div className="grid gap-5 rounded-3xl border border-cream-3 bg-cream p-6 shadow-[0_18px_44px_-22px_rgba(0,0,0,0.6)]">
      <div className="text-center">
        <span className="font-condensed text-sm font-bold uppercase tracking-[0.12em] text-ink-warm-soft">
          Valor do PIX
        </span>
        <p className="font-condensed text-5xl font-extrabold tabular-nums text-ink-warm">{brl(amountCents)}</p>
      </div>

      <div className="rounded-2xl border-2 border-cream-3 bg-cream-2/60 p-4">
        <span className="font-condensed text-xs font-bold uppercase tracking-[0.12em] text-ink-warm-soft">
          Chave PIX ({PIX_KEY_TYPE})
        </span>
        <div className="mt-1 flex items-center justify-between gap-3">
          <span className="break-all font-medium text-ink-warm">{PIX_KEY}</span>
          <button
            type="button"
            onClick={copyKey}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border-2 border-ink-warm px-3 py-1.5 font-condensed text-sm font-bold uppercase text-ink-warm transition-colors hover:bg-ink-warm hover:text-cream"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copiada" : "Copiar"}
          </button>
        </div>
        <p className="mt-2 text-xs text-ink-warm-soft">Recebedor: {PIX_RECEIVER}</p>
      </div>

      <p className="text-center text-sm text-ink-warm">
        Faca o PIX e mande o comprovante no WhatsApp pra confirmar seu ingresso.
      </p>

      <a
        href={pixWhatsappLink()}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[#25D366] font-condensed text-xl font-bold uppercase tracking-wide text-white transition-opacity hover:opacity-90"
      >
        <MessageCircle className="h-6 w-6" />
        Enviar comprovante
      </a>

      <button
        type="button"
        onClick={onBack}
        className="text-center text-xs font-medium text-ink-warm-soft underline"
      >
        Voltar
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Ligar o painel no checkout-form**

Em `app/(public)/pokerpi/checkout-form.tsx`:

1. Adicionar o import no topo (junto aos outros imports de `./`):

```tsx
import { PixPanel } from "./pix-panel";
```

2. Adicionar estado logo apos `const [loading, setLoading] = useState(false);`:

```tsx
  const [pixShown, setPixShown] = useState(false);
```

3. No `submit`, trocar o bloco de resultado (`if (res.ok) { window.location.href = res.invoiceUrl; }`) por:

```tsx
    if (res.ok && "pix" in res) {
      setPixShown(true);
      setLoading(false);
    } else if (res.ok) {
      window.location.href = res.invoiceUrl;
    } else {
      setServerError(res.error);
      setErrorField(res.field ?? null);
      setLoading(false);
    }
```

4. Logo depois do guard `if (soldOut) { ... }` e antes do `return (<form ...>`, inserir:

```tsx
  if (pixShown) {
    return <PixPanel amountCents={selectedPlan?.priceCents ?? 0} onBack={() => setPixShown(false)} />;
  }
```

5. Trocar o label do botao de submit pra refletir o metodo. A linha atual:

```tsx
          {loading ? "Gerando pagamento…" : `Pagar ${brl(totalCents)}`}
```

vira:

```tsx
          {loading
            ? (method === "PIX" ? "Gerando PIX…" : "Gerando pagamento…")
            : (method === "PIX" ? `Fazer PIX de ${brl(totalCents)}` : `Pagar ${brl(totalCents)}`)}
```

6. Trocar o texto do rodape pra ser condicional. A linha atual:

```tsx
          Pagamento 100% seguro via Asaas. Você recebe o ingresso com QR Code por e-mail.
```

vira:

```tsx
          {method === "PIX"
            ? "Voce faz o PIX na chave e manda o comprovante no WhatsApp. Confirmamos e o ingresso com QR Code vai pro seu e-mail."
            : "Pagamento 100% seguro via Asaas. Voce recebe o ingresso com QR Code por e-mail."}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit -p .`
Expected: sem erros.

- [ ] **Step 4: Verificacao no navegador**

Rodar `npm run dev` e abrir `http://localhost:3000/pokerpi`. Selecionar PIX, preencher dados validos, clicar "Fazer PIX". Esperado: aparece o painel PIX com valor cheio, a chave `pokerpi2026@gmail.com`, botao "Copiar" e botao verde de WhatsApp. Selecionar Cartao deve continuar redirecionando pro Asaas (nao regrediu).

- [ ] **Step 5: Commit**

```bash
git add app/\(public\)/pokerpi/pix-panel.tsx app/\(public\)/pokerpi/checkout-form.tsx
git commit -m "feat: painel PIX na LP (chave + valor + WhatsApp)"
```

---

### Task 4: Confirmacao manual reusavel (markPaid + e-mail)

**Files:**
- Modify: `lib/tickets/webhook.ts` (exportar `confirmTicket`; adicionar `findTicketById` ao `WebhookDeps`)
- Modify: `lib/tickets/webhook-deps.ts` (implementar `findTicketById`)
- Create: `lib/tickets/manual.ts`

**Interfaces:**
- Consumes: `buildWebhookDeps` (existente), `confirmTicket` (agora exportado).
- Produces:
  - `confirmTicketPaid(ticketId: string): Promise<{ handled: boolean; reason?: string }>`
  - `addPaidTicket(input: { eventId: string; ticketTypeId: string; name: string; email: string; phone: string; cpf: string }): Promise<{ ok: true } | { ok: false; error: string }>`

- [ ] **Step 1: Exportar confirmTicket e ampliar WebhookDeps**

Em `lib/tickets/webhook.ts`:

1. Trocar `async function confirmTicket(` por `export async function confirmTicket(`.
2. No type `WebhookDeps`, adicionar depois de `findTicketByCheckoutId(...)`:

```ts
  findTicketById(ticketId: string): Promise<Ticket | null>;
```

- [ ] **Step 2: Implementar findTicketById**

Em `lib/tickets/webhook-deps.ts`, dentro do objeto retornado, adicionar (logo apos `findTicketByCheckoutId`):

```ts
    async findTicketById(ticketId) {
      const { data } = await db.from("tickets").select(TICKET_COLS).eq("id", ticketId).maybeSingle();
      return data ? hydrate(data as TicketRow) : null;
    },
```

- [ ] **Step 3: Criar lib/tickets/manual.ts**

Importante: `manual.ts` NAO leva `"use server"` (senao viraria action publica
sem auth). E um modulo server-only comum - igual `reconcile.ts` - chamado so
pela action do admin (`actions.ts`), que roda `requireAdmin()`.

```ts
// lib/tickets/manual.ts
// Modulo server-only (sem "use server"): chamado pelas server actions do admin,
// que fazem requireAdmin(). Nao expor direto ao cliente.

import { rawServiceClient } from "@/lib/tournament/auth";
import { onlyDigits, isValidCpf } from "./cpf";
import { hasCapacity } from "./capacity";
import { confirmTicket } from "./webhook";
import { buildWebhookDeps } from "./webhook-deps";

/**
 * Marca um ticket pago MANUALMENTE (PIX confirmado via comprovante). Reusa o
 * MESMO caminho do webhook: markPaid (gera QR, gate atomico) + e-mail. Sem
 * verificacao no Asaas, porque a conferencia do comprovante e humana.
 */
export async function confirmTicketPaid(ticketId: string): Promise<{ handled: boolean; reason?: string }> {
  const db = rawServiceClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const deps = buildWebhookDeps(db, siteUrl);
  const ticket = await deps.findTicketById(ticketId);
  return confirmTicket(ticket, "PIX", deps);
}

/**
 * Adiciona um ingresso ja pago pra casos avulsos (pagou sem passar pela LP).
 * Insere o ticket e confirma pelo mesmo caminho (QR + e-mail).
 */
export async function addPaidTicket(input: {
  eventId: string;
  ticketTypeId: string;
  name: string;
  email: string;
  phone: string;
  cpf: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = rawServiceClient();
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const cpf = onlyDigits(input.cpf);
  if (name.length < 2) return { ok: false, error: "Nome invalido." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "E-mail invalido." };
  if (!isValidCpf(cpf)) return { ok: false, error: "CPF invalido." };

  const { data: tt } = await db
    .from("ticket_types")
    .select("id,event_id,price_cents")
    .eq("id", input.ticketTypeId)
    .maybeSingle();
  if (!tt || tt.event_id !== input.eventId) return { ok: false, error: "Ingresso indisponivel." };

  // Dedup: bloqueia se ja existe pago com esse CPF nesse evento.
  const { data: dup } = await db
    .from("tickets")
    .select("id")
    .eq("event_id", input.eventId)
    .eq("buyer_cpf", cpf)
    .eq("status", "paid");
  if ((dup ?? []).length > 0) return { ok: false, error: "Ja existe um ingresso pago com esse CPF." };

  // Capacidade.
  const { data: ev } = await db.from("events").select("capacity").eq("id", input.eventId).maybeSingle();
  const { count } = await db
    .from("tickets")
    .select("id", { count: "exact", head: true })
    .eq("event_id", input.eventId)
    .eq("status", "paid");
  if (!hasCapacity(count ?? 0, ev?.capacity ?? null)) return { ok: false, error: "Ingressos esgotados." };

  const { data: ticket, error: insErr } = await db
    .from("tickets")
    .insert({
      event_id: input.eventId,
      ticket_type_id: tt.id,
      buyer_name: name,
      buyer_email: email,
      buyer_phone: input.phone.trim(),
      buyer_cpf: cpf,
      amount_cents: tt.price_cents,
      charged_amount_cents: tt.price_cents,
      installments: 1,
      payment_method: "PIX",
      status: "pending",
    })
    .select("id")
    .single();
  if (insErr || !ticket) return { ok: false, error: "Nao foi possivel criar o ingresso." };

  const r = await confirmTicketPaid(ticket.id);
  if (!r.handled) return { ok: false, error: r.reason ?? "Falha ao confirmar." };
  return { ok: true };
}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit -p .`
Expected: sem erros. (Confirmar que `hasCapacity` e `isValidCpf`/`onlyDigits` existem em `./capacity` e `./cpf` - ja usados por `orders.ts`.)

- [ ] **Step 5: Commit**

```bash
git add lib/tickets/webhook.ts lib/tickets/webhook-deps.ts lib/tickets/manual.ts
git commit -m "feat: confirmacao manual de ingresso (PIX) reusando markPaid + e-mail"
```

---

### Task 5: Admin - confirmar PIX + adicionar avulso

**Files:**
- Modify: `app/admin/events/[id]/ingressos/actions.ts`
- Create: `app/admin/events/[id]/ingressos/pix-actions.tsx` (client: botoes/form)
- Modify: `app/admin/events/[id]/ingressos/page.tsx`

**Interfaces:**
- Consumes: `confirmTicketPaid`, `addPaidTicket` (Task 4).
- Produces: server actions `confirmPixTicket(ticketId)`, `addTicketManually(input)`.

- [ ] **Step 1: Server actions**

Em `app/admin/events/[id]/ingressos/actions.ts`, adicionar no fim:

```ts
import { revalidatePath } from "next/cache";
import { confirmTicketPaid, addPaidTicket } from "@/lib/tickets/manual";

/** Confirma um PIX pendente (comprovante conferido): marca pago + QR + e-mail. */
export async function confirmPixTicket(eventId: string, ticketId: string): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const r = await confirmTicketPaid(ticketId);
  revalidatePath(`/admin/events/${eventId}/ingressos`);
  if (!r.handled) return { ok: false, error: r.reason };
  return { ok: true };
}

/** Adiciona um ingresso ja pago (caso avulso). */
export async function addTicketManually(input: {
  eventId: string;
  ticketTypeId: string;
  name: string;
  email: string;
  phone: string;
  cpf: string;
}): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const r = await addPaidTicket(input);
  revalidatePath(`/admin/events/${input.eventId}/ingressos`);
  return r.ok ? { ok: true } : { ok: false, error: r.error };
}
```

(O `import { requireAdmin ... }` ja existe no topo do arquivo; nao duplicar.)

- [ ] **Step 2: Componentes client (botao confirmar + form avulso)**

```tsx
// app/admin/events/[id]/ingressos/pix-actions.tsx
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
```

- [ ] **Step 3: Ligar na page.tsx**

Em `app/admin/events/[id]/ingressos/page.tsx`:

1. Ampliar o select de tickets (linha 16-18) pra trazer o id e o cpf:

```ts
    .select(
      "id,buyer_name,buyer_email,buyer_cpf,amount_cents,status,payment_method,checked_in_at,created_at,ticket_type_id",
    )
```

2. Import no topo:

```tsx
import { ConfirmPixButton, AddTicketForm } from "./pix-actions";
```

3. Depois de `const paid = tickets.filter((t) => t.status === "paid");`, adicionar:

```tsx
  const pendingPix = tickets.filter((t) => t.status === "pending" && t.payment_method === "PIX");
  const ticketTypeList = (ttRows ?? []).map((tt) => ({ id: tt.id as string, name: tt.name as string }));
```

4. Trocar os dois `—` existentes (nas celulas "Plano" e "Presenca") por `-` (regra do projeto).

5. Depois do `<ReconcileButton />`, inserir a secao de PIX pendente + o form:

```tsx
      <AddTicketForm eventId={id} ticketTypes={ticketTypeList} />

      {pendingPix.length > 0 && (
        <section className="mt-5">
          <h2 className="text-sm font-bold uppercase tracking-wide text-gold">PIX aguardando comprovante</h2>
          <div className="mt-2 grid gap-2">
            {pendingPix.map((t) => (
              <div key={t.id as string} className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-ink-2 p-3">
                <div>
                  <div className="font-medium text-white">{t.buyer_name}</div>
                  <div className="text-xs text-gray-soft">
                    {t.buyer_email} · CPF {t.buyer_cpf} · R$ {((t.amount_cents as number) / 100).toFixed(2).replace(".", ",")}
                  </div>
                </div>
                <ConfirmPixButton eventId={id} ticketId={t.id as string} />
              </div>
            ))}
          </div>
        </section>
      )}
```

- [ ] **Step 4: Typecheck + build**

Run: `npx tsc --noEmit -p .`
Expected: sem erros.
Run: `npx next build`
Expected: build ok.

- [ ] **Step 5: Verificacao no navegador**

Logado como admin, abrir `/admin/events/<id>/ingressos`. Esperado: apos gerar um PIX na LP (Task 3), ele aparece em "PIX aguardando comprovante". Clicar "Confirmar pago" -> some da lista pendente, entra em pagos, e o e-mail com QR e enviado. Testar "Adicionar ingresso" com dados validos -> cria pago + e-mail.

- [ ] **Step 6: Commit**

```bash
git add app/admin/events/\[id\]/ingressos/
git commit -m "feat: admin confirma PIX pendente + adiciona ingresso avulso"
```

---

## Notas de teste

- `pix.ts` tem teste unitario puro (Task 1). `orders.ts`, `manual.ts` e o admin sao
  `"use server"` com Supabase/rede - o repo nao tem harness de mock pra eles hoje
  (nem `orders.ts` era testado). A verificacao deles e por `tsc` + `next build` +
  checagem no navegador, como ja e o padrao do projeto. Nao inventar mocks frageis.
- Regressao a cuidar: cartao NAO pode ter mudado. Confirmar no navegador que
  selecionar Cartao ainda redireciona pro Asaas.
