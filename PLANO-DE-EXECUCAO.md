# Plano de Execução — Poker Pi App

> Documento mestre que sintetiza toda a documentação (`CLAUDE.md` + `docs/`) num roteiro prático e sequencial de execução. **Não substitui** os arquivos detalhados, apenas serve de bússola e checklist consolidado.

---

## 0. O que é este projeto

Sistema web para gerenciar torneios presenciais de poker entre amigos. **30 jogadores · 2 mesas físicas de 8 · 1 vencedor por mesa classifica · mesa final define campeão.** Não é casa online — apoia o organizador de um evento real, com cartas e fichas reais.

### Três interfaces sincronizadas em tempo real

| Interface     | Rota               | Quem usa         | Auth                  |
| ------------- | ------------------ | ---------------- | --------------------- |
| Painel Admin  | `/admin/*`         | Organizador      | Supabase Auth         |
| TV Pública    | `/tv/[eventId]`    | Todos no salão   | Nenhuma (URL pública) |
| Jogador (V2)  | `/player/[token]`  | Participante     | Token na URL          |

### Stack (decidida, não revisitar)

Next.js 14 (App Router) · TypeScript estrito · Tailwind + shadcn/ui · Supabase (Postgres + Realtime + Auth) · Vercel · GitHub.

---

## 1. Princípios INVIOLÁVEIS (regras absolutas, não preferências)

1. **Cronômetro no servidor.** Cliente apenas calcula display a partir de `level_started_at`, `paused_at`, `total_paused_ms`. Nunca `setInterval` controlando tempo real.
2. **Real-time via Supabase Realtime.** Nunca polling.
3. **Reversibilidade.** Toda ação importante grava em `action_log` e tem botão desfazer.
4. **Server-authoritative.** Mutações via Server Actions, validadas com Zod e RLS. Cliente reflete.
5. **Resiliência.** Se internet cair, sistema não quebra — reconecta e estados são recuperáveis.
6. **Confirmação para ações destrutivas.** AlertDialog em finalizar mesa, encerrar evento, apagar jogador.
7. **Português brasileiro em TODA UI · inglês no código.**

### O que NUNCA fazer
`setInterval` cronometrando · `any` em TS · lógica de negócio dentro de componentes React · polling quando dá Realtime · mudar estado no cliente sem persistir antes · botões pequenos no admin · commitar `.env.local`.

---

## 2. Roteiro de execução (8 etapas + auditoria por etapa)

O fluxo padrão de **cada etapa** é sempre o mesmo:

```
1. git checkout main && git pull
2. git checkout -b etapa-N-foco
3. Abrir sessão nova no Claude Code → colar prompt de docs/etapa-N-*.md
4. Implementar
5. Rodar validação automática: build + lint + tsc + grep "any"
6. Rodar checklist manual da etapa
7. Em sessão SEPARADA, rodar prompt de auditoria (validacao-template.md)
8. Se tudo OK → merge na main → atualizar CLAUDE.md (marcar checkbox + ETAPA ATUAL)
9. git push (Vercel faz deploy)
```

### Visão consolidada

| Etapa | Foco                                                          | Saída concreta                                                                                       | Dependência crítica                       |
| ----- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| **0** | Setup do projeto                                              | Next.js + Tailwind + shadcn + Supabase clients + paleta + fontes + CLAUDE.md                         | Pré-requisitos manuais (ver §3)           |
| **1** | Fundação (schema + tipos + CRUD evento)                       | Migration 0001 com 7 tabelas + RLS + tipos derivados + form de criação + login admin                 | Schema **DEFINITIVO** — retrabalho aqui dói |
| **2** | Cronômetro server-side + TV básica                            | `lib/timer/calculate.ts` + Edge Function/cron pra avanço + página TV + subscriptions                 | Etapa 1 OK                                |
| **3** | Gestão de uma partida (eliminar + finalizar + undo)           | `action_log` helpers + `eliminatePlayer` + `finishMatch` + `undoLastAction` + toast/celebração na TV | Etapa 2 OK                                |
| **4** | Duas mesas paralelas + fila + renovação + rebuy               | `lib/tournament/queue.ts` + `rebuy.ts` + UI de fila + sorteio simples + 2 subscriptions filtradas    | Etapa 3 OK                                |
| **5** | Mesa final + pódio                                            | `transitionToFinalTable` + layout TV cinematográfico + página de resultados                          | Etapa 4 OK                                |
| **6** | Polimento (animações + sons + sorteio animado)                | framer-motion + canvas-confetti + sorteio estilo bingo + 7 arquivos de áudio + botão "Ativar som"    | MVP completo no fim desta etapa           |
| **7** | V2: PWA jogador + WhatsApp + export PDF                       | `/player/[token]` PWA + Twilio + react-pdf                                                           | **Só depois de 1 evento real rodado**     |

