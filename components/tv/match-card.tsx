import type { Tables } from "@/lib/types/database.types";
import { MatchTimer } from "./match-timer";
import { PokerTable, type PokerSeat, type SeatReaction } from "./poker-table";

type PhysicalTable = Tables<"physical_tables">;
type Match = Tables<"matches">;
type BlindLevel = Tables<"blind_levels">;

const TABLE_STATE_LABEL: Record<string, string> = {
  LIVRE: "Aguardando",
  JOGANDO: "Jogando",
  PAUSADA: "Pausada",
  FINALIZADA: "Finalizada",
};

export function MatchCard({
  table,
  match,
  level,
  seats,
  reactions = [],
}: {
  table: PhysicalTable;
  match: Match | undefined;
  level: BlindLevel | undefined;
  seats: PokerSeat[];
  reactions?: SeatReaction[];
}) {
  const accentClass =
    table.state === "JOGANDO"
      ? "border-gold/60 glow-jogando"
      : table.state === "PAUSADA"
        ? "border-red-poker/60"
        : "border-line";

  return (
    <div
      className={`flex flex-col items-center gap-6 rounded-2xl border ${accentClass} bg-ink-2 p-10 text-center transition-colors`}
    >
      <div className="flex items-center gap-3">
        <span className="font-display text-3xl font-light tracking-tight">
          Mesa {table.table_number}
        </span>
        <span className="rounded-full border border-line px-3 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-gray-soft">
          {TABLE_STATE_LABEL[table.state] ?? table.state}
        </span>
      </div>

      {match && level ? (
        <>
          <MatchTimer match={match} level={level} />

          <div className="font-mono text-2xl text-paper">
            <span className="text-gold">{level.small_blind}</span>
            <span className="mx-2 text-gray-mid">/</span>
            <span className="text-gold">{level.big_blind}</span>
            {level.ante > 0 && (
              <span className="ml-3 text-base text-gray-soft">ante {level.ante}</span>
            )}
          </div>

          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-soft">
            Nível {level.level_number}
            {level.is_final_table && " · Mesa Final"}
          </div>

          {/* V1.3: mesa oval com quem está sentado */}
          <div className="mt-2 w-full max-w-xl">
            <PokerTable
              seats={seats}
              avatarSize="lg"
              reactions={reactions}
              centerSlot={
                <>
                  <span className="font-mono text-xs uppercase tracking-[0.3em] text-gold/70">
                    Na mesa
                  </span>
                  <span className="font-display text-6xl font-light leading-none text-paper">
                    {seats.length}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-soft">
                    {seats.length === 1 ? "jogador" : "jogadores"}
                  </span>
                </>
              }
            />
          </div>
        </>
      ) : (
        <div className="font-display text-2xl italic text-gray-soft">
          Aguardando partida
        </div>
      )}
    </div>
  );
}
