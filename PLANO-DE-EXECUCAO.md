# Plano de Execução — Poker Pi App

> Documento mestre que sintetiza `CLAUDE.md` + `docs/` num roteiro prático.
> **Snapshot de execução atualizado em 2026-05-21** — reflete o que foi entregue de verdade, não o plano original.

---

## 0. Status atual

### Onde estamos

| | |
|---|---|
| **Branch ativa** | `etapa-1-fundacao` (9 commits) |
| **Branches no GitHub** | `origin/main` (1 commit — Etapa 0) · `origin/etapa-1-fundacao` (9 commits) |
| **Repo** | https://github.com/SamuelHosken/poker-pi-app |
| **Supabase** | projeto `hccsbjuefsqvjsnukyup` · migration 0001 aplicada · admin user criado |
| **Deploy** | ainda não — Vercel pendente |
| **Validação E2E** | ainda não — feita só via build/tests/lint |

### Etapas

| Etapa | Estado | Commit |
|---|---|---|
| **0** Setup | ✅ código + E2E (mergeada na main) | `f4ce16d` |
| **1** Fundação (schema, tipos, CRUD evento) | ✅ código | `d3c4e7a` + `5370012` |
| **2** Cronômetro + TV básica | ✅ código | `56eb938` |
| **3** Eliminar + finalizar + undo + celebrações | ✅ código | `f8c67fc` + `6a3daa9` |
| **4** Fila + renovação + rebuy + transição final | ✅ código | `7c92caa` |
| **5** Mesa final + pódio + página de resultados | ✅ código | `6258fda` |
| **6** Polimento (sound toggle + sorteio + glow + loading/error) | ✅ código | `7c8d7f1` |
| **7-A** PWA do jogador + QR codes | ✅ código | `7c8d7f1` |
| **7-B** WhatsApp via Twilio | ❌ não feita | — post-MVP, custos R$ |
| **7-C** Export PDF | ❌ não feita | — JSON na /results já cobre |

### Métricas de saúde

- `npm run build` ✅ verde em ~3s
- `npm run lint` ✅ limpo (zero warnings)
- `npx tsc --noEmit` ✅ limpo (TS estrito com 4 flags extras)
- `npm test` ✅ 11/11 testes vitest
- `grep ": any"` ✅ zero ocorrências em `app/ components/ lib/ utils/`

---

## 1. O que é o produto

Sistema web para gerenciar torneios presenciais de poker entre amigos.
**30 jogadores · 2 mesas físicas de 8 · 1 vencedor classifica · mesa final define campeão.**

### Três interfaces sincronizadas em Realtime

| Interface | Rota | Quem usa | Auth |
|---|---|---|---|
| Painel Admin | `/admin/*` | Organizador | Supabase Auth (email + senha) |
| TV Pública | `/tv/[eventId]` | Todos no salão | Nenhuma (URL pública) |
| Jogador | `/player/[token]` | Participante | Token único na URL |

### Stack entregue (divergiu do plano original em alguns pontos)

| Camada | Plano original | Entregue |
|---|---|---|
| Framework | Next.js 14 (App Router) | **Next.js 16.2.6** (App Router + Turbopack) |
| Linguagem | TypeScript estrito | ✅ idem |
| UI | Tailwind 3 + shadcn (Zinc) | **Tailwind 4** (CSS-first `@theme`) + shadcn v4 (New York · Zinc) |
| Banco | Supabase Postgres | ✅ idem (projeto `hccsbjuefsqvjsnukyup`) |
| Realtime | Supabase Realtime | ✅ idem (6 tabelas em `supabase_realtime`) |
| Auth | Supabase Auth | ✅ idem |
| Cliente Supabase | `lib/supabase/*` (plano) | **`utils/supabase/*`** (convenção do wizard atual) |
| Proxy/middleware | `middleware.ts` | **`proxy.ts`** (rename Next 16) |
| Cron | Edge Function 10s | Vercel Cron 1 min (granularidade do plano Hobby) |
| Hospedagem | Vercel | ✅ idem (não deployado ainda) |
| Animações | framer-motion (Etapa 6) | ✅ framer-motion + canvas-confetti + CSS keyframes |

