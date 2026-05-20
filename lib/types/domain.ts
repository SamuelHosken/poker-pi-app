/**
 * Domain types — enums textuais que refletem os CHECK constraints do banco.
 * Usar estes tipos em vez de `string` quando trafegar estados pela aplicação.
 */

export const EVENT_STATES = [
  "SETUP",
  "CREDENCIAMENTO",
  "EM_ANDAMENTO",
  "MESA_FINAL",
  "ENCERRADO",
] as const;
export type EventState = (typeof EVENT_STATES)[number];

export const MATCH_STATES = ["LIVRE", "JOGANDO", "PAUSADA", "FINALIZADA"] as const;
export type MatchState = (typeof MATCH_STATES)[number];

export const PHYSICAL_TABLE_STATES = MATCH_STATES;
export type PhysicalTableState = MatchState;

export const PLAYER_STATES = [
  "INSCRITO",
  "PRESENTE",
  "CHAMADO",
  "JOGANDO",
  "ELIMINADO",
  "CLASSIFICADO",
  "NA_FINAL",
  "CAMPEAO",
  "VICE",
  "TERCEIRO",
  "OUTROS_FINALISTAS",
] as const;
export type PlayerState = (typeof PLAYER_STATES)[number];

export const ACTION_TYPES = [
  "ELIMINATE_PLAYER",
  "FINISH_MATCH",
  "ASSIGN_SEAT",
  "START_MATCH",
  "REBUY_PLAYER",
  "TRANSITION_TO_FINAL",
] as const;
export type ActionType = (typeof ACTION_TYPES)[number];

export const BLIND_TEMPLATE_KEYS = ["turbo", "padrao", "lento"] as const;
export type BlindTemplateKey = (typeof BLIND_TEMPLATE_KEYS)[number];
