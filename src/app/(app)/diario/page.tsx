import type { Metadata } from "next";
import { FileChartColumnIcon } from "lucide-react";
import { LinkButton } from "@/components/link-button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/page-header";
import { ActivityForm } from "@/components/diario/activity-form";
import { ActivityFilters } from "@/components/diario/activity-filters";
import { ActivityItem } from "@/components/diario/activity-item";
import { requireUser } from "@/lib/session";
import { listActivities, listTags, type ActivityView } from "@/lib/queries/activities";
import { durationMinutes, formatLongDateBR, formatMinutes, todayISO } from "@/lib/dates";

export const metadata: Metadata = { title: "Diário de Atividades" };

const isIso = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

export default async function DiarioPage(props: PageProps<"/diario">) {
  const user = await requireUser();
  const params = await props.searchParams;
  const filters = {
    from: isIso(params.from) ? params.from : undefined,
    to: isIso(params.to) ? params.to : undefined,
    tag: typeof params.tag === "string" && params.tag ? params.tag : undefined,
  };

  const [activities, tags] = await Promise.all([listActivities(user, filters), listTags(user)]);
  const today = todayISO(user.timezone);

  // Agrupa por dia (lista já vem ordenada por data desc)
  const groups = new Map<string, ActivityView[]>();
  for (const a of activities) groups.set(a.date, [...(groups.get(a.date) ?? []), a]);

  return (
    <>
      <PageHeader
        module="diario"
        title="Diário de Atividades"
        description="Registre o que fez ou agende o que vai fazer — você será avisado antes de começar."
      >
        <LinkButton
          variant="outline"
          href={
            filters.from || filters.to
              ? `/relatorios?de=${filters.from ?? filters.to}&ate=${filters.to ?? filters.from}`
              : "/relatorios?p=hoje"
          }
        >
          <FileChartColumnIcon /> Relatório
        </LinkButton>
      </PageHeader>

      <Card className="mb-6">
        <CardContent>
          <ActivityForm today={today} knownTags={tags} />
        </CardContent>
      </Card>

      <ActivityFilters filters={filters} tags={tags} />

      <div className="mt-6 space-y-6">
        {groups.size === 0 && (
          <EmptyState>Nenhuma atividade encontrada{filters.tag ? ` com a tag #${filters.tag}` : ""}.</EmptyState>
        )}
        {[...groups].map(([date, items]) => {
          const minutes = items.reduce(
            (sum, a) => sum + (a.startTime && a.endTime ? durationMinutes(a.startTime, a.endTime) : 0),
            0,
          );
          return (
            <section key={date}>
              <h2 className="mb-1 text-sm font-semibold text-muted-foreground first-letter:uppercase">
                {date === today ? "Hoje" : formatLongDateBR(date)}
                <span className="ml-2 font-normal">
                  · {items.length} {items.length === 1 ? "atividade" : "atividades"}
                  {minutes > 0 && ` · ${formatMinutes(minutes)} registradas`}
                </span>
              </h2>
              <ul className="divide-y rounded-xl border bg-card px-4">
                {items.map((a) => (
                  <ActivityItem key={a.id} activity={a} today={today} knownTags={tags} />
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </>
  );
}
