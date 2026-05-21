import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json, Tables } from "@/lib/types/database.types";
import type {
  ActionType,
  EventState,
  MatchState,
  PhysicalTableState,
  PlayerState,
} from "@/lib/types/domain";

type AppClient = SupabaseClient<Database>;
type ActionLog = Tables<"action_log">;

/**
 * Payload tipado por tipo de ação. Cada variante inclui o "previousState"
 * necessário pra reverter a ação completamente.
 */
export type ActionPayload =
  | {
      type: "ELIMINATE_PLAYER";
      matchId: string;
      playerId: string;
      participationId: string;
      isFinalTable: boolean;
      previousState: {
        playerState: PlayerState;
        playerFinalPosition: number | null;
      };
    }
  | {
      type: "FINISH_MATCH";
      matchId: string;
      winnerPlayerId: string;
      winnerParticipationId: string;
      physicalTableId: string;
      isFinalTable: boolean;
      previousState: {
        match: {
          state: MatchState;
          winner_player_id: string | null;
          finished_at: string | null;
        };
        winnerPlayerState: PlayerState;
        winnerFinalPosition: number | null;
        physicalTableState: PhysicalTableState;
        eventState?: "MESA_FINAL"; // só presente quando isFinalTable=true
        winnerPlayerFinalPosition?: number | null; // event-level final_position
      };
    }
  | {
      type: "START_MATCH";
      matchId: string;
      physicalTableId: string;
      playerIds: string[];
      previousState: {
        matchState: "LIVRE";
        tableState: "LIVRE" | "FINALIZADA";
      };
    }
  | {
      type: "ASSIGN_SEAT";
      matchId: string;
      playerId: string;
      seatNumber: number;
    }
  | {
      type: "REBUY_PLAYER";
      playerId: string;
      previousState: {
        playerState: PlayerState;
        rebuysUsed: number;
      };
    }
  | {
      type: "TRANSITION_TO_FINAL";
      eventId: string;
      previousState: {
        eventState: "EM_ANDAMENTO";
      };
    }
  // V1.1: detecção automática de campeão após cada eliminação
  | {
      type: "CHAMPION_DETECTED";
      eventId: string;
      championId: string;
      previousChampionState: {
        state: PlayerState;
        finalPosition: number | null;
      };
      previousEventState: {
        state: EventState;
      };
    }
  // V1.1: admin encerrou o evento manualmente (fallback)
  | {
      type: "EVENT_MANUALLY_ENDED";
      eventId: string;
      previousState: {
        state: EventState;
      };
      // Se havia exatamente 1 jogador ativo na hora, foi marcado como CAMPEAO:
      crownedChampionId?: string | null;
      previousChampionState?: {
        state: PlayerState;
        finalPosition: number | null;
      } | null;
    };

export async function logAction(
  supabase: AppClient,
  eventId: string,
  payload: ActionPayload,
): Promise<void> {
  const { error } = await supabase.from("action_log").insert({
    event_id: eventId,
    action_type: payload.type satisfies ActionType,
    payload: payload as unknown as Json,
  });
  if (error) {
    throw new Error(`Falha ao registrar ação no log: ${error.message}`);
  }
}

export async function getLastReversibleAction(
  supabase: AppClient,
  eventId: string,
): Promise<{ row: ActionLog; payload: ActionPayload } | null> {
  const { data, error } = await supabase
    .from("action_log")
    .select("*")
    .eq("event_id", eventId)
    .is("reverted_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Erro ao buscar última ação: ${error.message}`);
  if (!data) return null;

  return { row: data, payload: data.payload as unknown as ActionPayload };
}

export async function markActionReverted(
  supabase: AppClient,
  actionId: string,
): Promise<void> {
  const { error } = await supabase
    .from("action_log")
    .update({ reverted_at: new Date().toISOString() })
    .eq("id", actionId);
  if (error) throw new Error(`Erro ao marcar ação como revertida: ${error.message}`);
}
