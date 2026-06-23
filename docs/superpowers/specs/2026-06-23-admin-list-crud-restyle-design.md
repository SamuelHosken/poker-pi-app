# Restyle das telas de lista/CRUD do admin — Incremento 4

> **Data:** 2026-06-23
> **Escopo:** Repaginar as telas de lista/CRUD do admin (Perfis, Cadastrar perfil, Inscritos,
> Galeria, Avaliações, Classificação, Lixeira) com o design system. Só apresentação.

---

## 1. Contexto

Quarto incremento da repaginação. Os anteriores entregaram o design system + fluxo do
jogador (1), o shell do admin (2) e o detalhe do evento (3). Restam as telas de lista/CRUD
do admin, ainda no estilo antigo (labels mono maiúsculas, botões pequenos, números
coloridos, emoji decorativo). Todas seguem o mesmo padrão de restyle do detalhe do evento.

## 2. Escopo

**No escopo (7 telas + sub-componentes):**
- `app/admin/profiles/page.tsx` (+ `profile-row-actions.tsx`)
- `app/admin/profiles/new/page.tsx` (+ `new-profile-form.tsx`)
- `app/admin/inscritos/page.tsx` (+ `inscritos-toolbar.tsx`)
- `app/admin/galeria/page.tsx`
- `app/admin/feedback/page.tsx` (+ `copy-link-button.tsx`, `reset-feedback-button.tsx`)
- `app/admin/events/[id]/results/page.tsx`
- `app/admin/events/lixeira/page.tsx` (+ `trashed-event-row.tsx`)

**Fora do escopo:**
- **Nada de banco/schema; nada de mudança de comportamento/fluxo.** Mesmas Server Actions,
  queries, confirmações (incluindo digitar "apagar").
- **Config de TV** (`/admin/events/[id]/tv`) e **telas de auth** — incrementos seguintes.

**Branch:** continua em `fundacao-visual-desktop`.

## 3. Design (padrão por tela)

Reusa os primitivos: `Card`/`CardContent`/`CardHeader`, `Button` (default/secondary/ghost/
destructive, ≥44px), `Badge` (live/gold/neutral), `AvatarImage`, e os helpers de
`lib/ui-labels`. Material `glass` onde fizer sentido. Tokens de marca seguem válidos.

1. **Perfis** — cards de perfil em `Card`; avatar via `AvatarImage`; ações TIRAR ADMIN /
   SENHA / APAGAR → `<Button>` (≥44px; APAGAR = destructive); "+ Cadastrar pessoa" →
   `<Button>` dourado; badge "ADMIN" → `<Badge variant="gold">`.
2. **Cadastrar perfil** — form com `Input`/`Label`/`<Button>`; **toggle mostrar/ocultar** no
   campo de senha (o atual mostra a senha como texto); suavizar o texto que expõe
   "/admin/login" (copy mais amigável, sem mudar a ação).
3. **Inscritos** — cards de stats em `Card`; linhas de inscrito/convidado em `Card`; status
   ("NÃO ABRIU" etc.) → `<Badge>`.
4. **Galeria** — cards de campeão em `Card`; **trocar o emoji 🏆 decorativo por ícone
   `lucide`** (Trophy/Crown) consistente.
5. **Avaliações** — cards de stats em `Card`; "COMPARTILHAR" → `<Button>`; "Resetar" →
   `<Button variant="destructive">` (confirmação preservada).
6. **Classificação (results)** — lista classificatória em `Card`; estados crus → helpers de
   label; "EXPORTAR JSON" → `<Button variant="secondary">`.
7. **Lixeira** — cards de evento apagado em `Card`; Restaurar → `<Button variant="secondary">`,
   Apagar definitivamente → `<Button variant="destructive">` (**confirmação de "apagar"
   preservada**).

**Transversal:** nenhum estado cru do banco renderizado (usar helpers); alvos ≥44px; cores
via tokens (`text-muted-foreground`, `border-hair`, `bg-surface`); componentes grandes
quebrados em sub-blocos só se necessário, sem mudar lógica.

## 4. Verificação

- `npx tsc --noEmit -p .` — zero erros.
- `npx next build` — build limpo.
- `npm test` — testes existentes passando.
- Screenshots de cada tela (desktop + mobile): cards de vidro, botões ≥44px e legíveis,
  badges no lugar dos enums crus, galeria sem emoji, nada torto/cortado.
- Sanidade de comportamento: promover/rebaixar admin, resetar senha, cadastrar perfil,
  compartilhar/resetar avaliações, restaurar/apagar evento — todas com as mesmas ações e
  confirmações de antes.

## 5. Riscos e mitigação

- **Várias telas de uma vez** → cada tela é uma task independente (um arquivo/grupo por
  task), com build + verificação de comportamento a cada commit; restyle não toca lógica.
- **API de subagentes sobrecarregada** (ocorreu no inc. 3) → fallback de execução inline,
  com verificação por task e review final quando a API recuperar.
