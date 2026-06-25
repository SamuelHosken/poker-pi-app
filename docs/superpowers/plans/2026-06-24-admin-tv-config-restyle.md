# Restyle da config de TV — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repaginar a config de TV (`/admin/events/[id]/tv`) com o design system + remover o botão "Recarregar TV" falso e o bloco "Em breve (V2.2)", sem mudar banco nem a lógica de cronômetro/blinds.

**Architecture:** Restyle de apresentação por área (arquivo/grupo). Cada componente troca markup à mão pelos primitivos (`Card`, `Button`, `Badge`, `Input`), usa helpers de `lib/ui-labels`, tokens de marca. Lógica de cronômetro/blinds/auto-advance/realtime preservada verbatim. Dois itens inertes/roadmap removidos.

**Tech Stack:** Next.js 16, React 19, TypeScript estrito, Tailwind v4, `@base-ui/react`, `lucide-react`, vitest.

## Global Constraints

- **PRESENTAÇÃO APENAS**, exceto: (a) remover o botão "Recarregar TV" + `handleRefresh` em `tv-actions.tsx`; (b) remover o bloco "Em breve (V2.2)" em `page.tsx`. Nada além disso muda comportamento.
- **NÃO mexer na lógica** de cronômetro (timestamps/pausa/avanço), blinds (`createBlindLevel`/`updateBlindLevel`/`deleteBlindLevel`/reset), auto-advance, ou realtime. Confirmações destrutivas (reset blinds, reiniciar mesa) preservadas.
- **NADA de banco/schema/migration.**
- **PT-BR; sem estados crus do banco** — `tableStateLabel(... as MatchState)` de `@/lib/ui-labels`.
- **TS estrito, ZERO `any`.** Alvos ≥44px. Componentes grandes quebrados só se necessário, sem mudar lógica.
- **Verificação:** `npx tsc --noEmit -p .` + `npx next build` após cada task.
- **Commit discipline:** working tree tem mudanças NÃO relacionadas (convite/inscrever/playwright). Commitar SÓ os arquivos da task com `git add "<path>"` explícito — NUNCA `git commit -a`.
- Subagentes não inspecionam navegador → conferência visual = passe humano no fim.

## Design system de referência (todas as tasks)

- `import { Button, buttonVariants } from "@/components/ui/button"` — variants default/secondary/ghost/destructive/outline; sizes default(h-11)/sm/lg/icon. Para triggers de Dialog/AlertDialog, `className={buttonVariants({ variant, size })}`.
- `import { Card, CardContent } from "@/components/ui/card"`.
- `import { Badge } from "@/components/ui/badge"`, `import { Input } from "@/components/ui/input"`, `import { Label } from "@/components/ui/label"`.
- `import { tableStateLabel } from "@/lib/ui-labels"`; `import type { MatchState } from "@/lib/types/domain"`.
- Tokens: `text-muted-foreground`, `border-hair`, `bg-surface`, `text-gold`, `text-gold-soft`, `text-destructive`.

---

## Task 1: Cabeçalho + Telão público (page.tsx + tv-actions.tsx)

**Files:**
- Modify: `app/admin/events/[id]/tv/page.tsx`
- Modify: `app/admin/events/[id]/tv/tv-actions.tsx`

- [ ] **Step 1: Restyle + remoções**

Ler ambos. Em `page.tsx`: cabeçalho (título do evento + meta) em `<Card>`; **remover o bloco `{/* Em breve */}` "Em breve (V2.2)"** (≈ linhas 193-205). Em `tv-actions.tsx`: a seção do link público em `<Card>`; "Abrir TV em nova aba" → `<Button>`, "Copiar link" → `<Button variant="secondary">`; **remover o botão "Recarregar TV" e a função `handleRefresh`**. Manter toda a lógica de copiar link e abrir aba.

- [ ] **Step 2: Verificar**

Run: `npx tsc --noEmit -p .` e `npx next build` → zero erros (confirmar que `toast` não fica importado sem uso em tv-actions.tsx após remover `handleRefresh`).

- [ ] **Step 3: Commit**

```bash
git add "app/admin/events/[id]/tv/page.tsx" "app/admin/events/[id]/tv/tv-actions.tsx"
git commit -m "feat(admin): config TV — cabeçalho/telão repaginados, remove Recarregar TV falso e bloco V2.2"
```

---

## Task 2: Controles de início/pausa (tv-start-control.tsx + tv-pause-control.tsx)

**Files:**
- Modify: `app/admin/events/[id]/tv/tv-start-control.tsx`
- Modify: `app/admin/events/[id]/tv/tv-pause-control.tsx`

- [ ] **Step 1: Restyle**

Ler ambos. Botões/controles (iniciar TV / "Vamos começar jajá" / pausar geral / retomar) → `<Button>` com variantes e `size` ≥44px. Cards/overlays → `<Card>` quando fizer sentido. Estados crus → `tableStateLabel(... as MatchState)`. **Não mexer na lógica** de início/pausa (timestamps, mensagens, transições).

- [ ] **Step 2: Verificar**

Run: `npx tsc --noEmit -p .` e `npx next build` → zero erros.

- [ ] **Step 3: Commit**

```bash
git add "app/admin/events/[id]/tv/tv-start-control.tsx" "app/admin/events/[id]/tv/tv-pause-control.tsx"
git commit -m "feat(admin): config TV — controles de início/pausa repaginados"
```

---

## Task 3: Cronômetro ao vivo + controles de todas as mesas (mesa-live-control.tsx + all-tables-controls.tsx)

