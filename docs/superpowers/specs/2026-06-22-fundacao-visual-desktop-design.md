# Fundação visual + desktop — Incremento 1 (piloto: fluxo do jogador)

> **Data:** 2026-06-22
> **Escopo:** Estabelecer o design system (tokens + componentes base) e o scaffolding
> responsivo/desktop, aplicando-os primeiro no fluxo do jogador (`/me`, mesa, perfil)
> como piloto. Sem mudança de banco e sem mudança de comportamento.

---

## 1. Contexto e motivação

O app foi feito em ~1 dia, já está em produção e tem **banco populado que não pode ser
perdido**. Uma auditoria identificou os maiores problemas; o dono priorizou a **fundação
visual + suporte a desktop** como primeiro passo, por destravar todo o resto sem virar
retrabalho.

Problemas que este incremento ataca (referência da auditoria):

- **Design system fantasma:** `components/ui/*` (Card, Badge, Table) tem 0 imports; o app
  reimplementa cards/badges/botões à mão 50–230 vezes; 6 raios de borda diferentes; paleta
  de marca duplicada com a paleta semântica do shadcn.
- **Sem desktop de verdade:** responsividade para em `sm:` (231 usos vs. 6 `md:`, 1 `lg:`);
  tudo é coluna mobile estreita centralizada.
- **Não parece app:** falta `viewport`/`themeColor` (zoom acidental, status bar errada),
  falta tratamento de `safe-area` (conteúdo sob notch/home-indicator), falta layout público
  compartilhado (`app/(public)/layout.tsx`).
- **Detalhes de polish:** estados crus do banco vazando na UI ("JOGANDO", "Você: INSCRITO"),
  avatares `<img>` sem fallback `onError`.

## 2. Direção visual (aprovada)

**Arejado tipo Apple + dourado refinado, tema escuro (dark-lock).**

- Estrutura, respiro e superfícies translúcidas elevadas (estilo Apple/B).
- Paleta quente: dourado **refinado** `#d9b876` (não cassino) como acento de marca/valor;
  dourado-suave `#f0dcae` para números em destaque; verde `#34d399` **exclusivamente** para
  sinal de "ao vivo".
- Fundo quase-preto neutro; bordas hairline translúcidas; profundidade por **luz** (brilho
  interno no topo dos cards), não por linha.
- Tipografia grande, system font (SF/Inter via `-apple-system`).
- Cantos generosos (16–20px), escala de raio consolidada.

Mockup de referência persistido em `.superpowers/brainstorm/` (não versionado).

## 3. Decisão de arquitetura (aprovada)

**Reconstruir sobre o shadcn/CVA já instalado.** `class-variance-authority` e
`components.json` já são dependências. Os `components/ui/*` são reescritos com os tokens
novos e tamanhos de toque corretos (≥44px), e passam a ser usados de verdade. Substituição
das versões feitas à mão é **incremental** — começa pelas telas do piloto.

Alternativas descartadas: primitivas próprias sem CVA (reinventa gestão de variantes); só
camada de tokens sem componentizar (não mata o design system fantasma, só repinta).

## 4. Design técnico

### 4.1 Camada de tokens (`app/globals.css`) — fonte única da verdade

**Princípio de segurança:** os nomes de token atuais (`--color-gold`, `--color-ink`,
`bg-ink-2`, `text-paper`, etc.) são consumidos em ~190 arquivos. **Não renomear.** Em vez
disso:

- **Retunar os valores** dos tokens de marca existentes para a paleta refinada. Assim o app
  inteiro (admin, TV, onboarding) herda o visual novo sem quebrar nada, e refinamos tela a
  tela depois.
- **Adicionar** os tokens novos que o sistema precisa: `--surface` / `--surface-2` (branco
  translúcido), `--hair` (borda hairline translúcida), `--muted` / `--muted-2`, `--gold-soft`,
  `--live` (verde), escala de raio consolidada (≈3 níveis), tokens de sombra/glow.
- **Mapear** os tokens semânticos do shadcn (`--primary`, `--card`, `--border`,
  `--background`, `--foreground`…) para os tokens de marca, para os componentes reconstruídos
  consumirem a mesma fonte.
