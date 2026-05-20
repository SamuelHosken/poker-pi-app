# Etapa 3 — Gestão Completa de Uma Partida (Eliminação + Finalização + Desfazer)

> Adiciona eliminação de jogadores, finalização de mesa, e o sistema de reversibilidade (action log + undo).

---

## Pré-requisitos

- ✅ Etapa 2 concluída e validada

---

## Branch nova

```bash
git checkout main && git pull
git checkout -b etapa-3-admin-partida
```

---

## Prompt para o Claude Code

```
Leia CLAUDE.md, docs/00 a 03, e os documentos das etapas anteriores.
Esta é a Etapa 3.

ETAPA 3: Gestão completa de uma partida — eliminação, finalização,
reversibilidade.

## Objetivo

Permitir ao organizador rodar uma partida do início ao fim:
- Marcar eliminações
- Finalizar mesa quando resta 1 jogador
- Desfazer qualquer ação importante
- TV reflete eliminações em tempo real

## Tarefas

### 1. Action Log helpers
Crie lib/tournament/action-log.ts com helpers:

```ts
export type ActionPayload =
  | { type: 'ELIMINATE_PLAYER'; matchId: string; playerId: string; previousState: { playerState: PlayerState; participation: Participation } }
  | { type: 'FINISH_MATCH'; matchId: string; winnerPlayerId: string; previousMatchState: { state: MatchState; winner_player_id: string | null; finished_at: string | null } }
  | { type: 'START_MATCH'; matchId: string; previousMatchState: { state: MatchState; current_level_id: string | null; level_started_at: string | null } }
  | { type: 'ASSIGN_SEAT'; matchId: string; playerId: string; seatNumber: number };

export async function logAction(supabase, eventId: string, payload: ActionPayload) { ... }

