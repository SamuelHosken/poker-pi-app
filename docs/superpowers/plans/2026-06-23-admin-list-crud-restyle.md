# Restyle das telas de lista/CRUD do admin — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repaginar as 7 telas de lista/CRUD do admin com o design system, sem mudar banco nem comportamento.

**Architecture:** Restyle de apresentação, uma tela (arquivo/grupo) por task. Cada tela troca markup à mão pelos primitivos (`Card`, `Button`, `Badge`, `AvatarImage`), usa helpers de `lib/ui-labels` para estados, e tokens de marca. Lógica (Server Actions, queries, confirmações) preservada verbatim.

**Tech Stack:** Next.js 16, React 19, TypeScript estrito, Tailwind v4, `@base-ui/react`, `lucide-react`, vitest.

## Global Constraints

- **PRESENTAÇÃO APENAS.** Não alterar Server Action, query, prop, handler, ou confirmação (incluindo digitar "apagar"). Mesmo fluxo.
- **NADA de banco/schema.**
- **PT-BR; sem estados crus do banco** — usar `eventStateLabel`/`tableStateLabel`/`playerStateLabel` de `@/lib/ui-labels` (cast `as EventState|MatchState|PlayerState` de `@/lib/types/domain`; DB `state` é `string`).
- **TS estrito, ZERO `any`.** Alvos de toque **≥44px**. Componentes grandes quebrados só se necessário, sem mudar lógica.
- **Verificação:** `npx tsc --noEmit -p .` + `npx next build` após cada task.
- **Commit discipline:** o working tree tem mudanças NÃO relacionadas (convite/inscrever/playwright). Commitar SÓ os arquivos da task com `git add "<path>"` explícito — NUNCA `git commit -a`.
- Subagentes não inspecionam navegador → conferência visual é passe humano no fim.

## Design system de referência (todas as tasks)

- `import { Button, buttonVariants } from "@/components/ui/button"` — `variant`: `default` (dourado, disabled limpo), `secondary` (translúcido), `ghost`, `destructive`, `outline`; `size`: `default` (h-11), `sm` (h-9), `lg` (h-12), `icon` (size-11). Para triggers de Dialog/AlertDialog que não podem ser `<Button>`, usar `className={buttonVariants({ variant, size })}`.
- `import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"`.
- `import { Badge } from "@/components/ui/badge"` — `live`/`gold`/`neutral`.
- `import { AvatarImage } from "@/components/ui/avatar-image"` — `{ name, url?, size?, variant?: "outline"|"gold"|"inline", className? }`.
- `import { Input } from "@/components/ui/input"`, `import { Label } from "@/components/ui/label"`.
- `import { playerStateLabel, eventStateLabel, tableStateLabel } from "@/lib/ui-labels"`.
- Material de vidro: classe `glass`. Tokens: `text-muted-foreground`, `border-hair`, `bg-surface`, `text-gold`, `text-gold-soft`, `text-destructive`.

---

## Task 1: Perfis (`/admin/profiles`)

**Files:**
- Modify: `app/admin/profiles/page.tsx`
- Modify: `app/admin/profiles/profile-row-actions.tsx`

**Interfaces:** Consumes `Card`, `Button`, `Badge`, `AvatarImage`.

- [ ] **Step 1: Restyle**

Ler ambos. `page.tsx`: cada perfil num `<Card>`; avatar via `<AvatarImage size="sm" variant="inline">`; badge "ADMIN" → `<Badge variant="gold">`; "+ Cadastrar pessoa" → `<Button>` dourado. `profile-row-actions.tsx`: TIRAR ADMIN / SENHA → `<Button variant="secondary" size="sm">`, APAGAR → `<Button variant="destructive" size="sm">`. Manter TODAS as Server Actions/handlers e o dialog de confirmação.

- [ ] **Step 2: Verificar**

Run: `npx tsc --noEmit -p .` e `npx next build` → zero erros, build limpo.

- [ ] **Step 3: Commit**

```bash
git add app/admin/profiles/page.tsx app/admin/profiles/profile-row-actions.tsx
git commit -m "feat(admin): tela de perfis repaginada"
```

