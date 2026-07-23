# PIX manual (fora do Asaas)

## Problema

Hoje o PIX passa pelo Asaas: `createTicketOrder` cria uma cobranca e a LP redireciona
pro `invoiceUrl`. O usuario quer tirar o Asaas do caminho do PIX e virar um fluxo
manual: a pessoa faz o PIX direto na chave, manda o comprovante no WhatsApp, e o
organizador confirma o pagamento na mao. O cartao continua igual (Asaas).

## Decisoes (fechadas com o usuario)

- PIX na LP: **mantem o formulario** (nome/email/CPF/telefone) e **gera um `tickets`
  pending** sem chamar o Asaas. Depois de confirmar, a tela mostra a chave PIX.
- Formato do PIX na tela: **so a chave** (sem copia-e-cola / BR Code), com o valor por
  escrito e botao de copiar a chave.
- Admin: **construir botao** pra confirmar (nao cadastrar no Supabase na mao).

## Valores (config editavel)

- Chave PIX: `pokerpi2026@gmail.com` (tipo: e-mail)
- Recebedor exibido: `Joao Henrique`
- WhatsApp do comprovante: `+55 61 99663-1580` (wa.me: `5561996631580`)

## Escopo

### 1. Config `lib/tickets/pix.ts` (novo)

Fonte unica dos valores acima + helper `pixWhatsappLink(message?)` que monta o link
`https://wa.me/5561996631580?text=...` com uma mensagem padrao pronta ("Oi! Fiz o PIX
do meu ingresso Poker Pi, segue o comprovante:").

### 2. Backend `lib/tickets/orders.ts`

No `createTicketOrder`, ramo por metodo:

- `CREDIT_CARD`: **inalterado** (customer + payment no Asaas, retorna `invoiceUrl`).
- `PIX`: **nao chama o Asaas**. `baseCents = tt.price_cents`, `chargedCents = baseCents`.
  Cria o `tickets` pending (metodo PIX, sem `asaas_customer_id`/`asaas_payment_id`).
  Retorna `{ ok: true, pix: true }`. Rastreia `order_created` com method PIX.
- Dedup por CPF: **reaproveita o que ja existe**. O loop de pendentes so chama o Asaas
  quando `asaas_payment_id` esta preenchido; linhas PIX manuais tem esse campo null,
  entao so viram `canceled` (sem chamada externa). Nenhuma mudanca necessaria ali.

`OrderResult` passa a ser uniao discriminada:
`{ ok: true; invoiceUrl: string } | { ok: true; pix: true } | { ok: false; error; field? }`.

### 3. LP `app/(public)/pokerpi/checkout-form.tsx`

- Cartao: submit continua redirecionando pro `invoiceUrl`.
- PIX: botao vira "Fazer PIX". No sucesso (`res.pix`), a tela troca pro **painel PIX**
  (novo componente `pix-panel.tsx`): valor em destaque, a chave com botao "Copiar
  chave", nome do recebedor, e botao verde de WhatsApp ("Enviar comprovante") apontando
  pro `pixWhatsappLink()`. Texto: "Faca o PIX e mande o comprovante no WhatsApp pra
  confirmar seu ingresso." Botao de "voltar" pra refazer se precisar.
- O texto do rodape ("Pagamento seguro via Asaas...") vira condicional ao metodo.

### 4. Confirmacao manual `lib/tickets/manual.ts` (novo) + admin

- Helper `confirmTicketPaid(ticketId)`: hidrata o ticket, se ja pago sai; senao chama o
  MESMO `markPaid` + `sendEmail` do `buildWebhookDeps` (gera QR, dispara e-mail). Sem
  verificacao no Asaas (e manual). Reusa a logica de `confirmTicket` do webhook.
- Helper `addPaidTicket({ eventId, ticketTypeId, name, email, phone, cpf })`: valida
  capacidade + dedup de CPF, insere o ticket e chama `confirmTicketPaid`.
- Server actions em `app/admin/events/[id]/ingressos/actions.ts`:
  `confirmPixTicket(ticketId)` e `addTicketManually(input)`, ambas com `requireAdmin()`.
- UI em `app/admin/events/[id]/ingressos/page.tsx`:
  - Secao "PIX aguardando comprovante": lista os pending com `payment_method = 'PIX'`
    (nome/email/CPF ja preenchidos), cada um com botao "Confirmar pago".
  - Botao/mini-form "Adicionar ingresso" pra casos avulsos.

## Fora de escopo

- Nao mexer no fluxo de cartao (Asaas) nem no webhook.
- Nao gerar BR Code / copia-e-cola.
- Nao remover o Asaas do projeto.

## Testes

- `pix.ts`: `pixWhatsappLink` monta o link e faz o encode da mensagem.
- `orders.ts` (ou a parte pura): PIX nao chama o Asaas e retorna `{ pix: true }`;
  cartao segue com `invoiceUrl`. (Cobrir via o que ja for testavel sem rede.)
- `manual.ts`: `confirmTicketPaid` marca pago + gera QR uma vez (idempotente no 2o
  clique); `addPaidTicket` respeita dedup de CPF e capacidade.
