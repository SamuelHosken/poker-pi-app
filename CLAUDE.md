# Poker Pi — Sistema de Gestão de Torneio de Poker

> **Este arquivo é a memória persistente do projeto. Leia-o no início de TODA sessão.**

---

## 1. Sobre o produto

Sistema web para gerenciar torneios presenciais de poker entre amigos. **Não é** casa de poker online — é uma ferramenta de apoio logístico a um evento físico, real, com cartas e fichas reais.

**Evento típico:** 30 participantes, 2 mesas físicas de 8 jogadores cada. Vencedor de cada mesa classifica para a mesa final. Mesa final define o campeão da noite. Suporta rebuy limitado por jogador.

**Contexto de uso:** festa entre amigos, com bar, música, distração. Organizador opera o sistema sob pressão social. UI precisa ser óbvia e tolerante a erros.

---

## 2. Stack técnica

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 16.2.6 (App Router, Turbopack) |
| Linguagem | TypeScript estrito |
| UI | Tailwind CSS + shadcn/ui |
| Banco | Supabase (Postgres gerenciado) |
| Real-time | Supabase Realtime |
| Auth | Supabase Auth |
| Hospedagem | Vercel |
| Versionamento | Git + GitHub |

---

## 3. As três interfaces

| Interface | Rota | Quem usa | Auth |
|---|---|---|---|
| Painel Admin | `/admin/*` | Organizador (laptop/tablet) | Email + senha |
| TV Pública | `/tv/[eventId]` | Todos no salão (televisão) | Nenhuma (URL pública) |
| Jogador | `/player/[token]` | Participante (celular) | Token único na URL |

---

## 4. Princípios INVIOLÁVEIS

Estes não são preferências, são **regras absolutas**:

1. **Cronômetro no servidor.** NUNCA usar `setInterval` no cliente pra cronômetro. O servidor guarda timestamp de início do nível, duração, tempo pausado. O cliente CALCULA o display a partir disso.

2. **Real-time via Supabase Realtime.** Toda mudança de estado dispara subscription que atualiza as 3 interfaces simultaneamente. Nunca polling.

3. **Reversibilidade.** Toda ação importante (eliminação, finalização de mesa, etc) DEVE ter botão de desfazer. Manter `action_log`.

4. **Resiliência.** Se internet cair, sistema não pode quebrar catastroficamente. Estados precisam ser recuperáveis ao reconectar.

5. **Server-authoritative.** Decisões de estado acontecem no servidor (via RLS + Server Actions). Cliente apenas reflete.

6. **Confirmação para ações destrutivas.** Finalizar mesa, encerrar evento, apagar jogador — sempre com modal de confirmação.

7. **Português brasileiro em TODA UI.** Labels, mensagens, erros. Código em inglês.

---

## 5. Entidades centrais

```
Event (evento da noite)
 ├── BlindLevels (estrutura de blinds, com flag is_final_table)
 ├── PhysicalTables (Mesa 1, Mesa 2 — permanentes durante evento)
 ├── Players (participantes)
 │    └── estado: INSCRITO → PRESENTE → CHAMADO → JOGANDO →
 │              (ELIMINADO | CLASSIFICADO → NA_FINAL → CAMPEAO/VICE/3º/...)
 └── Matches (cada partida em uma mesa física)
      └── Participations (jogador em uma partida específica)

ActionLog (log para reversibilidade)
```

---

## 6. Máquinas de estado

### Event
```
SETUP → CREDENCIAMENTO → EM_ANDAMENTO → MESA_FINAL → ENCERRADO
```

### Match (uma partida)
```
LIVRE → JOGANDO ⇄ PAUSADA → FINALIZADA
```

### Player
```
INSCRITO → PRESENTE → CHAMADO → JOGANDO →
  (ELIMINADO | CLASSIFICADO → NA_FINAL → CAMPEAO/VICE/TERCEIRO/...)
```

---

## 7. Convenções de código

- **TypeScript estrito.** ZERO `any`. Tipos derivados do schema Supabase via `supabase gen types typescript`.
- **Server Components por padrão.** Use `'use client'` só quando precisar (estado local, eventos do navegador).
- **Server Actions** para mutações. Não criar rotas API à toa.
- **Nomes em inglês no código**, **português na UI**.
- **Componentes < 200 linhas.** Se passar, quebrar.
- **Lógica de domínio em `lib/`**, não dentro de componentes.

---

## 8. O que NUNCA fazer

- Cronômetro com `setInterval` no cliente
- `any` em TypeScript
- Lógica de negócio dentro de componentes React
- Polling de banco quando dá pra usar Realtime
- Hardcoded de configurações que deveriam estar no banco
- Mudar estado no cliente sem persistir no banco antes
- UI sem confirmação para ações destrutivas
- Botões pequenos no painel admin (vai ser usado sob pressão)
- **Commitar credenciais** (`.env.local` está no `.gitignore` desde sempre)