---

## 2. Princípios INVIOLÁVEIS (mantidos do plano)

1. **Cronômetro no servidor.** Cliente apenas calcula display a partir de `level_started_at`, `paused_at`, `total_paused_ms`. `setInterval` no cliente SÓ força re-render.
2. **Real-time via Supabase Realtime.** Nunca polling.
3. **Reversibilidade.** Toda ação importante grava em `action_log` e tem botão desfazer (cobertura atual: 4 dos 6 tipos — ver §5).
4. **Server-authoritative.** Mutações via Server Actions, validadas com Zod e RLS.
5. **Resiliência.** Realtime reconecta automaticamente; estados são recuperáveis ao reabrir TV.
6. **Confirmação para ações destrutivas.** AlertDialog em eliminar, finalizar, transitar pra mesa final, undo.
7. **Português brasileiro em TODA UI · inglês no código.**

### Convenções de código checadas no CI manual
- Zero `any` em TypeScript
- TS estrito: `strict` + `noUncheckedIndexedAccess` + `noImplicitOverride` + `noImplicitReturns` + `noFallthroughCasesInSwitch`
- Server Component é o padrão; `'use client'` só com motivo
- Lógica de domínio em `lib/`, nunca dentro de componentes React
- Componentes < 200 linhas (regra de bolso)
- Botões admin ≥ 44px (operação sob pressão social)
- `.env.local` no `.gitignore`

---

## 3. Pré-requisitos (todos resolvidos)

- [x] Repo GitHub criado: `SamuelHosken/poker-pi-app`
- [x] Git inicializado + branches no remote
- [x] Projeto Supabase em West US (Oregon — não SP, mas funciona)
- [x] Credenciais no `.env.local` (URL + publishable + service_role + CRON_SECRET)
- [x] Node 20+ ativo via nvm
- [x] Supabase CLI via `npx supabase` (sem install global)
- [x] `supabase login` + `link --project-ref hccsbjuefsqvjsnukyup`
- [x] `supabase db push` rodou migration 0001
- [x] `supabase gen types --linked` gerou `lib/types/database.types.ts`
- [x] Admin user criado: `samuelhosken.o@gmail.com`
- [x] `.gitignore` cobre `.env.local`, `node_modules/`, `.next/`, `/supabase/.temp/`

---

## 4. Modelo de dados (entregue conforme `docs/02-modelo-de-dados.md`)

7 tabelas com RLS ativa. SELECT público; CUD restrito ao admin dono do evento via `auth.uid() = events.admin_user_id` (subqueries `EXISTS` nas tabelas filhas).

```
events ─┬─ blind_levels (is_final_table flag pra mesa final ter estrutura própria)
        ├─ physical_tables (Mesa 1, Mesa 2 — permanentes)
        ├─ players (com player_token único, gerado via nanoid(12))
        ├─ matches (várias por physical_table; is_final_table marca mesa final)
        │   └─ participations (seat + final_position + eliminated_at + rebought)
        └─ action_log (payload jsonb tipado, reverted_at pra undo idempotente)
```

### Máquinas de estado (validadas em `lib/tournament/transitions.ts`)

- **Event:** `SETUP → CREDENCIAMENTO → EM_ANDAMENTO → MESA_FINAL → ENCERRADO`
- **Match:** `LIVRE → JOGANDO ⇄ PAUSADA → FINALIZADA`
- **Player:** `INSCRITO → PRESENTE → CHAMADO → JOGANDO → (ELIMINADO ↺ PRESENTE via rebuy | CLASSIFICADO → NA_FINAL → CAMPEAO/VICE/TERCEIRO/OUTROS_FINALISTAS)`

