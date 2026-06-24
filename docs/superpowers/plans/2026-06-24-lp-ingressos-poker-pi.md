# LP de Ingressos + Venda Online (Poker Pi) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Vender ingressos do Poker Pi (11/07) por uma LP premium, com pagamento Asaas (PIX+cartão), ingresso com QR Code na tela + e-mail (Resend), e check-in na porta integrado ao sistema de jogadores.

**Architecture:** Páginas Next.js (App Router, Server Components) + Server Actions para mutação; cobrança via Checkout hospedado do Asaas (`invoiceUrl`) confirmada por webhook; novas tabelas `ticket_types`/`tickets` no Supabase acessadas server-side via `rawServiceClient()` (padrão do projeto pra tabelas novas, evita regenerar tipos agora).

**Tech Stack:** Next.js 16, TypeScript estrito, Supabase (Postgres + RLS), Asaas (REST), Resend (e-mail), `nanoid` (tokens), `qrcode` (QR PNG server-side p/ e-mail), `qrcode.react` (QR na tela), `html5-qrcode` (scanner do check-in), Vitest (testes).

## Global Constraints

- **Português na UI, inglês no código** (regra do projeto).
- **Server-authoritative**: chaves Asaas/Resend só no servidor, nunca no cliente.
- **TypeScript estrito, ZERO `any`** — exceto retornos do `rawServiceClient()` (untyped por design), que devem ser mapeados pra tipos locais explícitos.
- **Componentes < 200 linhas**; lógica de domínio em `lib/`, não em componentes.
- **Confirmação para ações destrutivas**; **rate limit** em ações públicas.
- **Migrations**: arquivo numerado sequencial em `supabase/migrations/` (próximo = `0020`), com cabeçalho comentado (padrão dos arquivos `0018`/`0019`).
- **Após qualquer mudança**: `npm test`, depois `npx tsc --noEmit -p .` e `npx next build`.
- **Valores**: Padrão `15000` cents (R$150), Open Bar `18500` cents (R$185). Lotação `35`. Início `2026-07-11T14:00:00-03:00`. Local: "Condomínio Solar da Serra, Quadra 1, Casa 14 — Jardim Botânico, Brasília · DF". Slug: `poker-pi-11-07`.
- **E-mail**: de `Poker Pi <ingressos@mesapigroup.com>`, reply-to `pokerpi2026@gmail.com`.
- **Cores do tema** (CSS vars em `app/globals.css`): `--color-ink` `#0a0a0c`, `--color-ink-2` `#131418`, `--color-gold` `#d9b876`, `--color-gold-soft` `#f0dcae`, `--color-paper` `#f2f3f5`, `--color-line` `#26272c`. Em Tailwind: `bg-ink`, `text-gold`, etc.

---

## File Structure

**Criar:**
- `supabase/migrations/0020_tickets.sql` — schema + seed do evento.
- `lib/payments/asaas-config.ts` — resolve URL base + chave por ambiente (pura).
- `lib/payments/asaas.ts` — cliente HTTP Asaas (customer + payment).
- `lib/tickets/types.ts` — tipos locais (`TicketType`, `Ticket`, status) + mapeadores.
- `lib/tickets/cpf.ts` — validação de CPF (pura).
- `lib/tickets/capacity.ts` — regra de vagas (pura).
- `lib/tickets/orders.ts` — Server Action `createTicketOrder` + leitura pública de tipos.
- `lib/tickets/webhook.ts` — `processWebhookEvent` (pura, deps injetadas).
- `lib/tickets/checkin.ts` — Server Action `checkInTicket`.
- `lib/email/ticket-email.ts` — HTML do ingresso (puro) + `sendTicketEmail`.
- `app/api/asaas/webhook/route.ts` — endpoint do webhook.
- `app/(public)/evento/[slug]/page.tsx` + `checkout-form.tsx` + `ticket-cards.tsx` — LP.
- `app/(public)/ingresso/[token]/page.tsx` + `ticket-qr.tsx` — página do ingresso.
- `app/admin/checkin/page.tsx` + `qr-scanner.tsx` — portaria.
- `app/admin/events/[id]/ingressos/page.tsx` — gestão de vendas.
- Testes em `*.test.ts` ao lado dos módulos `lib/`.

**Modificar:**
- `package.json` — deps `resend`, `qrcode`, `@types/qrcode`, `html5-qrcode`.
- `.env.local` + `.env.local.example` — `ASAAS_WEBHOOK_TOKEN`, `NEXT_PUBLIC_SITE_URL`.
- `CLAUDE.md` — status da iteração.

---

### Task 0: Dependências + config de ambiente do Asaas

**Files:**
- Modify: `package.json`
- Modify: `.env.local`, `.env.local.example`
- Create: `lib/payments/asaas-config.ts`
- Test: `lib/payments/asaas-config.test.ts`

**Interfaces:**
- Produces: `resolveAsaasConfig(env: { ASAAS_ENV?: string; ASAAS_API_KEY_SANDBOX?: string; ASAAS_API_KEY_PRODUCTION?: string }): { baseUrl: string; apiKey: string }`

- [ ] **Step 1: Instalar dependências**

Run:
```bash
npm install resend qrcode html5-qrcode && npm install -D @types/qrcode
```
Expected: instala sem erro; `package.json` lista as 4.

- [ ] **Step 2: Adicionar variáveis no `.env.local` e `.env.local.example`**

No `.env.local`, abaixo do bloco Resend, adicionar:
```bash
# Token que autentica o webhook do Asaas (você cria no painel Asaas e repete aqui).
ASAAS_WEBHOOK_TOKEN=defina-um-token-aleatorio-aqui
# URL pública do site (usada no QR e nos links do e-mail). Em dev: http://localhost:3000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```
No `.env.local.example`, adicionar as MESMAS chaves com valores de exemplo (sem segredo real), mais:
```bash
ASAAS_ENV=sandbox
ASAAS_API_KEY_SANDBOX=
ASAAS_API_KEY_PRODUCTION=
RESEND_API_KEY=
ASAAS_WEBHOOK_TOKEN=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

- [ ] **Step 3: Escrever o teste que falha**

```typescript
// lib/payments/asaas-config.test.ts
import { describe, it, expect } from "vitest";
import { resolveAsaasConfig } from "./asaas-config";

describe("resolveAsaasConfig", () => {
  it("usa sandbox URL + chave de sandbox quando ASAAS_ENV=sandbox", () => {
    const cfg = resolveAsaasConfig({
      ASAAS_ENV: "sandbox",
      ASAAS_API_KEY_SANDBOX: "sand_key",
      ASAAS_API_KEY_PRODUCTION: "prod_key",
    });
    expect(cfg.baseUrl).toBe("https://sandbox.asaas.com/api/v3");
    expect(cfg.apiKey).toBe("sand_key");
  });

  it("usa produção quando ASAAS_ENV=production", () => {
    const cfg = resolveAsaasConfig({
      ASAAS_ENV: "production",
      ASAAS_API_KEY_SANDBOX: "sand_key",
      ASAAS_API_KEY_PRODUCTION: "prod_key",
    });
    expect(cfg.baseUrl).toBe("https://api.asaas.com/v3");
    expect(cfg.apiKey).toBe("prod_key");
  });

  it("default é sandbox quando ASAAS_ENV ausente", () => {
    const cfg = resolveAsaasConfig({ ASAAS_API_KEY_SANDBOX: "s" });
    expect(cfg.baseUrl).toBe("https://sandbox.asaas.com/api/v3");
  });

  it("lança se a chave do ambiente escolhido faltar", () => {
    expect(() => resolveAsaasConfig({ ASAAS_ENV: "production" })).toThrow();
  });
});
```

- [ ] **Step 4: Rodar e ver falhar**

Run: `npx vitest run lib/payments/asaas-config.test.ts`
Expected: FAIL ("resolveAsaasConfig is not a function" / módulo não existe).

- [ ] **Step 5: Implementar**

```typescript
// lib/payments/asaas-config.ts
export type AsaasEnvVars = {
  ASAAS_ENV?: string;
  ASAAS_API_KEY_SANDBOX?: string;
  ASAAS_API_KEY_PRODUCTION?: string;
};