**Definição de MVP completo:** etapa 6 concluída. Etapa 7 só após uso real.

---

## 3. Pré-requisitos manuais (FAZER ANTES da Etapa 0)

Estes não são feitos pelo Claude Code — você faz na mão antes da primeira sessão:

- [ ] Repo `https://github.com/SamuelHosken/poker-pi-app` criado no GitHub
- [ ] Clonar localmente em `/Users/samuelhosken/code/hosken/poker-site/poker-pi-app/` (já temos a pasta — só rodar `git init` + adicionar remote ou clonar por cima do que existe, ver §8)
- [ ] Criar projeto Supabase em São Paulo (região mais próxima)
- [ ] Guardar em gerenciador de senhas: Project URL, Anon key, Service Role key, senha do banco
- [ ] Node 20+ instalado (`node --version`)
- [ ] Supabase CLI: `npm install -g supabase`
- [ ] `supabase login` + `supabase link --project-ref <ref>` dentro da pasta
- [ ] `.env.local` com `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `.env.local.example` com placeholders (commitar)
- [ ] `.gitignore` cobrindo `.env.local`, `node_modules/`, `.next/`, `.DS_Store`

---

## 4. Modelo de dados (resumo de navegação)

7 tabelas, todas com RLS habilitada. Detalhes completos em `docs/02-modelo-de-dados.md`.

```
events ─┬─ blind_levels (com flag is_final_table — mesa final tem estrutura própria)
        ├─ physical_tables (Mesa 1, Mesa 2 — permanentes)
        ├─ players (com player_token único pra URL /player/[token])
        ├─ matches (várias por physical_table ao longo da noite)
        │   └─ participations (jogador em uma partida específica)
        └─ action_log (reversibilidade)
```

### Máquinas de estado

- **Event:** `SETUP → CREDENCIAMENTO → EM_ANDAMENTO → MESA_FINAL → ENCERRADO`
- **Match:** `LIVRE → JOGANDO ⇄ PAUSADA → FINALIZADA`
- **Player:** `INSCRITO → PRESENTE → CHAMADO → JOGANDO → (ELIMINADO | CLASSIFICADO → NA_FINAL → CAMPEAO/VICE/TERCEIRO/OUTROS_FINALISTAS)`

**Toda transição validada** via função SQL ou Server Action (`lib/tournament/transitions.ts`). UPDATE direto na coluna `state` está proibido por convenção.

### Cálculo do cronômetro (regra inviolável reforçada)

```
tempo_decorrido = (state === 'PAUSADA' ? paused_at : Date.now()) - level_started_at - total_paused_ms
tempo_restante = duration_minutes * 60_000 - tempo_decorrido
```

Cron/Edge Function avança nível automaticamente quando `tempo_restante <= 0` (decisão técnica: provavelmente Vercel Cron Job batendo em `/api/cron/advance-blinds` a cada 10s — definir na Etapa 2).

---

## 5. Padrões técnicos (resumo, detalhes em `docs/03-padroes-tecnicos.md`)

- **TS estrito:** `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `noImplicitReturns`, `noFallthroughCasesInSwitch`. Zero `any`.
- **Server Component é o padrão.** `'use client'` só com motivo (estado local, event handlers, Realtime).
- **Server Actions pra toda mutação.** Validar input com Zod + chamar `revalidatePath` no fim.
- **3 clientes Supabase:** `lib/supabase/server.ts` (Server Components/Actions), `client.ts` (browser/Realtime), `middleware.ts` (refresh de sessão + redirect admin).
- **Subscriptions Realtime:** sempre filtradas (`filter: 'id=eq.${id}'`), sempre com cleanup, initial data vindo do Server Component.
- **`action_log` ANTES da mutação:** grava `previousState` no payload, depois aplica mudança. `undoLastAction` faz switch por `action_type`.
- **Componentes < 200 linhas.** Lógica de domínio mora em `lib/`, nunca dentro de componentes.
- **Botões admin ≥ 48px de altura.** Vai ser usado sob pressão social com cerveja na mão.