### Realtime publication

Habilitada em: `events`, `blind_levels`, `physical_tables`, `players`, `matches`, `participations`.
`action_log` fora — admin lê via fetch direto após mutação.

### Cálculo do cronômetro

Implementado em `lib/timer/calculate.ts` (testado em `calculate.test.ts`):

```
elapsed = (state === 'PAUSADA' ? paused_at : Date.now()) - level_started_at - total_paused_ms
remaining = max(0, duration_minutes * 60_000 - elapsed)
```

Avanço automático: `/api/cron/advance-blinds` (Vercel Cron `* * * * *` no plano Hobby — 1 min granularidade) usa service role pra escanear matches em JOGANDO e avançar nível quando `isLevelExpired`. Admin tem botão "Avançar nível" manual.

---

## 5. Reversibilidade — cobertura do `undoLastAction`

| Ação | Undo implementado? |
|---|---|
| `START_MATCH` | ✅ deleta match (cascateia participations), restaura players → PRESENTE, table → previousState |
| `ELIMINATE_PLAYER` | ✅ limpa eliminated_at + final_position; restaura player.state + player.final_position |
| `FINISH_MATCH` (classificatória) | ✅ restaura match + winner.state + table.state |
| `FINISH_MATCH` (mesa final) | ✅ + restaura event.state de ENCERRADO → MESA_FINAL |
| `REBUY_PLAYER` | ✅ volta player → ELIMINADO + decrementa rebuys_used |
| `ASSIGN_SEAT` | ❌ throw "não implementado" (não é usado isoladamente no MVP) |
| `TRANSITION_TO_FINAL` | ❌ throw "não implementado" (reverter mesa final montada é caro — admin recria) |

---

## 6. Mapa de arquivos entregue