const SANDBOX_URL = "https://sandbox.asaas.com/api/v3";
const PRODUCTION_URL = "https://api.asaas.com/v3";

/** Resolve URL base + chave de API a partir das env vars. Pura e testável. */
export function resolveAsaasConfig(env: AsaasEnvVars): {
  baseUrl: string;
  apiKey: string;
} {
  const isProd = env.ASAAS_ENV === "production";
  const baseUrl = isProd ? PRODUCTION_URL : SANDBOX_URL;
  const apiKey = isProd ? env.ASAAS_API_KEY_PRODUCTION : env.ASAAS_API_KEY_SANDBOX;
  if (!apiKey) {
    throw new Error(
      `Chave Asaas ausente para ambiente "${isProd ? "production" : "sandbox"}".`,
    );
  }
  return { baseUrl, apiKey };
}
```

- [ ] **Step 6: Rodar e ver passar**

Run: `npx vitest run lib/payments/asaas-config.test.ts`
Expected: PASS (4 testes).

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json lib/payments/asaas-config.ts lib/payments/asaas-config.test.ts .env.local.example
git commit -m "feat(tickets): deps + config de ambiente Asaas"
```

---

### Task 1: Migration — tabelas de ingresso + seed do evento

**Files:**
- Create: `supabase/migrations/0020_tickets.sql`
- Create: `lib/tickets/types.ts`

**Interfaces:**
- Produces (tabelas): `ticket_types`, `tickets`; colunas novas em `events`.
- Produces (tipos): `TicketStatus = "pending" | "paid" | "canceled"`, `TicketType`, `Ticket`.

- [ ] **Step 1: Escrever a migration**

```sql
-- supabase/migrations/0020_tickets.sql
-- =========================================================================
-- Venda de ingressos online (ticket_types + tickets) + campos de LP no event
-- =========================================================================
-- A LP pública (/evento/[slug]) lê event + ticket_types. A compra cria um
-- ticket (status=pending) e uma cobrança no Asaas; o webhook confirma e gera
-- o qr_token. tickets contém PII + dados de pagamento => SEM SELECT público;
-- todo acesso é server-side via service role. ticket_types é público (read).
-- =========================================================================

-- ---- Campos de LP/venda no event -----------------------------------------
alter table public.events
  add column if not exists slug              text,
  add column if not exists starts_at         timestamptz,
  add column if not exists location_text     text,
  add column if not exists location_maps_url text,
  add column if not exists capacity          int,
  add column if not exists sales_open        boolean not null default true;

create unique index if not exists uq_events_slug on public.events (slug) where slug is not null;

-- ---- Tipos de ingresso ----------------------------------------------------
create table if not exists public.ticket_types (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events(id) on delete cascade,
  name        text not null,
  description text,
  price_cents int  not null,
  sort_order  int  not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
create index if not exists idx_ticket_types_event on public.ticket_types (event_id);

alter table public.ticket_types enable row level security;
-- Leitura pública (a LP precisa mostrar os planos). Sem insert/update público.
create policy ticket_types_select_public on public.ticket_types
  for select to anon, authenticated using (true);

-- ---- Ingressos vendidos ----------------------------------------------------
create table if not exists public.tickets (
  id                uuid primary key default gen_random_uuid(),
  event_id          uuid not null references public.events(id) on delete cascade,
  ticket_type_id    uuid not null references public.ticket_types(id),
  buyer_name        text not null,
  buyer_email       text not null,
  buyer_phone       text not null,
  buyer_cpf         text not null,
  amount_cents      int  not null,
  status            text not null default 'pending'
                      check (status in ('pending','paid','canceled')),
  asaas_customer_id text,
  asaas_payment_id  text,
  asaas_invoice_url text,
  payment_method    text,
  qr_token          text,
  paid_at           timestamptz,
  checked_in_at     timestamptz,
  checked_in_by     uuid,
  player_id         uuid references public.players(id) on delete set null,
  created_at        timestamptz not null default now()
);
create unique index if not exists uq_tickets_asaas_payment on public.tickets (asaas_payment_id) where asaas_payment_id is not null;
create unique index if not exists uq_tickets_qr_token on public.tickets (qr_token) where qr_token is not null;
create index if not exists idx_tickets_event on public.tickets (event_id);

alter table public.tickets enable row level security;
-- SEM policies: tickets só é acessado via service role (server-side). RLS
-- habilitada nega tudo por padrão para anon/authenticated.

-- ---- Seed do evento da 2ª edição ------------------------------------------
insert into public.events (id, name, slug, starts_at, location_text, capacity, sales_open, state)
values (
  gen_random_uuid(),
  'Poker Pi — 2ª Edição',
  'poker-pi-11-07',
  '2026-07-11T14:00:00-03:00',
  'Condomínio Solar da Serra, Quadra 1, Casa 14 — Jardim Botânico, Brasília · DF',
  35,
  true,
  'SETUP'
)
on conflict (slug) do nothing;

insert into public.ticket_types (event_id, name, description, price_cents, sort_order)
select e.id, v.name, v.description, v.price_cents, v.sort_order
from public.events e
cross join (values
  ('Padrão',   'Comida + bebidas não alcoólicas', 15000, 1),
  ('Open Bar', 'Tudo + Open Bar',                 18500, 2)
) as v(name, description, price_cents, sort_order)
where e.slug = 'poker-pi-11-07'
  and not exists (select 1 from public.ticket_types t where t.event_id = e.id);
```

> Nota: a tabela `events` real pode ter colunas `not null` adicionais (ex.: `event_date`, `admin_user_id`). **Antes de aplicar**, conferir o schema atual e, se o INSERT do seed reclamar de coluna obrigatória, completar os valores no INSERT (ex.: `event_date`, `buy_in_cents`). Isso é parte deste passo.

- [ ] **Step 2: Aplicar a migration no Supabase**

Run (se o Supabase CLI estiver linkado):
```bash
npx supabase db push
```
Fallback (sem CLI linkado): abrir o SQL Editor do projeto no painel Supabase, colar o conteúdo de `0020_tickets.sql`, executar. Conferir que rodou sem erro.

- [ ] **Step 3: Verificar que as tabelas existem e o seed entrou**

Run:
```bash
node --env-file=.env.local -e "import('@supabase/supabase-js').then(async ({createClient})=>{const s=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY);const {data,error}=await s.from('ticket_types').select('name,price_cents');console.log(error??data);})"
```
Expected: imprime `[{name:'Padrão',price_cents:15000},{name:'Open Bar',price_cents:18500}]`.

- [ ] **Step 4: Definir tipos locais**

