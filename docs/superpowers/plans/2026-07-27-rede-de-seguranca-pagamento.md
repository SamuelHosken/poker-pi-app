# Rede de segurança do caminho do dinheiro (Fase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cobrir as 4 invariantes de dinheiro que hoje não têm teste, e fechar 4 lacunas estruturais, sem tocar em nenhum gateway de pagamento.

**Architecture:** Extrair a decisão pura de dentro da orquestração de banco (o padrão que o repo já usa em `paymentEligibilityError`, `isAsaasPaid` e `buildWebhookDeps`), e testar a decisão. Onde a garantia precisa ser inquebrável, empurrar para o banco como constraint em vez de código de aplicação. Nenhuma tarefa depende das respostas da Stripe.

**Tech Stack:** TypeScript estrito, vitest (`npm test` = `vitest run`, ambiente node, alias `@` para a raiz do repo), Supabase Postgres, Next.js App Router.

## Global Constraints

- Dois repos: `poker-pi-app` (ingressos) e `poker-pi-v2` (buy-in/rebuy). Cada tarefa declara o seu.
- `lib/types/database.types.ts` é mantido **à mão**. Nunca rodar `npm run gen:types`: ele apaga exports customizados e quebra o build.
- Trabalho de bar acontece no worktree `poker-pi-v2-bar`. Este plano não toca em bar.
- Zero `any` em TypeScript.
- Português brasileiro em toda a UI, inglês no código.
- **Nunca usar o caractere travessão** em UI, copy, e-mail, banco ou comentário.
- Nenhuma tarefa deste plano faz deploy. Deploy é sempre humano.
- Próximo número de migration: `poker-pi-app` = `0028`, `poker-pi-v2` = `0009`.
- Comandos rodam a partir da raiz do repo da tarefa.

---

### Task 1: Invariante I1 na aplicação (1 ingresso pago por CPF por evento)

**Repo:** `poker-pi-app`

Hoje a regra "no máximo 1 pago por CPF por evento" está copiada em três lugares
(`orders.ts:103-105`, `manual.ts:28-37`, `manual.ts:72-78`), cada um com uma variação, e
nenhum tem teste. Extrair para uma decisão pura e usar nos três.

**Files:**
- Create: `lib/tickets/dedup.ts`
- Create: `lib/tickets/dedup.test.ts`
- Modify: `lib/tickets/orders.ts:95-120`
- Modify: `lib/tickets/manual.ts:20-37` e `lib/tickets/manual.ts:71-78`

**Interfaces:**
- Consumes: nada
- Produces: `type CpfTicketRow = { id: string; status: string; asaas_payment_id: string | null }`,
  `function blocksNewPaidTicket(rows: CpfTicketRow[], selfId?: string): boolean`,
  `function pendingToCancel(rows: CpfTicketRow[], selfId?: string): CpfTicketRow[]`

- [ ] **Step 1: Write the failing test**

Create `lib/tickets/dedup.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { blocksNewPaidTicket, pendingToCancel, type CpfTicketRow } from "./dedup";

const row = (over: Partial<CpfTicketRow> & { id: string }): CpfTicketRow => ({
  status: "pending",
  asaas_payment_id: null,
  ...over,
});

describe("blocksNewPaidTicket", () => {
  it("bloqueia quando ja existe um pago com esse CPF no evento", () => {
    expect(blocksNewPaidTicket([row({ id: "t1", status: "paid" })])).toBe(true);
  });

  it("nao bloqueia quando so existem pendentes", () => {
    expect(blocksNewPaidTicket([row({ id: "t1" }), row({ id: "t2" })])).toBe(false);
  });

  it("nao bloqueia com a lista vazia", () => {
    expect(blocksNewPaidTicket([])).toBe(false);
  });

  it("ignora o proprio ticket: confirmar um pendente que ja virou pago nao se auto-bloqueia", () => {
    expect(blocksNewPaidTicket([row({ id: "t1", status: "paid" })], "t1")).toBe(false);
  });

  it("bloqueia quando existe OUTRO pago, mesmo confirmando um pendente", () => {
    const rows = [row({ id: "t1" }), row({ id: "t2", status: "paid" })];
    expect(blocksNewPaidTicket(rows, "t1")).toBe(true);
  });

  it("canceled e refunded nao bloqueiam", () => {
    const rows = [row({ id: "t1", status: "canceled" }), row({ id: "t2", status: "refunded" })];
    expect(blocksNewPaidTicket(rows)).toBe(false);
  });
});

describe("pendingToCancel", () => {
  it("devolve so os pendentes", () => {
    const rows = [
      row({ id: "t1" }),
      row({ id: "t2", status: "canceled" }),
      row({ id: "t3", asaas_payment_id: "pay_9" }),
    ];
    expect(pendingToCancel(rows).map((r) => r.id)).toEqual(["t1", "t3"]);
  });

  it("nunca devolve o proprio ticket", () => {
    const rows = [row({ id: "t1" }), row({ id: "t2" })];
    expect(pendingToCancel(rows, "t1").map((r) => r.id)).toEqual(["t2"]);
  });

  it("preserva o asaas_payment_id, que o caller usa pra cancelar a cobranca", () => {
    expect(pendingToCancel([row({ id: "t1", asaas_payment_id: "pay_9" })])[0].asaas_payment_id).toBe("pay_9");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lib/tickets/dedup.test.ts`
Expected: FAIL com `Failed to resolve import "./dedup"`

- [ ] **Step 3: Write minimal implementation**

Create `lib/tickets/dedup.ts`:

```ts
/**
 * Invariante I1: no maximo 1 ingresso PAGO por CPF por evento.
 *
 * Decisao pura, separada da orquestracao de Supabase, para ser testavel sem
 * banco. O caller e responsavel por fazer a query filtrando por
 * (event_id, buyer_cpf) e status in ('paid','pending').
 *
 * O banco tambem garante isso (indice unico parcial, migration 0028). Aqui e
 * so pra dar mensagem boa pro usuario antes de bater na constraint.
 */
export type CpfTicketRow = { id: string; status: string; asaas_payment_id: string | null };

/**
 * `selfId` e o ticket que esta sendo confirmado agora. Ele nao conta contra si
 * mesmo: sem isso, confirmar um pendente duas vezes se auto-bloquearia.
 */
export function blocksNewPaidTicket(rows: CpfTicketRow[], selfId?: string): boolean {
  return rows.some((r) => r.status === "paid" && r.id !== selfId);
}

/** Pendentes antigos do mesmo CPF, que o caller deve cancelar antes de criar a nova cobranca. */
export function pendingToCancel(rows: CpfTicketRow[], selfId?: string): CpfTicketRow[] {
  return rows.filter((r) => r.status === "pending" && r.id !== selfId);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- lib/tickets/dedup.test.ts`
