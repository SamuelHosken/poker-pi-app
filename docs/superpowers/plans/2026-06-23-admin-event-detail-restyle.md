# Restyle do detalhe do evento — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repaginar a tela `/admin/events/[id]` (e seus sub-componentes) com o design system + material glass, sem mudar banco nem comportamento.

**Architecture:** Restyle de apresentação, arquivo por arquivo. Cada componente troca markup feito à mão pelos primitivos existentes (`Card`, `Button`, `Badge`, `AvatarImage`), usa os helpers de label de `lib/ui-labels`, e aplica o material `glass`. Lógica (Server Actions, queries, realtime, confirmações) é preservada verbatim; arquivos grandes são quebrados em sub-blocos sem alterar comportamento.

**Tech Stack:** Next.js 16, React 19, TypeScript estrito, Tailwind v4, `@base-ui/react`, `lucide-react`, vitest.

## Global Constraints

- **PRESENTAÇÃO APENAS.** Não alterar nenhuma Server Action, query, subscription realtime, prop, ou confirmação. Mesmo fluxo, mesmas ações, mesmos textos de confirmação destrutiva (digitar "apagar").
- **NADA de banco/schema.**
- **PT-BR em TODA UI**, código em inglês. **Sem estados crus do banco** — usar `eventStateLabel`/`tableStateLabel`/`playerStateLabel` de `@/lib/ui-labels`.
- **TypeScript estrito, ZERO `any`.** Componentes **< 200 linhas** (quebrar os grandes sem mudar lógica). Alvos de toque **≥44px**.
- **Cronômetro/blinds NÃO entram nesta tela** (continuam na config de TV).
- **Verificação:** `npx tsc --noEmit -p .` + `npx next build` após cada task.
- **Subagentes não inspecionam navegador** → a conferência visual é um passe humano no fim; o implementer só garante tsc+build e lógica preservada.

## Design system de referência (usar em todas as tasks)

- `import { Button } from "@/components/ui/button"` — `variant`: `default` (dourado, **disabled limpo**), `secondary` (translúcido), `ghost`, `destructive`, `outline`; `size`: `default` (h-11/44px), `sm` (h-9), `lg` (h-12), `xs`, `icon` (size-11), `icon-sm`, `icon-lg`.
- `import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"`.
- `import { Badge } from "@/components/ui/badge"` — `variant`: `live` (verde), `gold`, `neutral`.
- `import { AvatarImage } from "@/components/ui/avatar-image"` — `{ name, url?, size?: "sm"|"md"|"lg"|"xl", variant?, className? }`.
- `import { eventStateLabel, tableStateLabel, playerStateLabel } from "@/lib/ui-labels"` — DB `state` é `string`; fazer cast pro tipo de domínio (`import type { EventState, MatchState, PlayerState } from "@/lib/types/domain"`).
- Material de vidro: classe utilitária `glass` (ex.: `<Card className="glass">` ou `<div className="glass ...">`).
- Tokens de marca (`text-gold`, `text-gold-soft`, `bg-ink-2`, `border-hair`, `text-muted-foreground`, `text-destructive`) seguem válidos.

---

## File Structure

| Arquivo | Responsabilidade | Ação |
|---|---|---|
| `app/admin/events/[id]/page.tsx` | Cabeçalho, seção de mesas, coroar/encerrar, zona de perigo, resumo encerrado | Modificar (extrair sub-blocos) |
| `app/admin/events/[id]/players-section.tsx` | Adicionar pessoa + lista de jogadores + eliminar | Modificar (extrair sub-blocos) |
| `app/admin/events/[id]/rebuy-section.tsx` | Ação de rebuy + elegibilidade | Modificar |
| `app/admin/events/[id]/match-players-section.tsx` | Jogadores por mesa | Modificar |
| `app/admin/events/[id]/match-controls.tsx` | Controles da partida (pausar/avançar) | Modificar |
| `app/admin/events/[id]/crown-champion-control.tsx` | Coroar campeão | Modificar |
| `app/admin/events/[id]/end-event-button.tsx` | Encerrar sem campeão | Modificar |
| `app/admin/events/[id]/advance-state-button.tsx` | Avançar estado do evento | Modificar |
| `app/admin/events/[id]/undo-button.tsx` | Desfazer última ação | Modificar |
| `app/admin/events/[id]/delete-event-button.tsx` | Apagar evento (zona de perigo) | Modificar |

Cada task lê o(s) arquivo(s) que toca, aplica o restyle preservando a lógica, roda `tsc`+`build`, commita.

