# Restyle do detalhe do evento — Incremento 3

> **Data:** 2026-06-23
> **Escopo:** Repaginar visualmente a tela `/admin/events/[id]` (detalhe/operação do
> evento) com o design system + material glass. Só apresentação — sem mudança de banco,
> de fluxo, ou de comportamento das ações.

---

## 1. Contexto e motivação

Terceiro incremento da repaginação. Os anteriores entregaram o design system + fluxo do
jogador (1) e o shell do admin com Liquid Glass (2). A varredura de design mostrou que o
**interior** das telas admin ainda usa o estilo antigo (labels mono maiúsculas, números
coloridos, botões pequenos). A tela mais densa e importante — a operação do evento — é o
primeiro alvo.

Problemas da auditoria que este incremento ataca:
- **Botões minúsculos** de Eliminar/Rebuy (`text-[10px]`), contra a regra ≥44px do CLAUDE.md.
- **Botão "+ Adicionar" desabilitado fica "oliva sujo"** (dourado + opacity).
- **Estados crus do banco** via dicionários inline duplicados (`STATE_LABEL`/`TABLE_STATE_LABEL`).
- **Motivo de "Inelegível" para rebuy** só no `title` (hover) — invisível no toque.
- **Largura de desktop desperdiçada** (a tela vivia em `max-w-3xl`; agora o shell dá espaço).
- **Arquivos enormes**: `players-section.tsx` (508 linhas), `page.tsx` (353).

## 2. Escopo (explícito)

**No escopo:** restyle de apresentação da tela `/admin/events/[id]` e seus sub-componentes
(`page.tsx`, `players-section.tsx`, `match-players-section.tsx`, `match-controls.tsx`,
`rebuy-section.tsx`, `crown-champion-control.tsx`, `end-event-button.tsx`,
`advance-state-button.tsx`, `undo-button.tsx`, `delete-event-button.tsx`).

**Fora do escopo:**
- **Nada de banco/schema; nada de mudança de comportamento/fluxo.** Mesmas Server Actions,
  queries, realtime, confirmações. A operação ao vivo continua igual.
- **Cronômetro/blinds permanecem na config de TV** — não reorganizamos a operação neste
  incremento (decisão tomada). Juntar cronômetro + eliminação é um incremento futuro.
- Outras telas admin (TV config, profiles, inscritos, results, lixeira) — incrementos seguintes.

**Branch:** continua em `fundacao-visual-desktop`.

## 3. Design por seção

Usa os componentes existentes: `Card`/`CardHeader`/`CardContent`, `Button` (variantes
default/secondary/ghost/destructive, tamanhos ≥44px), `Badge` (live/gold/neutral), `AvatarImage`,
e os helpers `eventStateLabel`/`tableStateLabel`/`playerStateLabel` de `lib/ui-labels`. Material
`glass` onde fizer sentido (cards de seção).

1. **Cabeçalho do evento** — `Card` com título, meta (data, buy-in, rebuy) como linha de
   stats, **estado em `<Badge>`** (live se EM_ANDAMENTO, neutral senão), link da TV pública com
   ação de copiar. Remove os dicionários `STATE_LABEL`/`TABLE_STATE_LABEL` inline e usa os
   helpers de `lib/ui-labels`.
2. **Credenciamento / adicionar pessoa** — `Card`; dropdown de pessoa; **"+ Adicionar" →
   `<Button>`** (default, estado disabled limpo); "Cadastrar nova pessoa" → `<Button variant="secondary">`.
3. **Lista de jogadores no evento** — linhas limpas num `Card`; ações **Eliminar / Rebuy /
   Pago → `<Button>` com `size` ≥44px** (`sm`/`default`/`icon`); avatar via `AvatarImage`;
   estados via helpers.
4. **Rebuy** — quando inelegível, **mostrar o motivo inline** (texto visível), não só `title`.
5. **Mesas** — `Card` de vidro por mesa; `match-controls` → `<Button>`; estados via `tableStateLabel`.
6. **Coroar campeão / encerrar** — `Card`; "Coroar campeão" → `<Button>` dourado; "Encerrar
   sem campeão" → `<Button variant="ghost">` (alternativa clara, não link cinza apagado).
7. **Zona de perigo (apagar evento)** — card destrutivo separado no rodapé, com tokens
   destrutivos; **comportamento idêntico** (ainda exige digitar "apagar").
8. **Desktop** — container mais largo e confortável (aproveita o espaço do shell); mantém
   o layout de seções; mesas lado a lado quando couber.

## 4. Saúde do código

- `players-section.tsx` (508) e `page.tsx` (353) violam a regra <200 linhas. Durante o
  restyle, extrair sub-blocos coesos **sem mudar lógica** (ex.: formulário de adicionar
  pessoa, linha de jogador, zona de perigo, resumo de encerrado). Onde não der pra ficar
  <200 sem refator artificial, anotar.
- Reusar `lib/ui-labels` em vez de redefinir dicionários de label.

## 5. Verificação

- `npx tsc --noEmit -p .` — zero erros.
- `npx next build` — build limpo.
- `npm test` — testes existentes passando.
- Conferência visual (screenshots) da tela em **mobile** (~390px) e **desktop** (~1280px):
  botões ≥44px e legíveis, "+ Adicionar" sem oliva, nenhum estado cru, cards de vidro
  coerentes, zona de perigo separada, nada torto/cortado.
- Sanidade de comportamento: adicionar/eliminar/rebuy/marcar pago/coroar/encerrar/apagar
  funcionam exatamente como antes (mesmas ações, mesmas confirmações).

## 6. Riscos e mitigação

- **Quebrar a operação ao vivo ao mexer numa tela crítica** → mudança restrita a
  apresentação; Server Actions/queries/realtime intocados; extrações preservam lógica
  verbatim; build + testes + conferência manual de comportamento.
- **Arquivos grandes difíceis de refatorar com segurança** → extrair só sub-blocos óbvios,
  um por vez, com verificação a cada passo; não reescrever a lógica.
