"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, FastForward } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createBlindLevel,
  updateBlindLevel,
  deleteBlindLevel,
} from "@/lib/tournament/blinds";
import { setCurrentLevel } from "@/lib/tournament/matches";
import type { Tables } from "@/lib/types/database.types";

type BlindLevel = Tables<"blind_levels">;

export function BlindsEditor({
  physicalTableId,
  matchId,
  levels,
  currentLevelId,
}: {
  physicalTableId: string;
  matchId: string | null;
  levels: BlindLevel[];
  currentLevelId: string | null;
}) {
  return (
    <div className="space-y-3">
      <Card size="sm">
        <CardContent className="px-3 py-2">
          <ul className="divide-y divide-hair">
            {levels.map((lvl) => {
              const isCurrent = lvl.id === currentLevelId;
              return (
                <li
                  key={lvl.id}
                  className={`grid grid-cols-[2.5rem_1fr_auto] items-center gap-2 py-2 font-mono text-xs ${
                    isCurrent ? "text-gold" : "text-muted-foreground"
                  }`}
                >
                  <span
                    className={`text-center font-semibold ${isCurrent ? "text-gold" : "text-muted-foreground"}`}
                  >
                    N{lvl.level_number}
                  </span>
                  <span className="truncate">
                    <span className={isCurrent ? "text-gold-soft" : ""}>
                      SB {lvl.small_blind.toLocaleString("pt-BR")} · BB{" "}
                      {lvl.big_blind.toLocaleString("pt-BR")}
                      {lvl.ante > 0 && (
                        <> · Ante {lvl.ante.toLocaleString("pt-BR")}</>
                      )}
                    </span>
                    <span className="ml-1 text-muted-foreground">
                      · {lvl.duration_minutes}min
                    </span>
                  </span>
                  <div className="flex items-center gap-1">
                    {matchId && !isCurrent && (
                      <JumpToLevelButton matchId={matchId} level={lvl} />
                    )}
                    <EditBlindButton level={lvl} />
                    <DeleteBlindButton level={lvl} isCurrent={isCurrent} />
                  </div>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      <AddBlindButton
        physicalTableId={physicalTableId}
        lastLevel={levels[levels.length - 1]}
      />
    </div>
  );
}

function JumpToLevelButton({
  matchId,
  level,
}: {
  matchId: string;
  level: BlindLevel;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  function handleConfirm() {
    startTransition(async () => {
      try {
        await setCurrentLevel({ matchId, levelNumber: level.level_number });
        toast.success(`Pulou pro nível ${level.level_number}`);
        setOpen(false);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro");
      }
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        aria-label={`Pular pro nível ${level.level_number}`}
        className={buttonVariants({ variant: "ghost", size: "icon" })}
      >
        <FastForward className="size-4" aria-hidden />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Pular pro nível {level.level_number}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            SB {level.small_blind.toLocaleString("pt-BR")} / BB{" "}
            {level.big_blind.toLocaleString("pt-BR")} · {level.duration_minutes}
            min. Cronômetro vai recomeçar do zero ({level.duration_minutes}min
            cheios). A mesa volta pra JOGANDO se tava pausada. Sem undo.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={pending}
            className="bg-gold text-ink hover:bg-gold/90"
          >
            {pending ? "Pulando…" : "Pular"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function AddBlindButton({
  physicalTableId,
  lastLevel,
}: {
  physicalTableId: string;
  lastLevel: BlindLevel | undefined;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [smallBlind, setSmallBlind] = useState<string>(
    String((lastLevel?.small_blind ?? 50) * 2),
  );
  const [bigBlind, setBigBlind] = useState<string>(
    String((lastLevel?.big_blind ?? 100) * 2),
  );
  const [ante, setAnte] = useState<string>(String(lastLevel?.ante ?? 0));
  const [duration, setDuration] = useState<string>(
    String(lastLevel?.duration_minutes ?? 15),
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      try {
        await createBlindLevel({
          physicalTableId,
          smallBlind: Number(smallBlind),
          bigBlind: Number(bigBlind),
          ante: Number(ante),
          durationMinutes: Number(duration),
        });
        toast.success("Nível adicionado");
        setOpen(false);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className={buttonVariants({
          variant: "outline",
          className: "w-full border-dashed border-hair text-muted-foreground hover:text-gold hover:border-gold/40",
        })}
      >
        <Plus className="size-4" aria-hidden />
        Adicionar nível
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Novo nível</DialogTitle>
          <DialogDescription>
            Adicionado ao fim da estrutura desta mesa.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <BlindFields
            smallBlind={smallBlind}
            bigBlind={bigBlind}
            ante={ante}
            duration={duration}
            onChange={{ setSmallBlind, setBigBlind, setAnte, setDuration }}
          />
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Adicionando…" : "Adicionar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditBlindButton({ level }: { level: BlindLevel }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [smallBlind, setSmallBlind] = useState<string>(
    String(level.small_blind),
  );
  const [bigBlind, setBigBlind] = useState<string>(String(level.big_blind));
  const [ante, setAnte] = useState<string>(String(level.ante));
  const [duration, setDuration] = useState<string>(
    String(level.duration_minutes),
  );

  function handleOpen(next: boolean) {
    if (next) {
      setSmallBlind(String(level.small_blind));
      setBigBlind(String(level.big_blind));
      setAnte(String(level.ante));
      setDuration(String(level.duration_minutes));
    }
    setOpen(next);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      try {
        await updateBlindLevel({
          blindLevelId: level.id,
          smallBlind: Number(smallBlind),
          bigBlind: Number(bigBlind),
          ante: Number(ante),
          durationMinutes: Number(duration),
        });
        toast.success("Nível atualizado");
        setOpen(false);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger
        aria-label={`Editar nível ${level.level_number}`}
        className={buttonVariants({ variant: "ghost", size: "icon" })}
      >
        <Pencil className="size-4" aria-hidden />
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar nível {level.level_number}</DialogTitle>
          <DialogDescription>
            Alterações valem imediatamente. Se este for o nível atual, o
            cronômetro ainda usa a duração nova.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <BlindFields
            smallBlind={smallBlind}
            bigBlind={bigBlind}
            ante={ante}
            duration={duration}
            onChange={{ setSmallBlind, setBigBlind, setAnte, setDuration }}
          />
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteBlindButton({
  level,
  isCurrent,
}: {
  level: BlindLevel;
  isCurrent: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      try {
        await deleteBlindLevel(level.id);
        toast.success("Nível removido");
        setOpen(false);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro");
      }
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        disabled={isCurrent}
        aria-label={`Remover nível ${level.level_number}`}
        className={buttonVariants({ variant: "destructive", size: "icon" })}
      >
        <Trash2 className="size-4" aria-hidden />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Remover nível {level.level_number}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            SB {level.small_blind} / BB {level.big_blind} ·{" "}
            {level.duration_minutes}min. Os outros níveis mantêm a numeração
            atual (pode ficar com gap).
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={pending}
            className="bg-red-poker text-white hover:bg-red-poker/90"
          >
            {pending ? "Removendo…" : "Remover"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function BlindFields({
  smallBlind,
  bigBlind,
  ante,
  duration,
  onChange,
}: {
  smallBlind: string;
  bigBlind: string;
  ante: string;
  duration: string;
  onChange: {
    setSmallBlind: (v: string) => void;
    setBigBlind: (v: string) => void;
    setAnte: (v: string) => void;
    setDuration: (v: string) => void;
  };
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Field label="Small blind" value={smallBlind} onChange={onChange.setSmallBlind} />
      <Field label="Big blind" value={bigBlind} onChange={onChange.setBigBlind} />
      <Field label="Ante" value={ante} onChange={onChange.setAnte} />
      <Field label="Duração (min)" value={duration} onChange={onChange.setDuration} />
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </Label>
      <Input
        type="number"
        inputMode="numeric"
        min={0}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11"
      />
    </div>
  );
}
