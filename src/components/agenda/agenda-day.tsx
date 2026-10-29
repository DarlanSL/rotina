import { Fragment } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActivityRow, DocumentRow, ItemRow, RoutineRow } from "@/components/dashboard/bucket-list";
import { cn } from "@/lib/utils";
import { diffDays, formatLongDateBR } from "@/lib/dates";
import type { AgendaDay, AgendaEntry } from "@/lib/agenda";

function dayLabel(date: string, today: string) {
  const diff = diffDays(date, today);
  if (diff === 0) return "Hoje";
  if (diff === 1) return "Amanhã";
  return null;
}

function EntryRow({ entry, timezone, today }: { entry: AgendaEntry; timezone: string; today: string }) {
  switch (entry.kind) {
    case "activity":
      return <ActivityRow activity={entry.activity} muted={entry.past} />;
    case "item":
      return <ItemRow item={entry.item} timezone={timezone} showDue={false} />;
    case "routine":
      return <RoutineRow routine={entry.routine} today={today} showDue={false} />;
    case "document":
      return <DocumentRow document={entry.document} />;
  }
}

function NowLine({ now }: { now: string }) {
  return (
    <li aria-label={`Agora, ${now}`} className="flex items-center gap-2 py-1 text-xs font-medium text-fuchsia-700 dark:text-fuchsia-300">
      <span className="size-2 rounded-full bg-fuchsia-500" />
      Agora · {now}
      <span className="h-px flex-1 bg-fuchsia-300 dark:bg-fuchsia-500/50" />
    </li>
  );
}

export function AgendaDayCard({
  day,
  today,
  now,
  timezone,
}: {
  day: AgendaDay;
  today: string;
  now: string;
  timezone: string;
}) {
  const label = dayLabel(day.date, today);
  const isToday = day.date === today;

  return (
    <Card id={`dia-${day.date}`} className={cn("scroll-mt-20", isToday && "border-t-4 border-t-fuchsia-500")}>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-baseline gap-x-2">
          {label && <span>{label}</span>}
          <span className={cn("first-letter:uppercase", label && "text-sm font-normal text-muted-foreground")}>
            {formatLongDateBR(day.date)}
          </span>
          {day.entries.length > 0 && (
            <span className="ml-auto rounded-full bg-fuchsia-100 px-2 py-0.5 text-xs font-medium text-fuchsia-800 dark:bg-fuchsia-500/15 dark:text-fuchsia-300">
              {day.entries.length}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {day.entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nada programado.</p>
        ) : (
          <ul className="-my-3 divide-y">
            {day.entries.map((entry, i) => (
              <Fragment key={entry.key}>
                {day.nowIndex === i && <NowLine now={now} />}
                <EntryRow entry={entry} timezone={timezone} today={today} />
              </Fragment>
            ))}
            {day.nowIndex === day.entries.length && <NowLine now={now} />}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