---

## Task 2: Cadastrar perfil (`/admin/profiles/new`)

**Files:**
- Modify: `app/admin/profiles/new/page.tsx`
- Modify: `app/admin/profiles/new/new-profile-form.tsx`

**Interfaces:** Consumes `Card`, `Button`, `Input`, `Label`.

- [ ] **Step 1: Restyle + toggle de senha**

Ler ambos. Form → `Input`/`Label`/`<Button>`. No campo de senha, adicionar um **toggle mostrar/ocultar** (estado local `showPassword`, botão com ícone `Eye`/`EyeOff` de `lucide-react`, alternando `type` entre `"text"` e `"password"`); default oculto. Suavizar o texto que cita "/admin/login" para algo amigável (ex.: "a pessoa entra com esse e-mail e senha") — sem mudar nenhuma ação. Manter a Server Action de criar perfil intacta.

- [ ] **Step 2: Verificar**

Run: `npx tsc --noEmit -p .` e `npx next build` → zero erros.

- [ ] **Step 3: Commit**

```bash
git add app/admin/profiles/new/page.tsx app/admin/profiles/new/new-profile-form.tsx
git commit -m "feat(admin): cadastrar perfil repaginado (toggle de senha)"
```

---

## Task 3: Inscritos (`/admin/inscritos`)

**Files:**
- Modify: `app/admin/inscritos/page.tsx`
- Modify: `app/admin/inscritos/inscritos-toolbar.tsx`

**Interfaces:** Consumes `Card`, `Button`, `Badge`.

- [ ] **Step 1: Restyle**

Ler ambos. Cards de stats (TOTAL / FORAM À 1ª / etc.) → `<Card>`; linhas de inscrito/convidado → `<Card>` ou itens de lista com `border-hair bg-surface`; status ("NÃO ABRIU"/"INSCRITO"/etc.) → `<Badge>` (neutral/gold/live conforme o caso). Toolbar: botões → `<Button>`. Manter Server Actions/queries.

- [ ] **Step 2: Verificar**

Run: `npx tsc --noEmit -p .` e `npx next build` → zero erros.

- [ ] **Step 3: Commit**

```bash
git add app/admin/inscritos/page.tsx app/admin/inscritos/inscritos-toolbar.tsx
git commit -m "feat(admin): tela de inscritos repaginada"
```

---

## Task 4: Galeria (`/admin/galeria`)

**Files:**
- Modify: `app/admin/galeria/page.tsx`

**Interfaces:** Consumes `Card`, `AvatarImage`; `Trophy`/`Crown` de `lucide-react`.

- [ ] **Step 1: Restyle + trocar emoji**

Ler. Cards de campeão → `<Card>`; avatares via `<AvatarImage>`. **Trocar o emoji 🏆 decorativo (`text-4xl`) por um ícone `lucide` (`Trophy` ou `Crown`) com `text-gold`** — consistente com o resto. Estados crus → helpers. Manter queries.

- [ ] **Step 2: Verificar**

Run: `npx tsc --noEmit -p .` e `npx next build` → zero erros.

- [ ] **Step 3: Commit**

```bash
git add app/admin/galeria/page.tsx
git commit -m "feat(admin): galeria repaginada (ícone lucide no lugar do emoji)"
```

---

## Task 5: Avaliações (`/admin/feedback`)

**Files:**
- Modify: `app/admin/feedback/page.tsx`
- Modify: `app/admin/feedback/copy-link-button.tsx`
- Modify: `app/admin/feedback/reset-feedback-button.tsx`

**Interfaces:** Consumes `Card`, `Button`.

- [ ] **Step 1: Restyle**

Ler os três. Cards de stats (nota média + por categoria) → `<Card>`. `copy-link-button.tsx`: "COMPARTILHAR" → `<Button>`. `reset-feedback-button.tsx`: "Resetar" → `<Button variant="destructive">`, **mantendo a confirmação de digitar "apagar"**. Manter Server Actions.

- [ ] **Step 2: Verificar**

Run: `npx tsc --noEmit -p .` e `npx next build` → zero erros.