---

## Task 1: Cabeçalho do evento + labels (page.tsx — topo)

**Files:**
- Modify: `app/admin/events/[id]/page.tsx`

**Interfaces:**
- Consumes: `Card`/`CardContent`, `Badge`, `eventStateLabel`/`tableStateLabel` (`@/lib/ui-labels`).
- Produces: cabeçalho repaginado; remove os dicionários inline `STATE_LABEL`/`TABLE_STATE_LABEL` (linhas ~23-39) e passa a usar os helpers em todo o arquivo.

- [ ] **Step 1: Ler o arquivo e mapear o cabeçalho**

Ler `app/admin/events/[id]/page.tsx` inteiro. Identificar: o `<h1>` do título (~linha 110), o bloco de meta (data/buy-in/rebuy/estado, que usa `STATE_LABEL[event.state]` ~linha 148), e o link da TV pública (~linha 159).

- [ ] **Step 2: Trocar os dicionários inline pelos helpers**

Remover as constantes `STATE_LABEL` e `TABLE_STATE_LABEL` (~linhas 23-39). Substituir TODOS os usos de `STATE_LABEL[event.state] ?? event.state` por `eventStateLabel(event.state as EventState)` e `TABLE_STATE_LABEL[t.state] ?? t.state` por `tableStateLabel(t.state as MatchState)`. Adicionar os imports:
```tsx
import { eventStateLabel, tableStateLabel } from "@/lib/ui-labels";
import type { EventState, MatchState } from "@/lib/types/domain";
```

- [ ] **Step 3: Repaginar o cabeçalho como Card**

Envolver o cabeçalho (título + meta + link TV) num `<Card>` de vidro. Meta (data/buy-in/rebuy) vira uma linha de stats limpa; **estado vira** `<Badge variant={event.state === "EM_ANDAMENTO" ? "live" : "neutral"}>{eventStateLabel(event.state as EventState)}</Badge>`. Manter o link da TV pública + a ação de copiar que já existir (sem mudar a lógica de copiar). Não tocar nos botões `advance-state`/`undo` aqui (Task 5).

- [ ] **Step 4: Largura no desktop**

Trocar o container externo da página de `max-w-3xl` para algo mais confortável (`max-w-5xl`), mantendo o padding atual. (Só a largura; o conteúdo continua em coluna.)

- [ ] **Step 5: Type-check + build**

Run: `npx tsc --noEmit -p .` e `npx next build`
Expected: zero erros; build limpo.

- [ ] **Step 6: Commit**

```bash
git add "app/admin/events/[id]/page.tsx"
git commit -m "feat(admin): cabeçalho do evento repaginado + labels via ui-labels"
```

---

## Task 2: Adicionar pessoa + lista de jogadores (players-section.tsx)

**Files:**
- Modify: `app/admin/events/[id]/players-section.tsx`
- Create (extração): `app/admin/events/[id]/add-person-form.tsx`, `app/admin/events/[id]/player-row.tsx`

**Interfaces:**
- Consumes: `Card`, `Button`, `AvatarImage`, `playerStateLabel`.
- Produces: seção repaginada; sub-blocos extraídos sem mudança de lógica.

> `players-section.tsx` tem 508 linhas. Extrair o formulário de adicionar pessoa e a linha de jogador para componentes próprios **passando as mesmas props/callbacks** (Server Actions e estado permanecem na seção pai ou movem-se intactos).

- [ ] **Step 1: Ler e mapear**

Ler `players-section.tsx` inteiro. Identificar: o formulário "Adicionar pessoa ao evento" (dropdown + "+ Adicionar" + "Cadastrar nova pessoa") e a lista "No evento" (linhas de jogador com avatar/nome/estado + ações Eliminar/Marcar/trash).

- [ ] **Step 2: Repaginar o formulário de adicionar pessoa**

Envolver em `<Card>`. O **"+ Adicionar" vira `<Button>`** (default) — isso já resolve o "oliva" do disabled. "Cadastrar nova pessoa" vira `<Button variant="secondary">`. Manter o `<select>`/dropdown e TODA a lógica de seleção/submit intacta. Se viável, extrair pra `add-person-form.tsx` (props = mesmas que a seção já usa).

- [ ] **Step 3: Repaginar a linha de jogador**

