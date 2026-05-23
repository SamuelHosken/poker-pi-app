"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

/**
 * V1.3 — Avisa TVs/mesas/listas abertas que uma foto de perfil mudou ou que
 * o estado de pagamento/inscrição de um player mudou.
 *
 * Por que broadcast (e não postgres_changes em `profiles`):
 * - `profiles` tem RLS que exige auth.uid(); a TV é anônima e não receberia
 *   o evento via postgres_changes.
 * - Broadcast vai cliente→cliente pelo WebSocket; sem RLS no caminho.
 *
 * IMPLEMENTAÇÃO: cada send abre um canal efêmero, espera o SUBSCRIBED de
 * verdade (não failsafe), envia com `ack: true` e fecha. Sem isso, a corrida
 * "subscribe + send rápido demais" descarta a mensagem no servidor.
 */
const AVATAR_CHANNEL = "profiles-updates";
const AVATAR_EVENT = "avatar-changed";
const PLAYER_CHANNEL = "player-updates";
const PLAYER_EVENT = "player-changed";

async function broadcastOnce(channelName: string, eventName: string): Promise<void> {
  const supabase = createClient();
  const channel = supabase.channel(channelName, {
    config: { broadcast: { ack: true } },
  });

  // Aguarda SUBSCRIBED REAL antes de mandar — se não vier em 3s, desiste.
  // Sem isso o servidor pode descartar a msg porque o canal do remetente
  // ainda não está registrado no momento do send.
  const subscribed = await new Promise<boolean>((resolve) => {
    const t = setTimeout(() => resolve(false), 3000);
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        clearTimeout(t);
        resolve(true);
      }
    });
  });
  if (!subscribed) {
    await supabase.removeChannel(channel);
    return;
  }

  await channel.send({ type: "broadcast", event: eventName, payload: {} });
  await supabase.removeChannel(channel);
}

export async function broadcastAvatarUpdate(): Promise<void> {
  await broadcastOnce(AVATAR_CHANNEL, AVATAR_EVENT);
}

export async function broadcastPlayerUpdate(): Promise<void> {
  await broadcastOnce(PLAYER_CHANNEL, PLAYER_EVENT);
}

/**
 * Hook: assina broadcast de avatar + faz fallback poll a cada 60s. Use em
 * páginas que exibem fotos de outros perfis (TV, mesa do player).
 *
 * Fallback poll garante eventual consistency mesmo se o broadcast falhar
 * (WebSocket cair, sender não conseguir SUBSCRIBE, etc.).
 */
export function useAvatarRefresh(): void {
  const router = useRouter();
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(AVATAR_CHANNEL)
      .on("broadcast", { event: AVATAR_EVENT }, () => router.refresh())
      .subscribe();
    channelRef.current = channel;

    // Fallback: poll a cada 60s mesmo se a TV nunca receber broadcast,
    // garante que troca de foto reflete em ≤ 60s. Pausa quando aba some.
    let pollId: ReturnType<typeof setInterval> | null = null;
    function startPoll() {
      if (pollId) return;
      pollId = setInterval(() => router.refresh(), 60_000);
    }
    function stopPoll() {
      if (pollId) clearInterval(pollId);
      pollId = null;
    }
    function onVis() {
      if (document.hidden) stopPoll();
      else startPoll();
    }
    if (!document.hidden) startPoll();
    document.addEventListener("visibilitychange", onVis);

    return () => {
      stopPoll();
      document.removeEventListener("visibilitychange", onVis);
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [router]);
}

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
