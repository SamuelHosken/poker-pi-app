import { requireAdmin } from "@/lib/tournament/auth";
import { PokerPiLogo } from "@/components/ui/poker-pi-logo";
import { QrScanner } from "./qr-scanner";

export const dynamic = "force-dynamic";

export default async function CheckinPage() {
  await requireAdmin();
  return (
    <main className="mx-auto min-h-dvh max-w-md px-4 py-6">
      <header className="mb-5 flex items-center gap-3">
        <PokerPiLogo className="h-8 w-8 text-gold" />
        <div>
          <h1 className="text-lg font-bold leading-none text-paper">Check-in</h1>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.22em] text-gray-mid">
            Portaria · Poker Pi
          </p>
        </div>
      </header>
      <QrScanner />
    </main>
  );
}