```typescript
// lib/tickets/types.ts
export type TicketStatus = "pending" | "paid" | "canceled";

export type TicketType = {
  id: string;
  eventId: string;
  name: string;
  description: string | null;
  priceCents: number;
  sortOrder: number;
};

export type Ticket = {
  id: string;
  eventId: string;
  ticketTypeId: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  buyerCpf: string;
  amountCents: number;
  status: TicketStatus;
  asaasCustomerId: string | null;
  asaasPaymentId: string | null;
  asaasInvoiceUrl: string | null;
  paymentMethod: string | null;
  qrToken: string | null;
  paidAt: string | null;
  checkedInAt: string | null;
  playerId: string | null;
};

/** Converte uma linha snake_case do Supabase (untyped) pro tipo camelCase. */
export function mapTicketRow(r: Record<string, unknown>): Ticket {
  return {
    id: r.id as string,
    eventId: r.event_id as string,
    ticketTypeId: r.ticket_type_id as string,
    buyerName: r.buyer_name as string,
    buyerEmail: r.buyer_email as string,
    buyerPhone: r.buyer_phone as string,
    buyerCpf: r.buyer_cpf as string,
    amountCents: r.amount_cents as number,
    status: r.status as TicketStatus,
    asaasCustomerId: (r.asaas_customer_id as string) ?? null,
    asaasPaymentId: (r.asaas_payment_id as string) ?? null,
    asaasInvoiceUrl: (r.asaas_invoice_url as string) ?? null,
    paymentMethod: (r.payment_method as string) ?? null,
    qrToken: (r.qr_token as string) ?? null,
    paidAt: (r.paid_at as string) ?? null,
    checkedInAt: (r.checked_in_at as string) ?? null,
    playerId: (r.player_id as string) ?? null,
  };
}

export function mapTicketTypeRow(r: Record<string, unknown>): TicketType {
  return {
    id: r.id as string,
    eventId: r.event_id as string,
    name: r.name as string,
    description: (r.description as string) ?? null,
    priceCents: r.price_cents as number,
    sortOrder: r.sort_order as number,
  };
}
```

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0020_tickets.sql lib/tickets/types.ts
git commit -m "feat(tickets): migration ticket_types/tickets + seed evento 11/07"
```

---

### Task 2: Validação de CPF + regra de vagas (lógica pura)

**Files:**
- Create: `lib/tickets/cpf.ts`, `lib/tickets/capacity.ts`
- Test: `lib/tickets/cpf.test.ts`, `lib/tickets/capacity.test.ts`

**Interfaces:**
- Produces: `isValidCpf(raw: string): boolean`, `onlyDigits(raw: string): string`
- Produces: `hasCapacity(paidCount: number, capacity: number | null): boolean`

- [ ] **Step 1: Testes que falham**

```typescript
// lib/tickets/cpf.test.ts
import { describe, it, expect } from "vitest";
import { isValidCpf } from "./cpf";

describe("isValidCpf", () => {
  it("aceita CPF válido (com e sem máscara)", () => {
    expect(isValidCpf("529.982.247-25")).toBe(true);
    expect(isValidCpf("52998224725")).toBe(true);
  });
  it("rejeita dígito verificador errado", () => {
    expect(isValidCpf("529.982.247-24")).toBe(false);
  });
  it("rejeita todos iguais e tamanho errado", () => {
    expect(isValidCpf("111.111.111-11")).toBe(false);
    expect(isValidCpf("123")).toBe(false);
  });
});
```

```typescript
// lib/tickets/capacity.test.ts
import { describe, it, expect } from "vitest";
import { hasCapacity } from "./capacity";

