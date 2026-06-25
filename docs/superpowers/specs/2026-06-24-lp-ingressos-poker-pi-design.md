# Spec — LP de ingressos + venda online (Poker Pi 2ª Edição)

**Data:** 2026-06-24
**Status:** Aprovado o desenho (aguardando revisão do spec antes do plano de implementação)

---

## 1. Objetivo

Criar uma **landing page (LP) premium** de um evento específico, que o organizador envia por link para os inscritos, com **venda de ingresso online** (PIX + cartão via Asaas) e **entrega de ingresso com QR Code** para **check-in na porta**, integrado ao sistema de torneio existente.

### Evento alvo

| Campo | Valor |
|---|---|
| Nome | Poker Pi — 2ª Edição |
| Data / hora | 11/07/2026, **14h** |
| Local | Condomínio Solar da Serra, Quadra 1, Casa 14 — Jardim Botânico, Brasília · DF |
| Lotação | **35 vagas** (meta real 30) |

### Ingressos

| Plano | Preço | Inclui |
|---|---|---|
| **Padrão** | R$ 150 | Comida + bebidas não alcoólicas |
| **Open Bar** | R$ 185 | Tudo + Open Bar |

---

## 2. Escopo

### Entra
- LP pública em `/evento/[slug]` (premium, dark + dourado, mobile-first).
- Dois tipos de ingresso com contador de vagas (35).
- Checkout via **Asaas** (Checkout hospedado — `invoiceUrl`), PIX + cartão.
- Webhook de confirmação de pagamento.
- Ingresso com **QR Code** exibido na tela após pagamento (entrega garantida, sem depender de e-mail).
- **E-mail do ingresso via Resend** (domínio `mesapigroup.com` já verificado).
- **Check-in** na porta (`/admin/checkin`, leitor de QR) integrado ao sistema de jogadores.
- Gestão de vendas no admin (`/admin/events/[id]/ingressos`).

### NÃO entra (YAGNI por enquanto)
- Cupons / descontos.
- Reembolso automático (cancelamento é manual via painel Asaas).
- Área logada do comprador.
- Lista de espera (waitlist) quando esgotar.
- Parcelamento no cartão (lançar à vista; reavaliar depois).

---

## 3. Identidade visual

- **Dark + dourado**, usando as cores do sistema (`gold` / `ink` / `paper` em `app/globals.css`).
- Herói: **π 3D dourado** (asset da marca) sobre fundo escuro.
- Logos disponíveis: `Icone-icone.svg`, `Icone-nome+icone.svg` (Google Drive) — copiar para `public/` na implementação.
- **Fotos**: entram depois (placeholders no lançamento; LP nasce só com o visual do π dourado).
- **Mobile-first** (o link cai no celular dos inscritos), mas polido no desktop.

---

## 4. Arquitetura

### Rotas novas
| Rota | Tipo | Função |
|---|---|---|
| `/evento/[slug]` | Pública (Server Component) | LP do evento + tipos de ingresso + checkout |
| `/api/asaas/webhook` | POST público (autenticado por token) | Recebe confirmação de pagamento do Asaas |
| `/ingresso/[token]` | Pública | Página do ingresso com QR (pós-compra e reabertura) |
| `/admin/checkin` | Admin | Leitor de QR para check-in na porta |
| `/admin/events/[id]/ingressos` | Admin | Lista de vendas + status + presença |

### Módulos de domínio (lib/)
- `lib/payments/asaas.ts` — cliente HTTP do Asaas (escolhe chave + URL base por `ASAAS_ENV`).
- `lib/email/resend.ts` + template do ingresso (React Email).
- `lib/tickets/orders.ts` — Server Actions: `createTicketOrder`, consultas.
- `lib/tickets/checkin.ts` — Server Action de check-in.
- `lib/tickets/qr.ts` — geração do QR (token + imagem).

---

## 5. Modelo de dados (migrations Supabase)

### `events` (adicionar colunas)
- `slug` text unique — usado na URL da LP.
- `starts_at` timestamptz — data + hora de início.
- `location_text` text — endereço legível.
- `location_maps_url` text — link do mapa.
- `capacity` int — lotação (35).
- `sales_open` boolean default true — liga/desliga venda.

### `ticket_types` (nova)
| Coluna | Tipo | Nota |
|---|---|---|
| id | uuid pk | |
| event_id | uuid fk → events | |
| name | text | "Padrão" / "Open Bar" |
| description | text | o que inclui |
| price_cents | int | 15000 / 18500 |
| sort_order | int | ordem na LP |
| active | boolean | |

### `tickets` (nova)
| Coluna | Tipo | Nota |
|---|---|---|
| id | uuid pk | |
| event_id | uuid fk | |
| ticket_type_id | uuid fk | |
| buyer_name | text | |
| buyer_email | text | |
| buyer_phone | text | |
| buyer_cpf | text | exigido pelo Asaas |
| amount_cents | int | snapshot do preço pago |
| status | text | `pending` \| `paid` \| `canceled` |
| asaas_customer_id | text | |
| asaas_payment_id | text | unique — idempotência do webhook |
| asaas_invoice_url | text | link do checkout |
| payment_method | text | PIX \| CREDIT_CARD (preenchido no pagamento) |
| qr_token | text unique | gerado na confirmação (nanoid) |
| paid_at | timestamptz | |
| checked_in_at | timestamptz | null até check-in |
| checked_in_by | uuid | admin que escaneou |
| player_id | uuid fk nullable → players | criado/ligado no check-in |
| created_at | timestamptz default now() | |

