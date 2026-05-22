"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Camera, Trash2 } from "lucide-react";
import { AvatarImage } from "@/components/ui/avatar-image";
import { removeAvatar, uploadAvatar } from "@/lib/tournament/profiles";

const TARGET_SIZE = 256;
const JPEG_QUALITY = 0.85;

/**
 * Comprime a imagem via canvas: crop quadrado central + resize pra 256x256
 * + JPEG 85%. Garante arquivo pequeno (~30-80KB) independente da câmera.
 */
async function compressImage(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = () => reject(new Error("Não consegui ler a imagem."));
      im.src = url;
    });

    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const sx = (img.naturalWidth - side) / 2;
    const sy = (img.naturalHeight - side) / 2;

    const canvas = document.createElement("canvas");
    canvas.width = TARGET_SIZE;
    canvas.height = TARGET_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas indisponível.");
    ctx.drawImage(img, sx, sy, side, side, 0, 0, TARGET_SIZE, TARGET_SIZE);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Falha ao comprimir."))),
        "image/jpeg",
        JPEG_QUALITY,
      );
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function AvatarUploader({
  name,
  currentUrl,
}: {
  name: string;
  currentUrl: string | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [preview, setPreview] = useState<string | null>(null);

  function pickFile() {
    inputRef.current?.click();
  }

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione uma imagem.");
      return;
    }
    let blob: Blob;
    try {
      blob = await compressImage(file);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
      return;
    }
    // Preview otimistic
    const previewUrl = URL.createObjectURL(blob);
    setPreview(previewUrl);

    const fd = new FormData();
    fd.append("file", new File([blob], "avatar.jpg", { type: "image/jpeg" }));

    startTransition(async () => {
      try {
        await uploadAvatar(fd);
        toast.success("Foto atualizada");
        setPreview(null);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao enviar");
        setPreview(null);
      } finally {
        URL.revokeObjectURL(previewUrl);
      }
    });
  }

  function handleRemove() {
    startTransition(async () => {
      try {
        await removeAvatar();
        toast.success("Foto removida");
        setPreview(null);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro");
      }
    });
  }

  const showUrl = preview ?? currentUrl;

  return (
    <div className="flex flex-col items-center gap-4 py-2">
      <div className="relative">
        <AvatarImage name={name} url={showUrl} size="xl" variant="outline" />
        {pending && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold">
              Enviando…
            </span>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          // reset pra permitir re-upload do mesmo arquivo
          e.target.value = "";
        }}
      />

      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={pickFile}
          disabled={pending}
          style={{ touchAction: "manipulation" }}
          className="inline-flex h-11 items-center gap-2 rounded-md bg-gold px-5 text-sm font-medium text-ink transition-colors hover:bg-gold/90 disabled:opacity-50"
        >
          <Camera className="size-4" aria-hidden />
          {currentUrl ? "Trocar foto" : "Adicionar foto"}
        </button>

        {currentUrl && !pending && (
          <button
            type="button"
            onClick={handleRemove}
            style={{ touchAction: "manipulation" }}
            className="inline-flex h-11 items-center gap-2 rounded-md border border-line px-4 text-sm text-gray-soft transition-colors hover:border-red-poker/40 hover:text-red-poker"
          >
            <Trash2 className="size-4" aria-hidden />
            Remover
          </button>
        )}
      </div>

      <p className="max-w-xs text-center font-mono text-[10px] uppercase tracking-[0.18em] text-gray-mid">
        Foto fica em 256×256 quadrada. Limite 512KB.
      </p>
    </div>
  );
}
