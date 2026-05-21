import type { EventState, MatchState, PlayerState } from "@/lib/types/domain";

/**
 * Máquinas de estado.
 *
 * Toda transição passa por estas tabelas antes de chegar ao banco.
 * UPDATE direto em colunas de estado está proibido por convenção — use
 * sempre os helpers `canTransition*` antes de aplicar mudanças.
 *
 * V1.1: EM_ANDAMENTO vai direto pra ENCERRADO (sem MESA_FINAL). A entrada
 * MESA_FINAL → ENCERRADO permanece pra compat com dados antigos via undo.
 */

export const VALID_EVENT_TRANSITIONS: Record<EventState, ReadonlyArray<EventState>> = {
  SETUP: ["CREDENCIAMENTO"],
  CREDENCIAMENTO: ["EM_ANDAMENTO", "SETUP"],
  EM_ANDAMENTO: ["ENCERRADO"], // V1.1: direto, sem mesa final
  MESA_FINAL: ["ENCERRADO"], // mantido pra compat com dados antigos
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
 *
 * V1.1: PRESENTE → JOGANDO → ELIMINADO → (rebuy) → PRESENTE.
 * Outros estados mantidos no enum mas não usados em fluxo novo.
 */
export const VALID_PLAYER_TRANSITIONS: Record<PlayerState, ReadonlyArray<PlayerState>> = {
  INSCRITO: ["PRESENTE"],
  PRESENTE: ["CHAMADO", "JOGANDO"],
  CHAMADO: ["JOGANDO", "PRESENTE"],
  JOGANDO: ["ELIMINADO", "CLASSIFICADO", "CAMPEAO"], // V1.1: CAMPEAO direto via detectChampion
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