describe("hasCapacity", () => {
  it("permite quando há vagas", () => {
    expect(hasCapacity(34, 35)).toBe(true);
  });
  it("bloqueia quando lotou", () => {
    expect(hasCapacity(35, 35)).toBe(false);
  });
  it("sem limite (null) sempre permite", () => {
    expect(hasCapacity(999, null)).toBe(true);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run lib/tickets/cpf.test.ts lib/tickets/capacity.test.ts`
Expected: FAIL (módulos não existem).

- [ ] **Step 3: Implementar**

```typescript
// lib/tickets/cpf.ts
export function onlyDigits(raw: string): string {
  return raw.replace(/\D/g, "");
}

/** Valida CPF pelos dígitos verificadores. Rejeita sequências repetidas. */
export function isValidCpf(raw: string): boolean {
  const cpf = onlyDigits(raw);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  const calcCheck = (slice: string, factorStart: number): number => {
    let sum = 0;
    let factor = factorStart;
    for (const ch of slice) sum += parseInt(ch, 10) * factor--;
    const mod = (sum * 10) % 11;
    return mod === 10 ? 0 : mod;
  };

  const d1 = calcCheck(cpf.slice(0, 9), 10);
  const d2 = calcCheck(cpf.slice(0, 10), 11);
  return d1 === parseInt(cpf[9], 10) && d2 === parseInt(cpf[10], 10);
}
```

```typescript
// lib/tickets/capacity.ts
/** Há vaga se ainda não atingiu a lotação. capacity null = sem limite. */
export function hasCapacity(paidCount: number, capacity: number | null): boolean {
  if (capacity == null) return true;
  return paidCount < capacity;
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run lib/tickets/cpf.test.ts lib/tickets/capacity.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/tickets/cpf.ts lib/tickets/cpf.test.ts lib/tickets/capacity.ts lib/tickets/capacity.test.ts
git commit -m "feat(tickets): validação de CPF + regra de vagas"
```

---

### Task 3: Cliente Asaas (customer + payment)

**Files:**
- Create: `lib/payments/asaas.ts`
- Test: `lib/payments/asaas.test.ts`

**Interfaces:**
- Consumes: `resolveAsaasConfig` (Task 0).
- Produces:
  - `createAsaasCustomer(input: { name: string; email: string; phone: string; cpf: string }): Promise<{ id: string }>`
  - `createAsaasPayment(input: { customerId: string; valueCents: number; description: string; externalReference: string; dueDate: string }): Promise<{ id: string; invoiceUrl: string }>`
- Both accept an optional 2º arg `fetchImpl: typeof fetch` (default global `fetch`) para testes.

- [ ] **Step 1: Teste que falha (mock de fetch)**

```typescript
// lib/payments/asaas.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createAsaasCustomer, createAsaasPayment } from "./asaas";

beforeEach(() => {
  process.env.ASAAS_ENV = "sandbox";
  process.env.ASAAS_API_KEY_SANDBOX = "test_key";
});

function mockJson(body: unknown, ok = true) {
  return vi.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 400,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response);
}

describe("createAsaasCustomer", () => {
  it("POSTa em /customers com header access_token e devolve o id", async () => {
    const f = mockJson({ id: "cus_123" });
    const res = await createAsaasCustomer(
      { name: "Ana", email: "a@b.com", phone: "+5561999998888", cpf: "52998224725" },
      f,
    );
    expect(res.id).toBe("cus_123");
    const [url, init] = f.mock.calls[0];
    expect(url).toBe("https://sandbox.asaas.com/api/v3/customers");
    expect((init.headers as Record<string, string>).access_token).toBe("test_key");
    expect(JSON.parse(init.body as string).cpfCnpj).toBe("52998224725");
  });
});

describe("createAsaasPayment", () => {
  it("POSTa em /payments com value em reais e billingType UNDEFINED", async () => {
    const f = mockJson({ id: "pay_9", invoiceUrl: "https://asaas/i/pay_9" });
    const res = await createAsaasPayment(
      { customerId: "cus_123", valueCents: 15000, description: "Ingresso", externalReference: "t1", dueDate: "2026-07-11" },
      f,
    );
    expect(res).toEqual({ id: "pay_9", invoiceUrl: "https://asaas/i/pay_9" });
    const body = JSON.parse(f.mock.calls[0][1].body as string);
    expect(body.value).toBe(150);          // cents -> reais
    expect(body.billingType).toBe("UNDEFINED");
    expect(body.externalReference).toBe("t1");
  });

  it("lança quando o Asaas responde erro", async () => {
    const f = mockJson({ errors: [{ description: "boom" }] }, false);
    await expect(
      createAsaasPayment({ customerId: "c", valueCents: 100, description: "x", externalReference: "t", dueDate: "2026-07-11" }, f),
    ).rejects.toThrow(/boom/);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run lib/payments/asaas.test.ts`
Expected: FAIL (funções não existem).

- [ ] **Step 3: Implementar**

```typescript
// lib/payments/asaas.ts
import { resolveAsaasConfig } from "./asaas-config";

type Fetch = typeof fetch;

function config() {
  return resolveAsaasConfig({
    ASAAS_ENV: process.env.ASAAS_ENV,
    ASAAS_API_KEY_SANDBOX: process.env.ASAAS_API_KEY_SANDBOX,
    ASAAS_API_KEY_PRODUCTION: process.env.ASAAS_API_KEY_PRODUCTION,
  });
}

async function asaasPost<T>(path: string, body: unknown, fetchImpl: Fetch): Promise<T> {
  const { baseUrl, apiKey } = config();
  const res = await fetchImpl(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", access_token: apiKey },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const raw = await res.text();
    let msg = raw;
    try {
      const parsed = JSON.parse(raw) as { errors?: { description?: string }[] };
      msg = parsed.errors?.map((e) => e.description).join("; ") || raw;
    } catch {
      /* mantém raw */
    }
    throw new Error(`Asaas ${path} falhou (${res.status}): ${msg}`);
  }
  return (await res.json()) as T;
}

export async function createAsaasCustomer(
  input: { name: string; email: string; phone: string; cpf: string },
  fetchImpl: Fetch = fetch,
): Promise<{ id: string }> {
  const data = await asaasPost<{ id: string }>(
    "/customers",
    {
      name: input.name,
      email: input.email,
      mobilePhone: input.phone,
      cpfCnpj: input.cpf,
    },
    fetchImpl,
  );
  return { id: data.id };
}

export async function createAsaasPayment(
  input: {
    customerId: string;
    valueCents: number;
    description: string;
    externalReference: string;
    dueDate: string;
  },
  fetchImpl: Fetch = fetch,
): Promise<{ id: string; invoiceUrl: string }> {
  const data = await asaasPost<{ id: string; invoiceUrl: string }>(
    "/payments",
    {
      customer: input.customerId,
      billingType: "UNDEFINED",
      value: input.valueCents / 100,
      dueDate: input.dueDate,
      description: input.description,
      externalReference: input.externalReference,
    },
    fetchImpl,
  );
  return { id: data.id, invoiceUrl: data.invoiceUrl };
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run lib/payments/asaas.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/payments/asaas.ts lib/payments/asaas.test.ts
git commit -m "feat(tickets): cliente Asaas (customer + payment)"
```

---

### Task 4: Server Action de compra (`createTicketOrder`) + leitura pública

**Files:**
- Create: `lib/tickets/orders.ts`
- Test: `lib/tickets/orders.test.ts` (cobre só o schema de validação — a ação completa é verificada em sandbox na Task 9)

**Interfaces:**
- Consumes: `isValidCpf`, `hasCapacity`, `createAsaasCustomer`, `createAsaasPayment`, `rawServiceClient` (`lib/tournament/auth`), `checkRateLimit`, `mapTicketTypeRow`.
- Produces:
  - `OrderInput = { ticketTypeId: string; name: string; email: string; phone: string; cpf: string }`
  - `createTicketOrder(input: OrderInput): Promise<{ ok: true; invoiceUrl: string } | { ok: false; error: string; field?: keyof OrderInput }>`
  - `getEventBySlugPublic(slug: string): Promise<{ event: {...}; ticketTypes: TicketType[]; soldCount: number } | null>`
  - `OrderSchema` (zod) exportado para teste.

- [ ] **Step 1: Teste do schema (falha)**

```typescript
// lib/tickets/orders.test.ts
import { describe, it, expect } from "vitest";
import { OrderSchema } from "./orders";

describe("OrderSchema", () => {
  it("aceita entrada válida", () => {
    const r = OrderSchema.safeParse({
      ticketTypeId: "11111111-1111-1111-1111-111111111111",
      name: "Ana Silva",
      email: "ana@gmail.com",
      phone: "+5561999998888",
      cpf: "529.982.247-25",
    });
    expect(r.success).toBe(true);
  });
  it("rejeita CPF inválido", () => {
    const r = OrderSchema.safeParse({
      ticketTypeId: "11111111-1111-1111-1111-111111111111",
      name: "Ana Silva",
      email: "ana@gmail.com",
      phone: "+5561999998888",
      cpf: "111.111.111-11",
    });
    expect(r.success).toBe(false);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run lib/tickets/orders.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar**

```typescript
// lib/tickets/orders.ts
"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { rawServiceClient } from "@/lib/tournament/auth";
import { checkRateLimit } from "@/lib/rate-limit/in-memory";
import { isValidCpf, onlyDigits } from "./cpf";
import { hasCapacity } from "./capacity";
import { mapTicketTypeRow, type TicketType } from "./types";
import { createAsaasCustomer, createAsaasPayment } from "@/lib/payments/asaas";

export const OrderSchema = z.object({
  ticketTypeId: z.string().uuid(),
  name: z.string().trim().min(2, "Digite seu nome completo.").max(120),
  email: z.string().trim().toLowerCase().email("E-mail inválido.").max(254),
  phone: z.string().trim().regex(/^\+[1-9]\d{6,17}$/, "Telefone inválido."),
  cpf: z.string().trim().refine(isValidCpf, "CPF inválido."),
});

export type OrderInput = z.input<typeof OrderSchema>;
export type OrderResult =
  | { ok: true; invoiceUrl: string }
  | { ok: false; error: string; field?: keyof OrderInput };

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function getEventBySlugPublic(slug: string): Promise<{
  event: { id: string; name: string; slug: string; startsAt: string; locationText: string; capacity: number | null; salesOpen: boolean };
  ticketTypes: TicketType[];
  soldCount: number;
} | null> {
  const db = rawServiceClient();
  const { data: ev } = await db
    .from("events")
    .select("id,name,slug,starts_at,location_text,capacity,sales_open")
    .eq("slug", slug)
    .maybeSingle();
  if (!ev) return null;

  const { data: types } = await db
    .from("ticket_types")
    .select("*")
    .eq("event_id", ev.id)
    .eq("active", true)
    .order("sort_order");

  const { count } = await db
    .from("tickets")
    .select("id", { count: "exact", head: true })
    .eq("event_id", ev.id)
    .eq("status", "paid");

  return {
    event: {
      id: ev.id, name: ev.name, slug: ev.slug, startsAt: ev.starts_at,
      locationText: ev.location_text, capacity: ev.capacity, salesOpen: ev.sales_open,
    },
    ticketTypes: (types ?? []).map(mapTicketTypeRow),
    soldCount: count ?? 0,
  };
}

export async function createTicketOrder(input: OrderInput): Promise<OrderResult> {
  const parsed = OrderSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: first?.message ?? "Confira os dados.", field: first?.path[0] as keyof OrderInput };
  }
  const data = parsed.data;

  try {
    const hdrs = await headers();
    const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
    checkRateLimit(`ticket-order:${ip}`, 5, 10 * 60_000);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Tente novamente." };
  }

  const db = rawServiceClient();

  const { data: tt } = await db
    .from("ticket_types")
    .select("id,event_id,name,price_cents")
    .eq("id", data.ticketTypeId)
    .maybeSingle();
  if (!tt) return { ok: false, error: "Ingresso indisponível." };

  const { data: ev } = await db
    .from("events")
    .select("capacity,sales_open,starts_at")
    .eq("id", tt.event_id)
    .maybeSingle();
  if (!ev || !ev.sales_open) return { ok: false, error: "As vendas estão fechadas." };

  const { count } = await db
    .from("tickets")
    .select("id", { count: "exact", head: true })
    .eq("event_id", tt.event_id)
    .eq("status", "paid");
  if (!hasCapacity(count ?? 0, ev.capacity)) {
    return { ok: false, error: "Ingressos esgotados." };
  }

  // 1) cria o ticket pendente (pra ter id como externalReference)
  const { data: ticket, error: insErr } = await db
    .from("tickets")
    .insert({
      event_id: tt.event_id,
      ticket_type_id: tt.id,
      buyer_name: data.name,
      buyer_email: data.email,
      buyer_phone: data.phone,
      buyer_cpf: onlyDigits(data.cpf),
      amount_cents: tt.price_cents,
      status: "pending",
    })
    .select("id")
    .single();
  if (insErr || !ticket) return { ok: false, error: "Não foi possível iniciar a compra." };

  // 2) cria customer + cobrança no Asaas
  try {
    const customer = await createAsaasCustomer({
      name: data.name, email: data.email, phone: data.phone, cpf: onlyDigits(data.cpf),
    });
    const payment = await createAsaasPayment({
      customerId: customer.id,
      valueCents: tt.price_cents,
      description: `Ingresso ${tt.name} — Poker Pi`,
      externalReference: ticket.id,
      dueDate: todayIso(),
    });
    await db.from("tickets").update({
      asaas_customer_id: customer.id,
      asaas_payment_id: payment.id,
      asaas_invoice_url: payment.invoiceUrl,
    }).eq("id", ticket.id);

    return { ok: true, invoiceUrl: payment.invoiceUrl };
  } catch (err) {
    await db.from("tickets").update({ status: "canceled" }).eq("id", ticket.id);
    return { ok: false, error: err instanceof Error ? err.message : "Falha no pagamento." };
  }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run lib/tickets/orders.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/tickets/orders.ts lib/tickets/orders.test.ts
git commit -m "feat(tickets): server action createTicketOrder + leitura pública do evento"
```

---

### Task 5: E-mail do ingresso (HTML puro + envio Resend)

**Files:**
- Create: `lib/email/ticket-email.ts`
- Test: `lib/email/ticket-email.test.ts`

**Interfaces:**
- Produces:
  - `buildTicketEmailHtml(p: { buyerName: string; ticketName: string; whenText: string; locationText: string; ticketUrl: string }): string`
  - `generateQrDataUrl(text: string): Promise<string>` (usa `qrcode`)
  - `sendTicketEmail(p: { to: string; buyerName: string; ticketName: string; whenText: string; locationText: string; ticketUrl: string }): Promise<void>`

- [ ] **Step 1: Teste que falha (só do HTML — puro)**

```typescript
// lib/email/ticket-email.test.ts
import { describe, it, expect } from "vitest";
import { buildTicketEmailHtml } from "./ticket-email";

describe("buildTicketEmailHtml", () => {
  it("inclui nome, plano, data, local e o link do ingresso", () => {
    const html = buildTicketEmailHtml({
      buyerName: "Ana",
      ticketName: "Open Bar",
      whenText: "11/07/2026 às 14h",
      locationText: "Solar da Serra",
      ticketUrl: "https://mesapigroup.com/ingresso/abc",
    });
    expect(html).toContain("Ana");
    expect(html).toContain("Open Bar");
    expect(html).toContain("11/07/2026");
    expect(html).toContain("Solar da Serra");
    expect(html).toContain("https://mesapigroup.com/ingresso/abc");
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run lib/email/ticket-email.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar**

```typescript
// lib/email/ticket-email.ts
import QRCode from "qrcode";
import { Resend } from "resend";

const FROM = "Poker Pi <ingressos@mesapigroup.com>";
const REPLY_TO = "pokerpi2026@gmail.com";

export function buildTicketEmailHtml(p: {
  buyerName: string;
  ticketName: string;
  whenText: string;
  locationText: string;
  ticketUrl: string;
}): string {
  return `<!doctype html>
<html lang="pt-BR"><body style="margin:0;background:#0a0a0c;color:#f2f3f5;font-family:Arial,Helvetica,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;padding:32px">
    <tr><td style="text-align:center">
      <div style="font-size:40px;color:#d9b876;font-weight:bold">π</div>
      <h1 style="color:#d9b876;font-size:22px;margin:8px 0 0">Seu ingresso está confirmado</h1>
    </td></tr>
    <tr><td style="padding:24px 0">
      <p style="font-size:16px">Olá, <strong>${p.buyerName}</strong>! Te esperamos no <strong>Poker Pi</strong>.</p>
      <table width="100%" style="background:#131418;border:1px solid #26272c;border-radius:12px;padding:16px;margin-top:12px">
        <tr><td style="color:#9aa0aa;font-size:13px">Ingresso</td><td style="text-align:right;color:#d9b876;font-weight:bold">${p.ticketName}</td></tr>
        <tr><td style="color:#9aa0aa;font-size:13px;padding-top:8px">Quando</td><td style="text-align:right;padding-top:8px">${p.whenText}</td></tr>
        <tr><td style="color:#9aa0aa;font-size:13px;padding-top:8px">Onde</td><td style="text-align:right;padding-top:8px">${p.locationText}</td></tr>
      </table>
      <p style="text-align:center;margin-top:24px">
        <a href="${p.ticketUrl}" style="display:inline-block;background:#d9b876;color:#0a0a0c;text-decoration:none;font-weight:bold;padding:14px 28px;border-radius:999px">Abrir meu ingresso (QR)</a>
      </p>
      <p style="text-align:center;color:#9aa0aa;font-size:13px">Apresente o QR Code deste link na entrada.</p>
    </td></tr>
  </table>
</body></html>`;
}

export async function generateQrDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, { width: 480, margin: 1 });
}

export async function sendTicketEmail(p: {
  to: string;
  buyerName: string;
  ticketName: string;
  whenText: string;
  locationText: string;
  ticketUrl: string;
}): Promise<void> {
  if (!process.env.RESEND_API_KEY) return; // e-mail é complementar; QR na tela já entrega
  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: FROM,
    replyTo: REPLY_TO,
    to: p.to,
    subject: "🎟️ Seu ingresso — Poker Pi",
    html: buildTicketEmailHtml(p),
  });
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run lib/email/ticket-email.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/email/ticket-email.ts lib/email/ticket-email.test.ts
git commit -m "feat(tickets): e-mail do ingresso (HTML + Resend)"
```

---

### Task 6: Webhook do Asaas

**Files:**
- Create: `lib/tickets/webhook.ts`
- Create: `app/api/asaas/webhook/route.ts`
- Test: `lib/tickets/webhook.test.ts`

**Interfaces:**
- Consumes: tipos de `./types`.
- Produces:
  - `WebhookDeps = { findTicketByPaymentId(id): Promise<{ id; status; buyer_email; ticket_name; when_text; location_text } | null>; markPaid(id, method): Promise<string /* qrToken */>; sendEmail(args): Promise<void>; siteUrl: string }`
  - `processWebhookEvent(payload: unknown, deps: WebhookDeps): Promise<{ handled: boolean; reason?: string }>`

- [ ] **Step 1: Teste que falha**

```typescript
// lib/tickets/webhook.test.ts
import { describe, it, expect, vi } from "vitest";
import { processWebhookEvent, type WebhookDeps } from "./webhook";

function deps(over: Partial<WebhookDeps> = {}): WebhookDeps {
  return {
    findTicketByPaymentId: vi.fn().mockResolvedValue({
      id: "t1", status: "pending", buyer_email: "a@b.com",
      ticket_name: "Padrão", when_text: "11/07", location_text: "Solar",
    }),
    markPaid: vi.fn().mockResolvedValue("qr_abc"),
    sendEmail: vi.fn().mockResolvedValue(undefined),
    siteUrl: "https://mesapigroup.com",
    ...over,
  };
}

describe("processWebhookEvent", () => {
  it("confirma pagamento, marca pago e envia e-mail", async () => {
    const d = deps();
    const r = await processWebhookEvent(
      { event: "PAYMENT_CONFIRMED", payment: { id: "pay_1", billingType: "PIX" } }, d,
    );
    expect(r.handled).toBe(true);
    expect(d.markPaid).toHaveBeenCalledWith("t1", "PIX");
    expect(d.sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: "a@b.com", ticketUrl: "https://mesapigroup.com/ingresso/qr_abc",
    }));
  });

  it("ignora eventos não-pagamento", async () => {
    const d = deps();
    const r = await processWebhookEvent({ event: "PAYMENT_CREATED", payment: { id: "x" } }, d);
    expect(r.handled).toBe(false);
    expect(d.markPaid).not.toHaveBeenCalled();
  });

  it("é idempotente: ticket já pago não reprocessa", async () => {
    const d = deps({ findTicketByPaymentId: vi.fn().mockResolvedValue({ id: "t1", status: "paid" }) });
    const r = await processWebhookEvent({ event: "PAYMENT_RECEIVED", payment: { id: "pay_1" } }, d);
    expect(r.handled).toBe(false);
    expect(d.markPaid).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run lib/tickets/webhook.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar a lógica pura**

```typescript
// lib/tickets/webhook.ts
export type WebhookDeps = {
  findTicketByPaymentId(paymentId: string): Promise<{
    id: string;
    status: string;
    buyer_email?: string;
    ticket_name?: string;
    when_text?: string;
    location_text?: string;
  } | null>;
  markPaid(ticketId: string, method: string | null): Promise<string>; // retorna qrToken
  sendEmail(args: {
    to: string; buyerName: string; ticketName: string;
    whenText: string; locationText: string; ticketUrl: string;
  }): Promise<void>;
  siteUrl: string;
};

const PAID_EVENTS = new Set(["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"]);

export async function processWebhookEvent(
  payload: unknown,
  deps: WebhookDeps,
): Promise<{ handled: boolean; reason?: string }> {
  const p = payload as { event?: string; payment?: { id?: string; billingType?: string; customer?: string } };
  if (!p?.event || !PAID_EVENTS.has(p.event)) return { handled: false, reason: "evento ignorado" };
  const paymentId = p.payment?.id;
  if (!paymentId) return { handled: false, reason: "sem payment id" };

  const ticket = await deps.findTicketByPaymentId(paymentId);
  if (!ticket) return { handled: false, reason: "ticket não encontrado" };
  if (ticket.status === "paid") return { handled: false, reason: "já pago (idempotente)" };

  const qrToken = await deps.markPaid(ticket.id, p.payment?.billingType ?? null);

  if (ticket.buyer_email) {
    await deps.sendEmail({
      to: ticket.buyer_email,
      buyerName: ticket.buyer_email.split("@")[0],
      ticketName: ticket.ticket_name ?? "Ingresso",
      whenText: ticket.when_text ?? "",
      locationText: ticket.location_text ?? "",
      ticketUrl: `${deps.siteUrl}/ingresso/${qrToken}`,
    });
  }
  return { handled: true };
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run lib/tickets/webhook.test.ts`
Expected: PASS.

- [ ] **Step 5: Implementar a rota (liga a lógica ao banco + Resend)**

```typescript
// app/api/asaas/webhook/route.ts
import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { rawServiceClient } from "@/lib/tournament/auth";
import { processWebhookEvent } from "@/lib/tickets/webhook";
import { sendTicketEmail } from "@/lib/email/ticket-email";

export async function POST(req: Request) {
  // Auth: o Asaas envia o token configurado no painel no header asaas-access-token.
  const token = req.headers.get("asaas-access-token");
  if (!process.env.ASAAS_WEBHOOK_TOKEN || token !== process.env.ASAAS_WEBHOOK_TOKEN) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const payload = await req.json().catch(() => null);
  const db = rawServiceClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  const result = await processWebhookEvent(payload, {
    async findTicketByPaymentId(paymentId) {
      const { data } = await db
        .from("tickets")
        .select("id,status,buyer_email,ticket_type_id,event_id")
        .eq("asaas_payment_id", paymentId)
        .maybeSingle();
      if (!data) return null;
      const { data: tt } = await db.from("ticket_types").select("name").eq("id", data.ticket_type_id).maybeSingle();
      const { data: ev } = await db.from("events").select("starts_at,location_text").eq("id", data.event_id).maybeSingle();
      const whenText = ev?.starts_at
        ? new Date(ev.starts_at).toLocaleString("pt-BR", { dateStyle: "long", timeStyle: "short", timeZone: "America/Sao_Paulo" })
        : "";
      return {
        id: data.id, status: data.status, buyer_email: data.buyer_email,
        ticket_name: tt?.name, when_text: whenText, location_text: ev?.location_text,
      };
    },
    async markPaid(ticketId, method) {
      const qrToken = nanoid(24);
      await db.from("tickets").update({
        status: "paid", paid_at: new Date().toISOString(), payment_method: method, qr_token: qrToken,
      }).eq("id", ticketId);
      return qrToken;
    },
    sendEmail: sendTicketEmail,
    siteUrl,
  });

  return NextResponse.json({ ok: true, ...result });
}
```

- [ ] **Step 6: Commit**

```bash
git add lib/tickets/webhook.ts lib/tickets/webhook.test.ts app/api/asaas/webhook/route.ts
git commit -m "feat(tickets): webhook Asaas confirma pagamento + dispara e-mail"
```

---

### Task 7: Página do ingresso (`/ingresso/[token]`)

**Files:**
- Create: `app/(public)/ingresso/[token]/page.tsx`
- Create: `app/(public)/ingresso/[token]/ticket-qr.tsx`

**Interfaces:**
- Consumes: `rawServiceClient`.
- Produces: rota pública que renderiza o ingresso pago com QR (usa `qrcode.react`).

- [ ] **Step 1: Componente client do QR**

```tsx
// app/(public)/ingresso/[token]/ticket-qr.tsx
"use client";
import { QRCodeSVG } from "qrcode.react";

export function TicketQr({ value }: { value: string }) {
  return (
    <div className="rounded-2xl bg-paper p-4">
      <QRCodeSVG value={value} size={240} level="M" />
    </div>
  );
}
```

- [ ] **Step 2: Página do ingresso**

```tsx
// app/(public)/ingresso/[token]/page.tsx
import { notFound } from "next/navigation";
import { rawServiceClient } from "@/lib/tournament/auth";
import { TicketQr } from "./ticket-qr";

export const dynamic = "force-dynamic";

export default async function IngressoPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const db = rawServiceClient();
  const { data: ticket } = await db
    .from("tickets")
    .select("id,status,buyer_name,ticket_type_id,event_id,qr_token,checked_in_at")
    .eq("qr_token", token)
    .maybeSingle();
  if (!ticket) notFound();

  const { data: tt } = await db.from("ticket_types").select("name").eq("id", ticket.ticket_type_id).maybeSingle();
  const { data: ev } = await db.from("events").select("name,starts_at,location_text").eq("id", ticket.event_id).maybeSingle();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const whenText = ev?.starts_at
    ? new Date(ev.starts_at).toLocaleString("pt-BR", { dateStyle: "long", timeStyle: "short", timeZone: "America/Sao_Paulo" })
    : "";

  return (
    <main className="min-h-dvh bg-ink text-paper flex flex-col items-center justify-center px-5 py-12">
      <div className="text-gold text-4xl font-bold">π</div>
      <h1 className="mt-2 text-xl font-semibold text-gold">{ev?.name}</h1>
      <p className="mt-1 text-sm text-gray-soft">{whenText}</p>

      <div className="mt-6">
        <TicketQr value={`${siteUrl}/ingresso/${ticket.qr_token}`} />
      </div>

      <div className="mt-6 w-full max-w-sm rounded-2xl border border-line bg-ink-2 p-5">
        <Row label="Nome" value={ticket.buyer_name} />
        <Row label="Ingresso" value={tt?.name ?? "—"} gold />
        <Row label="Local" value={ev?.location_text ?? "—"} />
        <Row label="Status" value={ticket.checked_in_at ? "Check-in feito ✓" : "Pago ✓"} />
      </div>
      <p className="mt-4 text-xs text-gray-soft text-center max-w-xs">
        Apresente este QR Code na entrada. Salve um print por garantia.
      </p>
    </main>
  );
}

function Row({ label, value, gold }: { label: string; value: string; gold?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-gray-soft">{label}</span>
      <span className={gold ? "text-gold font-semibold" : "text-paper"}>{value}</span>
    </div>
  );
}
```

- [ ] **Step 3: Verificação manual**

Run: `npm run dev`, depois (após ter um ticket pago da Task 9) abrir `http://localhost:3000/ingresso/<qr_token>`.
Expected: mostra QR + dados. Token inexistente → 404.

- [ ] **Step 4: Commit**

```bash
git add "app/(public)/ingresso"
git commit -m "feat(tickets): página pública do ingresso com QR"
```

---

### Task 8: LP do evento (`/evento/[slug]`)

**Files:**
- Create: `app/(public)/evento/[slug]/page.tsx`
- Create: `app/(public)/evento/[slug]/ticket-cards.tsx`
- Create: `app/(public)/evento/[slug]/checkout-form.tsx`

**Interfaces:**
- Consumes: `getEventBySlugPublic`, `createTicketOrder`, `hasCapacity`.
- Produces: LP pública com hero + planos + checkout que redireciona pro `invoiceUrl`.

- [ ] **Step 1: Cards de ingresso (seleção, client)**

```tsx
// app/(public)/evento/[slug]/ticket-cards.tsx
"use client";
import type { TicketType } from "@/lib/tickets/types";

export function TicketCards({
  types, selectedId, onSelect,
}: {
  types: TicketType[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {types.map((t) => {
        const active = t.id === selectedId;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onSelect(t.id)}
            className={`text-left rounded-2xl border p-5 transition ${
              active ? "border-gold bg-ink-2" : "border-line bg-ink-2/40 hover:border-gold/50"
            }`}
          >
            <div className="text-gold font-semibold">{t.name}</div>
            <div className="mt-1 text-2xl font-bold text-paper">
              R$ {(t.priceCents / 100).toFixed(2).replace(".", ",")}
            </div>
            <div className="mt-2 text-sm text-gray-soft">{t.description}</div>
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Formulário de checkout (client)**

```tsx
// app/(public)/evento/[slug]/checkout-form.tsx
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
```

- [ ] **Step 3: Página da LP (server)**

```tsx
// app/(public)/evento/[slug]/page.tsx
import { notFound } from "next/navigation";
import { getEventBySlugPublic } from "@/lib/tickets/orders";
import { hasCapacity } from "@/lib/tickets/capacity";
import { CheckoutForm } from "./checkout-form";

export const dynamic = "force-dynamic";

export default async function EventoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getEventBySlugPublic(slug);
  if (!data) notFound();
  const { event, ticketTypes, soldCount } = data;
  const soldOut = !event.salesOpen || !hasCapacity(soldCount, event.capacity);
  const remaining = event.capacity != null ? Math.max(0, event.capacity - soldCount) : null;
  const whenText = new Date(event.startsAt).toLocaleString("pt-BR", {
    dateStyle: "long", timeStyle: "short", timeZone: "America/Sao_Paulo",
  });

  return (
    <main className="min-h-dvh bg-ink text-paper">
      {/* HERO */}
      <section className="relative flex flex-col items-center px-5 pt-16 pb-12 text-center">
        <div className="text-gold text-6xl font-bold drop-shadow-[0_0_30px_rgba(217,184,118,0.35)]">π</div>
        <h1 className="mt-4 text-3xl font-bold text-gold sm:text-4xl">{event.name}</h1>
        <p className="mt-3 text-gray-soft">{whenText}</p>
        <p className="mt-1 text-sm text-gray-soft max-w-md">{event.locationText}</p>
        {remaining != null && (
          <p className="mt-4 text-xs uppercase tracking-wide text-gold/80">
            {remaining > 0 ? `${remaining} de ${event.capacity} vagas restantes` : "Esgotado"}
          </p>
        )}
        <a href="#ingressos" className="mt-6 rounded-full bg-gold px-7 py-3 font-bold text-ink">Garantir meu ingresso</a>
      </section>

      {/* INGRESSOS / CHECKOUT */}
      <section id="ingressos" className="mx-auto max-w-xl px-5 pb-20">
        <h2 className="mb-5 text-center text-xl font-semibold text-paper">Escolha seu ingresso</h2>
        <CheckoutForm types={ticketTypes} soldOut={soldOut} />
      </section>
    </main>
  );
}
```

- [ ] **Step 4: Verificação manual**

Run: `npm run dev`, abrir `http://localhost:3000/evento/poker-pi-11-07`.
Expected: hero com π dourado, contador de vagas, 2 planos, formulário. Selecionar plano + preencher → clica → (com sandbox configurado na Task 9) redireciona pro checkout Asaas.

- [ ] **Step 5: Commit**

```bash
git add "app/(public)/evento"
git commit -m "feat(tickets): LP premium do evento com checkout"
```

---

### Task 9: Check-in + gestão de vendas (admin) + verificação E2E sandbox

**Files:**
- Create: `lib/tickets/checkin.ts`
- Create: `app/admin/checkin/page.tsx`, `app/admin/checkin/qr-scanner.tsx`
- Create: `app/admin/events/[id]/ingressos/page.tsx`
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: `requireAdmin`, `rawServiceClient`.
- Produces: `checkInTicket(qrToken: string): Promise<{ ok: true; buyerName: string; ticketName: string } | { ok: false; error: string }>`

- [ ] **Step 1: Server Action de check-in**

```typescript
// lib/tickets/checkin.ts
"use server";
import { requireAdmin, rawServiceClient } from "@/lib/tournament/auth";

export async function checkInTicket(
  qrToken: string,
): Promise<{ ok: true; buyerName: string; ticketName: string; already: boolean } | { ok: false; error: string }> {
  const { userId } = await requireAdmin();
  const db = rawServiceClient();

  const { data: ticket } = await db
    .from("tickets")
    .select("id,status,buyer_name,checked_in_at,ticket_type_id,event_id,player_id")
    .eq("qr_token", qrToken)
    .maybeSingle();
  if (!ticket) return { ok: false, error: "Ingresso não encontrado." };
  if (ticket.status !== "paid") return { ok: false, error: "Ingresso não está pago." };

  const { data: tt } = await db.from("ticket_types").select("name").eq("id", ticket.ticket_type_id).maybeSingle();
  const ticketName = tt?.name ?? "Ingresso";
  if (ticket.checked_in_at) {
    return { ok: true, buyerName: ticket.buyer_name, ticketName, already: true };
  }

  // cria/liga o player no evento (estado PRESENTE)
  let playerId = ticket.player_id as string | null;
  if (!playerId) {
    const { data: player } = await db
      .from("players")
      .insert({ event_id: ticket.event_id, name: ticket.buyer_name, state: "PRESENTE" })
      .select("id")
      .single();
    playerId = player?.id ?? null;
  }

  await db.from("tickets").update({
    checked_in_at: new Date().toISOString(),
    checked_in_by: userId,
    player_id: playerId,
  }).eq("id", ticket.id);

  return { ok: true, buyerName: ticket.buyer_name, ticketName, already: false };
}
```

> Conferir no schema real de `players` os nomes de coluna obrigatórios (`name`, `state`, `event_id`) e ajustar o INSERT se houver `not null` adicional (ex.: `player_token`). Esse ajuste faz parte deste passo.

- [ ] **Step 2: Scanner de QR (client)**

```tsx
// app/admin/checkin/qr-scanner.tsx
"use client";
import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { checkInTicket } from "@/lib/tickets/checkin";

function extractToken(text: string): string {
  const m = text.match(/\/ingresso\/([^/?#]+)/);
  return m ? m[1] : text.trim();
}

export function QrScanner() {
  const ref = useRef<HTMLDivElement>(null);
  const [result, setResult] = useState<string | null>(null);
  const busy = useRef(false);

  useEffect(() => {
    const scanner = new Html5Qrcode("qr-reader");
    scanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: 250 },
      async (decoded) => {
        if (busy.current) return;
        busy.current = true;
        const r = await checkInTicket(extractToken(decoded));
        setResult(r.ok
          ? `${r.already ? "JÁ ENTROU — " : "✓ "}${r.buyerName} · ${r.ticketName}`
          : `✗ ${r.error}`);
        setTimeout(() => { busy.current = false; }, 2500);
      },
      () => {},
    ).catch(() => setResult("Não consegui abrir a câmera."));
    return () => { scanner.stop().catch(() => {}); };
  }, []);

  return (
    <div className="space-y-4">
      <div id="qr-reader" ref={ref} className="overflow-hidden rounded-2xl border border-line" />
      {result && <p className="rounded-xl bg-ink-2 p-4 text-center text-lg font-semibold text-gold">{result}</p>}
    </div>
  );
}
```

- [ ] **Step 3: Página de check-in (admin)**

```tsx
// app/admin/checkin/page.tsx
import { requireAdmin } from "@/lib/tournament/auth";
import { QrScanner } from "./qr-scanner";

export const dynamic = "force-dynamic";

export default async function CheckinPage() {
  await requireAdmin();
  return (
    <main className="mx-auto max-w-md px-5 py-8">
      <h1 className="mb-4 text-xl font-bold text-gold">Check-in na portaria</h1>
      <QrScanner />
    </main>
  );
}
```

- [ ] **Step 4: Página de gestão de vendas (admin)**

```tsx
// app/admin/events/[id]/ingressos/page.tsx
import { requireAdmin, rawServiceClient } from "@/lib/tournament/auth";

export const dynamic = "force-dynamic";

export default async function IngressosAdminPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const db = rawServiceClient();
  const { data: rows } = await db
    .from("tickets")
    .select("buyer_name,buyer_email,amount_cents,status,payment_method,checked_in_at,created_at")
    .eq("event_id", id)
    .order("created_at", { ascending: false });
  const tickets = rows ?? [];
  const paid = tickets.filter((t) => t.status === "paid");

  return (
    <main className="mx-auto max-w-3xl px-5 py-8">
      <h1 className="text-xl font-bold text-gold">Ingressos</h1>
      <p className="mt-1 text-sm text-gray-soft">
        {paid.length} pagos · {tickets.filter((t) => t.checked_in_at).length} presentes
      </p>
      <div className="mt-5 overflow-hidden rounded-2xl border border-line">
        <table className="w-full text-sm">
          <thead className="bg-ink-2 text-gray-soft">
            <tr><th className="p-3 text-left">Nome</th><th className="p-3 text-left">Status</th><th className="p-3 text-right">Valor</th><th className="p-3 text-center">Presença</th></tr>
          </thead>
          <tbody>
            {tickets.map((t, i) => (
              <tr key={i} className="border-t border-line">
                <td className="p-3">{t.buyer_name}<div className="text-xs text-gray-soft">{t.buyer_email}</div></td>
                <td className="p-3">{t.status}</td>
                <td className="p-3 text-right">R$ {(t.amount_cents / 100).toFixed(2).replace(".", ",")}</td>
                <td className="p-3 text-center">{t.checked_in_at ? "✓" : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
```

- [ ] **Step 5: Configurar webhook no Asaas (sandbox) e testar a compra ponta-a-ponta**

1. Garantir `ASAAS_ENV=sandbox` e `NEXT_PUBLIC_SITE_URL` apontando pra URL pública de teste (deploy de preview na Vercel, ou um túnel `ngrok http 3000`).
2. No painel **Asaas sandbox** → Integrações → Webhooks → criar apontando pra `<URL pública>/api/asaas/webhook`, com o token igual a `ASAAS_WEBHOOK_TOKEN` (header `asaas-access-token`).
3. Abrir `/evento/poker-pi-11-07`, comprar um ingresso, pagar com PIX/cartão **de teste do sandbox**.
4. Confirmar: webhook chega → ticket vira `paid` → redireciona/abre `/ingresso/<token>` com QR → e-mail chega (se domínio verificado).
5. Logar como admin, abrir `/admin/checkin`, escanear o QR → vira presente; conferir em `/admin/events/<id>/ingressos`.

Expected: fluxo completo funciona em sandbox, sem dinheiro real.

- [ ] **Step 6: Atualizar CLAUDE.md (status) e rodar build**

Atualizar a seção "Status atual" do `CLAUDE.md` registrando a iteração de venda de ingressos. Depois:

Run: `npm test && npx tsc --noEmit -p . && npx next build`
Expected: testes passam, sem erro de tipo, build OK.

- [ ] **Step 7: Commit**

```bash
git add lib/tickets/checkin.ts "app/admin/checkin" "app/admin/events/[id]/ingressos" CLAUDE.md
git commit -m "feat(tickets): check-in na portaria + gestão de vendas admin"
```

---

## Pós-implementação (antes do lançamento real)

> Não são tasks de código — são o checklist de virada pra produção, a fazer junto com o usuário.

- [ ] Trocar `ASAAS_ENV=production` no ambiente de produção (Vercel).
- [ ] Recriar o webhook no **Asaas produção** apontando pro domínio final.
- [ ] **Regenerar a chave de produção do Asaas** (foi exposta no chat de setup) e atualizar a env.
- [ ] Apontar `mesapigroup.com` pro deploy na Vercel (registros DNS na Hostinger) e setar `NEXT_PUBLIC_SITE_URL=https://mesapigroup.com`.
- [ ] Conferir e-mail real chegando (domínio Resend verificado) — enviar um ingresso de teste pra si mesmo.
- [ ] Adicionar as fotos da 1ª edição na LP.

---

## Self-Review (preenchido pelo autor do plano)

- **Cobertura do spec:** LP (Task 8), 2 ingressos + vagas (Tasks 1,2,8), checkout Asaas (Tasks 3,4), webhook (Task 6), ingresso QR na tela (Task 7), e-mail Resend (Task 5), check-in integrado a players (Task 9), gestão admin (Task 9), schema (Task 1), segurança/rate-limit/CPF (Tasks 2,4,6), sandbox→produção (pós-implementação). ✔
- **Decisões abertas do spec resolvidas:** vagas contam só `paid` (Task 4); cartão à vista (billingType UNDEFINED, sem parcelamento); slug `poker-pi-11-07`. ✔
- **Consistência de tipos:** `TicketType`/`Ticket` definidos na Task 1 e consumidos igual nas Tasks 4/7/8; `createAsaasPayment` retorna `{id, invoiceUrl}` usado igual na Task 4; `processWebhookEvent`/`WebhookDeps` casados entre Task 6 lógica e rota. ✔
- **Placeholders:** nenhum "TODO/TBD"; os dois pontos de "conferir schema real" (seed do event, insert de player) são verificações explícitas com ação definida, não lacunas. ✔