### Paleta Poker Pi

```
--ink #0A0A0B · --ink-2 #131316 · --paper #F5F1E8
--gold #C9A961 · --red #C8102E · --felt #0F3D2E
```

Fontes via `next/font`: Fraunces (display) · Geist (body) · Geist Mono (mono).

---

## 6. Riscos & mitigações

| Risco                                                                       | Probabilidade | Impacto | Mitigação                                                                                            |
| --------------------------------------------------------------------------- | ------------- | ------- | ---------------------------------------------------------------------------------------------------- |
| Schema da Etapa 1 errado → retrabalho em todas as próximas                  | Média         | Alto    | Prompt de auditoria obrigatório antes de mergear Etapa 1; testar com dados reais                     |
| Edge Function/Cron de avanço de blinds falha silenciosamente                | Média         | Alto    | Logar cada execução; alerta na TV se nível não avançou no tempo esperado                             |
| Subscription Realtime sem cleanup → memory leak na TV após horas ligada     | Alta          | Médio   | Audit obrigatório de cada `useEffect` com subscription                                               |
| Autoplay block dos sons na TV                                               | Certa         | Médio   | Botão "🔊 Ativar som" no primeiro acesso, persistido em `localStorage`                               |
| Sessão de Claude Code muito longa → contexto degrada                        | Alta          | Médio   | Abrir sessão nova por etapa. `CLAUDE.md` na raiz é a memória de longo prazo                          |
| Internet cair durante o evento                                              | Média         | Alto    | Reconnect automático do Supabase; plano B humano (cronômetro de celular) — sistema apoia, não bloqueia |
| Race condition em pause/resume                                              | Baixa         | Médio   | Toda mutação via Server Action server-side (não no cliente); função SQL atômica para resume          |
| Custos de WhatsApp/Twilio (V2)                                              | Certa         | Baixo   | ~R$10/evento documentado. Avaliar ROI antes da Etapa 7 sub-etapa B                                   |

---

## 7. Critérios de "pronto" (Definition of Done) por categoria

### Para fechar uma etapa

- [ ] `npm run build` passa
- [ ] `npx tsc --noEmit` passa (zero erros)
- [ ] `npm run lint` passa
- [ ] `grep -rn ": any" --include="*.ts" --include="*.tsx" lib/ app/ components/` retorna vazio
- [ ] Checklist manual específico da etapa (em `docs/etapa-N-*.md`) está 100%
- [ ] Prompt de auditoria (`docs/validacao-template.md`) rodado em sessão separada — veredicto APROVADO
- [ ] `CLAUDE.md` atualizado: checkbox marcado, ETAPA ATUAL e PRÓXIMA ETAPA mudaram
- [ ] Branch mergeada na main e pushada

### Para considerar o MVP entregue

- [ ] Etapas 0-6 todas APROVADAS
- [ ] Evento de teste com 4-8 amigos rodando end-to-end sem bug crítico
- [ ] TV consegue ficar 3h ligada sem memory leak / sem desincronizar
- [ ] Lighthouse Performance da TV ≥ 90
- [ ] Zero `any` no código

