import type { Metadata } from "next";
import { AlertTriangleIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { FilterChips } from "@/components/filter-chips";
import { LinkButton } from "@/components/link-button";
import { QuickLogDialog } from "@/components/dashboard/quick-log-dialog";
import { BucketList } from "@/components/dashboard/bucket-list";
import { DayStrip } from "@/components/agenda/day-strip";
import { AgendaDayCard } from "@/components/agenda/agenda-day";
import { requireUser } from "@/lib/session";
import { getAgenda } from "@/lib/queries/agenda";
import { bucketSize } from "@/lib/queries/dashboard";
import { listTags } from "@/lib/queries/activities";
import { addDays, formatDateBR, todayISO } from "@/lib/dates";
import { AGENDA_SPANS, parseAgendaParams } from "@/lib/agenda";

export const metadata: Metadata = { title: "Agenda" };

function agendaHref(from: string, days: number, today: string) {
  const params = new URLSearchParams();
  if (from !== today) params.set("de", from);
  if (days !== 7) params.set("dias", String(days));
  const query = params.toString();
  return query ? `/agenda?${query}` : "/agenda";
}

export default async function AgendaPage(props: PageProps<"/agenda">) {
  const user = await requireUser();
  const today = todayISO(user.timezone);
  const { from, days } = parseAgendaParams(await props.searchParams, today);
  const [data, tags] = await Promise.all([getAgenda(user, from, days), listTags(user)]);

  const overdueCount = bucketSize(data.overdue);
  // Hoje sempre aparece; os demais dias só se tiverem algo
  const visibleDays = data.days.filter((d) => d.entries.length > 0 || d.date === today);
  const freeDays = data.days.length - data.days.filter((d) => d.entries.length > 0).length;
  const prev = addDays(from, -days) < today ? today : addDays(from, -days);

  return (
    <>
      <PageHeader module="agenda" title="Agenda" description="O que está acontecendo e o que vem nos próximos dias.">
        <QuickLogDialog today={today} knownTags={tags} label="Agendar" title="Agendar ou registrar atividade" />
      </PageHeader>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          {from === today ? (
            <span aria-hidden className="inline-flex size-8 items-center justify-center text-muted-foreground/40">
              <ChevronLeftIcon className="size-4" />
            </span>
          ) : (
            <LinkButton href={agendaHref(prev, days, today)} variant="ghost" size="icon" aria-label="Período anterior">
              <ChevronLeftIcon />
            </LinkButton>
          )}
          <span className="min-w-36 text-center text-sm font-medium">
            {formatDateBR(data.from).slice(0, 5)} a {formatDateBR(data.to).slice(0, 5)}
          </span>
          <LinkButton href={agendaHref(addDays(from, days), days, today)} variant="ghost" size="icon" aria-label="Próximo período">
            <ChevronRightIcon />
          </LinkButton>
          {from !== today && (
            <LinkButton href={agendaHref(today, days, today)} variant="outline" size="sm" className="ml-1">
              Hoje
            </LinkButton>
          )}
        </div>
        <FilterChips
          active={String(days)}
          options={AGENDA_SPANS.map((n) => ({ label: `${n} dias`, value: String(n), href: agendaHref(from, n, today) }))}
        />
      </div>

      <DayStrip days={data.days} today={today} />

      {overdueCount > 0 && (
        <details className="group mb-4 rounded-xl border border-red-200 bg-red-50/60 dark:border-red-500/30 dark:bg-red-500/5">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium text-red-800 dark:text-red-300 [&::-webkit-details-marker]:hidden">
            <AlertTriangleIcon className="size-4" />
            {overdueCount} {overdueCount === 1 ? "item atrasado" : "itens atrasados"}
            <span className="ml-auto text-xs font-normal text-red-700/80 group-open:hidden dark:text-red-300/80">ver</span>
          </summary>
          <div className="border-t border-red-200 bg-card px-4 py-3 dark:border-red-500/30">
            <BucketList bucket={data.overdue} timezone={user.timezone} today={today} />
          </div>
        </details>
      )}

      <div className="grid gap-4">
        {visibleDays.map((day) => (
          <AgendaDayCard key={day.date} day={day} today={today} now={data.now} timezone={user.timezone} />
        ))}
      </div>

      {freeDays > 0 && (
        <p className="mt-4 text-center text-sm text-muted-foreground">
          {freeDays === data.days.length
            ? "Nenhum compromisso neste período."
            : `${freeDays} ${freeDays === 1 ? "dia livre" : "dias livres"} no período.`}
        </p>
      )}
    </>
  );
}
