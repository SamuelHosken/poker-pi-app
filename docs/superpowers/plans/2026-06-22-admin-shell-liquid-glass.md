# Admin Shell com Liquid Glass — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir o nav/shell do admin por uma sidebar de vidro (desktop) + tab bar flutuante de vidro (mobile) + menu de avatar, com material Liquid Glass, sem mudar banco nem comportamento.

**Architecture:** Um `@utility glass` no Tailwind v4 vira o material reutilizável. Um modelo de navegação puro (`lib/admin-nav.ts` + `components/admin/nav-config.tsx`) alimenta sidebar e tab bar a partir de uma fonte única. Componentes de nav são client (usam `usePathname` para estado ativo). O `app/admin/layout.tsx` (server) busca o profile do admin e compõe o frame responsivo. `logoutAction` (server action existente) é importada nos componentes client.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript estrito, Tailwind v4, `@base-ui/react`, `lucide-react`, Supabase, vitest (node env).

## Global Constraints

- **TypeScript estrito — ZERO `any`.**
- **PT-BR em TODA UI**, código em inglês.
- **Componentes < 200 linhas.**
- **NADA de banco/schema.** Sem migrations.
- **Sem mudança de comportamento/fluxo.** Rotas inalteradas; logout usa a `logoutAction` existente; nenhuma query/ação de negócio alterada.
- **NÃO redesenhar o interior das telas admin** — só o shell/nav. As páginas mantêm sua estrutura/largura atuais.
- **NÃO tocar** no fluxo do jogador, TV, ou onboarding.
- **Alvos de toque ≥44px; `aria-current="page"` no item ativo; foco visível.**
- **Ícones `lucide-react`.**
- **Verificação:** `npx tsc --noEmit -p .` e `npx next build` após mudanças.
- **Material de referência:** dark + dourado `#d9b876`/`#f0dcae`; verde só pra "ao vivo". Glass = translúcido + `backdrop-blur` + brilho especular na borda + hairline.

**Nota sobre testes:** vitest roda em ambiente `node` (sem DOM). TDD real só na lógica pura (`activeHref`). Componentes/JSX e o `@utility` CSS são verificados por **build limpo** (subagentes não inspecionam navegador → conferência visual fica pendente de passe humano).

---

## File Structure

| Arquivo | Responsabilidade | Ação |
|---|---|---|
| `app/globals.css` | `@utility glass` (material) | Modificar |
| `lib/admin-nav.ts` | `activeHref(pathname, hrefs)` puro | Criar |
| `lib/admin-nav.test.ts` | Testes do helper | Criar |
| `components/admin/nav-config.tsx` | Dados de navegação (PRIMARY/SECONDARY/ALL + hrefs + ícones) | Criar |
| `components/admin/account-menu.tsx` | Avatar + dropdown (Jogar / Sair) | Criar |
| `components/admin/admin-sidebar.tsx` | Sidebar de vidro (desktop) | Criar |
| `components/admin/admin-top-bar.tsx` | Top bar de vidro (mobile) | Criar |
| `components/admin/admin-bottom-nav.tsx` | Tab bar flutuante + sheet "Mais" (mobile) | Criar |
| `app/admin/layout.tsx` | Compor o shell responsivo (server) | Modificar |
| `app/admin/events/page.tsx` | Remover link "Lixeira" do rodapé (migrou pro nav) | Modificar |

---

## Task 1: Material Liquid Glass (`@utility glass`)

**Files:**
- Modify: `app/globals.css`

**Interfaces:**
- Produces: classe utilitária `glass` (usável como `className="glass ..."`) — superfície translúcida com backdrop-blur, hairline e brilho especular.

> Tarefa de CSS, verificada por build.

- [ ] **Step 1: Adicionar o `@utility` no fim do `globals.css`**

Acrescentar ao final de `app/globals.css` (após os `@keyframes` existentes):

```css
@utility glass {
  background: color-mix(in srgb, var(--color-ink-2) 72%, transparent);
  backdrop-filter: blur(20px) saturate(160%);
  -webkit-backdrop-filter: blur(20px) saturate(160%);
  border: 1px solid var(--color-hair);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.1),
    0 16px 40px -20px rgba(0, 0, 0, 0.65);
}
```

