"use server";

import { requireAdmin, adminServiceClient } from "@/lib/tournament/auth";
import type { Tables } from "@/lib/types/database.types";

type Event = Tables<"events">;

/*
  O que sobrou de `events` depois que o torneio v1 saiu deste projeto.

  Este arquivo tinha 517 linhas e quinze funções: criar evento com blinds e
  mesas, transição de estado, coroar campeão, lixeira, template de blind. Tudo
  isso é do torneio, e o torneio vive no app agora (app.mesapigroup.com).

  Ficou uma função só, porque é a única que alguém ainda chama: a lista que o
  admin usa para escolher de qual evento quer ver os ingressos.

  A TABELA `events` continua viva e importante, atenção: ela é o escopo do
  ingresso (`tickets.event_id`) e é ela que diz se a venda está aberta
  (`sales_open`). O que morreu foi o CRUD de torneio em cima dela, não ela.
*/

/**
 * Eventos não apagados, do mais recente para o mais antigo. Admin-only.
 */
export async function listEvents(): Promise<Event[]> {
  await requireAdmin();
  const supabase = adminServiceClient();

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .is("deleted_at", null)
    .order("event_date", { ascending: false });

  if (error) throw new Error(`Erro ao listar eventos: ${error.message}`);
  return data ?? [];
}
