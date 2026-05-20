import type { EventState, MatchState, PlayerState } from "@/lib/types/domain";

/**
 * Máquinas de estado.
 *
 * Toda transição passa por estas tabelas antes de chegar ao banco.
 * UPDATE direto em colunas de estado está proibido por convenção — use
 * sempre os helpers `canTransition*` antes de aplicar mudanças.
 */

export const VALID_EVENT_TRANSITIONS: Record<EventState, ReadonlyArray<EventState>> = {
  SETUP: ["CREDENCIAMENTO"],
  CREDENCIAMENTO: ["EM_ANDAMENTO", "SETUP"],
  EM_ANDAMENTO: ["MESA_FINAL"],
  MESA_FINAL: ["ENCERRADO"],
  ENCERRADO: [],
};

export function canTransitionEvent(from: EventState, to: EventState): boolean {
  return VALID_EVENT_TRANSITIONS[from].includes(to);
}

export const VALID_MATCH_TRANSITIONS: Record<MatchState, ReadonlyArray<MatchState>> = {
  LIVRE: ["JOGANDO"],
  JOGANDO: ["PAUSADA", "FINALIZADA"],
  PAUSADA: ["JOGANDO"],
  FINALIZADA: [],
};

export function canTransitionMatch(from: MatchState, to: MatchState): boolean {
  return VALID_MATCH_TRANSITIONS[from].includes(to);
}

/**
 * Transições de player são controladas indiretamente pelas ações do admin
 * (eliminate, finalize, rebuy). Documentadas aqui pra referência.
 */
export const VALID_PLAYER_TRANSITIONS: Record<PlayerState, ReadonlyArray<PlayerState>> = {
  INSCRITO: ["PRESENTE"],
  PRESENTE: ["CHAMADO", "JOGANDO"],
  CHAMADO: ["JOGANDO", "PRESENTE"],
  JOGANDO: ["ELIMINADO", "CLASSIFICADO"],
  ELIMINADO: ["PRESENTE"], // via rebuy
  CLASSIFICADO: ["NA_FINAL"],
  NA_FINAL: ["CAMPEAO", "VICE", "TERCEIRO", "OUTROS_FINALISTAS"],
  CAMPEAO: [],
  VICE: [],
  TERCEIRO: [],
  OUTROS_FINALISTAS: [],
};

export function canTransitionPlayer(from: PlayerState, to: PlayerState): boolean {
  return VALID_PLAYER_TRANSITIONS[from].includes(to);
}

/**
 * Mensagem amigável em pt-BR pra erro de transição inválida.
 */
export function transitionErrorMessage(
  entity: "evento" | "partida" | "jogador",
  from: string,
  to: string,
): string {
  return `Transição inválida do ${entity}: ${from} → ${to}.`;
}