**Files:**
- Modify: `app/admin/events/[id]/tv/mesa-live-control.tsx`
- Modify: `app/admin/events/[id]/tv/all-tables-controls.tsx`

- [ ] **Step 1: Restyle**

Ler ambos. `mesa-live-control.tsx` (383 linhas, o cronômetro por mesa + ±1min, pausar, avançar nível, reiniciar): todos os botões → `<Button>` (variantes apropriadas; ações destrutivas tipo "Reiniciar mesa" = `destructive`, **mantendo qualquer confirmação existente**); cards → `<Card>`; estados crus → `tableStateLabel(... as MatchState)`. `all-tables-controls.tsx`: botões → `<Button>`. **Não mexer na lógica do cronômetro** (advanceLevel, pause/resume, restart, os setTimeout do auto-advance). Se ajudar a ficar <200 linhas, extrair sub-blocos sem mudar lógica.

- [ ] **Step 2: Verificar**

Run: `npx tsc --noEmit -p .` e `npx next build` → zero erros.

- [ ] **Step 3: Commit**

```bash
git add "app/admin/events/[id]/tv/mesa-live-control.tsx" "app/admin/events/[id]/tv/all-tables-controls.tsx"
git commit -m "feat(admin): config TV — cronômetro ao vivo + controles de mesas repaginados"
```

---

## Task 4: Auto-advance + reset blinds (auto-advance-toggle.tsx + reset-blinds-button.tsx)

**Files:**
- Modify: `app/admin/events/[id]/tv/auto-advance-toggle.tsx`
- Modify: `app/admin/events/[id]/tv/reset-blinds-button.tsx`

- [ ] **Step 1: Restyle**

Ler ambos. `auto-advance-toggle.tsx`: o toggle MANUAL/AUTOMÁTICO → `<Button>` (par de botões/segmented) preservando o estado e a ação. `reset-blinds-button.tsx`: "Resetar blinds pro template Casa" → `<Button variant="destructive">` (ou via `buttonVariants` se for trigger), **mantendo a confirmação existente** e a Server Action `resetBlindsFromTemplate`.

- [ ] **Step 2: Verificar**

Run: `npx tsc --noEmit -p .` e `npx next build` → zero erros.

- [ ] **Step 3: Commit**

```bash
git add "app/admin/events/[id]/tv/auto-advance-toggle.tsx" "app/admin/events/[id]/tv/reset-blinds-button.tsx"
git commit -m "feat(admin): config TV — auto-advance e reset blinds repaginados"
```

---

## Task 5: Editor de blinds (blinds-editor.tsx)

**Files:**
- Modify: `app/admin/events/[id]/tv/blinds-editor.tsx`

- [ ] **Step 1: Restyle**

Ler o arquivo (410 linhas). A tabela/lista de níveis de blind → `<Card>`; os inputs de edição (SB/BB/ante/duração) → `<Input>`/`<Label>`; botões (editar / salvar / adicionar nível / remover nível / pular pro nível) → `<Button>` (≥44px; remover = `destructive`/`ghost icon`). **Não mexer na lógica** de `createBlindLevel`/`updateBlindLevel`/`deleteBlindLevel` nem nas confirmações. Estados crus → helpers. Se ajudar a ficar <200 linhas, extrair sub-blocos (ex.: linha de nível, dialog de edição) movendo lógica verbatim.

- [ ] **Step 2: Verificar**

Run: `npx tsc --noEmit -p .` e `npx next build` → zero erros.

- [ ] **Step 3: Commit**

```bash
git add "app/admin/events/[id]/tv/blinds-editor.tsx"
git commit -m "feat(admin): config TV — editor de blinds repaginado"
```

---

## Task 6: Verificação final + screenshots

**Files:** nenhum (verificação).

- [ ] **Step 1: Suite + tipos + build**

Run: `npm test` ; `npx tsc --noEmit -p .` ; `npx next build`
Expected: testes passando; zero erros; build limpo.

- [ ] **Step 2: Screenshots** *(passe humano/controller)*

Recapturar `/admin/events/[id]/tv` (desktop + mobile) via `.superpowers/shots/shoot.mjs`. Conferir: cabeçalho/telão em Card, **sem botão "Recarregar TV"**, **sem bloco "Em breve"**, cronômetro/controles em botões ≥44px, blinds editor legível, nada torto/cortado.

- [ ] **Step 3: Sanidade de comportamento**

Confirmar: iniciar/pausar/retomar cronômetro, ±1min, avançar nível, editar/adicionar/remover blind, resetar blinds (com confirmação), toggle auto-advance, copiar link/abrir TV — todas com as mesmas ações de antes.

---

## Self-Review (autor do plano)

- **Cobertura da spec:** §3.1 cabeçalho/telão + remoções → Task 1; §3.2 cronômetro/controles → Tasks 2,3; §3.3 auto-advance/reset → Task 4; §3.4 blinds editor → Task 5; §4 verificação → Task 6. Sem lacunas.
- **Sem placeholders:** cada task nomeia arquivos exatos + primitivos/variantes; o nível de detalhe (ler e aplicar o padrão) é o mesmo que funcionou nos incrementos 3 e 4.
- **Consistência:** primitivos e helpers idênticos aos incrementos anteriores; `tableStateLabel`/`MatchState` reusados; nenhum símbolo novo.
- **Risco residual:** `mesa-live-control.tsx` e `blinds-editor.tsx` (lógica de cronômetro/blinds) — destacado "não mexer na lógica" em cada task; coberto por build + verificação de comportamento na Task 6.
