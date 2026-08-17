# Aviso de push quando copiam o PIX — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Disparar um push pros admins quando alguém copia a chave PIX na LP (`/pokerpi`), 1x por pedido.

**Architecture:** A LP (poker-pi-app) detecta o copy no cliente e chama um endpoint interno autenticado da v2 (app.mesapigroup.com); a v2 — dona da infra de push — faz um claim atômico em `tickets.pix_copied_at` (dedup) e envia via `sendPushToProfiles`. As duas apps compartilham o mesmo Supabase.

**Tech Stack:** Next.js App Router (2 apps), Supabase (`rawServiceClient` destipado pra `tickets`), web-push/VAPID (só na v2), Vitest (node, include `lib/**` + `scripts/**`).

## Global Constraints

- **Português na UI, inglês no código.** Copy do push em pt-BR.
- **NUNCA usar o caractere `—` (travessão)** em UI, copy, código, e-mail ou banco.
- **`database.types.ts` é mantido à mão** nos dois apps: NUNCA rodar `gen:types` cru. (Aqui não é preciso mexer: `tickets` é acessado via `rawServiceClient()` destipado.)
- **Fire-and-forget à prova de erro:** nada nesse fluxo pode quebrar o checkout. Sempre `void fn().catch(() => {})` / try-catch que engole.
- **Vitest da v2 só roda `lib/**` e `scripts/**`** — testes automáticos só de código em `lib/`. Rotas de API e componentes são verificados à mão.
- **Migration é aplicada à mão no Supabase** (dev == prod, um único banco).

---

### Task 1: Migration — coluna `pix_copied_at` em `tickets`

**Files:**
- Create: `poker-pi-app/supabase/migrations/0027_tickets_pix_copied.sql`

**Interfaces:**
- Consumes: nada.
- Produces: coluna `public.tickets.pix_copied_at timestamptz` (nullable), usada como flag de dedup pela Task 3.

- [ ] **Step 1: Escrever a migration**

`poker-pi-app/supabase/migrations/0027_tickets_pix_copied.sql`:
```sql
-- Flag de dedup: marca quando a chave PIX de um pedido foi copiada (1 aviso por pedido).
-- Espelha o padrao de tickets.sale_notified_at (0026).
alter table public.tickets
  add column if not exists pix_copied_at timestamptz;
```

- [ ] **Step 2: Aplicar no Supabase**

Aplicar o SQL acima no projeto `hccsbjuefsqvjsnukyup` (SQL Editor do painel, ou `supabase db push` se o CLI estiver linkado). Confirmar:
```sql
select column_name from information_schema.columns
where table_name = 'tickets' and column_name = 'pix_copied_at';
```
Expected: 1 linha (`pix_copied_at`).

- [ ] **Step 3: Commit**

```bash
cd poker-pi-app
git add supabase/migrations/0027_tickets_pix_copied.sql
git commit -m "feat: coluna pix_copied_at em tickets (dedup do aviso de PIX copiado)"
```

---

### Task 2: v2 — builder do payload (puro, com teste) + `notifyAdminsPixCopied`

**Files:**
- Create: `poker-pi-v2/lib/push/pix-copied-payload.ts`
- Test: `poker-pi-v2/lib/push/pix-copied-payload.test.ts`
- Modify: `poker-pi-v2/lib/push/notify.ts` (adicionar função no fim, antes/depois das vizinhas)

**Interfaces:**
- Consumes: `PushPayload` (type-only) de `poker-pi-v2/lib/push/send.ts`; `adminProfileIds()` e `sendPushToProfiles()` já existentes em `notify.ts`/`send.ts`; `rawServiceClient()` de `@/lib/tournament/auth`.
- Produces:
  - `pixCopiedPayload(buyerName: string | null, amountCents: number | null, ticketId: string): PushPayload`
  - `notifyAdminsPixCopied(ticketId: string): Promise<void>` — consumida pela rota da Task 3.

- [ ] **Step 1: Escrever o teste que falha**