Expected: PASS, 9 casos

- [ ] **Step 5: Usar a decisão pura em `orders.ts`**

Em `lib/tickets/orders.ts`, adicionar ao bloco de imports:

```ts
import { blocksNewPaidTicket, pendingToCancel, type CpfTicketRow } from "./dedup";
```

Substituir as linhas 102 a 106 (da atribuição de `cpfRows` até o `for`), mantendo
tudo dentro do `for` intacto:

```ts
  const cpfRows = (sameCpf ?? []) as CpfTicketRow[];
  if (blocksNewPaidTicket(cpfRows)) {
    return { ok: false, error: "Você já tem um ingresso com esse CPF. Confira seu e-mail." };
  }
  for (const old of pendingToCancel(cpfRows)) {
```

- [ ] **Step 6: Usar a decisão pura em `manual.ts`**

Em `lib/tickets/manual.ts`, adicionar ao bloco de imports:

```ts
import { blocksNewPaidTicket, type CpfTicketRow } from "./dedup";
```

Em `confirmTicketPaid`, substituir a query de duplicata (linhas 29 a 37) por uma
que não filtra por status no banco, deixando a decisão com a função pura:

```ts
  if (self && self.status !== "paid" && self.buyer_cpf) {
    const { data: dup } = await db
      .from("tickets")
      .select("id, status, asaas_payment_id")
      .eq("event_id", self.event_id)
      .eq("buyer_cpf", self.buyer_cpf);
    if (blocksNewPaidTicket((dup ?? []) as CpfTicketRow[], ticketId)) {
      return { handled: false, reason: "Ja existe um ingresso pago com esse CPF." };
    }
  }
```

Em `addPaidTicket`, substituir a query de duplicata (linhas 72 a 78):

```ts
  const { data: dup } = await db
    .from("tickets")
    .select("id, status, asaas_payment_id")
    .eq("event_id", input.eventId)
    .eq("buyer_cpf", cpf);
  if (blocksNewPaidTicket((dup ?? []) as CpfTicketRow[])) {
    return { ok: false, error: "Ja existe um ingresso pago com esse CPF." };
  }
```

- [ ] **Step 7: Run the full suite and the type check**

Run: `npm test && npx tsc --noEmit -p .`
Expected: PASS, e nenhum erro de tipo

- [ ] **Step 8: Commit**

```bash
git add lib/tickets/dedup.ts lib/tickets/dedup.test.ts lib/tickets/orders.ts lib/tickets/manual.ts
git commit -m "test(tickets): invariante I1 (1 pago por CPF por evento) extraida e coberta"
```

**Verificação (loop):** `npm test -- lib/tickets/dedup.test.ts && npx tsc --noEmit -p .`
**Gate humano:** não

---

### Task 2: Invariante I1 no banco (constraint, não confiança)

**Repo:** `poker-pi-app`

Código de aplicação não sobrevive a corrida. Duas confirmações simultâneas do mesmo CPF
passam pelas duas checagens da Task 1 antes de qualquer uma escrever. O banco resolve.

**Files:**
- Create: `supabase/migrations/0028_one_paid_ticket_per_cpf.sql`

**Interfaces:**
- Consumes: nada
- Produces: índice `uq_tickets_one_paid_per_cpf_event`

- [ ] **Step 1: Checar se já existe violação em produção**

A criação do índice **falha** se já houver duplicata. Rodar antes, no SQL editor do Supabase:

```sql
select event_id, buyer_cpf, count(*) as pagos
from public.tickets
where status = 'paid'
group by event_id, buyer_cpf
having count(*) > 1;
```

Expected: 0 linhas. Se voltar alguma, **parar e chamar o humano**: significa que a
invariante já está violada em produção e alguém precisa decidir qual ingresso vale.

- [ ] **Step 2: Escrever a migration**

Create `supabase/migrations/0028_one_paid_ticket_per_cpf.sql`:

```sql
-- Invariante I1: no maximo 1 ingresso PAGO por CPF por evento.
--
-- A regra ja existe em codigo (lib/tickets/dedup.ts), mas codigo de aplicacao
-- nao segura corrida: duas confirmacoes simultaneas do mesmo CPF passam pelas
-- duas checagens antes de qualquer uma escrever. O indice parcial e a unica
-- garantia real.
--
-- Parcial de proposito: pending, canceled e refunded podem repetir a vontade.
-- So 'paid' e exclusivo.
create unique index if not exists uq_tickets_one_paid_per_cpf_event
  on public.tickets (event_id, buyer_cpf)
  where status = 'paid';
```

- [ ] **Step 3: Aplicar em dev e provar que a constraint morde**

Aplicar a migration no Supabase e rodar no SQL editor, substituindo os ids por
valores reais de um evento de teste:

```sql
-- deve falhar com: duplicate key value violates unique constraint
insert into public.tickets
  (event_id, ticket_type_id, buyer_name, buyer_email, buyer_phone, buyer_cpf,
   amount_cents, status)
select event_id, ticket_type_id, buyer_name, buyer_email, buyer_phone, buyer_cpf,
       amount_cents, 'paid'
from public.tickets
where status = 'paid'
limit 1;
```

Expected: erro `duplicate key value violates unique constraint "uq_tickets_one_paid_per_cpf_event"`

- [ ] **Step 4: Tratar o erro de constraint nos dois callers**

Em `lib/tickets/webhook-deps.ts`, dentro de `markPaid`, o `UPDATE` agora pode falhar
por violação de índice. Substituir a linha 73:

```ts
      if (error) {
        // 23505 = unique_violation: outro ticket do mesmo CPF ja esta pago
        // (invariante I1, indice uq_tickets_one_paid_per_cpf_event). Nao e erro
        // de infra: e a constraint funcionando. Devolve null como "perdeu a
        // corrida", que o confirmTicket ja trata sem reenviar e-mail.
        //
        // EMENDA (revisao da Task 2): este null NAO e a mesma coisa que a
        // corrida benigna. Pode significar que o gateway capturou o dinheiro
        // deste ticket e o UPDATE foi barrado porque OUTRO ticket do mesmo CPF
        // ja esta pago: dinheiro capturado, ingresso preso em pending, e o
        // reconcile so cancela por idade em 2 dias. O log e a unica pista que o
        // time tem. console.error, nao warn: isso e dinheiro preso.
        if ((error as { code?: string }).code === "23505") {
          console.error(
            `[webhook] markPaid: dinheiro capturado mas UPDATE barrado por constraint (23505) - ticket ${ticketId}`,
          );
          return null;
        }
        throw new Error(`DB update failed: ${error.message}`);
      }
```

