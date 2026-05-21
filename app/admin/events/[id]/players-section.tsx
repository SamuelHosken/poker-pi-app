"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createPlayer } from "@/lib/tournament/players";
import type { Tables } from "@/lib/types/database.types";
import { PlayerQrButton } from "./player-qr-button";

type Player = Tables<"players">;

const STATE_LABEL: Record<string, string> = {
  INSCRITO: "Inscrito",
  PRESENTE: "Presente",
  CHAMADO: "Chamado",
  JOGANDO: "Jogando",
  ELIMINADO: "Eliminado",
  CLASSIFICADO: "Classificado",
  NA_FINAL: "Na final",
  CAMPEAO: "Campeão",
  VICE: "Vice",
  TERCEIRO: "3º",
  OUTROS_FINALISTAS: "Finalista",
};

export function PlayersSection({
  eventId,
  players,
}: {
  eventId: string;
  players: Player[];
}) {
  const [pending, startTransition] = useTransition();

  async function handleAdd(formData: FormData) {
    const name = String(formData.get("name") ?? "").trim();
    const nickname = String(formData.get("nickname") ?? "").trim() || null;
    if (!name) {
      toast.error("Nome é obrigatório");
      return;
    }
    startTransition(async () => {
      try {
        await createPlayer({ eventId, name, nickname });
        toast.success(`${name} adicionado`);
        const form = document.getElementById("add-player-form") as HTMLFormElement | null;
        form?.reset();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro desconhecido");
      }
    });
  }

  const presentes = players.filter((p) => p.state === "PRESENTE");

  return (
    <section className="space-y-4">
      <h2 className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold">
        Credenciamento · {presentes.length} presente{presentes.length === 1 ? "" : "s"}
      </h2>

      <form
        id="add-player-form"
        action={handleAdd}
        className="flex flex-wrap gap-2 rounded-lg border border-line bg-ink-2 p-3"
      >
        <Input
          name="name"
          required
          placeholder="Nome do jogador"
          className="h-11 flex-1 min-w-[200px] bg-ink text-paper"
        />
        <Input
          name="nickname"
          placeholder="Apelido (opcional)"
          className="h-11 w-40 bg-ink text-paper"
        />
        <Button
          type="submit"
          disabled={pending}
          className="h-11 bg-gold text-ink hover:bg-gold/90 disabled:opacity-50"
        >
          {pending ? "Adicionando…" : "Adicionar"}
        </Button>
      </form>

      {players.length > 0 && (
        <ul className="grid gap-2 sm:grid-cols-2">
          {players.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between gap-2 rounded-md border border-line bg-ink-2 px-4 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <span className="text-paper">{p.name}</span>
                {p.nickname && (
                  <span className="ml-2 font-display italic text-gold">{p.nickname}</span>
                )}
              </div>
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-soft">
                {STATE_LABEL[p.state] ?? p.state}
              </span>
              <PlayerQrButton playerName={p.name} token={p.player_token} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