`poker-pi-v2/lib/push/pix-copied-payload.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { pixCopiedPayload } from "./pix-copied-payload";

describe("pixCopiedPayload", () => {
  it("usa o nome do comprador e o valor em reais", () => {
    const p = pixCopiedPayload("João Silva", 12345, "tk_1");
    expect(p.title).toBe("📋 Copiaram o PIX");
    expect(p.body).toBe("João Silva copiou a chave - R$123. Aguardando comprovante.");
    expect(p.tag).toBe("admin-pix-copied-tk_1");
    expect(p.url).toBe("/admin/vendas");
  });

  it("cai pra 'Alguém' quando nao ha nome", () => {
    const p = pixCopiedPayload(null, 5000, "tk_2");
    expect(p.body).toBe("Alguém copiou a chave - R$50. Aguardando comprovante.");
  });

  it("omite o valor quando amountCents e nulo ou zero", () => {
    const p = pixCopiedPayload("Ana", null, "tk_3");
    expect(p.body).toBe("Ana copiou a chave. Aguardando comprovante.");
  });
});
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `cd poker-pi-v2 && npx vitest run lib/push/pix-copied-payload.test.ts`
Expected: FAIL — `Cannot find module './pix-copied-payload'`.

- [ ] **Step 3: Implementar o builder puro**

`poker-pi-v2/lib/push/pix-copied-payload.ts`:
```ts
import type { PushPayload } from "./send";

// Puro e sem imports de servidor de proposito: fica testavel no vitest (node)
// sem puxar next/headers via rawServiceClient. Copy usa hifen normal (nunca travessao).
export function pixCopiedPayload(
  buyerName: string | null,
  amountCents: number | null,
  ticketId: string,
): PushPayload {
  const reais = Math.round((amountCents ?? 0) / 100);
  const valor = reais ? ` - R$${reais}` : "";
  return {
    title: "📋 Copiaram o PIX",
    body: `${buyerName || "Alguém"} copiou a chave${valor}. Aguardando comprovante.`,
    tag: `admin-pix-copied-${ticketId}`,
    url: "/admin/vendas",
  };
}
```

- [ ] **Step 4: Rodar o teste e ver passar**

Run: `cd poker-pi-v2 && npx vitest run lib/push/pix-copied-payload.test.ts`
Expected: PASS (3 testes).

- [ ] **Step 5: Adicionar `notifyAdminsPixCopied` em `notify.ts`**

Adicionar o import no topo de `poker-pi-v2/lib/push/notify.ts` (junto aos outros):
```ts
import { pixCopiedPayload } from "./pix-copied-payload";
```
Adicionar a função (logo depois de `notifyAdminsTicketSaleIfTicket`):
```ts
/**
 * Avisa os ADMINS quando alguem COPIA a chave PIX na LP (venda de ingresso manual,
 * fora do Asaas). Primeiro sinal automatico de intencao de pagar. Claim atomico em
 * tickets.pix_copied_at garante 1 aviso por pedido mesmo com varios cliques. Nao
 * avisa se o ticket ja estiver pago. Chamada pela rota /api/internal/pix-copied.
 */
