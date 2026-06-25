# Fundação Visual + Desktop — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Estabelecer o design system (tokens + componentes base shadcn/CVA) e o scaffolding responsivo/desktop, aplicando-os no fluxo do jogador (`/me`, mesa, perfil, dinheiro) como piloto, sem mudar banco nem comportamento.

**Architecture:** Tailwind v4 `@theme` é a fonte única de tokens. Retunamos os **valores** dos tokens de marca existentes (sem renomear, pra não quebrar ~190 arquivos) para a paleta nova, adicionamos tokens novos (surface/hair/live/gold-soft) e mapeamos os tokens semânticos do shadcn. Reconstruímos os primitivos `components/ui/*` (base-ui + CVA) com tamanhos de toque ≥44px e os aplicamos só nas telas do piloto. Um shell `app/(public)/me/layout.tsx` dá container app-like + safe-area sem afetar a TV.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript estrito, Tailwind CSS v4, `@base-ui/react`, `class-variance-authority`, Supabase, vitest (ambiente node).

## Global Constraints

- **TypeScript estrito — ZERO `any`.** (CLAUDE.md §7)
- **PT-BR em TODA UI, código em inglês.** (CLAUDE.md §4.7)
- **Componentes < 200 linhas.** Se passar, quebrar. (CLAUDE.md §7)
- **Server Components por padrão;** `'use client'` só quando há estado/eventos do navegador. (CLAUDE.md §7)
- **NADA de banco/schema.** Sem migrations, sem mudança de tabela. Banco populado intocado.
- **Sem mudança de comportamento/fluxo.** Mesmas Server Actions, mesmo realtime, mesmos dados.
- **NÃO renomear tokens de marca existentes** (`--color-ink`, `--color-gold`, `--color-paper`, etc.) — só retunar valores e adicionar novos.
- **Não tocar** em `app/admin/*`, `components/tv/*`, `app/(public)/tv/*`, `app/(public)/inscrever/*`, `app/(public)/convite/*`, `app/(public)/avaliar/*` (herdam a paleta via tokens; redesign é incremento futuro).
- **Verificação obrigatória após mudanças:** `npx tsc --noEmit -p .` e `npx next build`. (CLAUDE.md §14)
- **Paleta refinada de referência:** fundo `#0a0a0c`, dourado `#d9b876`, dourado-suave `#f0dcae`, texto `#f2f3f5`, "ao vivo" `#34d399`. Verde **só** para status ao vivo.

---

## File Structure

| Arquivo | Responsabilidade | Ação |
|---|---|---|
| `app/globals.css` | Tokens (fonte única) | Modificar |
| `lib/ui-labels.ts` | Tradução PT-BR de estados do banco para UI | Criar |
| `lib/ui-labels.test.ts` | Testes do helper de labels | Criar |
| `components/ui/button.tsx` | Botão (variantes + tamanhos ≥44px) | Modificar |
| `components/ui/button-variants.test.ts` | Teste das variantes (CVA puro) | Criar |
| `components/ui/badge.tsx` | Badge (live/gold/neutral) | Modificar |
| `components/ui/badge-variants.test.ts` | Teste das variantes do badge | Criar |
| `components/ui/card.tsx` | Card (surface + hairline + glow) | Modificar |
| `lib/avatar.ts` | Helper puro de inicial do avatar | Criar |
| `lib/avatar.test.ts` | Teste do helper | Criar |
| `components/ui/avatar-image.tsx` | Avatar com fallback `onError` | Modificar |
| `app/layout.tsx` | `viewport` (themeColor, viewport-fit) | Modificar |
| `app/(public)/me/layout.tsx` | Shell app-like do jogador (container + safe-area) | Criar |
| `app/(public)/me/page.tsx` | Hub do jogador (redesign) | Modificar |
| `app/(public)/me/me-player-realtime.tsx` | Wrapper realtime (sem mudança de lógica) | Modificar |
| `app/(public)/me/mesa/[tableId]/mesa-view.tsx` | Visão da mesa (redesign) | Modificar |
| `app/(public)/me/mesa/[tableId]/page.tsx` | Página da mesa (redesign) | Modificar |
| `app/(public)/me/mesa/[tableId]/reaction-bar.tsx` | Barra de reações (restyle) | Modificar |
| `app/(public)/me/perfil/page.tsx` | Perfil (redesign) | Modificar |
| `app/(public)/me/perfil/avatar-uploader.tsx` | Upload de avatar (restyle) | Modificar |
| `app/(public)/me/mesa/[tableId]/dinheiro/chip-calculator.tsx` | Calculadora (restyle, lógica intacta) | Modificar |

**Nota sobre testes:** vitest roda em ambiente `node` (sem DOM/jsdom). Logo, TDD real é feito sobre **lógica pura** (helpers de label, inicial do avatar, e as funções CVA `buttonVariants`/`badgeVariants` que retornam strings de classe). As tarefas de estilo/JSX visual são verificadas por **build limpo + checklist visual manual** (mobile ~390px e desktop ~1280px), não por teste unitário — não adicionamos infra de DOM-testing (fora de escopo).