- [ ] **Step 5: Run the full suite**

Run: `npm test && npx tsc --noEmit -p .`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/0028_one_paid_ticket_per_cpf.sql lib/tickets/webhook-deps.ts
git commit -m "feat(db): indice unico parcial garante 1 ingresso pago por CPF por evento"
```

**Verificação (loop):** `npm test && npx tsc --noEmit -p .`
**Gate humano:** **sim.** Aplicar migration em produção é humano, e o Step 1 pode revelar dados sujos.

---

### Task 3: Invariante I2 (não creditar valor divergente)

**Repo:** `poker-pi-v2`

A guarda de valor existe em `lib/tournament/payments.ts:151-155` e não tem teste. Pior:
ela devolve silenciosamente, então uma cobrança com valor errado fica PENDING para sempre
sem ninguém saber. Extrair a decisão e devolver o motivo.

**Files:**
- Create: `lib/tournament/credit-decision.ts`
- Create: `lib/tournament/credit-decision.test.ts`
- Modify: `lib/tournament/payments.ts:150-155`

**Interfaces:**
- Consumes: nada
- Produces: `type CreditDecision = { credit: true } | { credit: false; reason: "already-paid" | "value-mismatch" }`,
  `function decideCredit(args: { status: string; expectedCents: number; paidValueCents?: number }): CreditDecision`

- [ ] **Step 1: Write the failing test**

Create `lib/tournament/credit-decision.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { decideCredit } from "./credit-decision";