export async function notifyAdminsPixCopied(ticketId: string): Promise<void> {
  const db = rawServiceClient();
  const { data: claimed } = await db
    .from("tickets")
    .update({ pix_copied_at: new Date().toISOString() })
    .eq("id", ticketId)
    .is("pix_copied_at", null)
    .neq("status", "paid")
    .select("buyer_name, amount_cents")
    .maybeSingle();
  const t = claimed as { buyer_name: string | null; amount_cents: number | null } | null;
  if (!t) return; // ja avisado, inexistente, ou ja pago -> nada a fazer
  const admins = await adminProfileIds();
  if (!admins.length) return;
  await sendPushToProfiles(admins, pixCopiedPayload(t.buyer_name, t.amount_cents, ticketId));
}
```

- [ ] **Step 6: Typecheck**

Run: `cd poker-pi-v2 && npx tsc --noEmit`
Expected: sem erros novos nos arquivos tocados (`notify.ts`, `pix-copied-payload.ts`).

- [ ] **Step 7: Commit**

```bash
cd poker-pi-v2
git add lib/push/pix-copied-payload.ts lib/push/pix-copied-payload.test.ts lib/push/notify.ts
git commit -m "feat: notifyAdminsPixCopied + payload testado (aviso de PIX copiado)"
```

---

### Task 3: v2 — rota interna `/api/internal/pix-copied`

**Files:**
- Create: `poker-pi-v2/app/api/internal/pix-copied/route.ts`

**Interfaces:**
- Consumes: `notifyAdminsPixCopied(ticketId)` da Task 2; env `INTERNAL_NOTIFY_SECRET`.
- Produces: `POST /api/internal/pix-copied` (JSON `{ ticketId }`, header `x-internal-secret`) — consumida pela Task 5.

- [ ] **Step 1: Escrever a rota**

`poker-pi-v2/app/api/internal/pix-copied/route.ts`:
```ts
import { NextResponse } from "next/server";
import { notifyAdminsPixCopied } from "@/lib/push/notify";

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // web-push precisa de Node

// Chamada server-to-server pela LP quando alguem copia a chave PIX. Protegida por
// segredo compartilhado. Fire-and-forget: responde 204 sem esperar o push.
export async function POST(req: Request) {
  const secret = req.headers.get("x-internal-secret");
  if (!process.env.INTERNAL_NOTIFY_SECRET || secret !== process.env.INTERNAL_NOTIFY_SECRET) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as { ticketId?: string } | null;
  const ticketId = body?.ticketId;
  if (!ticketId) return NextResponse.json({ ok: false, reason: "sem ticketId" }, { status: 400 });

  void notifyAdminsPixCopied(ticketId).catch(() => undefined);
  return new NextResponse(null, { status: 204 });
}
```

- [ ] **Step 2: Typecheck**

Run: `cd poker-pi-v2 && npx tsc --noEmit`
Expected: sem erros novos.

- [ ] **Step 3: Verificação manual (após deploy da Task 7 — anotar pra fazer lá)**

Sem secret / secret errado:
```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST https://app.mesapigroup.com/api/internal/pix-copied \
  -H "content-type: application/json" -d '{"ticketId":"x"}'
```
Expected: `401`.

- [ ] **Step 4: Commit**

```bash
cd poker-pi-v2
git add app/api/internal/pix-copied/route.ts
git commit -m "feat: rota interna /api/internal/pix-copied (dispara aviso de PIX copiado)"
```

---

### Task 4: LP — `createTicketOrder` devolve `ticketId` no branch PIX

**Files:**
- Modify: `poker-pi-app/lib/tickets/types.ts` (type `OrderResult`)
- Modify: `poker-pi-app/lib/tickets/orders.ts` (o `return { ok: true, pix: true }`)

**Interfaces:**
- Consumes: nada novo.
- Produces: `OrderResult` com o branch PIX `{ ok: true; pix: true; ticketId: string }` — consumido pela Task 6.

- [ ] **Step 1: Atualizar o tipo `OrderResult`**

Em `poker-pi-app/lib/tickets/types.ts`, trocar:
```ts
export type OrderResult =
  | { ok: true; invoiceUrl: string }
  | { ok: true; pix: true }
  | { ok: false; error: string; field?: keyof OrderInput };
```
por:
```ts
export type OrderResult =
  | { ok: true; invoiceUrl: string }
  | { ok: true; pix: true; ticketId: string }
  | { ok: false; error: string; field?: keyof OrderInput };
```

- [ ] **Step 2: Devolver o id no branch PIX**

Em `poker-pi-app/lib/tickets/orders.ts`, no branch PIX (`if (method === "PIX") { … return { ok: true, pix: true }; }`), trocar o return por:
```ts
    return { ok: true, pix: true, ticketId: ticket.id };