---

## Task 1: Camada de tokens (globals.css)

**Files:**
- Modify: `app/globals.css`

**Interfaces:**
- Produces: tokens de marca retunados + novos tokens consumíveis como utilitários Tailwind: `bg-surface`, `bg-surface-2`, `border-hair`, `text-gold-soft`, `text-live`/`bg-live`, `text-muted-2`. Tokens semânticos shadcn (`bg-card`, `text-primary`, `border-border`, `bg-primary`, `text-primary-foreground`) remapeados para a paleta nova.

- [ ] **Step 1: Retunar tokens de marca e adicionar novos no bloco `@theme inline`**

No `@theme inline`, substituir o grupo "Poker Pi brand colors" por (mantendo os nomes, mudando valores e adicionando os novos):

```css
  /* Poker Pi brand colors — refinados (dark + dourado premium) */
  --color-ink: #0a0a0c;
  --color-ink-2: #131418;
  --color-smoke: #1a1b1f;
  --color-line: #26272c;
  --color-gray-mid: #6c707a;
  --color-gray-soft: #9aa0aa;
  --color-paper: #f2f3f5;
  --color-gold: #d9b876;
  --color-red-poker: #c8102e;
  --color-felt: #0f3d2e;

  /* Tokens novos do design system */
  --color-gold-soft: #f0dcae;
  --color-live: #34d399;
  --color-surface: rgba(255, 255, 255, 0.045);
  --color-surface-2: rgba(255, 255, 255, 0.065);
  --color-hair: rgba(255, 255, 255, 0.08);
  --color-muted-2: #6c707a;
```

- [ ] **Step 2: Bump do raio base para cantos mais generosos**

Trocar `--radius: 0.625rem;` (no bloco `.dark`/`:root`) — ver Step 3 — por `--radius: 0.8rem;`. A escala derivada (`--radius-md`, `--radius-2xl`, etc.) já existe no `@theme` e passa a render cantos maiores automaticamente.

- [ ] **Step 3: Remover o bloco `:root` (light, morto) e retunar `.dark`**

Apagar TODO o bloco `:root { ... }` (light mode — o app é dark-lock, `next-themes` removida). Substituir o conteúdo do bloco `.dark` por:

```css
.dark {
  --radius: 0.8rem;
  --background: #0a0a0c;
  --foreground: #f2f3f5;
  --card: #131418;
  --card-foreground: #f2f3f5;
  --popover: #131418;
  --popover-foreground: #f2f3f5;
  --primary: #d9b876;
  --primary-foreground: #1c1606;
  --secondary: #1a1b1f;
  --secondary-foreground: #f2f3f5;
  --muted: #1a1b1f;
  --muted-foreground: #9aa0aa;
  --accent: #d9b876;
  --accent-foreground: #1c1606;
  --destructive: #e5484d;
  --border: rgba(255, 255, 255, 0.08);
  --input: rgba(255, 255, 255, 0.12);
  --ring: #d9b876;
  --chart-1: #d9b876;
  --chart-2: #e5484d;
  --chart-3: #34d399;
  --chart-4: #6c707a;
  --chart-5: #9aa0aa;
  --sidebar: #131418;
  --sidebar-foreground: #f2f3f5;
  --sidebar-primary: #d9b876;
  --sidebar-primary-foreground: #1c1606;
  --sidebar-accent: #1a1b1f;
  --sidebar-accent-foreground: #f2f3f5;
  --sidebar-border: rgba(255, 255, 255, 0.08);
  --sidebar-ring: #d9b876;
}
```

Manter os blocos `@layer base` e `@keyframes` como estão (as animações da TV usam `rgba(201,169,97,…)` — herdam o tom antigo, será refinado no incremento da TV; não tocar agora).

- [ ] **Step 4: Verificar build**

Run: `npx next build`
Expected: build conclui sem erro de CSS/Tailwind ("Compiled successfully").

- [ ] **Step 5: Conferência visual rápida**

Run: `npm run dev`, abrir `/admin/login` e `/me` (logado). Esperado: telas ainda renderizam (não tocadas), agora com fundo neutro mais frio e dourado refinado herdados. Sem layout quebrado.

- [ ] **Step 6: Commit**

```bash
git add app/globals.css
git commit -m "feat(tokens): retune paleta para dark refinado + dourado, add tokens surface/hair/live"
```

---

## Task 2: Helper de labels PT-BR (lib/ui-labels.ts)

**Files:**
- Create: `lib/ui-labels.ts`
- Test: `lib/ui-labels.test.ts`

