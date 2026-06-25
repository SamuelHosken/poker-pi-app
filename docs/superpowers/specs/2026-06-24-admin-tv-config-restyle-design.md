# Restyle da config de TV — Incremento 5

> **Data:** 2026-06-24
> **Escopo:** Repaginar `/admin/events/[id]/tv` (config da TV) com o design system, mais dois
> fixes de honestidade. Apresentação apenas, fora os dois itens removidos. Lógica de
> cronômetro/blinds/auto-advance/realtime intacta.

---

## 1. Contexto

Quinto incremento da repaginação. Os anteriores cobriram fundação + jogador (1), admin
shell (2), detalhe do evento (3) e telas de lista/CRUD (4). Resta a **config de TV** — a
tela mais densa do admin (cronômetro, blinds editor, controles de mesa). A auditoria
apontou, além do estilo antigo: o **botão "Recarregar TV" falso** (só mostra um toast) e o
bloco **"Em breve (V2.2)"** vazando roadmap numa tela operacional.

## 2. Escopo

**No escopo (10 arquivos em `app/admin/events/[id]/tv/`):** `page.tsx`, `tv-actions.tsx`,
`mesa-live-control.tsx`, `tv-start-control.tsx`, `tv-pause-control.tsx`,
`all-tables-controls.tsx`, `auto-advance-toggle.tsx`, `reset-blinds-button.tsx`,
`blinds-editor.tsx`, `loading.tsx`.

**Dois fixes de comportamento (decididos):**
1. **Remover o botão "Recarregar TV"** (`tv-actions.tsx` — `handleRefresh` só faz
   `toast.info`). A TV já atualiza sozinha via realtime/polling. Remover o botão e a função.
2. **Remover o bloco "Em breve (V2.2)"** (`page.tsx:193-199`).

**Fora do escopo:**
- **Nada de banco/schema/migration.**
- **Toda a lógica de cronômetro, blinds, auto-advance e realtime permanece intacta.** Só
  apresentação (fora os dois itens removidos).
- A **fragilidade do auto-advance** (depende da aba aberta) — fix mais profundo, fica para
  outro incremento; aqui o toggle só é repaginado.
- Telas de auth — incremento seguinte.

**Branch:** continua em `fundacao-visual-desktop`.

## 3. Design (padrão por área)

Reusa os primitivos: `Card`/`CardContent`/`CardHeader`, `Button`/`buttonVariants`
(default/secondary/ghost/destructive, ≥44px), `Badge` (live/gold/neutral), `Input`/`Label`,
e helpers de `lib/ui-labels`. Tokens de marca seguem válidos.

1. **Cabeçalho + Telão público** (`page.tsx`, `tv-actions.tsx`) — cabeçalho em `Card`; a
   seção do link público em `Card`; **Abrir TV / Copiar link → `<Button>`**; **remover
   "Recarregar TV"**. Remover o bloco "Em breve (V2.2)".
2. **Cronômetro + controles de mesa** (`mesa-live-control.tsx`, `tv-start-control.tsx`,
   `tv-pause-control.tsx`, `all-tables-controls.tsx`) — controles (iniciar/pausar/retomar/
   ajustar tempo/avançar nível) → `<Button>`; cards de mesa → `<Card>`; estados crus →
   `tableStateLabel(... as MatchState)`. **Não mexer na lógica do cronômetro** (timestamps,
   pausa, avanço).
3. **Auto-advance + reset blinds** (`auto-advance-toggle.tsx`, `reset-blinds-button.tsx`) —
   toggle e botão → `<Button>`/design system; **reset blinds mantém a confirmação** existente.
4. **Blinds editor** (`blinds-editor.tsx`, 410 linhas) — tabela/edição de níveis em `Card`,
   inputs de edição → `<Input>`, botões (editar/salvar/adicionar/remover nível) → `<Button>`.
   **Não mexer na lógica** de `createBlindLevel`/`updateBlindLevel`/`deleteBlindLevel`. Quebrar
   em sub-blocos sem mudar lógica se ajudar a ficar <200 linhas.

**Transversal:** nenhum estado cru renderizado; alvos ≥44px; cores via tokens; confirmações
destrutivas preservadas.

## 4. Verificação

- `npx tsc --noEmit -p .` — zero erros.
- `npx next build` — build limpo.
- `npm test` — testes existentes passando.
- Screenshots da config de TV (desktop + mobile): cards de vidro, botões ≥44px, sem botão
  "Recarregar TV", sem bloco "Em breve", blinds editor legível, nada torto/cortado.
- Sanidade de comportamento: iniciar/pausar/retomar cronômetro, avançar nível, editar/
  adicionar/remover blind, resetar blinds (com confirmação), toggle auto-advance — todas com
  as mesmas ações de antes.

## 5. Riscos e mitigação

- **Tela crítica de operação ao vivo (cronômetro)** → mudança restrita a apresentação +
  remoção de 2 itens inertes/de roadmap; lógica de cronômetro/blinds intocada; build + testes
  + verificação manual de comportamento.
- **blinds-editor grande e com lógica de edição** → restyle dos elementos visuais sem tocar
  nas Server Actions de blinds; extrair sub-blocos só se seguro.