```
poker-pi-app/
├── CLAUDE.md                       ← memória persistente (LER no início de sessão)
├── README.md                       ← onboarding técnico (DESATUALIZADO — não reflete o entregue)
├── PLANO-DE-EXECUCAO.md            ← este arquivo
├── package.json                    ← deps: next 16.2.6, react 19.2.4, supabase/ssr 0.10.3,
│                                     framer-motion, canvas-confetti, qrcode.react, sonner, zod,
│                                     date-fns, lucide-react, nanoid, shadcn v4 + base-ui
├── proxy.ts                        ← refresh sessão Supabase + auth gate /admin/*
├── vercel.json                     ← cron schedule
├── vitest.config.ts                ← @ alias + node env
│
├── app/
│   ├── layout.tsx                  ← Fraunces+Geist+GeistMono + Toaster + lang pt-BR
│   ├── page.tsx                    ← home placeholder "Poker Pi."
│   ├── globals.css                 ← Tailwind 4 + paleta Poker Pi + keyframes
│   ├── icon.tsx                    ← ImageResponse com π dourado (PWA)
│   ├── manifest.ts                 ← PWA manifest
│   ├── admin/
│   │   ├── layout.tsx              ← header + logout
│   │   ├── login/                  ← page + login-form + actions
│   │   └── events/
│   │       ├── page.tsx + loading.tsx
│   │       ├── new/                ← page + form + actions
│   │       └── [id]/
│   │           ├── page.tsx + loading.tsx + error.tsx
│   │           ├── advance-state-button.tsx
│   │           ├── transition-to-final-button.tsx
│   │           ├── undo-button.tsx
│   │           ├── players-section.tsx (credenciamento + QR)
│   │           ├── player-qr-button.tsx (Dialog com QRCodeSVG)
│   │           ├── queue-section.tsx (fila com "há X min")
│   │           ├── rebuy-section.tsx (elegíveis pra rebuy)
│   │           ├── match-controls.tsx (start/pause/resume/advance/renovate/release/start-final)
│   │           ├── match-players-section.tsx (eliminate + finish)
│   │           └── results/page.tsx (classificação + export JSON)
│   ├── (public)/
│   │   ├── tv/[eventId]/           ← page + loading + error
│   │   └── player/[token]/         ← page + player-status (Realtime)
│   └── api/cron/advance-blinds/route.ts
│
├── components/
│   ├── ui/                         ← shadcn v4 (10 componentes)
│   └── tv/
│       ├── event-tv.tsx            ← orquestra subscriptions + conditional layout por event.state
│       ├── match-card.tsx          ← com glow JOGANDO
│       ├── match-timer.tsx         ← setInterval só re-render, cálculo é puro
│       ├── elimination-toast.tsx
│       ├── match-finish-celebration.tsx (canvas-confetti)
│       ├── new-match-overlay.tsx   ← sorteio animado framer-motion
│       ├── podium.tsx              ← I/II/III romanos + confete + lista outros finalistas
│       └── sound-toggle.tsx        ← useSyncExternalStore + localStorage
│
├── lib/
│   ├── utils.ts                    ← cn() do shadcn
│   ├── format.ts                   ← formatBRL + formatDateBR (date-fns/pt-BR)
│   ├── audio/play-sound.ts         ← gate via localStorage + CustomEvent
│   ├── timer/
│   │   ├── calculate.ts
│   │   ├── format.ts
│   │   └── calculate.test.ts       ← 11 testes vitest
│   ├── tournament/
│   │   ├── auth.ts                 ← requireAdmin compartilhado
│   │   ├── transitions.ts          ← VALID_*_TRANSITIONS + canTransition*
│   │   ├── blind-templates.ts      ← Turbo / Padrão / Lento (valores realistas)
│   │   ├── action-log.ts           ← ActionPayload typed union + logAction + getLastReversibleAction
│   │   ├── events.ts               ← createEvent + getEvent + listEvents + deleteEvent + transitionEventState
│   │   ├── players.ts              ← createPlayer + listPlayersForEvent + getPlayerByToken
│   │   ├── matches.ts              ← startMatchOnTable + pauseMatch + resumeMatch + advanceLevel +
│   │   │                              eliminatePlayer + finishMatch + undoLastAction +
│   │   │                              releaseFinishedTable + getMatchesForEvent +
│   │   │                              getParticipationsForMatch + hasReversibleAction
│   │   ├── queue.ts                ← getQueue
│   │   ├── rebuy.ts                ← isPlayerEligibleForRebuy + getEliminatedWithRebuyStatus + performRebuy
│   │   └── final-table.ts          ← canTransitionToFinalTable + transitionToFinalTable + startFinalMatch
│   └── types/
│       ├── database.types.ts       ← GERADO via supabase gen types (525 linhas, 7 tabelas)
│       ├── domain.ts               ← EVENT_STATES + MATCH_STATES + PLAYER_STATES + ACTION_TYPES + BLIND_TEMPLATE_KEYS
│       └── schemas.ts              ← Zod com mensagens pt-BR
│
├── utils/supabase/
│   ├── server.ts                   ← createServerClient<Database>
│   ├── client.ts                   ← createBrowserClient<Database>
│   └── middleware.ts               ← updateSession + redirect /admin gate
│
├── supabase/
│   ├── config.toml + .temp/        ← state local do CLI (gitignored)
│   └── migrations/0001_initial_schema.sql
│
├── public/sounds/                  ← elimination/match-finish/calling .mp3 (PLACEHOLDERS VAZIOS)
└── docs/                           ← documentação original (intacta)
```

---

## 7. Pendências reais (em ordem)