- [ ] **Step 2: Verificar build**

Run: `npx next build`
Expected: "Compiled successfully", sem erro de CSS/Tailwind. (`@utility` é sintaxe nativa do Tailwind v4; `--color-ink-2` e `--color-hair` já existem no `@theme`.)

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "feat(ui): @utility glass (material Liquid Glass reutilizável)"
```

---

## Task 2: Modelo de navegação (`activeHref` + nav-config)

**Files:**
- Create: `lib/admin-nav.ts`
- Test: `lib/admin-nav.test.ts`
- Create: `components/admin/nav-config.tsx`

**Interfaces:**
- Produces: `activeHref(pathname: string, hrefs: string[]): string | null` — retorna o href mais específico que casa o pathname (rota exata ou prefixo `href + "/"`), ou null. `NavItem = { href: string; label: string; Icon: LucideIcon }`. Arrays `PRIMARY_NAV`, `SECONDARY_NAV`, `ALL_NAV: NavItem[]` e `ALL_HREFS: string[]`.

- [ ] **Step 1: Escrever o teste que falha**

Criar `lib/admin-nav.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { activeHref } from "@/lib/admin-nav";

const HREFS = [
  "/admin/events",
  "/admin/profiles",
  "/admin/inscritos",
  "/admin/galeria",
  "/admin/feedback",
  "/admin/events/lixeira",
];