- **Remover código morto:** o bloco `:root` (light mode) inteiro — o app é dark-lock
  (`next-themes` já removida) — e duplicações de valor.

Manter `<html className="dark">` lock. Sem troca de tema.

### 4.2 Componentes base (`components/ui/*`) — reconstruídos com CVA

| Componente | Variantes / notas |
|---|---|
| `Button` | `primary` (dourado), `secondary` (translúcido), `ghost`, `destructive`; tamanhos com alvo ≥44px (`default` h-11, `lg` h-12). Corrige a violação "botões pequenos" do CLAUDE.md. |
| `Card` | superfície translúcida + hairline + brilho interno no topo. |
| `Badge` | `live` (verde), `gold`, `neutral`. |
| `Input`, `Label` | restyle com tokens novos; foco visível. |
| `Avatar` | unifica `<img>` + inicial do nome com fallback `onError` (resolve avatar quebrado). Consolida o `avatar-image.tsx` existente. |

Os componentes substituem as versões à mão **apenas nas telas do piloto** neste incremento.

### 4.3 Scaffolding de desktop + "cara de app"

- **Criar `app/(public)/layout.tsx`** (hoje inexistente): shell público compartilhado com
  tratamento de `safe-area` (`env(safe-area-inset-*)`) e container centralizado app-like com
  largura máxima confortável.
- **Adicionar `export const viewport`** no root layout (`app/layout.tsx`): `themeColor`
  `#0a0a0c`, `viewport-fit=cover`. Corrige zoom acidental, status bar e conteúdo sob o notch.
- **Desktop do jogador:** coluna centralizada (sensação de app Apple), não esticada full-width.
  Estabelece a convenção de breakpoints (`md:` / `lg:` usados de verdade) que os próximos
  incrementos seguem.

### 4.4 Piloto — telas do jogador (só apresentação)

Redesenhar com o design system novo, **sem mudar comportamento**:

- `app/(public)/me/page.tsx` — hub (eventos ao vivo / encerrados).
- `app/(public)/me/mesa/[tableId]/*` — visão da mesa.
- `app/(public)/me/perfil/*` — perfil + avatar.
- `app/(public)/me/mesa/[tableId]/dinheiro/*` — calculadora de fichas (restyle, lógica intacta).

Mesmas Server Actions, mesmo realtime, mesmos dados. De passagem, traduzir estados crus do
banco que aparecem na UI do jogador ("JOGANDO" → "Em jogo", badge "Você: INSCRITO" →
rótulo em PT-BR), reusando os dicionários de label já existentes em `me/page.tsx`.

## 5. Fora de escopo (explícito)

- **Nada de banco/schema.** Sem migrations. Banco populado intocado.
- **Sem mudança de fluxo/funcionalidade.** Mesmos passos, mesmas ações.
- **Admin, TV e onboarding** não são redesenhados agora (incrementos seguintes). Herdam a
  paleta nova via tokens e continuam funcionando.
- Refatorar os estados deprecados do enum, polling vs. realtime, e o funil de conta/check-in
  são outros incrementos.

## 6. Verificação

- `npx tsc --noEmit -p .` — zero erros de tipo.
- `npx next build` — build limpo.
- `npm test` (vitest) — testes existentes passando.
- Conferência visual das 4 telas do piloto em largura **mobile** (~390px) **e desktop**
  (~1280px+): layout app-like centralizado, safe-area respeitada, nenhum estado cru de banco
  visível, avatares com fallback.
- Sanidade: navegar telas não-tocadas (admin/TV) e confirmar que herdaram a paleta nova sem
  quebra de layout.

## 7. Riscos e mitigação

- **Quebrar o resto do app ao mexer nos tokens** → mitigado por não renomear tokens, só
  retunar valores; tokens novos são aditivos.
- **Regressão de comportamento no piloto** → mudança restrita a apresentação; Server Actions
  e realtime não são tocados; build + testes + conferência manual.
- **Defaults do shadcn (botões baixos)** → corrigidos na fonte ao reconstruir os componentes.