### Para parar de iterar (V2 e além)

- Apenas se demanda real aparecer no uso. **Não persiga perfeição especulativa.**

---

## 8. Próximos passos imediatos (ordem exata)

1. **Confirmar repo GitHub.** Verificar se `https://github.com/SamuelHosken/poker-pi-app` já existe ou criar agora.
2. **Inicializar git nesta pasta.** A pasta `/Users/samuelhosken/code/hosken/poker-site/poker-pi-app/` já tem `CLAUDE.md`, `README.md`, `docs/` e `PLANO-DE-EXECUCAO.md`. Falta:
   ```bash
   cd /Users/samuelhosken/code/hosken/poker-site/poker-pi-app
   git init
   git remote add origin https://github.com/SamuelHosken/poker-pi-app.git
   git add . && git commit -m "docs: documentação inicial e plano de execução"
   git push -u origin main
   ```
3. **Criar projeto Supabase em São Paulo** + guardar credenciais.
4. **Instalar Supabase CLI** + `supabase login` + `supabase init` + `supabase link`.
5. **Criar `.env.local`** e `.env.local.example`.
6. **Rodar Etapa 0.** Abrir Claude Code em sessão nova nesta pasta e colar o prompt de `docs/etapa-0-setup.md` (seção "Prompt para o Claude Code").
7. **Validar Etapa 0** com os comandos do `docs/etapa-0-setup.md` § "Validação manual".
8. **Avançar pela Etapa 1** seguindo o mesmo padrão.

> Quando a Etapa 0 estiver pronta, o próprio Claude Code vai criar a árvore `app/`, `components/`, `lib/`, `supabase/`, `public/` dentro desta pasta. Nada disso existe ainda — por design, esse é o trabalho da Etapa 0.

---

## 9. Mapa de arquivos do plano

```
poker-pi-app/
├── CLAUDE.md                       ← memória persistente (LER no início de toda sessão)
├── README.md                       ← onboarding técnico
├── PLANO-DE-EXECUCAO.md            ← você está aqui
└── docs/
    ├── 00-visao-geral.md           ← conceitos do produto
    ├── 01-decisoes-fechadas.md     ← decisões já tomadas (não revisitar)
    ├── 02-modelo-de-dados.md       ← schema completo do banco
    ├── 03-padroes-tecnicos.md      ← convenções de código
    ├── etapa-0-setup.md            ← scaffolding inicial
    ├── etapa-1-fundacao.md         ← schema + tipos + CRUD evento ⚠️ CRÍTICA
    ├── etapa-2-cronometro-tv.md    ← cronômetro server-side + TV
    ├── etapa-3-admin-partida.md    ← eliminar + finalizar + undo
    ├── etapa-4-duas-mesas.md       ← fila + renovação + rebuy
    ├── etapa-5-mesa-final.md       ← mesa final + pódio
    ├── etapa-6-polimento.md        ← animações + sons + sorteio
    ├── etapa-7-v2.md               ← PWA + WhatsApp (pós-MVP)
    └── validacao-template.md       ← prompt de auditoria por etapa
```

---

## 10. Regras de bolso para usar com Claude Code

- **Sempre comece nova sessão lendo `CLAUDE.md`.** O prompt de cada etapa já reforça isso.
- **Uma etapa = uma branch = uma sessão (de preferência).** Sessões longas degradam.
- **Auditoria sempre em sessão SEPARADA** da que implementou. Quem auditou não pode ter sido quem fez.
- **Não pule validação automática nem manual.** Cada etapa tem ambos.
- **Atualize `CLAUDE.md` ao terminar etapa.** Marca o checkbox, muda "ETAPA ATUAL". Isso é a memória que próxima sessão vai usar.
- **Quando travar, abra nova sessão** com: "Leia `CLAUDE.md`. Acabei de tentar Etapa N e [descreva problema]. Vamos consertar antes de avançar."

---

*Documento mestre — atualizar conforme aprendizados de cada etapa real forem aparecendo.*
