import Link from "next/link";
import { BookOpenIcon, CheckCheckIcon, CircleCheckIcon, RefreshCwIcon } from "lucide-react";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TONES } from "@/components/layout/nav-items";
import { durationMinutes, formatMinutes, formatTimeOfDay } from "@/lib/dates";
import { ITEM_TYPE_LABEL } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { ActivityView } from "@/lib/queries/activities";
import type { DoneToday as DoneEntry } from "@/lib/queries/dashboard";

export function DoneToday({
  activities,
  done,
  timezone,
}: {
  activities: ActivityView[];
  done: DoneEntry[];
  timezone: string;
}) {
  const minutes = activities.reduce(
    (sum, a) => sum + (a.startTime && a.endTime ? durationMinutes(a.startTime, a.endTime) : 0),
    0,
  );
  const total = activities.length + done.length;

  return (
    <Card className="border-t-4 border-t-emerald-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCheckIcon className="size-4 text-emerald-600 dark:text-emerald-400" />
          Feito hoje
          {total > 0 && (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300">
              {total}
            </span>
          )}
        </CardTitle>
        <CardAction>
          <Link href="/relatorios?p=hoje" className="text-sm text-cyan-700 hover:underline dark:text-cyan-400">
            Relatório do dia
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-5">
        {total === 0 && (
          <p className="text-sm text-muted-foreground">
            Nada registrado ainda. Use <span className="font-medium">Registrar atividade</span> para anotar o que fez.
          </p>
        )}

        {activities.length > 0 && (
          <section>
            <p
              className={cn(
                "mb-1 flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase",
                TONES.sky.icon,
              )}
            >
              <BookOpenIcon className="size-3.5" /> Atividades
              {minutes > 0 && (
                <span className="font-normal normal-case text-muted-foreground">· {formatMinutes(minutes)}</span>
              )}
            </p>
            <ul className="divide-y">
              {activities.map((a) => (
                <li key={a.id} className="flex gap-3 py-2.5">
                  <span className="w-11 shrink-0 pt-0.5 text-xs text-muted-foreground tabular-nums">
                    {a.startTime ?? "—"}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{a.title}</p>
                    {(a.endTime || a.tags.length > 0) && (
                      <p className="truncate text-xs text-muted-foreground">
                        {a.startTime && a.endTime && `até ${a.endTime}`}
                        {a.startTime && a.endTime && a.tags.length > 0 && " · "}
                        {a.tags.map((t) => `#${t}`).join(" ")}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {done.length > 0 && (
          <section>
            <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-emerald-600 uppercase dark:text-emerald-400">
              <CircleCheckIcon className="size-3.5" /> Concluídos
            </p>
            <ul className="divide-y">
              {done.map((d) => (
                <li key={`${d.kind}-${d.id}`} className="flex items-center gap-3 py-2.5">
                  <span className="w-11 shrink-0 text-xs text-muted-foreground tabular-nums">
                    {formatTimeOfDay(d.at, timezone)}
                  </span>
                  {d.kind === "routine" ? (
                    <RefreshCwIcon className={cn("size-4 shrink-0", TONES.violet.icon)} />
                  ) : (
                    <CircleCheckIcon className={cn("size-4 shrink-0", TONES.emerald.icon)} />
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{d.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {d.kind === "routine"
                        ? "Revisão concluída"
                        : d.type === "REMINDER"
                          ? "Lembrete concluído"
                          : `${ITEM_TYPE_LABEL[d.type].singular} realizada`}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </CardContent>
    </Card>
  );
}