---

## 9. Estrutura de pastas

```
poker-pi-app/
├── CLAUDE.md                    ← você está aqui
├── README.md                    ← onboarding técnico
├── docs/                        ← cadeia de informações
│   ├── 00-visao-geral.md
│   ├── 01-decisoes-fechadas.md
│   ├── 02-modelo-de-dados.md
│   ├── 03-padroes-tecnicos.md
│   ├── etapa-1-fundacao.md
│   ├── etapa-2-cronometro-tv.md
│   ├── etapa-3-admin-partida.md
│   ├── etapa-4-duas-mesas.md
│   ├── etapa-5-mesa-final.md
│   ├── etapa-6-polimento.md
│   ├── etapa-7-v2.md
│   └── validacao-template.md
├── app/
│   ├── (admin)/
│   ├── (public)/
│   └── api/
├── components/
│   ├── ui/                      ← shadcn
│   ├── admin/
│   ├── tv/
│   └── player/
├── utils/
│   └── supabase/             ← cliente Supabase (convenção do wizard atual)
├── lib/
│   ├── utils.ts              ← cn() do shadcn
│   ├── timer/
│   ├── tournament/
│   └── types/
├── supabase/
│   └── migrations/
└── public/
    └── sounds/
```

---

## 10. Status atual do projeto

**ITERAÇÃO ATUAL:** V1.2 — Perfis cadastrados + Self-service de mesa (concluída no código; aguardando validação E2E)
**PRÓXIMA ITERAÇÃO:** V1.3 — Chip display na TV + histórico de tempo em mesa (post-validação)

### Roteiro

- [x] Etapa 0: Setup do projeto, CLAUDE.md, estrutura de pastas
- [x] Etapa 1: Fundação (schema, tipos, CRUD evento)
- [x] Etapa 2: Cronômetro server-side + TV básica
- [x] Etapa 3: Painel admin de uma partida
- [x] Etapa 4: Duas mesas + fila + renovação
- [x] Etapa 5: Mesa final + pódio
- [x] Etapa 6: Polimento (animações, sons, sorteio)
- [~] Etapa 7-A: PWA do jogador + QR codes
- [x] **Iteração V1.1: Simplificação** → `docs/iteracao-v1-1-simplificacao.md`
- [x] **Iteração V1.2: Perfis cadastrados + Self-service de mesa** → `docs/iteracao-v1-2-perfis.md`
- [ ] Iteração V1.3: Chip display na TV + histórico (futuro)

### V1.1 — o que mudou (resumo)

- Mesas **não renovam** mais (`startMatchOnTable` rejeita FINALIZADA; `releaseFinishedTable` removida)
- **Fila de espera** removida como conceito visual (UI panel deletado, `getQueue` deletado)
- **Mesa final** removida como fase (transições neutralizadas em `final-table.ts`; `transitionToFinalTable` + `startFinalMatch` lançam erro)
- **Cron de avanço de blinds** removido (`/api/cron/advance-blinds` deletado, `vercel.json` deletado)
- **Cronômetro pode ficar negativo** (sem clamp em 0; cor vermelha quando expirado)
- **`detectChampionAndEndEvent`** hookado no `eliminatePlayer` — quando sobra 1 jogador em JOGANDO no evento todo, automaticamente vira CAMPEAO + event vai pra ENCERRADO
- Botão **"Encerrar evento manualmente"** no rodapé do detalhe (fallback)
- Pódio identifica por `final_position` puro (compat com state legado mantida)
- Estados deprecados (MESA_FINAL, CLASSIFICADO, NA_FINAL, VICE, TERCEIRO, OUTROS_FINALISTAS, CHAMADO) mantidos no enum por compat com histórico
- `next-themes` desinstalada (não usada)
- `finishMatch` marcada `@deprecated` (mantida pra undo de dados antigos)

### V1.2 — o que mudou (resumo)

- **Nova tabela `profiles`** vinculada 1:1 com `auth.users` (id compartilhado, trigger `handle_new_user` auto-cria profile)
- **`players.profile_id`** FK opcional → liga player a profile cadastrado
- **Tela `/admin/profiles`** lista/cria/edita perfis (admin pode promover/rebaixar admin, apagar)
- **PlayersSection** agora usa dropdown de profiles em vez de input livre de nome
- **`/me`** — UI nova do player: lista eventos onde está, mesas, botões "Entrar"/"Sair"
- **Login redirect smart**: `is_admin=true` → `/admin/events`, senão → `/me`
- **Auth gate** em proxy.ts agora valida `profile.is_admin` em `/admin/*`
- **`joinTableAsPlayer`** + **`leaveCurrentTable`** Server Actions — player se auto-junta/sai
- **Mesa LIVRE vira JOGANDO** quando primeiro player entra (cria match com level_started_at=now)
- **Compat com convidados antigos** mantida (profile_id nullable em players)
- `requireAdmin()` mais estrito — valida `profile.is_admin`

