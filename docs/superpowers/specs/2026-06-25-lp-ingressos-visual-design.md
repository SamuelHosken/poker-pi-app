# Spec — Repaginada visual da venda de ingressos (LP + ingresso + check-in)

**Data:** 2026-06-25
**Status:** Desenho aprovado (aguardando revisão do spec antes do plano)

---

## 1. Objetivo

Elevar as três superfícies da venda de ingressos do Poker Pi (já funcionais e em produção) ao nível **cinematográfico premium** da marca, usando **footage real da 1ª edição** e a linguagem **dark + dourado**. Nada de mudança funcional no fluxo de pagamento/webhook/check-in — só design e apresentação. Mobile-first.

Superfícies:
1. **LP `/pokerpi`** — landing de venda.
2. **Ingresso** — página `/ingresso/[token]` + e-mail (Resend).
3. **Check-in** `/admin/checkin`.

---

## 2. Assets

| Asset | Origem | Uso |
|---|---|---|
| Vídeo **slow-mo** (loop) | usuário envia → `public/event/slowmo.mp4` (+ `slowmo-poster.jpg`) | herói da LP |
| Vídeo **cortes rápidos** | usuário envia → `public/event/fastcuts.mp4` (+ poster) | faixa imersiva no meio da LP |
| **Placa de ouro 3D** (2 PNGs) | `/Users/samuelhosken/Downloads/ChatGPT Image *.png` → copiar p/ `public/event/ticket-gold-*.png` | **decorativa** na seção de ingressos |
| **Logo** | `public/brand/logo-full.svg`, `logo-icon.svg`, `logo-icon-white.svg` | herói, e-mail, check-in |

**Comportamento sem os vídeos ainda:** a estrutura usa o **poster** (ou um gradiente dark/gold de fallback) até os arquivos chegarem — a LP nunca quebra por falta do vídeo. Vídeos pesados são comprimidos pra web (alvo: slow-mo < ~6 MB, cortes < ~6 MB; `preload="metadata"`).

---

## 3. LP `/pokerpi`

Server Component carrega o evento ativo (já existe `getActiveEventPublic`). Seções, de cima pra baixo:

1. **Herói (tela cheia, `100dvh`):**
   - Vídeo slow-mo de fundo: `muted autoplay loop playsInline`, `poster`, `object-cover`, com **overlay de gradiente** (escurece de baixo) pra legibilidade.
   - Conteúdo centralizado: **logo** (logo-icon-white ou full), título "**Poker Pi · 2ª Edição**", "**11 de julho · Sábado · 14h**", subtítulo curto, **contador de vagas** ("X de 35"), botão **"Garantir meu ingresso"** (âncora suave pra `#ingressos`), e um indicador "role pra baixo".
   - Animações de entrada com **framer-motion** (já no projeto): fade/slide suave.
2. **Faixa imersiva (cortes rápidos):** seção full-bleed com o vídeo de cortes rápidos de fundo + uma linha de copy de impacto ("A noite que vira história", etc.). Mesmo tratamento de overlay.
3. **Local:** card dark/gold com "Condomínio Solar da Serra, Q1 C14 — Jardim Botânico, DF" + botão "Ver no mapa" (Google Maps).
4. **Ingressos `#ingressos`:** título; os **2 planos** como **cards premium** (Padrão R$150 / Open Bar R$185 — Open Bar com destaque dourado/"mais completo"); ao lado/junto, a **placa de ouro 3D como imagem decorativa** ("seu lugar na mesa"); e o **checkout** (componente atual `checkout-form.tsx`, mantido — telefone internacional + máscara CPF + validação).
5. **Rodapé:** discreto — regras curtas (lotação, "ingresso por e-mail + QR"), marca.

Decompor em componentes focados (cada `"use client"` só onde precisa de vídeo/observador): `hero-video.tsx`, `fast-cuts-band.tsx`, `ticket-cards.tsx` (existe, restyle premium), `venue-section.tsx`, `gold-ticket-art.tsx` (a placa decorativa). `page.tsx` permanece Server Component e compõe tudo.

---

## 4. Ingresso — página + e-mail (premium dark/gold)

Mantém a função (QR escaneável que abre `/ingresso/[token]`), eleva o visual. **Não** é a placa 3D (essa é só decorativa na LP).

