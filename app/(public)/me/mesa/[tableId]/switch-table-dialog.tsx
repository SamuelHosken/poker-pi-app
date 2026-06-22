"use client";

import { ArrowRightLeft } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { tableStateLabel } from "@/lib/ui-labels";
import type { MatchState } from "@/lib/types/domain";

type OtherTable = {
  id: string;
  tableNumber: number;
  state: string;
  seats: number;
};

export function SwitchTableDialog({
  otherTables,
  open,
  onOpenChange,
  pendingSwitch,
  onSwitch,
}: {
  otherTables: OtherTable[];
  open: boolean;
  onOpenChange: (o: boolean) => void;
  pendingSwitch: boolean;
  onSwitch: (tableId: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger
        disabled={otherTables.length === 0 || pendingSwitch}
        className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-line bg-ink-2 text-sm text-paper transition-colors hover:border-gold/40 hover:text-gold disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ArrowRightLeft className="size-4" aria-hidden />
        {pendingSwitch ? "Trocando…" : "Trocar de mesa"}
      </DialogTrigger>
      <DialogContent className="max-w-md gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-line p-4">
          <DialogTitle>Trocar de mesa</DialogTitle>
          <DialogDescription>
            Você sai daqui e entra na mesa escolhida. Não conta como eliminação.
          </DialogDescription>
        </DialogHeader>
        <ul className="max-h-[60svh] overflow-y-auto p-2">
          {otherTables.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => onSwitch(t.id)}
                disabled={pendingSwitch}
                className="flex w-full items-center gap-3 rounded-xl p-3 text-left text-paper transition-colors hover:bg-smoke disabled:opacity-50"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-gold/40 bg-ink-2 font-display text-lg text-gold">
                  {t.tableNumber}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm">Mesa {t.tableNumber}</div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-soft">
                    {tableStateLabel(t.state as MatchState)} · {t.seats}{" "}
                    {t.seats === 1 ? "pessoa" : "pessoas"}
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
