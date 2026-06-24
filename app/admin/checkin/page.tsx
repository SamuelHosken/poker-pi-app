import { requireAdmin } from "@/lib/tournament/auth";
import { QrScanner } from "./qr-scanner";

export const dynamic = "force-dynamic";

export default async function CheckinPage() {
  await requireAdmin();
  return (
    <main className="mx-auto max-w-md px-5 py-8">
      <h1 className="mb-4 text-xl font-bold text-gold">Check-in na portaria</h1>
      <QrScanner />
    </main>
  );
}
