import type { EventState, MatchState, PlayerState } from "@/lib/types/domain";

const PLAYER_STATE_LABELS: Record<PlayerState, string> = {
  INSCRITO: "Inscrito",
  PRESENTE: "Presente",
  CHAMADO: "Chamado",
  JOGANDO: "Em jogo",
  ELIMINADO: "Eliminado",
  CLASSIFICADO: "Classificado",
  NA_FINAL: "Na final",
  CAMPEAO: "Campeão",
  VICE: "Vice",
  TERCEIRO: "Terceiro",
  OUTROS_FINALISTAS: "Finalista",
};

const MATCH_STATE_LABELS: Record<MatchState, string> = {
  LIVRE: "Livre",
  JOGANDO: "Em jogo",
  PAUSADA: "Pausada",
  FINALIZADA: "Finalizada",
};

const EVENT_STATE_LABELS: Record<EventState, string> = {
  SETUP: "Preparação",
  CREDENCIAMENTO: "Credenciamento",
  EM_ANDAMENTO: "Em andamento",
  MESA_FINAL: "Mesa final",
  ENCERRADO: "Encerrado",
};

export function playerStateLabel(state: PlayerState): string {
  return PLAYER_STATE_LABELS[state] ?? state;
}

export function tableStateLabel(state: MatchState): string {
  return MATCH_STATE_LABELS[state] ?? state;
}

export function eventStateLabel(state: EventState): string {
  return EVENT_STATE_LABELS[state] ?? state;
}
