import { cn } from "@/lib/utils";
import { formatWeekdayShortBR } from "@/lib/dates";
import type { AgendaDay, AgendaEntry } from "@/lib/agenda";

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

// Mesmas cores das linhas da lista (atividade, lembrete, melhoria, revisão, documento)
function dotClass(e: AgendaEntry) {
  if (e.kind === "activity") return "bg-sky-500";
  if (e.kind === "routine") return "bg-violet-500";
  if (e.kind === "document") return "bg-amber-500";
  return e.item.type === "REMINDER" ? "bg-emerald-500" : "bg-rose-500";
}

/** Visão geral do período: um quadradinho por dia com a quantidade e as cores do que há nele. */
export function DayStrip({ days, today }: { days: AgendaDay[]; today: string }) {
  return (
    <nav
      aria-label="Dias do período"
      className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:grid md:grid-cols-7 md:overflow-visible md:px-0"
    >
      {days.map((day, i) => {
        const [, month, dayOfMonth] = day.date.split("-");
        const isToday = day.date === today;
        const count = day.entries.length;
        return (
          <a
            key={day.date}
            href={`#dia-${day.date}`}
            aria-label={`${formatWeekdayShortBR(day.date)} ${Number(dayOfMonth)}: ${count === 0 ? "livre" : `${count} ${count === 1 ? "item" : "itens"}`}`}
            className={cn(
              "flex w-16 shrink-0 flex-col items-center gap-1 rounded-xl border bg-card px-2 py-2 transition-colors hover:border-foreground/30 md:w-auto",
              count === 0 && "bg-muted/40 text-muted-foreground",
              isToday && "border-fuchsia-400 bg-fuchsia-50 dark:border-fuchsia-500/60 dark:bg-fuchsia-500/10",
            )}
          >
            <span className="text-[11px] font-medium uppercase text-muted-foreground">
              {isToday ? "hoje" : formatWeekdayShortBR(day.date)}
            </span>
            <span className="text-lg leading-none font-semibold">
              {Number(dayOfMonth)}
              {(i === 0 || dayOfMonth === "01") && (
                <span className="ml-0.5 text-[11px] font-normal text-muted-foreground">{MONTHS[Number(month) - 1]}</span>
              )}
            </span>
            <span className="flex h-2 items-center gap-0.5">
              {day.entries.slice(0, 4).map((e) => (
                <span key={e.key} className={cn("size-1.5 rounded-full", dotClass(e))} />
              ))}
              {count > 4 && <span className="text-[10px] leading-none text-muted-foreground">+{count - 4}</span>}
            </span>
          </a>
        );
      })}
    </nav>
  );
}