**Interfaces:**
- Consumes: tipos `PlayerState`, `MatchState`, `EventState` de `lib/types/domain.ts`.
- Produces: `playerStateLabel(state: PlayerState): string`, `tableStateLabel(state: MatchState): string`, `eventStateLabel(state: EventState): string` — todos retornam rótulo PT-BR; nunca o enum cru.

- [ ] **Step 1: Escrever o teste que falha**

Criar `lib/ui-labels.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { playerStateLabel, tableStateLabel, eventStateLabel } from "@/lib/ui-labels";

describe("ui-labels", () => {
  it("traduz estados do jogador para PT-BR (nunca o enum cru)", () => {
    expect(playerStateLabel("JOGANDO")).toBe("Em jogo");
    expect(playerStateLabel("INSCRITO")).toBe("Inscrito");
    expect(playerStateLabel("ELIMINADO")).toBe("Eliminado");
    expect(playerStateLabel("CAMPEAO")).toBe("Campeão");
  });

  it("traduz estados da mesa", () => {
    expect(tableStateLabel("JOGANDO")).toBe("Em jogo");
    expect(tableStateLabel("PAUSADA")).toBe("Pausada");
    expect(tableStateLabel("LIVRE")).toBe("Livre");
    expect(tableStateLabel("FINALIZADA")).toBe("Finalizada");
  });

  it("traduz estados do evento", () => {
    expect(eventStateLabel("EM_ANDAMENTO")).toBe("Em andamento");
    expect(eventStateLabel("ENCERRADO")).toBe("Encerrado");
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- lib/ui-labels.test.ts`
Expected: FAIL ("Cannot find module '@/lib/ui-labels'").

- [ ] **Step 3: Implementar**

Criar `lib/ui-labels.ts`:

```ts
import type { EventState, MatchState, PlayerState } from "@/lib/types/domain";

const PLAYER_STATE_LABELS: Record<PlayerState, string> = {
  INSCRITO: "Inscrito",
  PRESENTE: "Presente",
  CHAMADO: "Chamado",
  JOGANDO: "Em jogo",
  ELIMINADO: "Eliminado",
  CLASSIFICADO: "Classificado",
  NA_FINAL: "Na final",
  CAMPEAO: "Campeão",
  VICE: "Vice",
  TERCEIRO: "Terceiro",
  OUTROS_FINALISTAS: "Finalista",
};

const MATCH_STATE_LABELS: Record<MatchState, string> = {
  LIVRE: "Livre",
  JOGANDO: "Em jogo",
  PAUSADA: "Pausada",
  FINALIZADA: "Finalizada",
};

const EVENT_STATE_LABELS: Record<EventState, string> = {
  SETUP: "Preparação",
  CREDENCIAMENTO: "Credenciamento",
  EM_ANDAMENTO: "Em andamento",
  MESA_FINAL: "Mesa final",
  ENCERRADO: "Encerrado",
};

export function playerStateLabel(state: PlayerState): string {
  return PLAYER_STATE_LABELS[state] ?? state;
}

export function tableStateLabel(state: MatchState): string {
  return MATCH_STATE_LABELS[state] ?? state;
}

export function eventStateLabel(state: EventState): string {
  return EVENT_STATE_LABELS[state] ?? state;
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test -- lib/ui-labels.test.ts`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add lib/ui-labels.ts lib/ui-labels.test.ts
git commit -m "feat(ui): helper de labels PT-BR para estados do banco"
```

---

## Task 3: Reconstruir Button (touch ≥44px + variantes)

**Files:**
- Modify: `components/ui/button.tsx`
- Test: `components/ui/button-variants.test.ts`

**Interfaces:**
- Consumes: `cn` de `@/lib/utils`; `Button` de `@base-ui/react/button`.
- Produces: `Button` e `buttonVariants` com variantes `default` (dourado primário), `secondary` (translúcido), `ghost`, `destructive`, `outline`, `link`; tamanhos `default` (h-11), `sm` (h-9), `lg` (h-12), `xs` (h-8), `icon` (size-11), `icon-sm` (size-9), `icon-lg` (size-12).

- [ ] **Step 1: Escrever o teste que falha**

Criar `components/ui/button-variants.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buttonVariants } from "@/components/ui/button";