describe("decideCredit", () => {
  it("credita quando esta PENDING e o valor bate", () => {
    expect(decideCredit({ status: "PENDING", expectedCents: 2500, paidValueCents: 2500 }))
      .toEqual({ credit: true });
  });

  it("credita quando o valor pago nao foi informado (confirmacao manual do admin)", () => {
    expect(decideCredit({ status: "PENDING", expectedCents: 2500 }))
      .toEqual({ credit: true });
  });

  it("nao credita duas vezes: ja esta PAID", () => {
    expect(decideCredit({ status: "PAID", expectedCents: 2500, paidValueCents: 2500 }))
      .toEqual({ credit: false, reason: "already-paid" });
  });

  it("nao credita quando pagaram menos", () => {
    expect(decideCredit({ status: "PENDING", expectedCents: 4500, paidValueCents: 2500 }))
      .toEqual({ credit: false, reason: "value-mismatch" });
  });

  it("nao credita quando pagaram mais (pode ser cobranca trocada)", () => {
    expect(decideCredit({ status: "PENDING", expectedCents: 2500, paidValueCents: 4500 }))
      .toEqual({ credit: false, reason: "value-mismatch" });
  });

  it("zero pago nao passa como se fosse ausente", () => {
    expect(decideCredit({ status: "PENDING", expectedCents: 2500, paidValueCents: 0 }))
      .toEqual({ credit: false, reason: "value-mismatch" });
  });

  it("CANCELED nao credita", () => {
    expect(decideCredit({ status: "CANCELED", expectedCents: 2500 }))
      .toEqual({ credit: false, reason: "already-paid" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lib/tournament/credit-decision.test.ts`
Expected: FAIL com `Failed to resolve import "./credit-decision"`

- [ ] **Step 3: Write minimal implementation**

Create `lib/tournament/credit-decision.ts`:

```ts
/**
 * Invariante I2: nunca creditar um pagamento cujo valor pago diverge do
 * cobrado, e nunca creditar duas vezes.
 *
 * Decisao pura, separada do Supabase. `paidValueCents` ausente significa
 * confirmacao manual do admin (ele conferiu o extrato, nao ha valor vindo de
 * gateway). Zero e um valor de verdade, nao "ausente".
 */
export type CreditDecision =
  | { credit: true }
  | { credit: false; reason: "already-paid" | "value-mismatch" };

export function decideCredit(args: {
  status: string;
  expectedCents: number;
  paidValueCents?: number;
}): CreditDecision {
  if (args.status !== "PENDING") return { credit: false, reason: "already-paid" };
  if (args.paidValueCents != null && args.paidValueCents !== args.expectedCents) {
    return { credit: false, reason: "value-mismatch" };
  }
  return { credit: true };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- lib/tournament/credit-decision.test.ts`
Expected: PASS, 7 casos

- [ ] **Step 5: Usar em `applyPaid`**

Em `lib/tournament/payments.ts`, adicionar ao bloco de imports:

```ts
import { decideCredit } from "./credit-decision";
```

Substituir as linhas 151 a 155 (o `if (pay.status === "PAID") return;` e a guarda de valor) por:

```ts
  const decision = decideCredit({
    status: pay.status,
    expectedCents: pay.amount_cents,
    paidValueCents,
  });
  if (!decision.credit) {
    if (decision.reason === "value-mismatch") {
      console.warn(
        `[payments] valor divergente na cobranca ${pay.id}: pago ${paidValueCents}, esperado ${pay.amount_cents}. Nao creditado.`,
      );
    }
    return;
  }
```

- [ ] **Step 6: Run the full suite**

Run: `npm test && npx tsc --noEmit -p .`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add lib/tournament/credit-decision.ts lib/tournament/credit-decision.test.ts lib/tournament/payments.ts
git commit -m "test(payments): invariante I2 (valor divergente nao credita) extraida e coberta"
```

**Verificação (loop):** `npm test -- lib/tournament/credit-decision.test.ts && npx tsc --noEmit -p .`
**Gate humano:** não

---

### Task 4: Invariante I5 (pagamento nunca fica PAID sem crédito)

**Repo:** `poker-pi-v2`

O rollback existe em `payments.ts:174-187` e é a lógica mais cara do sistema: se ele
falhar, alguém pagou e não foi creditado, de forma irrecuperável. Não tem teste porque
`applyPaid` chama `serviceClient()` direto. Dar a ela o mesmo tratamento que o repo já
deu ao webhook: dependências injetadas.

**Files:**
- Create: `lib/tournament/apply-paid.ts`
- Create: `lib/tournament/apply-paid.test.ts`
- Modify: `lib/tournament/payments.ts:150-192`

**Interfaces:**
- Consumes: `decideCredit` da Task 3
- Produces: `type ApplyPaidDeps`, `function applyPaidCore(pay, paidValueCents, deps): Promise<{ applied: boolean; reason?: string }>`

- [ ] **Step 1: Write the failing test**

Create `lib/tournament/apply-paid.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { applyPaidCore, type ApplyPaidDeps, type ApplyPaidRow } from "./apply-paid";

const payFixture: ApplyPaidRow = {
  id: "p1",
  player_id: "pl1",
  kind: "BUYIN",
  amount_cents: 2500,
  status: "PENDING",
};

function deps(over: Partial<ApplyPaidDeps> = {}): ApplyPaidDeps {
  return {
    claimPending: vi.fn().mockResolvedValue(true),
    revertToPending: vi.fn().mockResolvedValue(undefined),
    credit: vi.fn().mockResolvedValue({ ok: true }),
    notifyPaid: vi.fn().mockResolvedValue(undefined),
    notifyCreditFailed: vi.fn().mockResolvedValue(undefined),
    ...over,
  };
}

describe("applyPaidCore", () => {
  it("credita e avisa os admins no caminho feliz", async () => {
    const d = deps();
    const r = await applyPaidCore(payFixture, 2500, d);
    expect(r).toEqual({ applied: true });
    expect(d.claimPending).toHaveBeenCalledWith("p1");
    expect(d.credit).toHaveBeenCalledWith("pl1", "BUYIN");
    expect(d.notifyPaid).toHaveBeenCalled();
    expect(d.revertToPending).not.toHaveBeenCalled();
  });

  it("valor divergente nao chega a reivindicar a linha", async () => {
    const d = deps();
    const r = await applyPaidCore(payFixture, 9900, d);
    expect(r).toEqual({ applied: false, reason: "value-mismatch" });
    expect(d.claimPending).not.toHaveBeenCalled();
    expect(d.credit).not.toHaveBeenCalled();
  });

  it("corrida: se outro caminho ja reivindicou a linha, nao credita", async () => {
    const d = deps({ claimPending: vi.fn().mockResolvedValue(false) });
    const r = await applyPaidCore(payFixture, 2500, d);
    expect(r).toEqual({ applied: false, reason: "race-lost" });
    expect(d.credit).not.toHaveBeenCalled();
    expect(d.notifyPaid).not.toHaveBeenCalled();
  });

  it("I5: se o credito falha, REVERTE pra PENDING, alerta e lanca", async () => {
    const d = deps({ credit: vi.fn().mockResolvedValue({ ok: false, error: "rebuy fechado" }) });
    await expect(applyPaidCore(payFixture, 2500, d)).rejects.toThrow("rebuy fechado");
    expect(d.revertToPending).toHaveBeenCalledWith("p1");
    expect(d.notifyCreditFailed).toHaveBeenCalledWith(
      expect.objectContaining({ paymentId: "p1", playerId: "pl1", error: "rebuy fechado" }),
    );
    expect(d.notifyPaid).not.toHaveBeenCalled();
  });

  it("I5: reverte ANTES de lancar, senao o retry acha a linha travada em PAID", async () => {
    const order: string[] = [];
    const d = deps({
      credit: vi.fn().mockResolvedValue({ ok: false, error: "boom" }),
      revertToPending: vi.fn().mockImplementation(async () => { order.push("revert"); }),
    });
    await expect(applyPaidCore(payFixture, 2500, d)).rejects.toThrow();
    expect(order).toEqual(["revert"]);
  });

  it("REBUY credita pelo caminho de rebuy", async () => {
    const d = deps();
    await applyPaidCore({ ...payFixture, kind: "REBUY", amount_cents: 4500 }, 4500, d);
    expect(d.credit).toHaveBeenCalledWith("pl1", "REBUY");
  });

  it("ja PAID sai cedo sem tocar em nada", async () => {
    const d = deps();
    const r = await applyPaidCore({ ...payFixture, status: "PAID" }, 2500, d);
    expect(r).toEqual({ applied: false, reason: "already-paid" });
    expect(d.claimPending).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lib/tournament/apply-paid.test.ts`
Expected: FAIL com `Failed to resolve import "./apply-paid"`

- [ ] **Step 3: Write minimal implementation**

Create `lib/tournament/apply-paid.ts`:

```ts
import { decideCredit } from "./credit-decision";

export type ApplyPaidRow = {
  id: string;
  player_id: string;
  kind: "BUYIN" | "REBUY";
  amount_cents: number;
  status: string;
};

export type ApplyPaidDeps = {
  /** UPDATE atomico PENDING -> PAID. true se ESTA chamada venceu a corrida. */
  claimPending(paymentId: string): Promise<boolean>;
  /** Reverte PAID -> PENDING, reabrindo o portao pra um retry sequencial. */
  revertToPending(paymentId: string): Promise<void>;
  credit(playerId: string, kind: "BUYIN" | "REBUY"): Promise<{ ok: boolean; error?: string }>;
  notifyPaid(args: { playerId: string; kind: "BUYIN" | "REBUY"; amountCents: number; paymentId: string }): Promise<void>;
  notifyCreditFailed(args: { playerId: string; kind: "BUYIN" | "REBUY"; amountCents: number; paymentId: string; error?: string }): Promise<void>;
};

/**
 * Invariante I5: um pagamento nunca fica PAID sem o jogador creditado.
 *
 * O credito (setPaid/rebuyPlayer) NUNCA lanca: devolve { ok: false } em falha,
 * por exemplo quando o evento virou MESA_FINAL entre a cobranca e o pagamento.
 * Ignorar esse retorno deixaria a cobranca PAID sem credito, de forma
 * irrecuperavel, porque a guarda de idempotencia por PAID trava qualquer retry.
 *
 * Por isso: reverter para PENDING, alertar, e SO ENTAO lancar. A ordem importa.
 */
export async function applyPaidCore(
  pay: ApplyPaidRow,
  paidValueCents: number | undefined,
  deps: ApplyPaidDeps,
): Promise<{ applied: boolean; reason?: string }> {
  const decision = decideCredit({
    status: pay.status,
    expectedCents: pay.amount_cents,
    paidValueCents,
  });
  if (!decision.credit) return { applied: false, reason: decision.reason };

  const won = await deps.claimPending(pay.id);
  if (!won) return { applied: false, reason: "race-lost" };

  const credit = await deps.credit(pay.player_id, pay.kind);
  if (!credit.ok) {
    await deps.revertToPending(pay.id);
    await deps.notifyCreditFailed({
      playerId: pay.player_id,
      kind: pay.kind,
      amountCents: pay.amount_cents,
      paymentId: pay.id,
      error: credit.error,
    });
    throw new Error(`Credito do pagamento ${pay.id} falhou apos confirmacao: ${credit.error}`);
  }

  await deps.notifyPaid({
    playerId: pay.player_id,
    kind: pay.kind,
    amountCents: pay.amount_cents,
    paymentId: pay.id,
  });
  return { applied: true };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- lib/tournament/apply-paid.test.ts`
Expected: PASS, 7 casos

- [ ] **Step 5: Ligar `applyPaid` ao core**

Em `lib/tournament/payments.ts`, adicionar ao bloco de imports:

```ts
import { applyPaidCore, type ApplyPaidDeps, type ApplyPaidRow } from "./apply-paid";
```

Substituir o corpo inteiro de `applyPaid` (linhas 150 a 192) por:

```ts
async function applyPaid(pay: PaymentRow, paidValueCents?: number): Promise<void> {
  const db = serviceClient();
  const deps: ApplyPaidDeps = {
    async claimPending(paymentId) {
      const { data } = await db
        .from("v2_event_payments")
        .update({ status: "PAID", paid_at: new Date().toISOString() })
        .eq("id", paymentId)
        .eq("status", "PENDING")
        .select("id");
      return (data?.length ?? 0) > 0;
    },
    async revertToPending(paymentId) {
      await db
        .from("v2_event_payments")
        .update({ status: "PENDING", paid_at: null })
        .eq("id", paymentId);
    },
    async credit(playerId, kind) {
      return kind === "BUYIN" ? setPaid(playerId, true) : rebuyPlayer(playerId);
    },
    async notifyPaid(args) {
      void notifyAdminsPayment(args.playerId, args.kind, args.amountCents, args.paymentId)
        .catch(() => undefined);
    },
    async notifyCreditFailed(args) {
      void notifyAdminsPaymentCreditFailed(
        args.playerId, args.kind, args.amountCents, args.paymentId, args.error,
      ).catch(() => undefined);
    },
  };

  await applyPaidCore(pay as ApplyPaidRow, paidValueCents, deps);
}
```

- [ ] **Step 6: Run the full suite**

Run: `npm test && npx tsc --noEmit -p .`
Expected: PASS. Os 7 testes de `paymentEligibilityError` continuam verdes.

- [ ] **Step 7: Commit**

```bash
git add lib/tournament/apply-paid.ts lib/tournament/apply-paid.test.ts lib/tournament/payments.ts
git commit -m "test(payments): invariante I5 (rollback de credito) extraida e coberta"
```

**Verificação (loop):** `npm test -- lib/tournament/apply-paid.test.ts && npx tsc --noEmit -p .`
**Gate humano:** não

---

### Task 5: Invariante I3 (idempotência real do webhook)

**Repo:** `poker-pi-app`

`webhook.test.ts` cobre "ticket já pago não reprocessa", mas **não cobre** o caso que
importa de verdade: `markPaid` devolvendo `null` porque perdeu a corrida. Esse é o
caminho que o Asaas exercita a cada retry e a cada par CONFIRMED + RECEIVED. O código
existe em `webhook.ts:42` sem teste nenhum.

**Files:**
- Modify: `lib/tickets/webhook.test.ts` (adicionar casos ao `describe` existente)

**Interfaces:**
- Consumes: `processWebhookEvent`, `WebhookDeps` de `./webhook`
- Produces: nada

- [ ] **Step 1: Write the failing test**

Em `lib/tickets/webhook.test.ts`, adicionar antes do fechamento do `describe("processWebhookEvent")`:

```ts
  it("I3: markPaid devolve null (corrida perdida) e o e-mail NAO e reenviado", async () => {
    const d = deps({ markPaid: vi.fn().mockResolvedValue(null) });
    const r = await processWebhookEvent({ event: "PAYMENT_CONFIRMED", payment: { id: "pay_1" } }, d);
    expect(r.handled).toBe(false);
    expect(r.reason).toBe("já confirmado (corrida)");
    expect(d.sendEmail).not.toHaveBeenCalled();
  });

  it("I3: duas entregas do mesmo pagamento produzem UM e-mail", async () => {
    // Primeira entrega vence o gate atomico, a segunda perde: e exatamente o que
    // o par CONFIRMED + RECEIVED do Asaas faz em toda venda de cartao.
    const markPaid = vi.fn()
      .mockResolvedValueOnce("qr_abc")
      .mockResolvedValueOnce(null);
    const d = deps({ markPaid });
    const payload = { event: "PAYMENT_CONFIRMED", payment: { id: "pay_1" } };

    const first = await processWebhookEvent(payload, d);
    const second = await processWebhookEvent({ ...payload, event: "PAYMENT_RECEIVED" }, d);

    expect(first.handled).toBe(true);
    expect(second.handled).toBe(false);
    expect(d.sendEmail).toHaveBeenCalledTimes(1);
  });

  it("I3: estorno seguido de retry do estorno nao quebra", async () => {
    const d = deps();
    const payload = { event: "PAYMENT_REFUNDED", payment: { id: "pay_1" } };
    await processWebhookEvent(payload, d);
    const again = await processWebhookEvent(payload, d);
    expect(again.handled).toBe(true);
    expect(d.markRefunded).toHaveBeenCalledTimes(2);
    expect(d.sendEmail).not.toHaveBeenCalled();
  });
```

- [ ] **Step 2: Run test to verify the first two fail**

Run: `npm test -- lib/tickets/webhook.test.ts`
Expected: os dois primeiros casos novos podem já passar (o código existe). Se passarem,
**esse é o resultado correto**: eram caminhos implementados sem cobertura. O objetivo
aqui é travar o comportamento contra regressão, não descobrir bug. Registrar no commit
qual passou de primeira.

- [ ] **Step 3: Rodar a suíte inteira**

Run: `npm test`
Expected: PASS, 10 casos em `webhook.test.ts`

- [ ] **Step 4: Commit**

```bash
git add lib/tickets/webhook.test.ts
git commit -m "test(webhook): invariante I3 (idempotencia sob corrida e retry) coberta"
```

**Verificação (loop):** `npm test -- lib/tickets/webhook.test.ts`
**Gate humano:** não

---

### Task 6: Corrigir o drift de `TicketStatus`

**Repo:** `poker-pi-app`

A migration `0025` adicionou `'refunded'` ao CHECK do banco em 18/07, mas
`lib/tickets/types.ts:23` nunca foi atualizado. Hoje `mapTicketRow` faz cast de um
`"refunded"` real para um tipo que não o inclui: mentira de tipo em produção.

**Files:**
- Modify: `lib/tickets/types.ts:23`
- Create: `lib/tickets/types.test.ts`

**Interfaces:**
- Consumes: nada
- Produces: `TicketStatus` incluindo `"refunded"`

- [ ] **Step 1: Write the failing test**

Create `lib/tickets/types.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { mapTicketRow, type TicketStatus } from "./types";

describe("mapTicketRow", () => {
  it("aceita 'refunded', que a migration 0025 adicionou ao CHECK do banco", () => {
    // Se TicketStatus nao incluir "refunded", o tsc quebra nesta linha.
    const status: TicketStatus = "refunded";
    const t = mapTicketRow({
      id: "t1", event_id: "e1", ticket_type_id: "tt1",
      buyer_name: "Ana", buyer_email: "a@b.com", buyer_phone: "+5561999999999",
      buyer_cpf: "00000000000", amount_cents: 15000, status,
    });
    expect(t.status).toBe("refunded");
  });

  it("mapeia snake_case pra camelCase e usa null nos opcionais ausentes", () => {
    const t = mapTicketRow({
      id: "t1", event_id: "e1", ticket_type_id: "tt1",
      buyer_name: "Ana", buyer_email: "a@b.com", buyer_phone: "+5561999999999",
      buyer_cpf: "00000000000", amount_cents: 15000, status: "pending",
      charged_amount_cents: 15540, installments: 3, asaas_payment_id: "pay_9",
    });
    expect(t.chargedAmountCents).toBe(15540);
    expect(t.installments).toBe(3);
    expect(t.asaasPaymentId).toBe("pay_9");
    expect(t.qrToken).toBeNull();
    expect(t.paidAt).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsc --noEmit -p .`
Expected: FAIL com `Type '"refunded"' is not assignable to type 'TicketStatus'` em `types.test.ts`

- [ ] **Step 3: Write minimal implementation**

Em `lib/tickets/types.ts`, substituir a linha 23:

```ts
// 'refunded' entrou no CHECK do banco na migration 0025 (estorno/chargeback
// libera a vaga). Manter esta uniao em sincronia com o CHECK: sem isso,
// mapTicketRow faz cast de um valor real pra um tipo que nao o inclui.
export type TicketStatus = "pending" | "paid" | "canceled" | "refunded";
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsc --noEmit -p . && npm test -- lib/tickets/types.test.ts`
Expected: PASS, 2 casos, zero erro de tipo

- [ ] **Step 5: Commit**

```bash
git add lib/tickets/types.ts lib/tickets/types.test.ts
git commit -m "fix(tickets): TicketStatus inclui 'refunded' (drift com a migration 0025)"
```

**Verificação (loop):** `npx tsc --noEmit -p . && npm test -- lib/tickets/types.test.ts`
**Gate humano:** não

---

### Task 7: Timeout em toda chamada ao gateway

**Repo:** `poker-pi-app` (e o mesmo patch em `poker-pi-v2`)

Nenhuma das chamadas HTTP ao gateway tem timeout. Numa função serverless, uma chamada
pendurada consome o tempo inteiro e o comprador vê a compra travar sem erro. Isso já foi
apontado na review de 18/07 e continua aberto. Vale para o Asaas hoje e para o Stripe depois.

**Files:**
- Create: `lib/payments/fetch-timeout.ts`
- Create: `lib/payments/fetch-timeout.test.ts`
- Modify: `lib/payments/asaas.ts:13-52` (as três funções de transporte)

**Interfaces:**
- Consumes: nada
- Produces: `const GATEWAY_TIMEOUT_MS = 8000`,
  `function fetchWithTimeout(fetchImpl: typeof fetch, url: string, init: RequestInit, timeoutMs?: number): Promise<Response>`

- [ ] **Step 1: Write the failing test**

Create `lib/payments/fetch-timeout.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { fetchWithTimeout, GATEWAY_TIMEOUT_MS } from "./fetch-timeout";

/** fetch que so resolve se o AbortController mandar abortar. */
const hangingFetch: typeof fetch = (_url, init) =>
  new Promise((_resolve, reject) => {
    init?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
  });

describe("fetchWithTimeout", () => {
  it("aborta e lanca mensagem de timeout quando o gateway nao responde", async () => {
    await expect(fetchWithTimeout(hangingFetch, "https://api.asaas.com/v3/payments", {}, 10))
      .rejects.toThrow("Gateway timeout apos 10ms");
  });

  it("devolve a resposta normalmente quando o gateway responde a tempo", async () => {
    const ok = new Response('{"id":"pay_1"}', { status: 200 });
    const fast: typeof fetch = vi.fn().mockResolvedValue(ok);
    const res = await fetchWithTimeout(fast, "https://api.asaas.com/v3/payments", { method: "POST" }, 500);
    expect(res.status).toBe(200);
  });

  it("propaga o init original (metodo e headers) e adiciona o signal", async () => {
    const spy = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    await fetchWithTimeout(spy as unknown as typeof fetch, "https://x.test", {
      method: "POST",
      headers: { access_token: "k" },
    }, 500);
    const init = spy.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).access_token).toBe("k");
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("propaga erro de rede que nao e timeout, sem mascarar", async () => {
    const boom: typeof fetch = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));
    await expect(fetchWithTimeout(boom, "https://x.test", {}, 500))
      .rejects.toThrow("ECONNREFUSED");
  });

  it("o default e 8 segundos", () => {
    expect(GATEWAY_TIMEOUT_MS).toBe(8000);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lib/payments/fetch-timeout.test.ts`
Expected: FAIL com `Failed to resolve import "./fetch-timeout"`

- [ ] **Step 3: Write minimal implementation**

Create `lib/payments/fetch-timeout.ts`:

```ts
/**
 * Timeout em toda chamada ao gateway de pagamento.
 *
 * Numa funcao serverless, um fetch pendurado consome o tempo inteiro da
 * invocacao e o comprador ve a compra travar sem erro nenhum. 8 segundos e
 * folgado pro gateway e curto o bastante pra sobrar tempo de responder direito.
 */
export const GATEWAY_TIMEOUT_MS = 8000;

export async function fetchWithTimeout(
  fetchImpl: typeof fetch,
  url: string,
  init: RequestInit,
  timeoutMs: number = GATEWAY_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, { ...init, signal: controller.signal });
  } catch (err) {
    // Distingue timeout de erro de rede: mascarar os dois como "falhou" apaga a
    // informacao que diz se o problema e nosso ou do gateway.
    if (controller.signal.aborted) {
      throw new Error(`Gateway timeout apos ${timeoutMs}ms: ${url}`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- lib/payments/fetch-timeout.test.ts`
Expected: PASS, 5 casos

- [ ] **Step 5: Usar nas três funções de transporte do Asaas**

Em `lib/payments/asaas.ts`, adicionar ao topo, abaixo do import existente:

```ts
import { fetchWithTimeout } from "./fetch-timeout";
```

Substituir a chamada dentro de `asaasPost` (linhas 15 a 19):

```ts
  const res = await fetchWithTimeout(fetchImpl, `${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", access_token: apiKey },
    body: JSON.stringify(body),
  });
```

Substituir a chamada dentro de `asaasGet` (linha 36):

```ts
  const res = await fetchWithTimeout(fetchImpl, `${baseUrl}${path}`, { headers: { access_token: apiKey } });
```

Substituir a chamada dentro de `asaasDelete` (linha 46):

```ts
  const res = await fetchWithTimeout(fetchImpl, `${baseUrl}${path}`, {
    method: "DELETE",
    headers: { access_token: apiKey },
  });
```

- [ ] **Step 6: Rodar a suíte e confirmar que os testes existentes do Asaas seguem verdes**

Run: `npm test -- lib/payments/ && npx tsc --noEmit -p .`
Expected: PASS. Os 4 casos de `asaas.test.ts` e os 4 de `asaas-config.test.ts` continuam
passando, porque `fetchWithTimeout` repassa o `init` inteiro.

- [ ] **Step 7: Repetir em `poker-pi-v2`**

Copiar `lib/payments/fetch-timeout.ts` e `lib/payments/fetch-timeout.test.ts` para
`poker-pi-v2/lib/payments/`, e aplicar o mesmo patch em `poker-pi-v2/lib/payments/asaas.ts`
nas funções `asaasPost` (linhas 28 a 36) e `asaasGet` (linhas 38 a 42). O v2 não tem
`asaasDelete`.

Run (no `poker-pi-v2`): `npm test -- lib/payments/ && npx tsc --noEmit -p .`
Expected: PASS

- [ ] **Step 8: Commit (um por repo)**

```bash
git add lib/payments/fetch-timeout.ts lib/payments/fetch-timeout.test.ts lib/payments/asaas.ts
git commit -m "feat(payments): timeout de 8s em toda chamada ao gateway"
```

**Verificação (loop):** `npm test -- lib/payments/ && npx tsc --noEmit -p .` nos dois repos
**Gate humano:** não

---

### Task 8: Log cru dos eventos de webhook

**Repo:** `poker-pi-app`

Hoje, se um pagamento der errado, não existe forense: o payload do gateway não é
guardado em lugar nenhum. Foi apontado na review de 18/07 e é o que vai permitir
depurar a migração para o Stripe sem adivinhação.

**Files:**
- Create: `supabase/migrations/0029_webhook_events.sql`
- Modify: `lib/tickets/webhook.ts` (adicionar `recordEvent` a `WebhookDeps` e chamar na entrada)
- Modify: `lib/tickets/webhook.test.ts`
- Modify: `lib/tickets/webhook-deps.ts` (implementar `recordEvent`)

**Interfaces:**
- Consumes: `WebhookDeps` das tasks anteriores
- Produces: `WebhookDeps.recordEvent(args: { provider: string; event: string | null; paymentId: string | null; raw: unknown }): Promise<void>`

- [ ] **Step 1: Write the failing test**

Em `lib/tickets/webhook.test.ts`, adicionar `recordEvent` ao helper `deps` (dentro do objeto retornado, antes do `...over`):

```ts
    recordEvent: vi.fn().mockResolvedValue(undefined),
```

E adicionar os casos ao `describe("processWebhookEvent")`:

```ts
  it("registra o payload cru ANTES de decidir qualquer coisa", async () => {
    const d = deps();
    const payload = { event: "PAYMENT_CONFIRMED", payment: { id: "pay_1", billingType: "PIX" } };
    await processWebhookEvent(payload, d);
    expect(d.recordEvent).toHaveBeenCalledWith({
      provider: "asaas", event: "PAYMENT_CONFIRMED", paymentId: "pay_1", raw: payload,
    });
  });

  it("registra ate eventos que serao ignorados (e onde o bug se esconde)", async () => {
    const d = deps();
    await processWebhookEvent({ event: "PAYMENT_CREATED", payment: { id: "x" } }, d);
    expect(d.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event: "PAYMENT_CREATED", paymentId: "x" }),
    );
  });

  it("falha ao registrar NAO derruba o processamento do pagamento", async () => {
    const d = deps({ recordEvent: vi.fn().mockRejectedValue(new Error("tabela sumiu")) });
    const r = await processWebhookEvent({ event: "PAYMENT_CONFIRMED", payment: { id: "pay_1" } }, d);
    expect(r.handled).toBe(true);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lib/tickets/webhook.test.ts`
Expected: FAIL com `d.recordEvent is not a function` ou `expected "spy" to be called`

- [ ] **Step 3: Escrever a migration**

Create `supabase/migrations/0029_webhook_events.sql`:

```sql
-- Log append-only dos webhooks de gateway de pagamento.
--
-- Hoje, quando um pagamento da errado, nao existe forense: o payload do gateway
-- nao e guardado em lugar nenhum e a investigacao vira adivinhacao. Esta tabela
-- e escrita ANTES de qualquer decisao, inclusive pra eventos que serao
-- ignorados, que e justamente onde o bug costuma estar.
--
-- Nunca e lida pelo caminho quente. Escrita best-effort: falhar aqui nao pode
-- derrubar a confirmacao de um pagamento.
create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event text,
  payment_id text,
  raw jsonb not null,
  received_at timestamptz not null default now()
);

create index if not exists idx_webhook_events_payment on public.webhook_events (payment_id);
create index if not exists idx_webhook_events_received on public.webhook_events (received_at desc);

-- Mesma postura das outras tabelas de pagamento: RLS ligada, sem policy.
-- Acesso so via service role, server-side.
alter table public.webhook_events enable row level security;
```

- [ ] **Step 4: Adicionar `recordEvent` ao contrato e chamar na entrada**

Em `lib/tickets/webhook.ts`, adicionar ao tipo `WebhookDeps`, logo antes de `siteUrl`:

```ts
  /** Log append-only do payload cru. Best-effort: falhar aqui nao derruba o pagamento. */
  recordEvent(args: {
    provider: string;
    event: string | null;
    paymentId: string | null;
    raw: unknown;
  }): Promise<void>;
```

Em `processWebhookEvent`, inserir logo depois da desestruturação de `p` (após a linha 65)
e **antes** do `if (!p?.event)`:

```ts
  // Registra tudo que chega, inclusive o que sera ignorado. Best-effort de
  // proposito: um problema no log nunca pode impedir a confirmacao de um pagamento.
  await deps.recordEvent({
    provider: "asaas",
    event: p?.event ?? null,
    paymentId: p?.payment?.id ?? null,
    raw: payload,
  }).catch(() => undefined);
```

- [ ] **Step 5: Implementar em `webhook-deps.ts`**

Em `lib/tickets/webhook-deps.ts`, adicionar ao objeto retornado por `buildWebhookDeps`,
logo antes de `siteUrl`:

```ts
    async recordEvent({ provider, event, paymentId, raw }) {
      // `webhook_events` nao esta em database.types.ts (mantido a mao, e nao
      // inclui as tabelas de ticket), entao esta chamada e untyped, igual as
      // outras deste arquivo que tocam `tickets`.
      await db.from("webhook_events").insert({
        provider, event, payment_id: paymentId, raw,
      });
    },
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test -- lib/tickets/webhook.test.ts && npx tsc --noEmit -p .`
Expected: PASS, 13 casos

- [ ] **Step 7: Run the full suite**

Run: `npm test && npm run lint && npm run build`
Expected: PASS nos três

- [ ] **Step 8: Commit**

```bash
git add supabase/migrations/0029_webhook_events.sql lib/tickets/webhook.ts lib/tickets/webhook-deps.ts lib/tickets/webhook.test.ts
git commit -m "feat(webhook): log append-only do payload cru pra forense de pagamento"
```

**Verificação (loop):** `npm test && npx tsc --noEmit -p .`
**Gate humano:** **sim**, para aplicar a migration em produção.

---

## Checklist de qualidade (roda ao fim de cada tarefa)

- [ ] O teste foi escrito antes e foi visto falhando (exceto Task 5, que trava comportamento já implementado, e isso está declarado lá)
- [ ] A mensagem de erro da falha bateu com a que o plano previu
- [ ] `npm test` verde no repo da tarefa
- [ ] `npx tsc --noEmit -p .` sem erro
- [ ] `npm run lint` limpo
- [ ] Nenhuma das 6 invariantes regrediu
- [ ] Nenhum segredo em arquivo versionado
- [ ] Sem travessão em texto de UI, copy, e-mail ou banco

## Estado das invariantes ao fim do plano

| # | Invariante | Antes | Depois |
|---|---|---|---|
| I1 | 1 ingresso pago por CPF por evento | não coberta | Task 1 (código) + Task 2 (constraint no banco) |
| I2 | não creditar valor divergente | não coberta | Task 3 |
| I3 | N entregas produzem 1 efeito | 1 caso | Task 5, incluindo corrida e retry |
| I4 | display igual à cobrança | coberta | inalterada |
| I5 | nunca PAID sem crédito | não coberta | Task 4 |
| I6 | capacidade nunca estoura | pura coberta | inalterada, ver nota abaixo |

**Nota sobre I6:** `hasCapacity` é puro e testado, mas a corrida de duas compras na
última vaga só se resolve no banco, e não existe constraint que expresse "conte as linhas
pagas deste evento". A solução real é um trigger ou uma coluna de contador com CHECK, e
isso é decisão de arquitetura, não de teste. Fica **fora deste plano, registrado aqui**
como dívida conhecida.

**Não coberto por este plano, e por quê:** `createTicketOrder` continua sem teste de
orquestração ponta a ponta. As Tasks 1 e 7 cobrem as decisões que ela toma, mas a função
chama `rawServiceClient()` direto e testá-la inteira exige mockar o builder encadeado do
Supabase, o que custa mais do que entrega. O caminho certo é o teste de integração da
Fase 2 (L4, contra o sandbox), quando o adapter de gateway já estiver atrás de interface.

---

## Emendas vindas da execução

O plano foi corrigido pela própria execução. Registrado aqui porque o texto das tasks
acima ficou desatualizado nestes pontos, e porque o padrão importa: em 4 tasks revisadas,
3 geraram achados do plano, não do implementador.

**Task 2, Step 4 (emenda aplicada no texto do Step).** O `return null` no branch 23505 era
silencioso. Mas o índice criado nesta task introduziu um caminho novo: o gateway captura o
dinheiro e o UPDATE é barrado porque outro ticket do mesmo CPF já está pago, deixando o
ticket preso em `pending` sem alerta, até o reconcile cancelar por idade em 2 dias. Agora
emite `console.error` com o `ticketId` antes do `return null`. Fluxo de controle inalterado.

**Task 4, quatro emendas.** O Step 3 e o Step 5 mudaram:

1. `ApplyPaidDeps.revertToPending` passou de `Promise<void>` para
   `Promise<{ ok: boolean; error?: string }>`. Um rollback que falha era indistinguível de
   sucesso, o que deixava a linha PAID sem crédito: exatamente o que a invariante I5
   existe para impedir. Quando o rollback falha, a mensagem do alerta e a do `Error`
   lançado ganham o prefixo `ROLLBACK FALHOU: `, porque muda o que o admin tem que fazer:
   com rollback ok o retry conserta sozinho, com rollback falho alguém precisa mexer no banco.
2. O wrapper de `notifyCreditFailed` passou a `await` a chamada, mantendo o
   `.catch(() => undefined)`. O `void` seguido de `throw` imediato podia fazer o alerta
   nunca sair, porque promise solta não completa quando o container serverless é suspenso.
   Este projeto já teve esse incidente na rota `/api/internal/pix-copied`. O `void` foi
   mantido em `notifyPaid`, onde não há throw em seguida.
3. O `console.warn` de valor divergente, que o refactor tinha apagado, voltou DENTRO de
   `applyPaidCore`. Ficou melhor do que estava antes: agora é testável.
4. `ApplyPaidDeps.credit` virou união discriminada
   `Promise<{ ok: true } | { ok: false; error: string }>`, o que eliminou um fallback
   `?? "falha desconhecida"` e a interpolação de `undefined` na mensagem de erro.

**Correção de fato sobre o critério de verificação.** O plano diz `npx tsc --noEmit -p .`
limpo. Isso nunca foi verdade em `poker-pi-v2`: o repo tem 14 erros pré-existentes em
`scripts/estudio/*.test.ts`, idênticos na `main`. O critério real nesse repo é: continuar
com 14, nenhum erro novo fora de `scripts/estudio`. Dívida pré-existente, fora do escopo
deste plano.