---

## 11. Como navegar nesta documentação

Quando estiver começando uma sessão, faça nesta ordem:

1. **Leia este arquivo (CLAUDE.md)** primeiro
2. **Veja em qual etapa estamos** (seção "Status atual" acima)
3. **Abra o arquivo da etapa correspondente** em `docs/etapa-N-*.md`
4. **Se for a primeira sessão do dia**, leia também `docs/00-visao-geral.md` e `docs/01-decisoes-fechadas.md` pra refrescar
5. **Execute o que está na etapa**
6. **Antes de avançar de etapa**, rode a validação correspondente
7. **Atualize o status no final deste arquivo** ao concluir uma etapa

---

## 12. Decisões fechadas (resumo)

Para detalhes, ver `docs/01-decisoes-fechadas.md`.

| Decisão | Valor |
|---|---|
| Formato torneio | 30 jogadores, 2 mesas de 8, 1 vencedor classifica |
| Mesa final | Reúne vencedores das classificatórias |
| Rebuy | Configurável por evento (default: 1 rebuy até nível 3) |
| Sorteio animado | Incluído no MVP |
| Estrutura de blinds | Templates prontos + custom |
| PWA jogador | V2 |
| WhatsApp | V2 |

---

## 13. Convenções pra trabalhar com o Claude Code

- **Use branch por etapa.** Crie `etapa-N-nome` e merge na main ao validar.
- **Commit frequente.** Mesmo coisas pequenas. Salva você de "rollback grande".
- **Não pule validação.** Cada etapa tem prompt de validação. Use.
- **Se travar, nova sessão.** Claude Code se confunde em sessões muito longas. O CLAUDE.md existe pra isso — nova sessão lê o arquivo e continua.
- **Quando atualizar o CLAUDE.md**, marque o checkbox da etapa e atualize as linhas "ETAPA ATUAL" e "PRÓXIMA ETAPA".

---

## 14. Constantes que o usuário pode pedir pra mudar

Quando o user pedir mudança de **valores** ou **design** dessas coisas, vai direto nesses arquivos. Não invente fonte da verdade nova — só mexe no que tá listado aqui, sem refactor.

### 14.1 Estrutura de blinds (valores SB/BB/ante/duração)

**Arquivo:** `lib/tournament/blind-templates.ts`

Três templates: `turbo`, `padrao` (= "Casa", 20 níveis com rebuy), `lento`. Cada um é um array `levels: BlindLevelTemplate[]` com `{ level, smallBlind, bigBlind, ante, durationMinutes }`.

**Pra mudar valor de um nível:** edita direto o objeto no array. Ex.: nível 6 do `padrao` é `{ level: 6, smallBlind: 700, bigBlind: 1400, ante: 0, durationMinutes: 20 }`.

**Pra adicionar/remover nível:** ajusta o array. Não esquece de manter `level` sequencial (1, 2, 3, …).

**Atenção crítica — eventos JÁ CRIADOS NÃO se atualizam automaticamente.** O template é copiado pra `blind_levels` no banco só na hora do `createEvent`. Mudou no arquivo, só vale pra eventos novos.

**Pra mudar blinds de evento ATIVO (3 caminhos):**

1. **Editar um nível específico** (UI): `/admin/events/[id]/tv` → `<details>` "Estrutura de blinds" de cada mesa → ícone de lápis em qualquer nível. Abre dialog com SB / BB / ante / duração. Salva direto na linha do `blind_levels` via `updateBlindLevel`. **Vale imediato** — se o nível for o atual, o cronômetro passa a usar a duração nova.

2. **Adicionar / remover nível** (UI, mesmo lugar): botão "Adicionar nível" no fim, ou trash em cada linha (exceto o atual). Chamam `createBlindLevel` / `deleteBlindLevel`.

3. **Resetar TUDO pro template Casa** (UI ou via código): botão "Resetar blinds pro template Casa" no topo da config TV. Apaga toda `blind_levels` do evento e recria do template atual de `blind-templates.ts`. **As mesas em andamento voltam pro nível 1.** Usa quando: edição manual virou bagunça, ou você mudou `blind-templates.ts` e quer aplicar no evento ativo.

**Server actions correspondentes:** `lib/tournament/blinds.ts` (`createBlindLevel`, `updateBlindLevel`, `deleteBlindLevel`) e `lib/tournament/events.ts` (`resetBlindsFromTemplate`).

