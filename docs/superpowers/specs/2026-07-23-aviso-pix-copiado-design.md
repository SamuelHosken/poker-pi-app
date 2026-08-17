# Aviso de push quando copiam o PIX (LP → admin)

**Data:** 2026-07-23
**Status:** aprovado, pronto pra plano

## Problema

No fluxo de venda de ingresso da LP (`/pokerpi`), o PIX é **manual**: chave estática +
comprovante por WhatsApp. Esse caminho **não passa pelo Asaas**, então o organizador
(admin) não tem nenhum sinal automático de intenção de compra. Ele só descobre quando o
comprovante cai no WhatsApp.

A pessoa só chega na tela do PIX **depois de preencher nome, e-mail, telefone e CPF e
gerar o pedido** — logo, já existe um `ticket` pendente e já sabemos quem é. Copiar a
chave é o primeiro sinal automático de "estou pagando agora".

## Objetivo

Quando alguém copia a chave PIX na LP, mandar **um push** pros admins (a mesma infra do
torneio), com o nome e o valor. **1 aviso por pedido** (não spamma se clicarem copiar
várias vezes).

Decisões do usuário: canal = **push no celular**; gatilho = **copiar a chave** (não o
botão de WhatsApp).

## Arquitetura

```
LP (poker-pi-app)                          v2 (app.mesapigroup.com)
 pix-panel: copyKey() ok
   → server action pingPixCopied(ticketId)
        POST /api/internal/pix-copied ───►  valida x-internal-secret
        { ticketId }                         → notifyAdminsPixCopied(ticketId)
                                                 → claim atômico tickets.pix_copied_at (1x)
                                                 → sendPushToProfiles(admins, …)
                                             📲 "📋 Fulano copiou o PIX — R$X"
```

A v2 é a **dona do push** (só ela tem `web-push` + a chave VAPID privada + a tabela
`v2_push_subscriptions`). A LP fala com ela por um endpoint interno autenticado. Ambas as
apps compartilham o mesmo Supabase, e a v2 já lê a tabela `tickets` (ver
`notifyAdminsTicketSaleIfTicket`).

Alternativa rejeitada: instalar `web-push` na LP e duplicar a chave VAPID privada + a
lógica de envio. Mais superfície e segredo em dois lugares.

## Peças

### 1. Migration `poker-pi-app/supabase/migrations/0027_tickets_pix_copied.sql`
```sql
alter table public.tickets add column if not exists pix_copied_at timestamptz;
```
Flag de dedup, espelha o `sale_notified_at` de `0026`. Aplicar no Supabase à mão.
`database.types.ts` é mantido à mão nos dois apps — adicionar a coluna no tipo `tickets`
(Row/Insert/Update) manualmente, **nunca** rodar `gen:types` cru (quebra exports custom).

### 2. v2 `lib/push/notify.ts` → `notifyAdminsPixCopied(ticketId: string)`
Vizinha da `notifyAdminsTicketSaleIfTicket`, mesmo padrão:
- Claim atômico once-only:
  `update tickets set pix_copied_at = now() where id = ticketId and pix_copied_at is null
   and status <> 'paid' returning buyer_name, amount_cents`.
  Se não voltar linha → já avisado / não existe / já pago → retorna sem fazer nada.
- `adminProfileIds()` (já existe) → `sendPushToProfiles`.
- Push: título `📋 Copiaram o PIX`, corpo `${buyer_name || "Alguém"} copiou a chave — R$${reais}. Aguardando comprovante.`,
  tag `admin-pix-copied-${ticketId}`, url `/admin/vendas`.
- Fire-and-forget / à prova de erro, como as vizinhas.

### 3. v2 `app/api/internal/pix-copied/route.ts`
- `POST`, body `{ ticketId: string }`.
- Guarda: header `x-internal-secret` === `process.env.INTERNAL_NOTIFY_SECRET`. Sem match → 401.
- Chama `void notifyAdminsPixCopied(ticketId).catch(() => {})`, responde 204.
- `runtime = "nodejs"` (web-push precisa de Node).

### 4. LP `lib/tickets/orders.ts`
Branch PIX passa a devolver o id: `return { ok: true, pix: true, ticketId: ticket.id }`
(hoje devolve `{ ok: true, pix: true }`). Ajustar o tipo de retorno correspondente.

### 5. LP `lib/tickets/notify-copy.ts` (novo) → `pingPixCopied(ticketId: string)`
- `"use server"`. Faz `fetch(`${V2_BASE}/api/internal/pix-copied`, { method: POST,
  headers: { x-internal-secret }, body })` server-to-server.
- `V2_BASE` = `https://app.mesapigroup.com` (const; ou env `V2_BASE_URL`).
- Secret de `process.env.INTERNAL_NOTIFY_SECRET`.
- Best-effort: try/catch engole erro, timeout curto (AbortController ~4s).

### 6. LP `checkout-form.tsx` + `pix-panel.tsx`
- `checkout-form`: guardar `ticketId` no state quando `res.pix`; passar `<PixPanel ticketId={…} />`.
- `pix-panel`: nova prop `ticketId?: string`; dentro do `copyKey()`, no sucesso,
  `if (ticketId) void pingPixCopied(ticketId)`.

## Envs novos (Vercel)
- `INTERNAL_NOTIFY_SECRET` — mesmo valor nos **dois** projetos (v2 e LP).
- (opcional) `V2_BASE_URL` na LP; senão hardcode `https://app.mesapigroup.com`.

## Verificação
- Dedup: o claim atômico em `pix_copied_at` é o mesmo padrão já provado do
  `sale_notified_at` (`notifyAdminsTicketSaleIfTicket`). Teste manual: copiar a chave 2x
  → chega **1** push.
- Auth do endpoint: POST sem/`com` secret errado → 401; com secret certo → 204 + push.
- E2E: gerar pedido PIX na LP em prod, copiar a chave, confirmar push no aparelho admin.
- `npx tsc --noEmit` nas duas apps. (Lint do repo está quebrado por config ESLint 9 — não
  bloqueia.)

## Fora de escopo
- Notificar no clique do botão "Enviar comprovante" (WhatsApp) — decidido ficar só na chave.
- E-mail / dashboard realtime — só push.
- Retry/fila se a v2 estiver fora — best-effort de propósito.

## Deploy
Deploy das **duas** apps (rota nova na v2 + mudanças na LP) + env nos dois projetos +
migration `0027` aplicada no Supabase antes do deploy.
