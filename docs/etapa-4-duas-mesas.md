# Etapa 4 — Duas Mesas Paralelas + Fila + Renovação + Rebuy

> Aqui o sistema vira o produto real: 2 mesas independentes rodando ao mesmo tempo, fila de espera, renovação automática quando uma termina, e suporte a rebuy.

---

## Pré-requisitos

- ✅ Etapa 3 concluída e validada

---

## Branch nova

```bash
git checkout main && git pull
git checkout -b etapa-4-duas-mesas
```

---

## Prompt para o Claude Code

```
Leia CLAUDE.md e todos os docs. Esta é a Etapa 4 — a mais complexa em
termos de regras de negócio.

ETAPA 4: Duas mesas paralelas + fila + renovação + rebuy.

## Objetivo

Sistema completo de fluxo de classificatórias com múltiplas partidas
em paralelo, fila de espera, renovação automática de mesa quando uma
finaliza, e rebuy configurável.

## Regras de negócio

### Sobre a fila
- Jogadores em state='PRESENTE' formam a fila
- Ordem da fila é por created_at (chegada cronológica)
- Sorteio pode ser ativado pelo organizador como alternativa

### Sobre renovação
- Quando mesa finaliza, sistema verifica fila
- Se há >= table_size na fila: oferece renovar mesa
- Se há jogadores < table_size: organizador decide:
  - Esperar outra mesa terminar pra juntar
  - Iniciar mesa com menos jogadores (mínimo configurável, default 4)
  - Encerrar classificatórias e ir pra mesa final
- Se fila vazia E ambas as mesas terminaram: ir pra mesa final

### Sobre rebuy
- Jogador ELIMINADO pode fazer rebuy se:
  - event.rebuy_cents NÃO é null (rebuy ativo)
  - player.rebuys_used < event.rebuy_limit_per_player
  - current_level (da partida que ele estava) <= event.rebuy_until_level
- Quando faz rebuy:
  - player.state volta pra PRESENTE
  - player.rebuys_used += 1
  - **NÃO** volta automaticamente à mesa — entra na fila
  - Quando entra em próxima partida, participação tem rebought=true

## Tarefas

### 1. Server Actions de fila e renovação
lib/tournament/queue.ts:

```ts
export async function getQueue(eventId): Promise<Player[]> {
  // Retorna players com state='PRESENTE', ordenados por created_at
}

export async function getCallableQueueSize(eventId): Promise<number> { ... }

export async function startNewMatchOnTable(
  physicalTableId: string,
  playerIds: string[],
  options: { randomizeSeats: boolean }
) {
  // 1. Cria nova match nessa physical_table (match_number = max + 1)
  // 2. Define current_level_id como nível 1 (NÃO is_final_table)
  // 3. level_started_at = now
  // 4. Cria participations com seat_number atribuído
  // 5. Players → state='JOGANDO'
  // 6. physical_table.state='JOGANDO'
  // 7. Log ação START_MATCH
}

export async function callNextPlayersToTable(
  physicalTableId: string,
  count: number,
  options: { random: boolean }
): Promise<Player[]> {
  // Pega "count" jogadores da fila (FIFO ou aleatório)
  // Retorna pra UI mostrar quem foi chamado
}
```

### 2. Server Action de rebuy
lib/tournament/rebuy.ts:

```ts
export async function performRebuy(playerId: string) {
  // 1. Valida elegibilidade (state ELIMINADO, rebuys_used < limit, level <= rebuy_until_level)
  // 2. player.state = 'PRESENTE'
  // 3. player.rebuys_used += 1
  // 4. revalidatePath
  // 5. Log no action_log (REBUY_PLAYER)
}