```

- [ ] **Step 3: Typecheck**

Run: `cd poker-pi-app && npx tsc --noEmit`
Expected: sem erros. (O consumidor em `checkout-form.tsx` ainda compila: só lê `"pix" in res`.)

- [ ] **Step 4: Commit**

```bash
cd poker-pi-app
git add lib/tickets/types.ts lib/tickets/orders.ts
git commit -m "feat: createTicketOrder devolve ticketId no PIX (pro aviso de copia)"
```

---

### Task 5: LP — server action `pingPixCopied`

**Files:**
- Create: `poker-pi-app/lib/tickets/notify-copy.ts`

**Interfaces:**
- Consumes: rota da Task 3; envs `INTERNAL_NOTIFY_SECRET`, `V2_BASE_URL` (opcional).
- Produces: `pingPixCopied(ticketId: string): Promise<void>` — consumida pela Task 6.

- [ ] **Step 1: Escrever a server action**

`poker-pi-app/lib/tickets/notify-copy.ts`:
```ts
"use server";

// Avisa a v2 (dona do push) que alguem copiou a chave PIX. Server-to-server com
// segredo compartilhado. Best-effort: o aviso e nice-to-have e NUNCA pode quebrar
// o checkout, entao qualquer falha (rede, v2 fria, timeout) e engolida.
const V2_BASE = process.env.V2_BASE_URL || "https://app.mesapigroup.com";

