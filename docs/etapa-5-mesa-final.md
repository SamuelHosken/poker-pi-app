# Etapa 5 — Mesa Final + Pódio de Encerramento

> A reta final do torneio. Layout especial na TV, estrutura de blinds própria, pódio cinematográfico.

---

## Pré-requisitos

- ✅ Etapa 4 concluída e validada

---

## Branch

```bash
git checkout main && git pull
git checkout -b etapa-5-mesa-final
```

---

## Prompt para o Claude Code

```
Leia CLAUDE.md e todos os docs. Esta é a Etapa 5.

ETAPA 5: Mesa final + pódio de encerramento.

## Objetivo

Implementar o fluxo completo de encerramento do torneio:
- Transição EM_ANDAMENTO → MESA_FINAL com mesa final montada
- Layout da TV muda pra modo cinematográfico (1 mesa em destaque)
- Estrutura de blinds da mesa final (pode ser diferente das classificatórias)
- Pódio final ao acabar

## Tarefas

### 1. Configuração da estrutura de blinds da mesa final
Em /admin/events/[id]/page.tsx, adicione seção "Estrutura da Mesa Final".

Por padrão, a mesa final usa os mesmos blinds das classificatórias.
Mas organizador pode:
- Marcar checkbox "Usar estrutura própria pra mesa final"
- Definir níveis específicos (mesma UI dos blinds normais)

Crie blind_levels com is_final_table=true.

### 2. Server Action: transitionToFinalTable
lib/tournament/final-table.ts:

```ts
export async function transitionToFinalTable(eventId: string) {
  // Pré-condições:
  // 1. Event está em EM_ANDAMENTO
  // 2. Há >= 2 players CLASSIFICADO
  // 3. Não há matches em estado JOGANDO

  // Ações:
  // 1. Event.state = 'MESA_FINAL'
  // 2. Escolhe physical_table 1 (ou primeira disponível) como mesa final
  // 3. As outras physical_tables ficam permanentemente LIVRE (descomissionadas)
  // 4. Cria nova match nessa mesa com is_final_table=true
  // 5. Players CLASSIFICADO → NA_FINAL
  // 6. Cria participations pra cada finalista, com seat_number sorteado
  // 7. match.current_level_id = primeiro level com is_final_table=true (ou
  //    primeiro normal se não há estrutura própria)
  // 8. match.level_started_at = now, state = LIVRE (organizador inicia manualmente)

  // Log no action_log (TRANSITION_TO_FINAL com undo possível)
}
```

### 3. Server Action: eliminate na mesa final
Reaproveite eliminatePlayer mas com lógica adicional:

Quando elimina jogador da mesa final:
- Atribui posição final no torneio:
  - Total de finalistas = N
  - Primeiro eliminado da mesa final = posição N (último colocado)
  - Próximo = N-1
  - Quando resta 1 = posição 1 (CAMPEAO)
- player.state vira:
  - VICE se ele ficou em 2º
  - TERCEIRO se ficou em 3º
  - OUTROS_FINALISTAS se ficou em 4º ou mais
  - CAMPEAO quando ele é o último (via finishMatch)
- player.final_position é setado

### 4. Server Action: finishFinalTable
```ts
export async function finishFinalTable(matchId: string) {
  // 1. Valida que resta 1 jogador
  // 2. Esse vira CAMPEAO, final_position=1
  // 3. Match.state = FINALIZADA
  // 4. Event.state = ENCERRADO
  // 5. Log
}
```

### 5. Layout TV — modo MESA_FINAL
Em app/(public)/tv/[eventId]/page.tsx, condicional pelo estado:

Quando event.state === 'MESA_FINAL':
- Layout completamente diferente
- UMA mesa central, ocupando 70% da tela
- Cronômetro GIGANTE (200px)
- Blinds destacados
- Lista de finalistas em volta (formato circular, como mesa de poker?)
- Lado direito: histórico de eliminações ("Eliminado: X — Posição N")

Quando state === 'ENCERRADO':
- Pódio fullscreen:
  - 1º lugar no centro, mais alto
  - 2º à esquerda
  - 3º à direita
  - 4-N abaixo, lista
- Animação de revelação (1º revela por último)
- Confetes
- Som de campeão

### 6. Componente <FinalTablePodium />
Build com Tailwind:
- 3 colunas (4 se quiser destacar 4º)
- Cada coluna: nome em Fraunces grande + posição (1º, 2º, 3º em romanos: I, II, III)
- 1º com altura maior, dourado
- Animação CSS: cada pódio sobe da base com delay (4º primeiro, 1º por último)

### 7. Painel admin — botões da mesa final
Em /admin/events/[id], quando EM_ANDAMENTO e canTransitionToFinalTable retorna true:
- Botão grande "Iniciar Mesa Final" → confirmação → transitionToFinalTable

Quando MESA_FINAL:
- Card único da mesa final
- Botões: iniciar partida, pausar, eliminar, finalizar mesa final
- Quando finalizar (resta 1) → automaticamente encerra evento

### 8. Resultados finais — página dedicada
Crie app/(admin)/events/[id]/results/page.tsx:

Tabela com classificação completa:
- Posição (1º, 2º, 3º, ...)
- Nome
- Quantas mesas jogou
- Quantos rebuys usou
- Quando foi eliminado

Botão "Exportar como JSON" (V2 vira PDF, por enquanto JSON serve).

### 9. Atualize a TV pra mostrar resultados no ENCERRADO
Estado ENCERRADO → mostra pódio + abaixo lista completa de finalização.

### 10. Commit
git commit -m "feat(etapa-5): mesa final + pódio + encerramento"

## Restrições

- NÃO implementar PWA do jogador ainda
- Sorteio com animação é Etapa 6, aqui pode ser sorteio "instantâneo"
- Foque em funcional, polimento visual é Etapa 6

## Critérios de aceitação

1. Build/lint/tsc passam
2. Configuro evento com 4 jogadores (pra testar rápido)
3. Faço 2 mesas de 2, finalizam, 2 classificados
4. Não tem mais ninguém na fila → botão "Iniciar Mesa Final" aparece
5. Clico → mesa final é criada com 2 jogadores classificados
6. TV muda layout pra modo mesa final
7. Inicio partida da mesa final, elimino 1 jogador
8. Último restante vira CAMPEAO
9. TV explode em pódio + confetes + som
10. /admin/events/[id]/results mostra tabela final

## Ao final
Atualize CLAUDE.md.
```

---

## Validação

Mesmo padrão das anteriores. Foco extra em:

- [ ] Transição EM_ANDAMENTO → MESA_FINAL não corrompe dados
- [ ] Mesa não usada (Mesa 2) fica em estado neutro
- [ ] Pódio mostra todas as posições corretamente
- [ ] Estrutura de blinds da mesa final é usada (se configurada)
- [ ] Posições finais são calculadas corretamente

---

*Próximo: `etapa-6-polimento.md`*