### RLS
- `ticket_types`: **SELECT público** (a LP precisa ler os planos).
- `tickets`: **sem acesso público** (contém PII + dados de pagamento). Toda leitura/escrita é server-side via **service role**. A página `/ingresso/[token]` busca pelo `qr_token` no servidor (token aleatório serve de credencial).

---

## 6. Fluxos

### 6.1 Compra
```
Pessoa abre /evento/[slug]
  → escolhe plano (Padrão/Open Bar)
  → preenche Nome, E-mail, Telefone, CPF
  → Server Action createTicketOrder():
       valida + rate limit
       checa vaga (capacity)
       cria/recupera customer no Asaas
       cria payment (billingType UNDEFINED, value, dueDate curto, externalReference=ticket.id)
       grava ticket status=pending + asaas_payment_id + invoice_url
       retorna invoiceUrl
  → cliente redireciona pro Checkout hospedado do Asaas (PIX/cartão)
```

### 6.2 Confirmação (webhook)
```
Asaas → POST /api/asaas/webhook (PAYMENT_CONFIRMED / PAYMENT_RECEIVED)
  → valida token de autenticação do webhook
  → acha ticket por asaas_payment_id (idempotente; ignora duplicado)
  → status=paid, paid_at=now, gera qr_token, grava payment_method
  → dispara e-mail do ingresso (Resend) — se domínio verificado
```

### 6.3 Ingresso na tela
```
Asaas redireciona o comprador de volta → /ingresso/[token]
  → mostra: nome, plano, data/hora, local, QR Code grande, status PAGO
  → "salve este print" / pode reabrir pelo link
```

### 6.4 Check-in na porta
```
Admin abre /admin/checkin (celular) → escaneia QR
  → lê qr_token → Server Action checkInTicket():
       marca checked_in_at, checked_in_by
       cria/liga players (estado PRESENTE) no evento
       mostra na tela: nome + PLANO (destaque Open Bar vs Padrão)
```
> O plano precisa aparecer com destaque no check-in pra equipe saber quem tem **Open Bar** (ex.: pulseira de cor diferente).

---

## 7. Integração Asaas

- **Auth:** header `access_token: <ASAAS_API_KEY>`; URL base por `ASAAS_ENV` (sandbox `https://sandbox.asaas.com/api/v3`, produção `https://api.asaas.com/v3`).
- **Customer:** `POST /customers` com `name`, `email`, `mobilePhone`, `cpfCnpj`.
- **Payment:** `POST /payments` com `customer`, `billingType: "UNDEFINED"` (cliente escolhe PIX/cartão), `value`, `dueDate` (curto, ex.: hoje), `description`, `externalReference: ticket.id`.
- **Redirect:** usa `invoiceUrl` da resposta (página de pagamento hospedada — sem PCI no nosso lado).
- **Webhook:** eventos `PAYMENT_CONFIRMED` e `PAYMENT_RECEIVED`. Autenticação por token configurado no painel Asaas e conferido no handler.
- **Idempotência:** casa por `asaas_payment_id`; webhook repetido não reprocessa.

---

## 8. E-mail (Resend)

- **De:** `Poker Pi <ingressos@mesapigroup.com>` (domínio verificado).
- **Responder para:** `pokerpi2026@gmail.com`.
- **Template:** React Email — marca Poker Pi, dados do evento, plano, e **QR Code** (inline/anexo).
- **Disparo:** na confirmação do pagamento (6.2).
- Entrega por e-mail é **complementar**: o QR na tela (6.3) já garante o ingresso mesmo se o e-mail falhar.

---

## 9. Segurança

- Chaves Asaas e Resend **server-only** (nunca no cliente).
- Webhook protegido por **token de autenticação**.
- `qr_token` aleatório (nanoid) — não adivinhável.
- **Rate limit** em `createTicketOrder` (reusa `lib/rate-limit/in-memory`).
- Validação de **CPF** e e-mail (reusa `verifyEmail` existente).

---

## 10. Sandbox → produção

- Desenvolver e testar com `ASAAS_ENV=sandbox` (PIX/cartão de teste do Asaas).
- Antes do lançamento: trocar `ASAAS_ENV=production` + configurar webhook de produção apontando pro domínio público.
- Regenerar a chave de produção do Asaas (foi exposta no chat durante o setup).

---

## 11. Pequenas decisões em aberto (resolver no plano)

1. **Controle de vagas:** contar só ingressos `paid`, ou `paid` + `pending` recentes? Proposta: contar `paid`; `dueDate` curto evita pendências segurando vaga.
2. **Cartão à vista vs parcelado:** lançar à vista; parcelamento fica pra depois.
3. **Slug do evento:** `poker-pi-11-07` (sugestão).

---

## 12. Plano de testes

- **Unit:** cliente Asaas, transições de status do ticket, geração de QR.
- **E2E (sandbox):** compra completa, simular webhook, conferir e-mail (Resend), check-in.
- **Build + lint:** `npx tsc --noEmit -p .` e `npx next build` (regra do projeto).
