# Admin Shell com Liquid Glass — Incremento 2

> **Data:** 2026-06-22
> **Escopo:** Redesenhar o shell e a navegação do painel admin (sidebar no desktop,
> tab bar flutuante de vidro no mobile, menu de avatar) com material Liquid Glass.
> Sem mudança de banco e sem mudança de comportamento das ações.

---

## 1. Contexto e motivação

Segundo incremento da repaginação de qualidade. O primeiro (`fundacao-visual-desktop`)
estabeleceu o design system (dark refinado + dourado, componentes shadcn/CVA) e
redesenhou o fluxo do jogador. Agora o foco é o **admin**, cujo maior incômodo do dono é
a **navegação no mobile**.

Problemas que a auditoria apontou e este incremento ataca:
- **Nav de 10px mono, sem estado ativo, espremido no mobile** (`app/admin/layout.tsx:27-46`).
- **Largura de desktop desperdiçada** — telas em `max-w-3xl` centralizado, sem aproveitar
  o espaço de um laptop/tablet.
- **IA inconsistente** — "Lixeira" escondida como link no rodapé da lista de eventos.

Direção visual aprovada: **Liquid Glass** sobre o dark + dourado refinado já existente —
material de vidro fosco (translucidez + `backdrop-blur` + brilho especular na borda +
sombra suave), estado ativo claro em dourado.

## 2. Escopo (explícito)

**No escopo:** o shell/chrome do admin via `app/admin/layout.tsx` e os componentes de
navegação. Todas as telas admin passam a renderizar dentro do shell novo e herdam a
paleta; o shell é responsivo (sidebar no desktop, tab bar no mobile).

**Fora do escopo:** o redesign do *interior* de cada tela admin (lista de eventos, detalhe
do evento, config de TV, profiles, etc.) — são incrementos seguintes. Elas continuam com a
estrutura atual, só realojadas no shell novo. Sem banco/migrations. Sem mudança de fluxo ou
de comportamento das Server Actions (incluindo logout).

**Branch:** continua em `fundacao-visual-desktop` (o shell consome o design system dessa
branch; mantemos como um pacote único de qualidade).

## 3. Material Liquid Glass (adição ao design system)

Uma utility/componente reutilizável — superfície translúcida com:
- `backdrop-filter: blur(...) saturate(...)` (e `-webkit-` prefix),
- fundo semitransparente sobre os tokens existentes (sem cor nova),
- brilho especular: `box-shadow: inset 0 1px 0 rgba(255,255,255,.10)`,
- borda hairline (`--hair`) e sombra externa suave,
- cantos generosos.

Forma de entrega: uma classe utilitária `glass` (ex.: definida em `globals.css` com
`@utility glass { ... }` do Tailwind v4) **ou** um componente `<GlassPanel>` —
decidido no plano. Fica disponível para todo o app (admin e, no futuro, refino da TV).

## 4. Desktop (≥ breakpoint md/lg): sidebar de vidro

Coluna fixa à esquerda (largura ~236px), painel `glass`, com:
- Marca (logo + "Poker Pi").
- Grupo "Gestão": **Eventos, Perfis, Inscritos, Galeria, Avaliações** (links `lucide-react`
  + label). Estado **ativo em dourado** derivado do `usePathname()`.
- Rodapé: card de conta com avatar → menu (Jogar / Sair).

O conteúdo da página ocupa o restante da largura (fim do `max-w-3xl` desperdiçado no shell;
o conteúdo interno de cada tela mantém suas próprias larguras por ora).

## 5. Mobile (< breakpoint): tab bar flutuante + top bar

- **Top bar** `glass` fixa: logo à esquerda, **avatar** à direita abrindo um menu de conta
  (itens: "Jogar como jogador" → `/me`; "Sair" → logout via ação existente).
- **Tab bar flutuante** `glass`, ancorada embaixo com `env(safe-area-inset-bottom)`, 4 itens:
  **Eventos · Perfis · Inscritos · Mais**, ícones `lucide-react`, indicador dourado na aba
  ativa (via `usePathname()`). O `<main>` recebe `padding-bottom` suficiente para o conteúdo
  não ficar atrás da barra.
- **"Mais"** abre uma sheet/menu de vidro deslizante listando o overflow: **Galeria,
  Avaliações, Lixeira** (+ link de conta como fallback).

## 6. Comportamento / IA

- Estado ativo de cada item derivado do `pathname` (resolve "sem indicação de página ativa").
  Item ativo quando o pathname casa com sua rota base.
- **Lixeira** sai do rodapé escondido da lista de eventos e passa a viver no "Mais".
- Rotas inalteradas; **logout** usa a Server Action existente (`app/admin/login/actions.ts`
  ou equivalente atual). Nenhuma query/ação de negócio alterada.
- Acessibilidade: `aria-current="page"` no item ativo; alvos de toque ≥44px; foco visível.

## 7. Fora de escopo (reforço)

- Nada de banco/schema; sem migrations.
- Sem mudança de comportamento/fluxo das ações.
- Sem redesign do interior das telas admin (incrementos futuros).
- Sem mexer no fluxo do jogador, na TV ou no onboarding.

## 8. Verificação

- `npx tsc --noEmit -p .` — zero erros.
- `npx next build` — build limpo.
- `npm test` (vitest) — testes existentes passando.
- Conferência visual em **mobile** (~390px: top bar + tab bar flutuante + sheet "Mais", nada
  coberto, safe-area ok) e **desktop** (~1280px: sidebar, estado ativo, conteúdo aproveitando
  a largura).
- Sanidade: navegar todas as rotas admin e confirmar que o shell aparece coerente em todas,
  estado ativo correto, e que logout/Jogar funcionam como antes.

## 9. Riscos e mitigação

- **`backdrop-blur` sobre conteúdo rolando** pode pesar em devices fracos → manter o blur
  moderado; é aceitável para o público (laptop/tablet/celular do organizador).
- **Shell novo afeta todas as telas admin de uma vez** → mudança concentrada em
  `app/admin/layout.tsx` + componentes de nav; telas internas não mudam; build + navegação
  manual em todas as rotas cobrem regressão de layout.
- **Reaproveitar a navegação ativa** entre sidebar e tab bar → extrair a lista de destinos
  para uma fonte única (um array de `{ href, label, icon }`) consumida pelos dois.
