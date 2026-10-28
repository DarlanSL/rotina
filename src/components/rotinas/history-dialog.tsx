"use client";

import { CalendarClockIcon, CheckIcon, HistoryIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatDateBR } from "@/lib/dates";
import type { RoutineHistoryEvent } from "@/lib/queries/routines";

export function HistoryDialog({ title, history }: { title: string; history: RoutineHistoryEvent[] }) {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button variant="ghost" size="icon-sm" aria-label="Histórico">
            <HistoryIcon />
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Histórico · {title}</DialogTitle>
        </DialogHeader>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma conclusão ou adiamento registrado ainda.</p>
        ) : (
          <ol className="relative max-h-[60vh] space-y-4 overflow-y-auto border-l pl-5">
            {history.map((e) =>
              e.kind === "done" ? (
                <li key={e.id} className="relative">
                  <span className="absolute top-0.5 -left-[29px] flex size-4.5 items-center justify-center rounded-full bg-emerald-500 text-white ring-4 ring-popover">
                    <CheckIcon className="size-3" />
                  </span>
                  <p className="text-sm font-medium">Concluída em {formatDateBR(e.date)}</p>
                </li>
              ) : (
                <li key={e.id} className="relative">
                  <span className="absolute top-0.5 -left-[29px] flex size-4.5 items-center justify-center rounded-full bg-amber-500 text-white ring-4 ring-popover">
                    <CalendarClockIcon className="size-3" />
                  </span>
                  <p className="text-sm font-medium">
                    Prorrogada de {formatDateBR(e.from)} para {formatDateBR(e.to)}
                  </p>
                  <p className="mt-1 rounded-lg bg-amber-50 px-2.5 py-1.5 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
                    {e.reason}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    registrado em{" "}
                    {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(
                      new Date(e.at),
                    )}
                  </p>
                </li>
              ),
            )}
          </ol>
        )}
      </DialogContent>
    </Dialog>
  );
}
