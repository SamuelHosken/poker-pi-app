import { notFound } from "next/navigation";
import { getPlayerByToken } from "@/lib/tournament/players";
import { PlayerStatus } from "./player-status";

export const metadata = {
  title: "Jogador · Poker Pi",
};

export default async function PlayerPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const player = await getPlayerByToken(token);
  if (!player) notFound();

  return <PlayerStatus initialPlayer={player} />;
}