- [ ] **Step 3: Commit**

```bash
git add app/admin/feedback/page.tsx app/admin/feedback/copy-link-button.tsx app/admin/feedback/reset-feedback-button.tsx
git commit -m "feat(admin): avaliações repaginadas"
```

---

## Task 6: Classificação (`/admin/events/[id]/results`)

**Files:**
- Modify: `app/admin/events/[id]/results/page.tsx`

**Interfaces:** Consumes `Card`, `Button`, `AvatarImage`, `playerStateLabel`.

- [ ] **Step 1: Restyle**

Ler. Lista classificatória → `<Card>` com linhas limpas; avatares/posição; estados crus → `playerStateLabel(... as PlayerState)` (mantendo rótulos específicos do contexto como "Não jogou" se já existirem). "EXPORTAR JSON" → `<Button variant="secondary">`. Manter a lógica de exportar e as queries.

- [ ] **Step 2: Verificar**

Run: `npx tsc --noEmit -p .` e `npx next build` → zero erros.

- [ ] **Step 3: Commit**

```bash
git add "app/admin/events/[id]/results/page.tsx"
git commit -m "feat(admin): classificação (results) repaginada"
```

---

## Task 7: Lixeira (`/admin/events/lixeira`)

**Files:**
- Modify: `app/admin/events/lixeira/page.tsx`
- Modify: `app/admin/events/lixeira/trashed-event-row.tsx`

**Interfaces:** Consumes `Card`, `Button`, `Badge`, `eventStateLabel`.

- [ ] **Step 1: Restyle**

Ler ambos. Cards de evento apagado → `<Card>`; estado → `<Badge>` via `eventStateLabel(... as EventState)`. `trashed-event-row.tsx`: Restaurar → `<Button variant="secondary">`, Apagar definitivamente → `<Button variant="destructive">`, **mantendo a confirmação de digitar "apagar definitivamente"**. Manter Server Actions.

- [ ] **Step 2: Verificar**

Run: `npx tsc --noEmit -p .` e `npx next build` → zero erros.

- [ ] **Step 3: Commit**

```bash
git add app/admin/events/lixeira/page.tsx app/admin/events/lixeira/trashed-event-row.tsx
git commit -m "feat(admin): lixeira repaginada"
```

---

## Task 8: Verificação final + screenshots

**Files:** nenhum (verificação).

- [ ] **Step 1: Suite + tipos + build**

Run: `npm test` ; `npx tsc --noEmit -p .` ; `npx next build`
Expected: testes passando; zero erros; build limpo.

- [ ] **Step 2: Screenshots** *(passe humano/controller)*

Recapturar as 7 telas (desktop + mobile) via `.superpowers/shots/shoot.mjs`. Conferir: cards de vidro, botões ≥44px, badges no lugar de enums crus, galeria sem emoji, toggle de senha no cadastro, nada torto/cortado.

- [ ] **Step 3: Sanidade de comportamento**

Confirmar que promover/rebaixar admin, resetar senha, cadastrar perfil, compartilhar/resetar avaliações, exportar JSON, restaurar/apagar evento continuam com as mesmas ações e confirmações.

---

## Self-Review (autor do plano)

- **Cobertura da spec:** §3.1 Perfis → Task 1; §3.2 Cadastrar → Task 2; §3.3 Inscritos → Task 3; §3.4 Galeria → Task 4; §3.5 Avaliações → Task 5; §3.6 Results → Task 6; §3.7 Lixeira → Task 7; §4 verificação → Task 8. Sem lacunas.
- **Sem placeholders:** cada task nomeia arquivos exatos + os primitivos/variantes a usar; o nível de detalhe (ler o arquivo e aplicar o padrão) é o mesmo que funcionou nos incrementos 1 e 3.
- **Consistência:** primitivos e helpers idênticos aos definidos nos incrementos anteriores; nenhum tipo/símbolo novo introduzido.
- **Risco residual:** confirmações destrutivas (Avaliações reset, Lixeira apagar) — destacadas em cada task como "manter a confirmação"; cobertas pela verificação de comportamento na Task 8.