1. **Validar E2E no browser** (você) — `npm run dev` + fluxo completo: criar evento → credenciar 16+ → iniciar mesas → eliminar → finalizar → renovar → mesa final → encerrar → ver resultados → testar QR de player
2. **Auditoria** — rodar `docs/validacao-template.md` em sessão separada do Claude Code
3. **Abrir PR** `etapa-1-fundacao → main` em https://github.com/SamuelHosken/poker-pi-app/pull/new/etapa-1-fundacao
4. **Merge na main** + tag `v0.1.0-mvp`
5. **Deploy Vercel** com env vars:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `CRON_SECRET`
6. **Rotacionar `sb_secret_...`** que passou pelo chat
7. **Substituir sons placeholder** em `public/sounds/` por arquivos reais (Freesound.org com créditos)
8. **Atualizar README.md** refletindo setup real (atualmente é a versão antiga do docs original)
9. **README dos docs** já refletem o ENTREGUE no `CLAUDE.md`, mas etapas-individuais e validacao-template estão intactos como referência histórica

---

## 8. Riscos & mitigações

| Risco | Probabilidade | Impacto | Mitigação aplicada |
|---|---|---|---|
| Memory leak na TV após horas ligada | Alta | Médio | Toda subscription tem cleanup; refs pra estado atual em vez de closure stale |
| Autoplay block dos sons na TV | Certa | Médio | `SoundToggle` com primer Audio() + localStorage flag |
| Cron de avanço falha silenciosamente | Média | Alto | Manual "Avançar nível" sempre disponível; admin pode atuar |
| Race condition em pause/resume | Baixa | Médio | Toda mutação server-side; cálculo de `total_paused_ms` no resume |
| Schema errado | Resolvido | — | Schema validado via gen types + tipos derivados em runtime + tests |
| Sessão Claude longa degrada | Alta | Médio | CLAUDE.md como memória; novas sessões leem antes de tudo |
| Custos Twilio | N/A | — | Etapa 7-B explicitamente skipada até primeiro evento real |
| Validação E2E pendente | Alta | Alto | **Próximo passo crítico** — build/lint/tests garantem só compilação, não fluxo |

---

## 9. Deltas conscientes do plano original

Decisões que divergiram dos prompts em `docs/` mas que estão documentadas e foram pragmáticas:

1. **Next 14 → Next 16.2.6** — scaffold default agora; usa Turbopack
2. **`lib/supabase/` → `utils/supabase/`** — Supabase wizard atual recomenda `utils/`; alias `TablesInsert as Inserts` mantém código de domínio compatível
3. **`middleware.ts` → `proxy.ts`** — Next 16 deprecou `middleware`; função renomeada pra `proxy`
4. **Cron 10s → 60s** — Vercel Hobby tier limita; documentado
5. **Tailwind 3 → Tailwind 4** — CSS-first `@theme`; cores em hex direto (não OKlch)
6. **shadcn (legacy) → shadcn v4** — Button usa `@base-ui/react/button` sem `asChild`; substituí por `buttonVariants({})` no Link
7. **Undo de `TRANSITION_TO_FINAL` e `ASSIGN_SEAT`** — explicitamente "não implementado" no MVP
8. **Sons reais → placeholders vazios** — usuário troca quando quiser; `.catch(()=>{})` silencia erros
9. **Etapa 7-B (WhatsApp) e 7-C (PDF)** — skipadas por design; Etapa 7-A (PWA + QR) entregue
10. **TV "🎺 MESA X NOVA PARTIDA"** (Etapa 4) consolidada no sorteio animado completo da Etapa 6 — visualmente melhor

---

## 10. Regras de bolso pra próximas sessões

- **Comece sempre lendo `CLAUDE.md`.**
- **Validação E2E em sessão separada** — checklist em `docs/validacao-template.md`
- **Não revisitar decisões fechadas** (em `docs/01-decisoes-fechadas.md`) sem motivo forte
- **Sessões longas degradam** — abra nova quando perceber repetições
- **Atualize este arquivo** (PLANO-DE-EXECUCAO.md) ao concluir cada milestone real

---

*Documento mestre — última atualização: 2026-05-21 após push pra GitHub.*
