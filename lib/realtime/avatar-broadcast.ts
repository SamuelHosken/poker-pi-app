"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

/**
 * V1.3 — Avisa todas as TVs/mesas/listas abertas que uma foto de perfil mudou
 * (ou que o estado de pagamento/inscrição de um player mudou).
 *
 * Por que broadcast em vez de postgres_changes em `profiles`:
 * - `profiles` tem RLS que exige auth.uid(); a TV é anônima e não receberia
 *   o evento via Realtime postgres_changes.
 * - Broadcast vai cliente→cliente direto pelo WebSocket, sem RLS no caminho.
 *
 * Pattern: o componente que faz a alteração chama um dos `broadcast*()`
 * depois de salvar; quem usa `useAvatarRefresh()` ou `usePlayerRefresh()`
 * em outra aba/dispositivo chama router.refresh() e re-renderiza.
 */
const CHANNEL = "profiles-updates";
const EVENT = "avatar-changed";
const PLAYER_CHANNEL = "player-updates";
const PLAYER_EVENT = "player-changed";

export async function broadcastAvatarUpdate(): Promise<void> {
  const supabase = createClient();
  const channel = supabase.channel(CHANNEL);
  // subscribe + send + cleanup. Mantemos curto — broadcast é fire-and-forget.
  await new Promise<void>((resolve) => {
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") resolve();
    });
    // Failsafe: se subscribe não responder em 1s, segue mesmo assim.
    setTimeout(resolve, 1000);
  });
  await channel.send({ type: "broadcast", event: EVENT, payload: {} });
  supabase.removeChannel(channel);
}

/**
 * Hook: assina o broadcast e chama `router.refresh()` ao receber. Use em
 * páginas/componentes que exibem fotos de outros perfis (TV, mesa do player).
 */
export function useAvatarRefresh(): void {
  const router = useRouter();
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(CHANNEL)
      .on("broadcast", { event: EVENT }, () => router.refresh())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);
}

/**
 * Admin marcou pago/desmarcou ou adicionou/removeu player em evento.
 * Avisa as sessões /me abertas (jogador no celular) pra atualizarem na hora.
 */
export async function broadcastPlayerUpdate(): Promise<void> {
  const supabase = createClient();
  const channel = supabase.channel(PLAYER_CHANNEL);
  await new Promise<void>((resolve) => {
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") resolve();
    });
    setTimeout(resolve, 1000);
  });
  await channel.send({
    type: "broadcast",
    event: PLAYER_EVENT,
    payload: {},
  });
  supabase.removeChannel(channel);
}

/**
 * Hook usado em /me — ao receber broadcast, dispara router.refresh().
 * Resolve "admin marcou pago e meu /me só vê depois de 5s (LiveRefresh)".
 */
export function usePlayerRefresh(): void {
  const router = useRouter();
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(PLAYER_CHANNEL)
      .on("broadcast", { event: PLAYER_EVENT }, () => router.refresh())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);
}