Cada linha num item de lista limpo (dentro de um `<Card>` que envolve a lista). Avatar via `<AvatarImage size="sm">`; nome + estado via `playerStateLabel(p.state as PlayerState)`. As ações **Eliminar / Marcar pago / remover viram `<Button>`** com `size` ≥44px (`sm` ou `icon`): Eliminar = `variant="destructive"`, Marcar/Pago = `variant="secondary"` ou `default`, remover = `variant="ghost" size="icon"`. **Manter exatamente** as mesmas Server Actions/handlers já chamados. Se viável, extrair pra `player-row.tsx`.

- [ ] **Step 4: Garantir <200 linhas**

Após extrair `add-person-form.tsx` e `player-row.tsx`, `players-section.tsx` deve ficar bem menor. Se algum dos novos arquivos passar de 200, anotar como concern (não refatorar lógica à força).

- [ ] **Step 5: Type-check + build**

Run: `npx tsc --noEmit -p .` e `npx next build`
Expected: zero erros; build limpo.

- [ ] **Step 6: Commit**

```bash
git add "app/admin/events/[id]/players-section.tsx" "app/admin/events/[id]/add-person-form.tsx" "app/admin/events/[id]/player-row.tsx"
git commit -m "feat(admin): adicionar pessoa + lista de jogadores repaginados"
```

---

## Task 3: Rebuy + controles da partida (rebuy-section.tsx, match-controls.tsx)

**Files:**
- Modify: `app/admin/events/[id]/rebuy-section.tsx`
- Modify: `app/admin/events/[id]/match-controls.tsx`

**Interfaces:**
- Consumes: `Button`, `Card`, `tableStateLabel`.
- Produces: ambos repaginados; motivo de inelegibilidade visível inline.

- [ ] **Step 1: rebuy-section.tsx — botões + motivo inline**

Ler o arquivo. O botão "Fazer rebuy" vira `<Button size="sm">` (≥44px no `default`/`sm`). Onde hoje a tag "Inelegível" usa `title={...}` (hover), **renderizar o motivo como texto visível** ao lado/abaixo (ex.: `<span className="text-xs text-muted-foreground">{eligibility.reason}</span>`), mantendo a lógica de elegibilidade intacta.

- [ ] **Step 2: match-controls.tsx — botões**

Ler o arquivo. Os controles (Pausar/Avançar/etc.) viram `<Button>` com variantes apropriadas e `size` ≥44px. Manter as Server Actions/handlers. Estados crus de mesa → `tableStateLabel(... as MatchState)`.

- [ ] **Step 3: Type-check + build**

Run: `npx tsc --noEmit -p .` e `npx next build`
Expected: zero erros; build limpo.

- [ ] **Step 4: Commit**

```bash
git add "app/admin/events/[id]/rebuy-section.tsx" "app/admin/events/[id]/match-controls.tsx"
git commit -m "feat(admin): rebuy + controles da partida repaginados (motivo inline, botões ≥44px)"
```

---

## Task 4: Jogadores por mesa (match-players-section.tsx)

**Files:**
- Modify: `app/admin/events/[id]/match-players-section.tsx`

**Interfaces:**
- Consumes: `Card`, `Button`, `AvatarImage`, `playerStateLabel`.
- Produces: seção de jogadores por mesa repaginada.

- [ ] **Step 1: Ler e repaginar**

Ler o arquivo. Cada jogador da mesa vira uma linha limpa (avatar via `AvatarImage`, nome, estado via `playerStateLabel(... as PlayerState)`). O botão "Eliminar" (hoje `text-[10px]`) vira `<Button variant="destructive" size="sm">` (≥44px). Manter todas as Server Actions/handlers. Envolver a lista num `<Card>` se ainda não estiver.

- [ ] **Step 2: Type-check + build**

Run: `npx tsc --noEmit -p .` e `npx next build`
Expected: zero erros; build limpo.

- [ ] **Step 3: Commit**

```bash
git add "app/admin/events/[id]/match-players-section.tsx"
git commit -m "feat(admin): jogadores por mesa repaginados (botão eliminar ≥44px)"
```

---

## Task 5: Botões de ciclo de vida + zona de perigo

**Files:**
- Modify: `app/admin/events/[id]/crown-champion-control.tsx`
- Modify: `app/admin/events/[id]/end-event-button.tsx`
- Modify: `app/admin/events/[id]/advance-state-button.tsx`
- Modify: `app/admin/events/[id]/undo-button.tsx`
- Modify: `app/admin/events/[id]/delete-event-button.tsx`
- Modify: `app/admin/events/[id]/page.tsx` (seções que envolvem esses controles: coroar/encerrar e zona de perigo)

