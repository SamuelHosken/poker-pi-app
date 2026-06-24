"use client";

import { PokerPiLogo } from "@/components/ui/poker-pi-logo";
import { AccountMenu } from "./account-menu";

export function AdminTopBar({
  name,
  avatarUrl,
}: {
  name: string;
  avatarUrl?: string | null;
}) {
  return (
    <header
      className="glass sticky z-30 mx-3 mt-3 flex items-center justify-between rounded-2xl px-3 py-2.5 md:hidden"
      style={{ top: "max(0.75rem, env(safe-area-inset-top))" }}
    >
      <div className="flex items-center gap-2">
        <PokerPiLogo className="size-6 text-gold" />
        <span className="text-sm font-semibold">Poker Pi</span>
      </div>
      <AccountMenu name={name} avatarUrl={avatarUrl} variant="compact" />
    </header>
  );
}
