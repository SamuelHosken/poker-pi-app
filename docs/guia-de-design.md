# Poker Pi · Guia de Design e Arquitetura

> Documento de referência da **LP de ingressos** (`/pokerpi`) e do e-mail do ingresso.
> Objetivo: qualquer pessoa (ou IA) conseguir manter o visual coeso sem reinventar nada.
> Leia junto com o `CLAUDE.md` (regras gerais do sistema).

---

## Parte 1 · Como o site é feito

### 1.1 Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack, Server Components) |
| Linguagem | TypeScript estrito |
| Estilo | Tailwind CSS v4 (tokens em `@theme`) + shadcn/ui |
| Banco | Supabase (Postgres + RLS) |
| Pagamento | Asaas (PIX, cartão até 12x, boleto) |
| E-mail | Resend (domínio `mesapigroup.com`) |
| Animação | framer-motion + keyframes CSS |
| Hospedagem | Vercel (deploy manual: `vercel --prod`) |

### 1.2 As superfícies do produto

O projeto tem **duas caras** bem diferentes, de propósito:

1. **Sistema interno** (`/admin`, `/tv`, `/me`): operação do torneio. Estética dark + dourado (tokens `ink`, `gold`, `paper`). NÃO mexer nessa cara quando o assunto for a LP.
2. **LP de ingressos** (`/pokerpi`) + e-mail: a vitrine de venda. Estética **creme + vermelho-tomate + Big Shoulders**, inspirada nos vídeos do evento. É sobre essa cara que este guia fala.

### 1.3 Fluxo da venda (ponta a ponta)

```
/pokerpi (LP)
  -> usuário escolhe plano + preenche dados (checkout-form.tsx)
  -> Server Action createTicketOrder (lib/tickets/orders.ts)
     -> cria customer + cobrança no Asaas (lib/payments/asaas.ts), maxInstallments: 12
     -> grava ticket no Supabase (status pendente)
  -> redireciona pro invoiceUrl do Asaas (PIX / cartão / boleto)
  -> Asaas confirma -> webhook (/api/asaas/webhook) marca ticket pago
     -> dispara e-mail com QR (lib/email/ticket-email.ts)
  -> usuário recebe ingresso (página /ingresso/[token] + e-mail)
  -> na portaria: /admin/checkin lê o QR e valida (lib/tickets/checkin.ts)
```

A URL é **única e permanente**: `mesapigroup.com/pokerpi` sempre mostra o evento ativo
(`getActiveEventPublic()`), nunca slug por evento.

### 1.4 Onde fica cada coisa (LP)

```
app/(public)/pokerpi/
├── page.tsx            ← compõe a página inteira (nav, seções, footer)
├── hero.tsx            ← herói: título gigante + vídeo emoldurado
├── stat-band.tsx       ← faixa vermelha com números (35, 2, 1, 14h)
├── the-night.tsx       ← dobra CLARA (creme) no meio do dark
├── gallery-strip.tsx   ← mosaico de fotos da 1ª edição
├── venue-schedule.tsx  ← programação do dia + local/mapa
├── faq.tsx             ← perguntas frequentes
├── ticket-cards.tsx    ← cards de plano (Open Bar com degradê + Padrão)
├── checkout-form.tsx   ← formulário de compra
├── gold-ticket-art.tsx ← arte do ingresso dourado (decorativo)
├── reveal.tsx          ← animação de entrada ao rolar
├── blur-word.tsx       ← palavra com blur leve
└── flicker-text.tsx    ← texto que "acende" (pisca branco e assenta)

app/globals.css         ← tokens de cor + keyframes
app/layout.tsx          ← carrega a fonte Big Shoulders
lib/email/ticket-email.ts ← e-mail do ingresso (espelha a LP)
public/event/           ← vídeos, fotos, logos, poster
```

---

## Parte 2 · Guia de Design (a marca)

### 2.1 Conceito

> "Isso não é uma festa." Um torneio de verdade, ousado e editorial.

A vibe vem dos vídeos do evento: cores **creme**, vermelho **saturado**, tipografia
**condensada gigante** em caixa alta. Referência de atitude: pôsteres esportivos /
editoriais ousados. NUNCA "premium genérico", NUNCA tímido.