export async function getLastReversibleAction(supabase, eventId: string) { ... }
```

### 2. Server Action: eliminatePlayer
Em lib/tournament/matches.ts adicione:

```ts
export async function eliminatePlayer(matchId: string, playerId: string) {
  // 1. Busca match, participação atual do player
  // 2. Calcula final_position dentro da partida:
  //    (total de participantes da partida) - (eliminados até agora) = posição do que saiu
  //    Ex: mesa de 8, primeiro eliminado fica em final_position = 8
  // 3. Salva participação com eliminated_at = now, final_position
  // 4. Atualiza player.state = 'ELIMINADO'
  // 5. Loga ação no action_log
  // 6. revalidatePath
}
```

### 3. Server Action: finishMatch
```ts
export async function finishMatch(matchId: string) {
  // 1. Valida que só há 1 jogador não eliminado na partida
  // 2. Esse é o vencedor (winner_player_id)
  // 3. Atualiza match: state='FINALIZADA', winner=X, finished_at=now
  // 4. Atualiza vencedor: state='CLASSIFICADO', participação.final_position=1
  // 5. Atualiza physical_table.state='FINALIZADA'
  // 6. Loga ação
  // 7. revalidatePath
}
```

### 4. Server Action: undoLastAction
```ts
export async function undoLastAction(eventId: string) {
  // 1. Busca última ação não revertida do action_log
  // 2. Switch case por tipo, restaura estado anterior usando o payload
  // 3. Marca ação como reverted_at = now
  // 4. revalidatePath
}
```

Implemente os 4 tipos de undo:
- ELIMINATE_PLAYER → player volta JOGANDO, participação volta sem
  eliminated_at/final_position
- FINISH_MATCH → match volta JOGANDO, vencedor volta JOGANDO,
  physical_table volta JOGANDO
- START_MATCH → match volta LIVRE, todos os jogadores voltam PRESENTE,
  participações são deletadas
- ASSIGN_SEAT → remove a participação criada

### 5. UI no painel admin
Em /admin/events/[id], no card de cada mesa em JOGANDO:

- Lista de jogadores na mesa (com checkbox/avatar)
- Pra cada jogador, botão "Eliminar" → confirmação modal → eliminatePlayer
- Quando resta 1 → mostra botão grande "Finalizar mesa" → confirmação → finishMatch
- Header da página tem botão "↶ Desfazer última ação" (disabled se não há)
  → confirmação → undoLastAction

Use AlertDialog do shadcn pra confirmações. Botões grandes (h-12+).

### 6. UI na TV — notificação de eliminação
Components/tv/elimination-toast.tsx ('use client'):

Subscription em postgres_changes na tabela participations, evento UPDATE,
onde eliminated_at IS NOT NULL.

Quando dispara:
- Mostra toast fullscreen no canto direito por 4 segundos:
  "ELIMINADO: [nome] · Mesa X · Posição N"
- Som de eliminação (public/sounds/elimination.mp3) — use <audio> com ref
- Animação CSS de entrada (slide from right) + saída (fade out)

### 7. UI na TV — celebração de finalização
Components/tv/match-finish-celebration.tsx:

Subscription em matches, UPDATE onde state='FINALIZADA'.

Quando dispara:
- Tela cheia tomada por uma overlay dourada
- Nome do vencedor em FONTE GIGANTE (Fraunces, ~200px)
- "Vencedor — Mesa X" em fonte menor
- Som de vitória (public/sounds/match-finish.mp3)
- Duração: 8 segundos, depois fade out volta ao layout normal
- Confetes CSS (use uma lib leve como canvas-confetti, ou CSS puro)

### 8. Sons placeholder
Coloque em public/sounds/ placeholders (arquivos vazios .mp3 ou sons
genéricos do freesound.org com creditos). Eu trocarei depois pelos
sons finais.

### 9. Adicione lista de classificados na TV
No rodapé da TV (que já tem placeholder), agora mostre:
- "Classificados (X)": lista de nomes dos jogadores CLASSIFICADO
- Atualiza em tempo real via subscription em players where state='CLASSIFICADO'

### 10. Commit
git commit -m "feat(etapa-3): eliminação, finalização, undo, celebrações na TV"

## Restrições

- NÃO implementar fluxo de renovação ainda (Etapa 4)
- Reversibilidade tem que cobrir TODAS as ações importantes
- Toast e celebração na TV têm que funcionar sem refresh

## Critérios de aceitação

1. build/lint/tsc passam, sem any
2. Crio partida com 4 jogadores (pra ser rápido)
3. Elimino 3 — vejo notificações na TV em tempo real
4. Cada eliminação toca som e mostra toast
5. Quando resta 1 → botão "Finalizar" aparece
6. Clico → modal de confirmação → confirmo
7. TV explode em celebração com nome do vencedor + som
8. Vencedor aparece na lista de Classificados no rodapé
9. Clico em "Desfazer última ação" → finalização desfeita, partida volta
10. Clico em "Desfazer" de novo → última eliminação desfeita
11. action_log no Supabase mostra reverted_at preenchido

## Ao final
Atualize CLAUDE.md.
```

---

## Validação

```bash
npm run build && npx tsc --noEmit && npm run lint
grep -rn ": any" --include="*.ts" --include="*.tsx" lib/ app/ components/
```

### Checklist

- [ ] Eliminar funciona, com confirmação
- [ ] Toast aparece na TV em tempo real
- [ ] Som toca
- [ ] Finalizar funciona, com celebração
- [ ] Desfazer funciona pras 4 ações
- [ ] action_log popula corretamente

---

## Prompt de validação

```
Audite Etapa 3:

1. undoLastAction cobre os 4 tipos de ação? Mostre o switch.
2. eliminatePlayer calcula final_position corretamente? Mostre cálculo.
3. finishMatch valida que só há 1 jogador não eliminado? Mostre validação.
4. As subscriptions Realtime na TV usam filter pra reduzir eventos?
5. AlertDialog está em todas as ações destrutivas? Liste.
6. Audio na TV respeita autoplay policies do navegador? (precisa
   interação do usuário antes)
7. Qualquer any no código novo?
```

---

*Próximo: `etapa-4-duas-mesas.md`*