export async function pingPixCopied(ticketId: string): Promise<void> {
  const secret = process.env.INTERNAL_NOTIFY_SECRET;
  if (!secret || !ticketId) return;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 4000);
  try {
    await fetch(`${V2_BASE}/api/internal/pix-copied`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-internal-secret": secret },
      body: JSON.stringify({ ticketId }),
      signal: ctrl.signal,
    });
  } catch {
    // best-effort: silencioso de proposito
  } finally {
    clearTimeout(timer);
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `cd poker-pi-app && npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
cd poker-pi-app
git add lib/tickets/notify-copy.ts
git commit -m "feat: pingPixCopied (LP avisa a v2 quando copiam a chave PIX)"
```

---

### Task 6: LP — ligar o gatilho no checkout e no painel do PIX

**Files:**
- Modify: `poker-pi-app/app/(public)/pokerpi/checkout-form.tsx`
- Modify: `poker-pi-app/app/(public)/pokerpi/pix-panel.tsx`

**Interfaces:**
- Consumes: `pingPixCopied` (Task 5); `res.ticketId` no branch PIX (Task 4).
- Produces: nada (folha).

- [ ] **Step 1: Guardar o `ticketId` no checkout-form**

Em `checkout-form.tsx`, adicionar estado junto de `pixShown` (linha ~54):
```ts
  const [pixShown, setPixShown] = useState(false);
  const [pixTicketId, setPixTicketId] = useState<string | null>(null);
```
No `submit`, no branch PIX (`if (res.ok && "pix" in res) { … }`), guardar o id:
```ts
    if (res.ok && "pix" in res) {
      setPixTicketId(res.ticketId);
      setPixShown(true);
      setLoading(false);
    } else if (res.ok) {
```
E passar a prop no render do painel (bloco `if (pixShown) { return <PixPanel … /> }`):
```ts
  if (pixShown) {
    return (
      <PixPanel
        amountCents={selectedPlan?.priceCents ?? 0}
        ticketId={pixTicketId ?? undefined}
        onBack={() => setPixShown(false)}
      />
    );
  }
```

- [ ] **Step 2: Disparar no copy do painel**

Em `pix-panel.tsx`, adicionar o import no topo:
```ts
import { pingPixCopied } from "@/lib/tickets/notify-copy";
```
Ampliar a assinatura do componente:
```ts
export function PixPanel({ amountCents, ticketId, onBack }: { amountCents: number; ticketId?: string; onBack: () => void }) {
```
No `copyKey()`, no sucesso do clipboard, disparar o aviso (fire-and-forget):
```ts
  async function copyKey() {
    try {
      await navigator.clipboard.writeText(PIX_KEY);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      if (ticketId) void pingPixCopied(ticketId);
    } catch {
      // clipboard bloqueado - a chave fica visivel pra copiar na mao
    }
  }
```

- [ ] **Step 3: Typecheck + build**

Run: `cd poker-pi-app && npx tsc --noEmit`
Expected: sem erros.
(Opcional, mais lento) `npx next build` pra garantir que a server action importada no client compila.

- [ ] **Step 4: Commit**

```bash
cd poker-pi-app
git add "app/(public)/pokerpi/checkout-form.tsx" "app/(public)/pokerpi/pix-panel.tsx"
git commit -m "feat: dispara aviso ao copiar a chave PIX na LP"
```

---

### Task 7: Envs, deploy das duas apps e E2E

**Files:** nenhum (ops). Requer ação do usuário nos painéis Vercel.

**Interfaces:**
- Consumes: tudo acima.
- Produces: feature no ar.

- [ ] **Step 1: Gerar o segredo**

```bash
openssl rand -hex 32
```
Guardar o valor.

- [ ] **Step 2: Setar env nos DOIS projetos Vercel (Production)**

- Projeto **poker-pi-v2**: `INTERNAL_NOTIFY_SECRET=<valor>`
- Projeto **poker-pi-app**: `INTERNAL_NOTIFY_SECRET=<mesmo valor>` (e, se quiser sobrescrever a base, `V2_BASE_URL=https://app.mesapigroup.com`).

Via CLI (exemplo): `vercel env add INTERNAL_NOTIFY_SECRET production` em cada projeto. Confirmar que a v2 já tem `VAPID_PRIVATE_KEY`/`NEXT_PUBLIC_VAPID_PUBLIC_KEY` (já tem — push do torneio funciona).

- [ ] **Step 3: Confirmar migration aplicada (Task 1 Step 2)** no Supabase antes de deployar.

- [ ] **Step 4: Deploy das duas apps**

```bash
cd poker-pi-v2 && npx vercel --prod --yes
cd ../poker-pi-app && npx vercel --prod --yes
```

- [ ] **Step 5: Verificar a rota (401)** — Task 3 Step 3.

- [ ] **Step 6: E2E real**

Ter o push do torneio já ativado num aparelho admin. Na LP `/pokerpi`: escolher ingresso, preencher nome/e-mail/telefone/CPF, forma **PIX**, gerar. Na tela do PIX, tocar **Copiar**. Confirmar:
- chega **1** push `📋 Copiaram o PIX` no aparelho admin;
- tocar **Copiar** de novo NÃO gera 2º push (dedup por `pix_copied_at`);
- o push abre `/admin/vendas`.

- [ ] **Step 7 (limpeza):** conferir no banco que `tickets.pix_copied_at` do pedido de teste está preenchido.

---

## Self-Review

**1. Spec coverage:**
- Migration `0027` → Task 1. ✓
- `notifyAdminsPixCopied` + claim atômico + copy → Task 2. ✓
- Rota interna com secret → Task 3. ✓
- `orders.ts` devolve `ticketId` → Task 4. ✓
- `pingPixCopied` server action → Task 5. ✓
- `checkout-form` + `pix-panel` → Task 6. ✓
- Envs + deploy duas apps + E2E + dedup → Task 7. ✓
- Fora de escopo (WhatsApp, e-mail, retry) respeitado: nenhuma task os toca. ✓

**2. Placeholder scan:** Todo passo tem código/comando reais. A nota de "travessao no teste" é intencional (red→corrige) e explícita, não um TODO.

**3. Type consistency:**
- `pixCopiedPayload(buyerName, amountCents, ticketId)` — mesma assinatura na Task 2 (def) e no uso interno. ✓
- `notifyAdminsPixCopied(ticketId: string)` — Task 2 (def), Task 3 (uso). ✓
- `OrderResult … { ok: true; pix: true; ticketId: string }` — Task 4 (def), Task 6 (`res.ticketId`). ✓
- `pingPixCopied(ticketId: string)` — Task 5 (def), Task 6 (uso). ✓
- Rota `/api/internal/pix-copied`, header `x-internal-secret`, body `{ ticketId }` — Task 3 (def) e Task 5 (chamada) batem. ✓