- **Página `/ingresso/[token]`:** fundo dark, **logo**, **QR grande** em card claro (contraste pra leitura), dados do evento (data/hora/local), **plano em destaque** (badge Padrão/Open Bar), status ("Pago ✓" / "Check-in feito ✓"), "Apresente este QR na entrada". Toque de dourado/borda fina. (Reaproveita `TicketQr` client.)
- **E-mail (`lib/email/ticket-email.ts`):** redesenhar o HTML — cabeçalho escuro com **logo** (imagem hospedada via `NEXT_PUBLIC_SITE_URL` + `/brand/...`), **QR grande** (inline/anexo, já gerado por `qrcode`), card com data/hora/local, **plano em destaque**, botão "Abrir meu ingresso" (link pra página), "apresente na entrada", rodapé. HTML robusto: tabelas, estilos inline, cores sólidas (fundo dark com fallback), largura ~600px. Mantém de/reply-to atuais.

---

## 5. Check-in `/admin/checkin`

Mantém a Server Action `checkInTicket` (que já retorna nome, plano, `already`). Eleva a UI do scanner:

- **Topo — contador ao vivo:** "**N presentes / M vendidos**" do evento ativo, atualizando sozinho (reusa `<LiveRefresh>` do projeto, ou re-fetch leve). Precisa de uma leitura: contagem de `tickets` pagos e com `checked_in_at` do evento ativo (nova função `getCheckinCounts()` em `lib/tickets/checkin.ts`, admin-gated).
- **Scanner** grande (html5-qrcode, já existe).
- **Resultado em tela cheia** sobre o scanner, por ~3s:
  - 🟢 **VÁLIDO** (verde): nome **grande** + **PLANO em destaque** — Open Bar com cor própria (ex.: dourado/roxo) bem visível pra pulseira; Padrão neutro.
  - 🟡 **JÁ ENTROU** (amarelo): nome + horário do check-in anterior.
  - 🔴 **INVÁLIDO** (vermelho): "não pago" / "não encontrado".
- Feedback sonoro curto opcional (reusa `lib/audio` se trivial; senão pula — YAGNI).

`checkInTicket` precisa expor se o plano é **Open Bar** (comparar `ticketName` ou retornar um flag) pra UI escolher a cor.

---

## 6. Restrições (constraints)

- **Português na UI, inglês no código.** Dark + dourado (tokens `globals.css`: `--color-ink`, `--color-gold`, `--color-paper`, `--color-line`, `--color-gold-soft`).
- **Mobile-first** (o link cai no celular).
- **Vídeos:** `muted autoplay loop playsInline preload="metadata"` + `poster`; nunca bloquear render; respeitar `prefers-reduced-motion` (mostra poster estático).
- **Server Components por padrão**; `"use client"` só onde há vídeo/estado/observador.
- **Componentes < 200 linhas**; lógica em `lib/`.
- **TS estrito, ZERO `any`** (exceto `rawServiceClient()` untyped).
- Reusa o que já existe: `checkout-form.tsx`, `TicketQr`, `LiveRefresh`, `PhoneInput`, framer-motion, qrcode.
- Sem mudar fluxo de pagamento/webhook/check-in (apenas apresentação + as leituras novas de contador).
- Após mudanças: `npm test`, `npx tsc --noEmit -p .`, `npx next build`.

---

## 7. Fora de escopo (YAGNI)

- Ingresso dourado **dinâmico** (a placa 3D é só decorativa).
- Fotos (entram depois; design brilha só com vídeo + dourado).
- Busca manual por nome no check-in (não pedido).
- Mudanças no schema/pagamento.

---

## 8. Plano de testes

- **Build/tsc/lint** verdes; rotas `/pokerpi`, `/ingresso/[token]`, `/admin/checkin` presentes.
- **Visual humano** (mobile + desktop): herói com vídeo/poster, faixa de cortes, cards, placa decorativa, checkout; e-mail num cliente real (Gmail) — QR + logo + plano; check-in: estados VÁLIDO/JÁ ENTROU/INVÁLIDO + contador.
- **Funcional preservado:** uma compra de teste (sandbox) ainda confirma sozinha e gera e-mail (regressão do fluxo).
- `prefers-reduced-motion` mostra poster.