export async function isPlayerEligibleForRebuy(playerId: string): Promise<{ eligible: boolean; reason?: string }> { ... }
```

Adicione tipo REBUY_PLAYER ao action_log e implementa undo (volta player
pra ELIMINADO, decrementa rebuys_used).

### 3. UI: painel admin de fila
Em /admin/events/[id], quando state=EM_ANDAMENTO:

Adicione um painel "Fila de espera" mostrando:
- Total na fila
- Lista de nomes com tempo de espera (calculado por created_at)
- Posição na fila

E painel "Eliminados (elegíveis pra rebuy)":
- Lista de players ELIMINADO
- Pra cada um, mostra "Rebuys: X/Y" e botão "Fazer rebuy" (disabled se inelegível)
- Tooltip explica por que está disabled

### 4. UI: ação "Renovar mesa"
Quando uma mesa fica FINALIZADA:

No card dela, mostra:
- Vencedor da partida (que já é CLASSIFICADO)
- Status "Aguardando renovação"
- Botão "Renovar mesa" (se há jogadores na fila)
  → abre modal com seletor de jogadores
  → checkbox por jogador da fila + opção "Sortear aleatoriamente"
  → ao confirmar, chama startNewMatchOnTable
- Botão "Deixar mesa livre" (mantém estado LIVRE)
- Botão "Ir pra mesa final" (se decidir encerrar classificatórias)
  → só habilitado se não há jogadores suficientes pra continuar

### 5. UI: TV mostra ambas as mesas simultaneamente
Verifica que a TV (que já tem layout de 2 colunas) funciona com 2
matches em paralelo. Cada coluna deve subscrever apenas à sua match
(não receber updates da outra).

Adicione no rodapé:
- "Na fila: X jogadores"
- "Classificados: Y"
- (continua tendo)

### 6. UI: notificação de "mesa renovando" na TV
Quando uma nova match começa numa mesa que estava FINALIZADA:

- Overlay no canto da TV: "🎺 MESA X — NOVA PARTIDA"
- Lista os 8 nomes chamados em fonte destacada
- Duração: 6 segundos
- Som de chamada (public/sounds/calling.mp3)
- Depois volta layout normal

### 7. Lógica condicional: ir pra mesa final
Adicione função utilitária:
```ts
export async function canTransitionToFinalTable(eventId): Promise<{
  canTransition: boolean;
  reason?: string;
  classifiedCount: number;
}> { ... }
```

Verifica:
- Todas as classificatórias estão finalizadas?
- Há pelo menos 2 classificados?
- Fila está vazia (ou organizador concorda em deixar pra trás)?

Adicione botão "Transitar para Mesa Final" no painel admin, habilitado
quando elegível.

### 8. Comportamento quando fila esgota com número ímpar
Cenário: fila tem 6 jogadores, table_size=8.

Opções no UI:
- "Iniciar mesa com 6 jogadores" (em vez de 8)
- "Esperar outra mesa terminar pra juntar"

Modal de decisão quando o caso ocorrer.

### 9. Commit
git commit -m "feat(etapa-4): duas mesas, fila, renovação, rebuy"

## Restrições

- NÃO implementar mesa final (Etapa 5)
- Rebuy DEVE ter undo funcional
- TV deve refletir tudo em tempo real

## Critérios de aceitação

1. Build/lint/tsc passam, zero any
2. Inicio 2 mesas com 16 jogadores total
3. Mesa 1 finaliza primeiro → vejo na TV celebração
4. Painel admin oferece "Renovar mesa" → seleciono 8 da fila
5. Mesa 1 começa nova partida (zerou cronômetro, novos blinds)
6. Mesa 2 continua sua partida sem interferência
7. Elimino jogador na Mesa 2 → vejo opção de rebuy
8. Faço rebuy → jogador volta pra fila
9. Quando renovar Mesa 1 outra vez, jogador rebuy entra
10. Quando fila esgota e ambas mesas terminam → botão "Ir pra mesa final"
    aparece habilitado
11. action_log mostra todas as ações reversíveis

## Ao final
Atualize CLAUDE.md.
```

---

## Validação

```bash
npm run build && npx tsc --noEmit && npm run lint
```

### Checklist crítico

- [ ] Duas mesas em paralelo SEM interferência de cronômetros
- [ ] Renovação cria nova match independente
- [ ] Rebuy respeita limite e janela
- [ ] Subscriptions na TV são filtradas (uma por mesa)
- [ ] Quando uma mesa renova, a outra não tem flicker

---

*Próximo: `etapa-5-mesa-final.md`*