describe("buttonVariants", () => {
  it("o tamanho default tem alvo de toque >= 44px (h-11)", () => {
    expect(buttonVariants({ size: "default" })).toContain("h-11");
  });
  it("o tamanho lg é h-12", () => {
    expect(buttonVariants({ size: "lg" })).toContain("h-12");
  });
  it("a variante default usa o primário (dourado)", () => {
    expect(buttonVariants({ variant: "default" })).toContain("bg-primary");
  });
  it("a variante secondary é translúcida (surface)", () => {
    expect(buttonVariants({ variant: "secondary" })).toContain("bg-surface");
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- components/ui/button-variants.test.ts`
Expected: FAIL (size default ainda é `h-8`; secondary ainda usa `bg-secondary`).

- [ ] **Step 3: Implementar (substituir o `cva` em button.tsx)**

Substituir o objeto de `variants`/`size` dentro de `buttonVariants` (manter a string base de classes, os imports e a função `Button`) por:

```ts
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-xl border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground font-semibold shadow-[0_8px_24px_-10px_rgba(217,184,118,0.55)] [a]:hover:bg-primary/90 hover:bg-primary/90",
        secondary:
          "bg-surface text-foreground border-hair hover:bg-surface-2",
        ghost: "hover:bg-white/5 hover:text-foreground",
        destructive:
          "bg-destructive/12 text-destructive hover:bg-destructive/20 focus-visible:ring-destructive/20",
        outline:
          "border-hair bg-transparent hover:bg-white/5 hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 gap-2 px-4",
        xs: "h-8 gap-1 px-2.5 text-xs",
        sm: "h-9 gap-1.5 px-3 text-sm",
        lg: "h-12 gap-2 px-5 text-base",
        icon: "size-11",
        "icon-sm": "size-9",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test -- components/ui/button-variants.test.ts`
Expected: PASS (4 testes).

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit -p .`
Expected: zero erros (a remoção de tamanhos `icon-xs` não é usada por nenhum arquivo do escopo; se `tsc` apontar uso fora do escopo, restaurar só aquele size — mas o esperado é zero).

- [ ] **Step 6: Commit**

```bash
git add components/ui/button.tsx components/ui/button-variants.test.ts
git commit -m "feat(ui): Button com alvo de toque >=44px e variantes do design system"
```

---

## Task 4: Reconstruir Badge (live/gold/neutral)

**Files:**
- Modify: `components/ui/badge.tsx`
- Test: `components/ui/badge-variants.test.ts`

**Interfaces:**
- Produces: `Badge` e `badgeVariants` com variantes adicionais `live` (verde), `gold`, `neutral` — além das existentes (`default`, `secondary`, `destructive`, `outline`, `ghost`, `link`).

- [ ] **Step 1: Escrever o teste que falha**

Criar `components/ui/badge-variants.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { badgeVariants } from "@/components/ui/badge";

describe("badgeVariants", () => {
  it("a variante live usa o verde de status", () => {
    expect(badgeVariants({ variant: "live" })).toContain("text-live");
  });
  it("a variante gold usa o dourado-suave", () => {
    expect(badgeVariants({ variant: "gold" })).toContain("text-gold-soft");
  });
  it("a variante neutral é discreta", () => {
    expect(badgeVariants({ variant: "neutral" })).toContain("text-muted-foreground");
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- components/ui/badge-variants.test.ts`
Expected: FAIL (variantes `live`/`gold`/`neutral` não existem).

- [ ] **Step 3: Implementar**

No objeto `variants.variant` do `badgeVariants` em `badge.tsx`, adicionar (mantendo as existentes):

```ts
        live: "border-live/30 bg-live/15 text-live",
        gold: "border-gold/30 bg-gold/15 text-gold-soft",
        neutral: "border-border bg-white/5 text-muted-foreground",
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test -- components/ui/badge-variants.test.ts`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add components/ui/badge.tsx components/ui/badge-variants.test.ts
git commit -m "feat(ui): Badge com variantes live/gold/neutral"
```

---

## Task 5: Reconstruir Card (surface + hairline + glow)

**Files:**
- Modify: `components/ui/card.tsx`

**Interfaces:**
- Consumes: `cn` de `@/lib/utils`.
- Produces: `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardAction`, `CardContent`, `CardFooter` (mesmas assinaturas; só estilo). `Card` agora é superfície translúcida com hairline + brilho interno no topo.

> Tarefa visual: verificada por build limpo, não por teste unitário (Card tem 0 imports atuais — sem regressão de consumidores).

- [ ] **Step 1: Trocar o estilo do `Card`**

Substituir o `className` do componente `Card` por:

```ts
        "group/card flex flex-col gap-4 overflow-hidden rounded-2xl border border-hair bg-surface py-5 text-sm text-card-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:gap-3 data-[size=sm]:py-4 *:[img:first-child]:rounded-t-2xl *:[img:last-child]:rounded-b-2xl",
```

- [ ] **Step 2: Ajustar `CardTitle` para sans (clean Apple) e `CardFooter` para hairline**

No `CardTitle`, trocar `font-heading text-base` por `text-base font-semibold tracking-tight` (sans em vez do serif Fraunces, pra um visual mais limpo).

No `CardFooter`, trocar `border-t bg-muted/50` por `border-t border-hair bg-white/[0.02]`.

No `CardHeader`/`CardContent`, trocar os `px-4` por `px-5` (respiro maior) e `rounded-t-xl` por `rounded-t-2xl`.

- [ ] **Step 3: Verificar build**

Run: `npx next build`
Expected: "Compiled successfully", sem erro de classe Tailwind.

- [ ] **Step 4: Commit**

```bash
git add components/ui/card.tsx
git commit -m "feat(ui): Card com superfície translúcida, hairline e brilho interno"
```

---

## Task 6: Avatar com fallback onError (lib/avatar.ts + avatar-image.tsx)

**Files:**
- Create: `lib/avatar.ts`
- Test: `lib/avatar.test.ts`
- Modify: `components/ui/avatar-image.tsx`

**Interfaces:**
- Produces: `avatarInitial(name: string): string` — primeira letra maiúscula, robusto a vazio/espaço. `AvatarImage` (mesma assinatura de props) agora cai para a inicial quando a imagem falha (`onError`).

- [ ] **Step 1: Escrever o teste que falha**

Criar `lib/avatar.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { avatarInitial } from "@/lib/avatar";

describe("avatarInitial", () => {
  it("retorna a primeira letra maiúscula", () => {
    expect(avatarInitial("rafael")).toBe("R");
  });
  it("ignora espaços à esquerda", () => {
    expect(avatarInitial("  ana")).toBe("A");
  });
  it("retorna '?' para nome vazio", () => {
    expect(avatarInitial("")).toBe("?");
    expect(avatarInitial("   ")).toBe("?");
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- lib/avatar.test.ts`
Expected: FAIL ("Cannot find module '@/lib/avatar'").

- [ ] **Step 3: Implementar o helper**

Criar `lib/avatar.ts`:

```ts
export function avatarInitial(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  return trimmed.charAt(0).toUpperCase();
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test -- lib/avatar.test.ts`
Expected: PASS (3 testes).

- [ ] **Step 5: Adicionar fallback onError no AvatarImage**

Reescrever `components/ui/avatar-image.tsx` para client component com estado de erro, reusando o helper (manter a mesma assinatura de props):

```tsx
"use client";

import { useState } from "react";
import { avatarInitial } from "@/lib/avatar";

export function AvatarImage({
  name,
  url,
  size = "md",
  variant = "outline",
  className,
}: {
  name: string;
  url?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "outline" | "gold" | "inline";
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  const sizeClass = {
    sm: "size-9 text-sm",
    md: "size-12 text-lg",
    lg: "size-16 text-2xl",
    xl: "size-32 text-6xl sm:size-40 sm:text-7xl",
  }[size];

  const variantClass = {
    outline: "border border-gold/40 bg-ink-2 text-gold",
    gold: "bg-gold text-ink",
    inline: "border border-line bg-ink text-gold",
  }[variant];

  const cls = `flex shrink-0 items-center justify-center overflow-hidden rounded-full font-display font-light ${sizeClass} ${variantClass} ${className ?? ""}`;

  if (url && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={name}
        className={`${cls} object-cover`}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div className={cls} aria-label={name}>
      {avatarInitial(name)}
    </div>
  );
}
```

- [ ] **Step 6: Type-check + build**

Run: `npx tsc --noEmit -p .` e depois `npx next build`
Expected: zero erros. (O componente já era usado como server-friendly; ao virar client, confirmar que nenhum caller passa props não-serializáveis — todas as props atuais são primitivas, então OK.)

- [ ] **Step 7: Commit**

```bash
git add lib/avatar.ts lib/avatar.test.ts components/ui/avatar-image.tsx
git commit -m "feat(ui): Avatar com fallback de inicial quando a imagem falha"
```

---

## Task 7: Viewport + theme-color no root layout

**Files:**
- Modify: `app/layout.tsx`

**Interfaces:**
- Produces: `export const viewport: Viewport` com `themeColor`, `viewportFit: "cover"`, escala controlada.

> Tarefa de config: verificada por build.

- [ ] **Step 1: Adicionar o export `viewport`**

Em `app/layout.tsx`, adicionar `Viewport` ao import de tipo e o export logo após `metadata`:

```ts
import type { Metadata, Viewport } from "next";
```

```ts
export const viewport: Viewport = {
  themeColor: "#0a0a0c",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  maximumScale: 5,
};
```

- [ ] **Step 2: Verificar build**

Run: `npx next build`
Expected: "Compiled successfully"; sem aviso de viewport duplicado.

- [ ] **Step 3: Commit**

```bash
git add app/layout.tsx
git commit -m "feat(app): viewport com theme-color e viewport-fit=cover (PWA/notch)"
```

---

## Task 8: Shell app-like do jogador (app/(public)/me/layout.tsx)

**Files:**
- Create: `app/(public)/me/layout.tsx`

**Interfaces:**
- Produces: layout que envolve `/me/**` com `<main>` de fundo `bg-ink`, container centralizado app-like (`max-w-md` em desktop) e padding com safe-area. **Não** afeta `/tv`, `/inscrever`, `/avaliar`, `/convite` (cada um fora de `me/`).

> **Por que `me/layout.tsx` e não `(public)/layout.tsx`:** `/tv/[eventId]` é kiosk full-bleed e também mora em `(public)`. Um container centralizado em `(public)` quebraria a TV. Escopo correto = só o fluxo do jogador.

- [ ] **Step 1: Criar o layout**

Criar `app/(public)/me/layout.tsx`:

```tsx
export default function MeLayout({ children }: { children: React.ReactNode }) {
  return (
    <main
      className="min-h-svh bg-ink text-paper"
      style={{
        paddingTop: "max(1.5rem, env(safe-area-inset-top))",
        paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))",
        paddingLeft: "max(1rem, env(safe-area-inset-left))",
        paddingRight: "max(1rem, env(safe-area-inset-right))",
      }}
    >
      <div className="mx-auto w-full max-w-md">{children}</div>
    </main>
  );
}
```

- [ ] **Step 2: Remover o `<main>`/wrapper duplicado das páginas filhas**

As páginas `/me/page.tsx`, `/me/mesa/[tableId]/page.tsx`, `/me/perfil/page.tsx`, `/me/mesa/[tableId]/dinheiro/page.tsx` hoje cada uma abre seu próprio `<main className="min-h-svh ... px-4 py-…">`. Isso será reconciliado nas tarefas 9–12 (cada uma deixa de declarar `<main>`/fundo/container, pois passam a vir do layout). **Nesta tarefa**, apenas criar o layout; não editar as páginas ainda (serão editadas nas tarefas seguintes). Para evitar padding duplo temporário, é aceitável que o build fique visualmente com margem extra até a Task 9 — as tarefas 9–12 corrigem.

- [ ] **Step 3: Verificar build**

Run: `npx next build`
Expected: "Compiled successfully".

- [ ] **Step 4: Commit**

```bash
git add "app/(public)/me/layout.tsx"
git commit -m "feat(me): shell app-like do jogador com safe-area e container centralizado"
```

---

## Task 9: Redesign do hub do jogador (/me)

**Files:**
- Modify: `app/(public)/me/page.tsx`
- Modify: `app/(public)/me/me-player-realtime.tsx` (só se contiver markup a ajustar; não mudar lógica de realtime)

**Interfaces:**
- Consumes: `Card`, `Badge`, `Button` de `@/components/ui/*`; `AvatarImage`; `eventStateLabel`, `playerStateLabel`, `tableStateLabel` de `@/lib/ui-labels`.
- Produces: hub redesenhado; **mesmas** Server Actions / dados / props.

> Tarefa visual: verificada por build + checklist manual. Regra de ouro: **só apresentação** — não alterar nenhuma chamada a Server Action, query, nem o componente `LiveRefresh`.

- [ ] **Step 1: Remover o wrapper de página e aplicar o sistema**

Em `app/(public)/me/page.tsx`:
- Remover o `<main className="min-h-svh ... px-4 py-…">` externo e o container de largura — agora vêm de `me/layout.tsx`. Manter apenas o conteúdo interno (header "Olá, {nome}", lista de eventos, etc.).
- Trocar os cards de evento feitos à mão (`rounded-… border …`) por `<Card>` + `<CardHeader>`/`<CardContent>`.
- Trocar os badges inline (`font-mono uppercase …`) por `<Badge variant="live">AO VIVO</Badge>`, `<Badge variant="gold">Campeão</Badge>`, `<Badge variant="neutral">…</Badge>`.
- Substituir QUALQUER render de estado cru (`ev.player.state`, `ev.table.state`) pelos helpers: `playerStateLabel(...)`, `tableStateLabel(...)`, `eventStateLabel(...)`.
- Botões "Entrar"/"Sair"/ações → `<Button>` (variant `default` para primário, `secondary`/`ghost` para o resto).
- Header no estilo do mockup aprovado: label dourado pequeno em uppercase (`text-gold text-xs tracking-wide`) + nome grande (`text-2xl font-bold tracking-tight`).

- [ ] **Step 2: Melhorar o empty state**

Onde hoje aparece "Você ainda não foi adicionado a nenhum evento. Peça pro admin te incluir." — envolver em `<Card>` com um ícone (lucide-react, ex.: `CalendarClock`) e o texto, centralizado, com respiro. Manter o texto PT-BR (pode reescrever para algo mais acolhedor, ex.: "Nenhum evento ainda — assim que o organizador te incluir, ele aparece aqui.").

- [ ] **Step 3: Type-check + build**

Run: `npx tsc --noEmit -p .` e `npx next build`
Expected: zero erros, build limpo.

- [ ] **Step 4: Checklist visual manual**

Run: `npm run dev`. Abrir `/me` logado, em viewport ~390px e ~1280px. Conferir:
- Container centrado app-like no desktop (não esticado).
- Nenhum estado cru ("JOGANDO"/"INSCRITO") visível — tudo PT-BR.
- Cards com superfície translúcida + hairline; badge "ao vivo" verde.
- Nada quebrado; mesma navegação/ações de antes.

- [ ] **Step 5: Commit**

```bash
git add "app/(public)/me/page.tsx" "app/(public)/me/me-player-realtime.tsx"
git commit -m "feat(me): redesign do hub do jogador com o design system novo"
```

---

## Task 10: Redesign da visão da mesa (/me/mesa/[tableId])

**Files:**
- Modify: `app/(public)/me/mesa/[tableId]/page.tsx`
- Modify: `app/(public)/me/mesa/[tableId]/mesa-view.tsx`
- Modify: `app/(public)/me/mesa/[tableId]/reaction-bar.tsx`

**Interfaces:**
- Consumes: `Card`, `Badge`, `Button`, `AvatarImage`, `tableStateLabel`, `playerStateLabel`.
- Produces: tela da mesa redesenhada; **mesma** subscription realtime e Server Actions (`joinTableAsPlayer`/`leaveCurrentTable`/reações).

> `mesa-view.tsx` tem 396 linhas (viola <200). Se a refatoração visual permitir extrair sub-blocos (ex.: a lista de jogadores em `mesa-players-list.tsx`, o dialog de eliminação em `eliminate-dialog.tsx`) sem mudar lógica, fazê-lo para respeitar a regra. Caso contrário, manter e anotar.

- [ ] **Step 1: Aplicar o sistema no `page.tsx`**

Remover `<main>`/container próprio (vem do layout). O badge fixo de estado no topo direito (`view.table.state`) → usar `tableStateLabel(view.table.state)` dentro de `<Badge variant={...}>` (variant `live` se JOGANDO, `neutral` caso contrário). Atenção: o `<Toaster>` é `position="top-right"` (global) — para não cobrir o badge, posicionar o badge à **esquerda** (`top-left`) ou abaixo do header. (Não mexer no Toaster global.)

- [ ] **Step 2: Aplicar o sistema no `mesa-view.tsx`**

- Cards/listas à mão → `<Card>`.
- Estados crus (`t.state`, `{t.state}` no dialog de trocar mesa) → `tableStateLabel(...)`.
- Botões → `<Button>`. O dialog "Estou eliminado": o botão destrutivo "Sim, eliminar" usa `<Button variant="destructive">` e o "Voltar" `<Button variant="secondary">`; aumentar o destaque do aviso "Não dá pra voltar sem rebuy" (texto maior/cor de atenção) — mantendo o comportamento (segue irreversível neste incremento; reversibilidade é outro incremento).
- Avatares → `<AvatarImage>` (já com fallback da Task 6).

- [ ] **Step 3: Restyle do `reaction-bar.tsx`**

Botões de reação com `<Button variant="ghost" size="icon-lg">` ou equivalente ≥44px; manter o throttle e a Server Action. (Feedback local de reação é melhoria de outro incremento — não adicionar aqui.)

- [ ] **Step 4: Type-check + build**

Run: `npx tsc --noEmit -p .` e `npx next build`
Expected: zero erros.

- [ ] **Step 5: Checklist visual manual**

Abrir `/me/mesa/[id]` logado (mobile + desktop). Conferir: badge de estado em PT-BR e sem ser coberto por toast; entrar/sair da mesa funciona igual; avatares com fallback; reações disparam.

- [ ] **Step 6: Commit**

```bash
git add "app/(public)/me/mesa/[tableId]/page.tsx" "app/(public)/me/mesa/[tableId]/mesa-view.tsx" "app/(public)/me/mesa/[tableId]/reaction-bar.tsx"
git commit -m "feat(me): redesign da visão da mesa do jogador"
```

---

## Task 11: Redesign do perfil (/me/perfil)

**Files:**
- Modify: `app/(public)/me/perfil/page.tsx`
- Modify: `app/(public)/me/perfil/avatar-uploader.tsx`

**Interfaces:**
- Consumes: `Card`, `Button`, `Input`, `Label`, `AvatarImage`, helpers de label.
- Produces: perfil redesenhado; **mesma** lógica de upload/edição.

> `perfil/page.tsx` tem 361 linhas (viola <200). Extrair sub-blocos sem mudar lógica se viável (ex.: histórico em `profile-history.tsx`).

- [ ] **Step 1: Aplicar o sistema**

- Remover `<main>`/container próprio (vem do layout). A página hoje usa `notFound()` quando não há sessão — trocar por uma UI coerente de "sessão inválida" igual à de `/me` (link de login), em vez de 404. (Comportamento de dados intacto; só a tela de erro.)
- Form de edição → `<Input>`/`<Label>`/`<Button>`.
- Histórico/estatísticas → `<Card>`; estados crus → helpers de label.
- Avatar grande → `<AvatarImage size="xl">`.

- [ ] **Step 2: Restyle do `avatar-uploader.tsx`**

Botão de upload → `<Button variant="secondary">`; manter toda a lógica de Cloudinary/Supabase Storage.

- [ ] **Step 3: Type-check + build**

Run: `npx tsc --noEmit -p .` e `npx next build`
Expected: zero erros.

- [ ] **Step 4: Checklist visual manual**

Abrir `/me/perfil` (mobile + desktop). Conferir: form estilizado, upload de avatar funciona, sem 404 ao deslogar (mostra tela coerente), histórico em PT-BR.

- [ ] **Step 5: Commit**

```bash
git add "app/(public)/me/perfil/page.tsx" "app/(public)/me/perfil/avatar-uploader.tsx"
git commit -m "feat(me): redesign do perfil do jogador"
```

---

## Task 12: Restyle da calculadora de fichas (/me/mesa/[tableId]/dinheiro)

**Files:**
- Modify: `app/(public)/me/mesa/[tableId]/dinheiro/chip-calculator.tsx`

**Interfaces:**
- Consumes: `Button`, `Card`.
- Produces: calculadora restilizada; **lógica de contagem e o array `CHIPS` intactos** (CLAUDE.md §14.2 — não mexer em valores/denominações).

> Tarefa visual. **Não alterar** o array `CHIPS`, o tipo `Denomination`, nem a lógica de `counts`/`formatChip`/"Mostrar na TV".

- [ ] **Step 1: Aplicar o sistema**

- Remover `<main>`/container próprio (vem do layout).
- Container e cabeçalho no estilo novo; botões `+`/`-`/"Limpar"/"Mostrar na TV" → `<Button>` (mantendo `size` ≥44px e `touch-action: manipulation`).
- Total em destaque com `text-gold-soft` (estilo "chips" do mockup).
- Não tocar nas cores das fichas (são semânticas da denominação).

- [ ] **Step 2: Type-check + build**

Run: `npx tsc --noEmit -p .` e `npx next build`
Expected: zero erros.

- [ ] **Step 3: Checklist visual manual**

Abrir `/me/mesa/[id]/dinheiro` (mobile + desktop). Conferir: somar/limpar/"Mostrar na TV" funcionam igual; fichas com as mesmas cores; total em dourado-suave; sem dedup de toque quebrado no iOS.

- [ ] **Step 4: Commit**

```bash
git add "app/(public)/me/mesa/[tableId]/dinheiro/chip-calculator.tsx"
git commit -m "feat(me): restyle da calculadora de fichas"
```

---

## Task 13: Verificação final do incremento

**Files:** nenhum (verificação).

- [ ] **Step 1: Suite de testes completa**

Run: `npm test`
Expected: PASS — incluindo os testes de `lib/timer/*` (pré-existentes), `lib/ui-labels`, `lib/avatar`, `components/ui/button-variants`, `components/ui/badge-variants`.

- [ ] **Step 2: Type-check + build de produção**

Run: `npx tsc --noEmit -p .` e `npx next build`
Expected: zero erros de tipo; "Compiled successfully".

- [ ] **Step 3: Conferência de regressão (telas não-tocadas)**

Run: `npm run dev`. Abrir `/admin/events` (logado como admin), `/tv/[eventId]` e `/inscrever`. Esperado: renderizam normalmente, agora com a paleta refinada herdada via tokens, **sem layout quebrado** (largura/kiosk da TV intactos).

- [ ] **Step 4: Conferência do piloto (mobile + desktop)**

Percorrer `/me`, `/me/mesa/[id]`, `/me/perfil`, `/me/mesa/[id]/dinheiro` em ~390px e ~1280px. Confirmar a direção visual aprovada (arejado + dourado refinado), zero estados crus de banco, avatares com fallback, app-like centrado no desktop, safe-area respeitada.

- [ ] **Step 5: Commit final (se houver ajuste) e fim**

```bash
git status   # deve estar limpo se nada sobrou
```

Incremento concluído. Próximos incrementos (fora deste plano): rota de login neutra, redesign do admin (desktop wide), funil de conta/check-in, refino da TV.

---

## Self-Review (preenchido pelo autor do plano)

- **Cobertura da spec:** §4.1 tokens → Task 1; §4.2 componentes → Tasks 3–6; §4.3 desktop/viewport/safe-area → Tasks 7–8; §4.4 piloto + tradução de estados → Tasks 2, 9–12; §6 verificação → Task 13. Sem lacunas.
- **Sem placeholders:** todos os steps têm código/comando concretos.
- **Consistência de tipos:** `buttonVariants`/`badgeVariants` (CVA) usados nos testes batem com os exports; `avatarInitial`, `playerStateLabel`/`tableStateLabel`/`eventStateLabel` consistentes entre criação (Tasks 2,6) e consumo (Tasks 9–12); `AvatarImage` mantém a mesma assinatura de props ao virar client.
- **Risco residual:** Task 8/9 podem ter padding duplicado transitório entre commits — documentado; resolvido até a Task 12.
