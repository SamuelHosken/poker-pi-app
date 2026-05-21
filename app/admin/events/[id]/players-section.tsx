"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createPlayer } from "@/lib/tournament/players";
import type { Tables } from "@/lib/types/database.types";
import { PlayerQrButton } from "./player-qr-button";

type Player = Tables<"players">;
type Profile = Tables<"profiles">;

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

/**
 * V1.2 — Credenciamento usa profiles cadastrados (não input livre de nome).
 * Admin escolhe da lista de profiles que ainda não estão neste evento.
 * Pra cadastrar pessoa nova, vai pra /admin/profiles/new.
 */
export function PlayersSection({
  eventId,
  players,
  availableProfiles,
}: {
  eventId: string;
  players: Player[];
  availableProfiles: Profile[];
}) {
  const [pending, startTransition] = useTransition();
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");

  function handleAdd() {
    if (!selectedProfileId) {
      toast.error("Selecione um perfil");
      return;
    }
    const profile = availableProfiles.find((p) => p.id === selectedProfileId);
    if (!profile) {
      toast.error("Perfil não encontrado");
      return;
    }
    startTransition(async () => {
      try {
        await createPlayer({
          eventId,
          name: profile.name,
          nickname: profile.nickname ?? null,
          profileId: profile.id,
        });
        toast.success(`${profile.name} adicionado ao evento`);
        setSelectedProfileId("");
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

      <div className="space-y-3 rounded-lg border border-line bg-ink-2 p-3">
        {availableProfiles.length === 0 ? (
          <p className="text-sm text-gray-soft">
            Todos os perfis cadastrados já estão neste evento.{" "}
            <Link
              href="/admin/profiles/new"
              className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold underline-offset-4 hover:underline"
            >
              Cadastrar nova pessoa →
            </Link>
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedProfileId}
              onChange={(e) => setSelectedProfileId(e.target.value)}
              className="h-11 flex-1 min-w-[220px] rounded-md border border-line bg-ink px-3 text-sm text-paper"
              disabled={pending}
            >
              <option value="">Selecione uma pessoa…</option>
              {availableProfiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.nickname ? ` (${p.nickname})` : ""}
                </option>
              ))}
            </select>
            <Button
              type="button"
              onClick={handleAdd}
              disabled={pending || !selectedProfileId}
              className="h-11 bg-gold text-ink hover:bg-gold/90 disabled:opacity-50"
            >
              {pending ? "Adicionando…" : "Adicionar ao evento"}
            </Button>
          </div>
        )}
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-mid">
          Não vê quem você quer?{" "}
          <Link
            href="/admin/profiles/new"
            className="text-gold underline-offset-4 hover:underline"
          >
            Cadastrar nova pessoa
          </Link>
        </p>
      </div>

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
                {!p.profile_id && (
                  <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.18em] text-gray-mid">
                    convidado
                  </span>
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