**Interfaces:**
- Consumes: `Button`, `Card`.
- Produces: todos os botões de ciclo de vida via `<Button>`; coroar/encerrar e zona de perigo em `Card`s claros.

> Estes são botões/controles menores. Cada um troca o markup do botão à mão por `<Button>` com a variante certa, **sem mudar a ação nem a confirmação** (delete continua exigindo digitar "apagar").

- [ ] **Step 1: crown-champion-control.tsx**

Ler. "Coroar campeão" → `<Button>` (default, dourado). Manter o dialog/seleção e a Server Action.

- [ ] **Step 2: end-event-button.tsx**

Ler. "Encerrar sem campeão" → `<Button variant="ghost">` (alternativa clara, não link cinza apagado). Manter a confirmação e a ação.

- [ ] **Step 3: advance-state-button.tsx + undo-button.tsx**

Ler ambos. Cada um vira `<Button>` (advance = default/secondary; undo = `variant="ghost"` ou `secondary`). Manter as ações.

- [ ] **Step 4: delete-event-button.tsx (zona de perigo)**

Ler. O botão de apagar → `<Button variant="destructive">`. **Manter o dialog que exige digitar "apagar"** e a Server Action. Em `page.tsx`, envolver a "Zona de perigo" num `<Card>` destrutivo claramente separado no rodapé (tokens `border-destructive/30 bg-destructive/5` ou similar), e a seção coroar/encerrar num `<Card>` próprio.

- [ ] **Step 5: Type-check + build**

Run: `npx tsc --noEmit -p .` e `npx next build`
Expected: zero erros; build limpo.

- [ ] **Step 6: Commit**

```bash
git add "app/admin/events/[id]/crown-champion-control.tsx" "app/admin/events/[id]/end-event-button.tsx" "app/admin/events/[id]/advance-state-button.tsx" "app/admin/events/[id]/undo-button.tsx" "app/admin/events/[id]/delete-event-button.tsx" "app/admin/events/[id]/page.tsx"
git commit -m "feat(admin): botões de ciclo de vida e zona de perigo repaginados"
```

---

## Task 6: Verificação final + screenshots

**Files:** nenhum (verificação).

- [ ] **Step 1: Suite + tipos + build**

Run: `npm test` ; `npx tsc --noEmit -p .` ; `npx next build`
Expected: testes existentes passando; zero erros de tipo; build limpo.

- [ ] **Step 2: Screenshots da tela** *(passe humano/controller — subagente não inspeciona navegador)*

Recapturar `/admin/events/[id]` em desktop e mobile (script `.superpowers/shots/shoot.mjs`). Conferir: cabeçalho em Card, estado em Badge, "+ Adicionar" sem oliva, botões Eliminar/Rebuy/Pago ≥44px e legíveis, motivo de inelegível visível, mesas em cards de vidro, coroar/encerrar claros, zona de perigo separada no rodapé, nenhum estado cru, nada torto/cortado, desktop usando a largura.

- [ ] **Step 3: Sanidade de comportamento**

Confirmar (visualmente / via código) que adicionar/eliminar/rebuy/marcar pago/coroar/encerrar/desfazer/apagar continuam com as mesmas ações e confirmações de antes.

---

## Self-Review (autor do plano)

- **Cobertura da spec:** §3.1 cabeçalho → Task 1; §3.2 adicionar pessoa → Task 2; §3.3 lista jogadores → Task 2; §3.4 rebuy inline → Task 3; §3.5 mesas → Tasks 3,4; §3.6 coroar/encerrar → Task 5; §3.7 zona de perigo → Task 5; §3.8 desktop → Task 1; §4 saúde do código (extrações) → Tasks 1,2; §5 verificação → Task 6. Sem lacunas.
- **Sem placeholders:** cada task nomeia arquivos exatos e os componentes/variantes a usar; restyle de arquivos grandes é descrito com o nível de detalhe certo (o implementer lê o arquivo existente, como nos incrementos anteriores).
- **Consistência:** os primitivos e helpers (Button/Card/Badge/AvatarImage, eventStateLabel/tableStateLabel/playerStateLabel) são os mesmos definidos nos incrementos 1-2 e referenciados igualmente em todas as tasks; novos arquivos extraídos (`add-person-form.tsx`, `player-row.tsx`) só na Task 2.
- **Risco residual:** extrair sub-blocos de `players-section.tsx` (508 linhas) é o ponto mais delicado — mitigado por mover lógica verbatim + build/test + conferência de comportamento na Task 6.