**Granularidade por mesa:** cada `physical_table` tem sua própria cópia dos blinds. Editar a Mesa 1 não muda a Mesa 2 — o `BlindsEditor` opera por mesa.

**Tipos:** `BlindTemplateKey` em `lib/types/domain.ts` (turbo | padrao | lento). Se for adicionar novo template, atualiza o tipo + o select em `app/admin/events/new/new-event-form.tsx:144`.

### 14.2 Fichas da tela "Mostrar dinheiro" (denominações + cores)

**Arquivo:** `app/(public)/me/mesa/[tableId]/dinheiro/chip-calculator.tsx`

Array `CHIPS: ChipMeta[]` no topo (linha ~19). Cada ficha tem `{ value, ring, inner, text }`:
- `value` (Denomination): valor inteiro (1, 5, 10, 25, 50, 100). Se mudar/adicionar valor, atualiza o tipo `Denomination` no mesmo arquivo (linha ~9) — é union de literais.
- `ring`: bg color da ficha (classes Tailwind do anel externo)
- `inner`: cor da borda tracejada interna
- `text`: cor do número central

**Pra mudar valor existente:** edita value + Denomination type juntos.

**Pra adicionar nova ficha (ex.: 500):**
1. Adiciona `| 500` no tipo `Denomination`
2. Adiciona objeto em `CHIPS` com value: 500 + cores
3. Adiciona entrada em `counts` state inicial `{ ..., 500: 0 }` (linha ~30)
4. `clearAll` também (linha ~65)

**Animação/visual da ficha** (overlay do TV): `components/tv/chip-display-overlay.tsx`, `CHIP_DEFS` (linha ~263). É o conjunto que CAI na chuva de fichas. Espelhar valores/cores aqui também se quiser consistência visual.

### 14.3 Hot streak (tiers de fogo no avatar)

**Arquivo:** `components/tv/poker-table.tsx`

- **Tier de chamas no canto** (`CornerFlames`): `count - 1` flames até 3 max. Tier começa em count=2.
- **Aura no avatar** (`fireGlowStyle`): 3 tiers em box-shadow inline:
  - count >= 5: laranja
  - count >= 7: laranja-vermelho
  - count >= 10: vermelho intenso
- **Chama subindo** (>=7) + **badge "ON FIRE"** (>=7, dourado em >=10).
- **Tier-crossing sound**: array `TIERS = [2, 3, 4, 5, 6, 7, 10]` em `event-tv.tsx` — toca synth quando o count cruza um desses valores.

Pra mudar limiares: ajusta os números nas comparações + array `TIERS`.

### 14.4 Som / volume

**Arquivo:** `lib/audio/synth.ts`

Cada efeito tem volume entre 0.4 e 0.8. Master gain em 1.0. Pra subir/baixar global, mexe no master. Pra um efeito específico, no `volume` do `playSynth(key, volume)` no caller — vários estão hardcoded (`playSynth("level-up", 0.55)`, etc.).

### 14.5 LiveRefresh — intervalos de polling

**Arquivo:** `components/live-refresh.tsx` (componente). Os intervalos ficam nas páginas que usam:
- `/me` 5s, `/admin/events/[id]` 5s, `/admin/events/[id]/tv` 5s
- `/admin/events/[id]/results` 10s, `/admin/events` 10s
- `/admin/profiles` 15s
- `/admin/galeria` 30s, `/admin/events/lixeira` 30s

**Pra mudar:** edita o `intervalMs` na chamada `<LiveRefresh intervalMs={X} />` da página específica.

### 14.6 Outros valores comumente ajustados

| O que | Onde |
|---|---|
| Tempo do chip overlay (15s) | `components/tv/chip-display-overlay.tsx` → `DISPLAY_MS` |
| TTL de reação (5s) | `lib/realtime/use-reactions.ts` → `REACTION_TTL_MS` |
| Duração de animações (entrada, eliminação, ghost) | `components/tv/poker-table.tsx` keyframes no `<style>` |
| Tamanho do avatar (md/lg) | `components/ui/avatar-image.tsx` + `avatarBox` em poker-table |
| Cor gold/ink/paper | `app/globals.css` (Tailwind tokens) |
| Tier do "On Fire" badge dourado | poker-table.tsx → função `OnFireBadge` (>=10) |

### Princípios ao mexer nesses valores

1. **Não refactor.** Só mexe no objeto/array. Sem reorganizar arquivos.
2. **Mantém os tipos atualizados** se o valor faz parte de um union (`Denomination`, `BlindTemplateKey`).
3. **Lembrar do banco:** valores que viram registros (blinds em `blind_levels`) **não retroagem** em eventos existentes.
4. **Build + lint** depois de qualquer mudança: `npx tsc --noEmit -p .` e `npx next build`.

---

*Fim do CLAUDE.md.*
