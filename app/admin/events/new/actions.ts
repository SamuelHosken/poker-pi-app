"use server";

import { createEvent } from "@/lib/tournament/events";
import type { BlindTemplateKey } from "@/lib/types/domain";

/**
 * Adapta o FormData (strings) para o input tipado de createEvent.
 * Conversões: R$ → centavos, números via Number(), template via enum.
 */
export async function createEventFromForm(formData: FormData): Promise<{ id: string }> {
  const name = String(formData.get("name") ?? "");
  const eventDate = String(formData.get("eventDate") ?? "");
  const buyInReais = Number(formData.get("buyIn") ?? 0);
  const hasRebuy = formData.get("hasRebuy") === "on";
  const rebuyReais = hasRebuy ? Number(formData.get("rebuy") ?? 0) : null;
  const rebuyLimit = hasRebuy ? Number(formData.get("rebuyLimit") ?? 1) : 0;
  const rebuyUntilLevel = hasRebuy ? Number(formData.get("rebuyUntilLevel") ?? 3) : 0;
  const tableSize = Number(formData.get("tableSize") ?? 8);
  const numberOfPhysicalTables = Number(formData.get("numberOfTables") ?? 2);
  const blindTemplate = String(formData.get("blindTemplate") ?? "padrao") as BlindTemplateKey;

  return createEvent({
    name,
    eventDate,
    buyInCents: Math.round(buyInReais * 100),
    rebuyCents: rebuyReais == null ? null : Math.round(rebuyReais * 100),
    rebuyLimitPerPlayer: rebuyLimit,
    rebuyUntilLevel,
    tableSize,
    numberOfPhysicalTables,
    blindTemplate,
  });
}