Três adjetivos-guia: **ousado · editorial · quente**.

### 2.2 Paleta de cores

Todos os tokens estão em `app/globals.css` (bloco `@theme`). Use sempre a classe
Tailwind (`text-red-brand`, `bg-cream`), nunca o hex solto.

**Vermelho (a cor da marca):**

| Token | Hex | Uso |
|---|---|---|
| `red-brand` | `#cd0000` | Cor principal. Olhos de seção, CTAs, faixas, destaques. |
| `red-deep` | `#a80000` | Hover de botão, sombra/profundidade. |

**Creme (texto e fundos claros):**

| Token | Hex | Uso |
|---|---|---|
| `cream` | `#f4ede1` | Texto sobre dark; fundo da dobra clara. |
| `cream-2` | `#ece3d3` | Cards na dobra clara. |
| `cream-3` | `#e2d7c3` | Bordas na dobra clara. |
| `cream-soft` | `#b7aa99` | Texto secundário/legendas. |

**Dark quente (fundo dominante):**

| Token | Hex | Uso |
|---|---|---|
| `ink-warm` | `#17120f` | Fundo principal (≈70% da página). |
| `ink-warm-2` | `#221b16` | Cards/superfícies sobre o dark. |
| `ink-warm-soft` | `#6a6058` | Texto fraco sobre dark. |

**Regra dos 70/30:** ~70% da página é **dark quente**, com **uma dobra clara** (creme,
o componente `the-night`) pra respirar, mais as faixas/CTAs em **vermelho cheio**.
Nunca a página inteira clara, nunca o vermelho dominando tudo.

> **Histórico do vermelho.** A marca usou `#f0300e` (tomate/alaranjado) na primeira
> versão e migrou para `#cd0000` (vermelho puro, mais "clássico/baralho") em 2026-06.
> A troca vive nos tokens `red-brand`/`red-deep` em `globals.css`; o degradê do card
> Open Bar e o e-mail mantêm um acento laranja quente ("luz vindo de baixo") por cima
> do vermelho puro, como pedido na concepção original.

### 2.3 Tipografia

**Fonte de display: Big Shoulders** (condensada), carregada em `app/layout.tsx` como
`--font-big-shoulders` -> classe `font-condensed`.

Regras:
- Títulos e rótulos: **sempre `font-condensed`, `uppercase`, `font-extrabold`/`font-bold`**.
- Tamanho fluido nos títulos grandes: `text-[clamp(40px,9vw,92px)]`.
- `leading` apertado nos títulos: `leading-[0.9]` a `leading-[0.96]`.
- Olho de seção (eyebrow): `font-condensed text-lg font-bold uppercase tracking-[0.18em] text-red-brand`.
- Corpo de texto: fonte padrão (sans), `text-cream` / `text-cream-soft`, `leading-relaxed`.

Hierarquia típica de uma seção:
```
[eyebrow vermelho, pequeno, tracking largo]   <- FlickerText
[título gigante creme/condensado]             <- com 1-2 BlurWord
[parágrafo de apoio, sans, cream-soft]
```

### 2.4 Layout e espaçamento

- Container: `mx-auto max-w-6xl px-5 sm:px-8`.
- Respiro vertical de seção: `py-20 lg:py-28`.
- Raio dos cards: generoso (`rounded-2xl`, `rounded-3xl`).
- **Mobile-first sempre.** O evento é vendido no celular. Teste no 390px antes de tudo.
- Bordas sutis sobre dark: `border-white/10`. Sobre creme: `border-cream-3`.

### 2.5 Componentes-chave

- **StatBand** (`stat-band.tsx`): faixa `bg-red-brand` com 4 números creme gigantes.
  Quebra o dark e dá ritmo.
- **TheNight** (`the-night.tsx`): a ÚNICA dobra clara (`bg-cream`). Texto escuro,
  cards creme. É o respiro da página.
