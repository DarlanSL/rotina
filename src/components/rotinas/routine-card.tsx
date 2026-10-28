import { CalendarClockIcon, PencilIcon, RepeatIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { ConfirmDelete } from "@/components/confirm-delete";
import { CompleteButton } from "@/components/rotinas/complete-button";
import { HistoryDialog } from "@/components/rotinas/history-dialog";
import { PostponeDialog } from "@/components/rotinas/postpone-dialog";
import { RoutineFormDialog } from "@/components/rotinas/routine-form";
import { deleteRoutine } from "@/app/(app)/rotinas/actions";
import { formatDateBR } from "@/lib/dates";
import { STATUS_ACCENT } from "@/lib/deadlines";
import type { RoutineWithHistory } from "@/lib/queries/routines";
import { cn } from "@/lib/utils";

export function RoutineCard({ routine }: { routine: RoutineWithHistory }) {
  const lastEvent = routine.history[0];
  const recentlyPostponed = lastEvent?.kind === "postponed" ? lastEvent : null;

  return (
    <li className={cn("rounded-xl border border-l-4 bg-card p-4 shadow-xs", STATUS_ACCENT[routine.status])}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium">{routine.title}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <RepeatIcon className="size-3" /> a cada {routine.intervalDays} dia(s)
            </span>
            {routine.postponeCount > 0 && (
              <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400">
                <CalendarClockIcon className="size-3" /> prorrogada {routine.postponeCount}x
              </span>
            )}
          </p>
        </div>
        <StatusBadge status={routine.status} daysLeft={routine.daysLeft} />
      </div>

      {routine.description && <p className="mt-2 text-sm text-muted-foreground">{routine.description}</p>}

      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">Última conclusão</dt>
          <dd>{routine.lastCompletedAt ? formatDateBR(routine.lastCompletedAt) : "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Próxima revisão</dt>
          <dd className="font-medium">{formatDateBR(routine.nextDueAt)}</dd>
        </div>
      </dl>

      {recentlyPostponed && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
          <span className="font-medium">Adiada de {formatDateBR(recentlyPostponed.from)}:</span>{" "}
          {recentlyPostponed.reason}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3">
        <div className="flex items-center gap-1">
          <CompleteButton routineId={routine.id} completedToday={routine.completedToday} />
          <PostponeDialog routine={routine} today={routine.today} />
        </div>
        <div className="flex items-center gap-0.5">
          <HistoryDialog title={routine.title} history={routine.history} />
          <RoutineFormDialog
            routine={routine}
            trigger={
              <Button variant="ghost" size="icon-sm" aria-label="Editar">
                <PencilIcon />
              </Button>
            }
          />
          <ConfirmDelete what="rotina" action={deleteRoutine.bind(null, routine.id)} />
        </div>
      </div>
    </li>
  );
}