describe("activeHref", () => {
  it("casa rota exata", () => {
    expect(activeHref("/admin/events", HREFS)).toBe("/admin/events");
  });
  it("casa subrota do evento com Eventos", () => {
    expect(activeHref("/admin/events/abc123", HREFS)).toBe("/admin/events");
  });
  it("a rota mais específica (Lixeira) ganha de Eventos", () => {
    expect(activeHref("/admin/events/lixeira", HREFS)).toBe("/admin/events/lixeira");
  });
  it("casa subrota de perfis", () => {
    expect(activeHref("/admin/profiles/new", HREFS)).toBe("/admin/profiles");
  });
  it("retorna null fora do admin", () => {
    expect(activeHref("/me", HREFS)).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- lib/admin-nav.test.ts`
Expected: FAIL ("Cannot find module '@/lib/admin-nav'").

- [ ] **Step 3: Implementar o helper**

Criar `lib/admin-nav.ts`:

```ts
/**
 * Retorna o href de navegação mais específico que casa com o pathname atual
 * (rota exata ou prefixo `href + "/"`), ou null. A "mais específica ganha"
 * resolve o conflito entre /admin/events e /admin/events/lixeira.
 */
export function activeHref(pathname: string, hrefs: string[]): string | null {
  let best: string | null = null;
  for (const href of hrefs) {
    if (pathname === href || pathname.startsWith(href + "/")) {
      if (best === null || href.length > best.length) best = href;
    }
  }
  return best;
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test -- lib/admin-nav.test.ts`
Expected: PASS (5 testes).

- [ ] **Step 5: Criar os dados de navegação**

Criar `components/admin/nav-config.tsx`:

```tsx
import {
  CalendarDays,
  Users,
  UserPlus,
  Images,
  Star,
  Trash2,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; Icon: LucideIcon };

export const PRIMARY_NAV: NavItem[] = [
  { href: "/admin/events", label: "Eventos", Icon: CalendarDays },
  { href: "/admin/profiles", label: "Perfis", Icon: Users },
  { href: "/admin/inscritos", label: "Inscritos", Icon: UserPlus },
];

export const SECONDARY_NAV: NavItem[] = [
  { href: "/admin/galeria", label: "Galeria", Icon: Images },
  { href: "/admin/feedback", label: "Avaliações", Icon: Star },
  { href: "/admin/events/lixeira", label: "Lixeira", Icon: Trash2 },
];

export const ALL_NAV: NavItem[] = [...PRIMARY_NAV, ...SECONDARY_NAV];
export const ALL_HREFS: string[] = ALL_NAV.map((n) => n.href);
```

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit -p .`
Expected: zero erros (confirma que `LucideIcon` e os ícones existem em `lucide-react`).

- [ ] **Step 7: Commit**

```bash
git add lib/admin-nav.ts lib/admin-nav.test.ts components/admin/nav-config.tsx
git commit -m "feat(admin): modelo de navegação (activeHref + nav-config)"
```

---

## Task 3: Menu de conta (`account-menu.tsx`)

**Files:**
- Create: `components/admin/account-menu.tsx`

**Interfaces:**
- Consumes: `AvatarImage` (`@/components/ui/avatar-image`), `logoutAction` (`@/app/admin/login/actions`).
- Produces: `AccountMenu({ name, avatarUrl, variant }: { name: string; avatarUrl?: string | null; variant: "sidebar" | "compact" })` — avatar que abre um dropdown de vidro com "Jogar como jogador" (→ `/me`) e "Sair" (logout). `sidebar` abre pra cima e mostra nome; `compact` abre pra baixo, só avatar.

> Tarefa visual/interativa, verificada por build. Importar uma server action (`logoutAction`) num client component é suportado pelo Next.

- [ ] **Step 1: Criar o componente**

Criar `components/admin/account-menu.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import { Gamepad2, LogOut } from "lucide-react";
import { AvatarImage } from "@/components/ui/avatar-image";
import { logoutAction } from "@/app/admin/login/actions";

export function AccountMenu({
  name,
  avatarUrl,
  variant,
}: {
  name: string;
  avatarUrl?: string | null;
  variant: "sidebar" | "compact";
}) {
  const [open, setOpen] = useState(false);
  const panelPos =
    variant === "sidebar"
      ? "bottom-full left-0 mb-2"
      : "top-full right-0 mt-2";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={
          variant === "sidebar"
            ? "flex w-full items-center gap-3 rounded-2xl border border-hair bg-white/[0.03] p-2.5 text-left transition-colors hover:bg-white/[0.06]"
            : "flex items-center rounded-full"
        }
      >
        <AvatarImage name={name} url={avatarUrl} size="sm" variant="outline" />
        {variant === "sidebar" && (
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{name}</span>
            <span className="block text-xs text-muted-foreground">Jogar / Sair</span>
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div role="menu" className={`glass absolute z-50 w-52 rounded-2xl p-1.5 ${panelPos}`}>
            <Link
              href="/me"
              prefetch
              role="menuitem"
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm no-underline hover:bg-white/5"
            >
              <Gamepad2 className="size-4 text-gold" /> Jogar como jogador
            </Link>
            <form action={logoutAction}>
              <button
                type="submit"
                role="menuitem"
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-destructive transition-colors hover:bg-destructive/10"
              >
                <LogOut className="size-4" /> Sair
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Type-check + build**

Run: `npx tsc --noEmit -p .` e `npx next build`
Expected: zero erros; build limpo.

- [ ] **Step 3: Commit**

```bash
git add components/admin/account-menu.tsx
git commit -m "feat(admin): menu de conta (avatar → Jogar / Sair)"
```

---

## Task 4: Sidebar de vidro (desktop)

**Files:**
- Create: `components/admin/admin-sidebar.tsx`

**Interfaces:**
- Consumes: `ALL_NAV`, `ALL_HREFS` (`./nav-config`), `activeHref` (`@/lib/admin-nav`), `AccountMenu` (`./account-menu`), `Spade` (lucide).
- Produces: `AdminSidebar({ name, avatarUrl }: { name: string; avatarUrl?: string | null })` — sidebar de vidro visível só em `md+` (`hidden md:flex`), com marca, nav com estado ativo dourado, e `AccountMenu` no rodapé.

> Tarefa visual, verificada por build.

- [ ] **Step 1: Criar o componente**

Criar `components/admin/admin-sidebar.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Spade } from "lucide-react";
import { ALL_NAV, ALL_HREFS } from "./nav-config";
import { activeHref } from "@/lib/admin-nav";
import { AccountMenu } from "./account-menu";

export function AdminSidebar({
  name,
  avatarUrl,
}: {
  name: string;
  avatarUrl?: string | null;
}) {
  const pathname = usePathname();
  const active = activeHref(pathname, ALL_HREFS);

  return (
    <aside className="glass sticky top-3 m-3 hidden h-[calc(100svh-1.5rem)] w-60 flex-col rounded-3xl p-3 md:flex">
      <div className="flex items-center gap-2.5 px-2 py-3">
        <span className="flex size-7 items-center justify-center rounded-lg bg-gold text-ink">
          <Spade className="size-4" />
        </span>
        <span className="text-[15px] font-semibold tracking-tight">Poker Pi</span>
      </div>

      <p className="px-2 pb-2 pt-3 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        Gestão
      </p>

      <nav className="flex flex-col gap-1">
        {ALL_NAV.map(({ href, label, Icon }) => {
          const isOn = href === active;
          return (
            <Link
              key={href}
              href={href}
              aria-current={isOn ? "page" : undefined}
              className={
                isOn
                  ? "flex items-center gap-3 rounded-xl border border-gold/30 bg-gradient-to-b from-gold/15 to-gold/5 px-3 py-2.5 text-sm text-paper no-underline"
                  : "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground no-underline transition-colors hover:bg-white/5 hover:text-paper"
              }
            >
              <Icon className={`size-[18px] ${isOn ? "text-gold" : ""}`} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-3">
        <AccountMenu name={name} avatarUrl={avatarUrl} variant="sidebar" />
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Type-check + build**

Run: `npx tsc --noEmit -p .` e `npx next build`
Expected: zero erros; build limpo.

- [ ] **Step 3: Commit**

```bash
git add components/admin/admin-sidebar.tsx
git commit -m "feat(admin): sidebar de vidro (desktop) com estado ativo"
```

---

## Task 5: Nav mobile (top bar + tab bar flutuante + sheet "Mais")

**Files:**
- Create: `components/admin/admin-top-bar.tsx`
- Create: `components/admin/admin-bottom-nav.tsx`

**Interfaces:**
- Consumes: `PRIMARY_NAV`, `SECONDARY_NAV`, `ALL_HREFS` (`./nav-config`), `activeHref` (`@/lib/admin-nav`), `AccountMenu` (`./account-menu`), lucide `Spade`/`MoreHorizontal`.
- Produces: `AdminTopBar({ name, avatarUrl })` (top bar de vidro, `md:hidden`) e `AdminBottomNav()` (tab bar flutuante de vidro + sheet "Mais", `md:hidden`).

> Tarefa visual, verificada por build. Ambos só aparecem no mobile.

- [ ] **Step 1: Criar a top bar**

Criar `components/admin/admin-top-bar.tsx`:

```tsx
"use client";

import { Spade } from "lucide-react";
import { AccountMenu } from "./account-menu";

export function AdminTopBar({
  name,
  avatarUrl,
}: {
  name: string;
  avatarUrl?: string | null;
}) {
  return (
    <header
      className="glass sticky z-30 mx-3 mt-3 flex items-center justify-between rounded-2xl px-3 py-2.5 md:hidden"
      style={{ top: "max(0.75rem, env(safe-area-inset-top))" }}
    >
      <div className="flex items-center gap-2">
        <span className="flex size-6 items-center justify-center rounded-md bg-gold text-ink">
          <Spade className="size-3.5" />
        </span>
        <span className="text-sm font-semibold">Poker Pi</span>
      </div>
      <AccountMenu name={name} avatarUrl={avatarUrl} variant="compact" />
    </header>
  );
}
```

- [ ] **Step 2: Criar a tab bar + sheet "Mais"**

Criar `components/admin/admin-bottom-nav.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { PRIMARY_NAV, SECONDARY_NAV, ALL_HREFS } from "./nav-config";
import { activeHref } from "@/lib/admin-nav";

export function AdminBottomNav() {
  const pathname = usePathname();
  const active = activeHref(pathname, ALL_HREFS);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = SECONDARY_NAV.some((n) => n.href === active);

  return (
    <>
      <nav
        className="glass fixed inset-x-3 z-40 flex items-center justify-around rounded-[22px] px-1.5 py-2 md:hidden"
        style={{ bottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        {PRIMARY_NAV.map(({ href, label, Icon }) => {
          const isOn = href === active;
          return (
            <Link
              key={href}
              href={href}
              aria-current={isOn ? "page" : undefined}
              className={`flex flex-1 flex-col items-center gap-1 rounded-xl py-1.5 text-[10px] font-medium no-underline ${
                isOn ? "text-gold-soft" : "text-muted-foreground"
              }`}
            >
              <Icon className={`size-[22px] ${isOn ? "text-gold" : ""}`} />
              {label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          aria-haspopup="dialog"
          className={`flex flex-1 flex-col items-center gap-1 rounded-xl py-1.5 text-[10px] font-medium ${
            moreActive ? "text-gold-soft" : "text-muted-foreground"
          }`}
        >
          <MoreHorizontal className={`size-[22px] ${moreActive ? "text-gold" : ""}`} />
          Mais
        </button>
      </nav>

      {moreOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Fechar"
            className="absolute inset-0 bg-black/50"
            onClick={() => setMoreOpen(false)}
          />
          <div
            className="glass absolute inset-x-0 bottom-0 rounded-t-3xl p-4"
            style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom))" }}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/15" />
            <p className="px-1 pb-2 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              Mais
            </p>
            <div className="flex flex-col gap-1">
              {SECONDARY_NAV.map(({ href, label, Icon }) => {
                const isOn = href === active;
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMoreOpen(false)}
                    aria-current={isOn ? "page" : undefined}
                    className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-sm no-underline ${
                      isOn
                        ? "border border-gold/30 bg-gold/10 text-paper"
                        : "hover:bg-white/5"
                    }`}
                  >
                    <Icon className="size-5 text-gold" />
                    {label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 3: Type-check + build**

Run: `npx tsc --noEmit -p .` e `npx next build`
Expected: zero erros; build limpo.

- [ ] **Step 4: Commit**

```bash
git add components/admin/admin-top-bar.tsx components/admin/admin-bottom-nav.tsx
git commit -m "feat(admin): nav mobile (top bar + tab bar flutuante + sheet Mais)"
```

---

## Task 6: Wire do shell no `app/admin/layout.tsx`

**Files:**
- Modify: `app/admin/layout.tsx`

**Interfaces:**
- Consumes: `getCurrentUserId` (`@/lib/tournament/auth`), `getMyProfile` (`@/lib/tournament/profiles`), `AdminSidebar`, `AdminTopBar`, `AdminBottomNav`.
- Produces: layout server que, quando logado, renderiza o shell responsivo (sidebar desktop + top bar/tab bar mobile + `<main>`); quando deslogado (login/forgot/reset), renderiza os filhos sem shell.

> O `getMyProfile()` retorna `Profile | null` com `.name` e `.avatar_url`. Não mudar o gate de auth.

- [ ] **Step 1: Substituir o conteúdo de `app/admin/layout.tsx`**

```tsx
import { getCurrentUserId } from "@/lib/tournament/auth";
import { getMyProfile } from "@/lib/tournament/profiles";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminTopBar } from "@/components/admin/admin-top-bar";
import { AdminBottomNav } from "@/components/admin/admin-bottom-nav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userId = await getCurrentUserId();

  // Páginas públicas do admin (login/forgot/reset): sem shell.
  if (!userId) {
    return (
      <div className="flex min-h-svh flex-col bg-ink text-paper">{children}</div>
    );
  }

  const profile = await getMyProfile();
  const name = profile?.name ?? "Admin";
  const avatarUrl = profile?.avatar_url ?? null;

  return (
    <div className="flex min-h-svh bg-ink text-paper">
      <AdminSidebar name={name} avatarUrl={avatarUrl} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopBar name={name} avatarUrl={avatarUrl} />
        <main className="flex-1 pb-28 md:pb-0">{children}</main>
        <AdminBottomNav />
      </div>
    </div>
  );
}
```

> O `<main>` só adiciona `pb-28` no mobile (espaço pra tab bar flutuante) e `md:pb-0` no desktop. As páginas internas mantêm seu próprio padding/largura — **não** adicionar padding horizontal aqui (evita padding duplo).

- [ ] **Step 2: Type-check + build**

Run: `npx tsc --noEmit -p .` e `npx next build`
Expected: zero erros; build limpo, todas as rotas admin geram.

- [ ] **Step 3: Commit**

```bash
git add app/admin/layout.tsx
git commit -m "feat(admin): compõe o shell Liquid Glass (sidebar + nav mobile)"
```

---

## Task 7: Remover o link "Lixeira" do rodapé da lista de eventos

**Files:**
- Modify: `app/admin/events/page.tsx`

**Interfaces:**
- Produces: lista de eventos sem o link de rodapé pra Lixeira (que agora vive no nav — sidebar/Mais). Nenhuma outra mudança.

> A "Lixeira" agora é um destino de navegação (Task 2). O link solto no rodapé vira redundante e foi apontado pela auditoria como IA inconsistente.

- [ ] **Step 1: Localizar e remover o link**

Ler `app/admin/events/page.tsx`. Encontrar o link no rodapé que aponta para `/admin/events/lixeira` (um `<Link href="/admin/events/lixeira" ...>` com texto tipo "Lixeira →" / "Ver lixeira", geralmente no fim da página). **Remover apenas esse bloco do link** (e qualquer wrapper que exista só pra ele). Não tocar em mais nada da página.

- [ ] **Step 2: Type-check + build**

Run: `npx tsc --noEmit -p .` e `npx next build`
Expected: zero erros; build limpo. (Se algum import — ex.: `Link` — ficar sem uso após a remoção, removê-lo também pra não quebrar o lint.)

- [ ] **Step 3: Commit**

```bash
git add app/admin/events/page.tsx
git commit -m "refactor(admin): Lixeira migra pro nav (remove link do rodapé)"
```

---

## Task 8: Verificação final do incremento

**Files:** nenhum (verificação).

- [ ] **Step 1: Suite completa**

Run: `npm test`
Expected: PASS — incluindo `lib/admin-nav` (5 testes) e todos os pré-existentes.

- [ ] **Step 2: Type-check + build de produção**

Run: `npx tsc --noEmit -p .` e `npx next build`
Expected: zero erros; "Compiled successfully".

- [ ] **Step 3: Conferência manual (mobile + desktop)** *(passe humano — subagente não inspeciona navegador)*

Com `npm run dev`, logado como admin, percorrer `/admin/events`, `/admin/profiles`, `/admin/inscritos`, `/admin/galeria`, `/admin/feedback`, `/admin/events/[id]`, `/admin/events/lixeira`:
- **Desktop (~1280px):** sidebar de vidro fixa, estado ativo dourado correto (Lixeira ativa sem acender Eventos), conteúdo à direita.
- **Mobile (~390px):** top bar + tab bar flutuante de vidro (safe-area ok, nada coberto), aba ativa dourada, "Mais" abre a sheet com Galeria/Avaliações/Lixeira, menu de avatar abre com "Jogar"/"Sair".
- **Login deslogado** (`/admin/login`): sem shell (nem sidebar nem tab bar).
- **Comportamento:** logout funciona; "Jogar" leva a `/me`.

- [ ] **Step 4: Fim**

```bash
git status   # limpo se nada sobrou
```

Incremento concluído. Próximos (fora deste plano): redesign do interior das telas admin (detalhe do evento ao vivo, config de TV), aproveitando o shell e o material glass.

---

## Self-Review (autor do plano)

- **Cobertura da spec:** §3 glass → Task 1; §4 sidebar desktop → Task 4; §5 mobile (top bar + tab bar + Mais) → Task 5; §6 IA/estado ativo/Lixeira → Tasks 2,6,7; menu de avatar (Jogar/Sair) → Task 3; composição → Task 6; verificação §8 → Task 8. Sem lacunas.
- **Sem placeholders:** todos os steps têm código/comando concretos (Task 7 é uma remoção localizada descrita com precisão — o arquivo exato é conhecido, o trecho é o link pra `/admin/events/lixeira`).
- **Consistência de tipos:** `activeHref(pathname, hrefs)` e `NavItem`/`PRIMARY_NAV`/`SECONDARY_NAV`/`ALL_NAV`/`ALL_HREFS` definidos na Task 2 e consumidos igual nas Tasks 4/5; `AccountMenu({name, avatarUrl, variant})` definido na Task 3, consumido nas Tasks 4/5; `AdminSidebar`/`AdminTopBar`/`AdminBottomNav` props batem com o uso na Task 6; `getMyProfile()` retorna `.name`/`.avatar_url`.
- **Risco residual:** import de server action (`logoutAction`) em client component — suportado pelo Next; coberto por build na Task 3.
