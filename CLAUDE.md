# Ingressos · a venda do Mesa Pi

> Esta pasta se chamava `legado` e o nome mentia. Aqui não é resto de nada: é o produto
> que vende o ingresso, emite, manda por e-mail e recebe na portaria.

Repositório `poker-pi-app`. Mapa das pastas em `../LEIA-ME.md`.

---

## 1. O que este projeto é

Três coisas, e só três:

1. **Vender.** A LP `/pokerpi` mostra os planos e cobra. `/inscrever` captura quem ainda
   não decidiu.
2. **Entregar.** Pagamento confirmado vira `qr_token`, e-mail com QR e a página
   `/ingresso/[token]`, que é o que a pessoa mostra na porta.
3. **Receber.** `/admin/checkin` lê o QR na portaria. `/admin/events/[id]/ingressos`
   confere quem pagou, confirma PIX na mão e reconcilia pendente.

Mais duas pontas que sobreviveram porque não têm casa melhor: `/avaliar` (pesquisa
pós-evento) e `/convite/[slug]` (vídeo-convite).

**O que NÃO é daqui:** o torneio. Cronômetro, mesas, eliminação, TV, bar, jogador. Tudo
isso vive no app, em `app.mesapigroup.com` (pasta `sistema/`).

## 2. O torneio v1 foi apagado daqui em 12/08/2026

95 arquivos, 13.345 linhas. Saíram `/me`, `/tv`, `/admin/profiles`, `/admin/galeria`, o
detalhe de torneio de `/admin/events/[id]`, `/api/auto-advance`, `/api/chip-version`,
`components/tv`, `components/player`, `lib/timer`, `lib/audio`, `lib/realtime` e dez
módulos de `lib/tournament`. O app substituiu todos.

**A tabela `events` continua viva e não é v1.** Ela é o escopo do ingresso
(`tickets.event_id`) e quem diz se a venda está aberta (`sales_open`). O que morreu foi o
CRUD de torneio em cima dela. De `lib/tournament/` sobraram seis arquivos, e o nome da
pasta virou herança: `auth.ts` (que é de onde sai `requireAdmin` e `rawServiceClient`,
usado por 15 arquivos), `events.ts` (uma função), `profiles.ts`, `subscriptions.ts`,
`feedback.ts` e `convite-stats.ts`.

## 3. Portões de verificação

```bash
npm test
npx tsc --noEmit
npx next build
```

Linha de base depois da limpeza: **126 testes verdes em 22 arquivos**, `tsc` zerado, build
passando. O `next build` não é opcional aqui: mudança de rota **não** é pega por `npm test`
nem por `tsc`, só por ele.

Existe lint neste projeto, ao contrário do `sistema`.

## 4. O que mais custou caro aqui

1. **Dev é igual a prod.** Um só Supabase, sem banco de desenvolvimento. Rodar local
   escreve em produção.
2. **`NEXT_PUBLIC_*` é inlinado no build.** O e-mail do ingresso monta três URLs absolutas
   a partir de `NEXT_PUBLIC_SITE_URL`: o botão, a imagem do QR e o logo. Trocar a variável
   sem rebuildar não muda nada, e o QR **codifica a URL dentro do próprio desenho**.
3. **Webhook que responde 200 em falha nunca é re-tentado.** Já fez comprador pagar e não
   receber ingresso, em silêncio (`87326ff`). Falha responde 500.
4. **Uma conta Asaas serve dois apps**, e por isso precisa de dois webhooks registrados. Se
   faltar um, o ingresso paga e fica `pending` para sempre.
5. **O 23505 em `markPaid` é sempre dinheiro capturado sem ingresso emitido.** Nada no
   sistema conserta sozinho, e `reconcilePendingTickets` não é cron: só roda quando um
   admin aperta o botão.

Mais: nunca o caractere travessão, em lugar nenhum. Português na interface, inglês no
código.

## 5. Antes de escrever feature

Vale o mesmo processo do `sistema`: a skill `nova-feature` na raiz do `mesa-pi` e o
checklist em `../sistema/docs/CHECKLIST-PERGUNTAS-FEATURE.md`. Ele foi escrito olhando os
dois projetos, e as perguntas de dinheiro, webhook e rota pública são quase todas sobre
código que mora aqui.