- **OpenBarCard** (em `ticket-cards.tsx`): o card que tem que chamar mais atenção.
  Fundo escuro com **degradê de luz vermelha subindo de baixo** (`.ob-glow` animado:
  laranja -> vermelho -> escuro). O Padrão é um card creme mais sóbrio. O contraste
  entre os dois É proposital (Open Bar = mais desejável).
- **GoldTicketArt**: ingresso dourado decorativo (só visual). O ingresso funcional é a
  página `/ingresso/[token]` + e-mail.

### 2.6 Animações (e quando usar cada uma)

| Componente | O que faz | Quando usar |
|---|---|---|
| `Reveal` | Fade + sobe ao entrar na tela (framer-motion). Aceita `delay` pra escalonar. | Em quase todo bloco/card. Use `delay={i * 0.08}` pra stagger em listas. |
| `BlurWord` | Blur **leve** numa palavra (`amount` 0.4 a 1.3). | 1-2 palavras por título, pra dar textura. Nunca a frase toda. |
| `FlickerText` | Texto "acende": pisca branco algumas vezes e assenta na cor real. | Olhos de seção, números do StatBand, destaques pontuais. |
| `.ob-glow` | Luz vermelha pulsando de baixo pra cima. | Exclusivo do card Open Bar. |

Princípios de animação:
- **Sutileza.** Blur leve, flicker rápido. Nada que atrapalhe a leitura.
- **Stagger.** Itens de lista entram em sequência (delay incremental), não todos juntos.
- **Acessibilidade.** Todos respeitam `prefers-reduced-motion` (viram estáticos). Mantenha isso.
- **Sem grão.** O ruído/grão de filme foi removido a pedido. NÃO reintroduzir.

### 2.7 Tom de voz e copy

- **Direto, confiante, curto.** "É a 2ª edição do Poker Pi. Um torneio de verdade."
- Títulos provocativos: "Isso não é uma festa.", "Te vejo na mesa?".
- Caixa alta nos títulos (já vem do `uppercase`).
- Português do Brasil, informal mas afiado.

### 2.8 Regra inviolável de copy

> **NUNCA usar o caractere "—" (travessão, em dash) em lugar nenhum.**
> Nem na UI, nem no e-mail, nem em copy, nem no banco, nem em comentário de código.
> Use vírgula, ponto, dois-pontos ou o meio-ponto "·". O hífen "-" é permitido.

### 2.9 O e-mail do ingresso

`lib/email/ticket-email.ts` **espelha a LP**: fundo dark quente, faixa vermelha com a
logo, título condensado gigante ("SEU LUGAR ESTÁ GARANTIDO"), QR num cartão creme,
badge do plano (Open Bar com degradê), botão vermelho.

Restrições de e-mail (não fugir disto):
- Layout em **tabelas** + **estilos inline** (clientes de e-mail ignoram CSS externo).
- A fonte Big Shoulders carrega via `<link>` só em alguns clientes (Apple Mail). No
  **Gmail** cai pro fallback `Arial Narrow`. Isso é limitação do cliente, aceitável.
  Cores e layout seguem coesos em todos.
- Ícone só como **glifo de texto** (ex.: espada `&#9824;`) ou **PNG hospedado** em
  `public/event/`. NUNCA emoji colorido. NUNCA SVG inline (Gmail corta).
- QR servido por rota própria (`/api/qr/[token]`), pois Gmail bloqueia `data:` URI.

### 2.10 Do's & Don'ts

**Faça:**
- Use os tokens (`red-brand`, `cream`, `ink-warm`), nunca hex solto.
- Mantenha o equilíbrio 70% dark / dobra clara / faixas vermelhas.
- Títulos condensados, caixa alta, com 1-2 palavras em blur.
- Teste no mobile primeiro. Rode `npx tsc --noEmit` e `npx next build` ao final.

**Não faça:**
- Não use o travessão "—".
- Não reintroduza grão/ruído.
- Não deixe a página inteira clara nem o vermelho cobrir tudo.
- Não use emoji colorido no e-mail.
- Não misture a estética dark/dourado do sistema interno na LP.
- Não anime a ponto de prejudicar leitura.

---

*Atualize este guia sempre que mudar um token, fonte ou padrão de animação.*
