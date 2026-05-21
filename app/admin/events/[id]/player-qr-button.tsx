"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function PlayerQrButton({
  playerName,
  token,
}: {
  playerName: string;
  token: string;
}) {
  const [open, setOpen] = useState(false);
  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/player/${token}`
      : `/player/${token}`;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className="rounded-md border border-line px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-gray-soft hover:border-gold/50 hover:text-gold"
        aria-label={`QR Code de ${playerName}`}
      >
        QR
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{playerName}</DialogTitle>
          <DialogDescription>
            Aponte a câmera do celular pra esse QR pra acompanhar seu status.
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center py-4">
          <div className="rounded-lg bg-paper p-4">
            <QRCodeSVG value={url} size={220} level="M" />
          </div>
        </div>

        <p className="break-all text-center font-mono text-[10px] text-gray-soft">{url}</p>
      </DialogContent>
    </Dialog>
  );
}
