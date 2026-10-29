import {
  AlertTriangleIcon,
  BookOpenIcon,
  CalendarCheckIcon,
  ChevronRightIcon,
  ClockIcon,
  PartyPopperIcon,
  WrenchIcon,
} from "lucide-react";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LinkButton } from "@/components/link-button";
import { BucketList } from "@/components/dashboard/bucket-list";
import { DoneToday } from "@/components/dashboard/done-today";
import { QuickLogDialog } from "@/components/dashboard/quick-log-dialog";
import { StatDialog, StatLink } from "@/components/dashboard/stat-card";
import { requireUser } from "@/lib/session";
import { bucketSize, getDashboardData } from "@/lib/queries/dashboard";
import { listTags } from "@/lib/queries/activities";
import { formatLongDateBR } from "@/lib/dates";

function greeting(timeZone: string) {
  const hour = Number(
    new Intl.DateTimeFormat("pt-BR", { hour: "numeric", hourCycle: "h23", timeZone }).format(new Date()),
  );
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

export default async function DashboardPage() {
  const user = await requireUser();
  const [data, tags] = await Promise.all([getDashboardData(user), listTags(user)]);
  const firstName = user.name?.split(" ")[0];
  const agendaCount = bucketSize(data.agenda);
  const overdueCount = bucketSize(data.overdue);
  const upcomingCount = bucketSize(data.upcoming);

  return (
    <>
      <section className="mb-6 flex flex-wrap items-end justify-between gap-4 rounded-2xl bg-linear-to-br from-indigo-600 via-indigo-600 to-violet-600 p-5 text-white shadow-sm md:p-6">
        <div>
          <p className="text-sm text-indigo-100 first-letter:uppercase">{formatLongDateBR(data.today)}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {greeting(user.timezone)}
            {firstName ? `, ${firstName}` : ""}
          </h1>
          <p className="mt-1 text-sm text-indigo-100">
            {agendaCount === 0
              ? "Nada programado para hoje."
              : `${agendaCount} ${agendaCount === 1 ? "item programado" : "itens programados"} para hoje.`}
          </p>
        </div>
        <QuickLogDialog
          today={data.today}
          knownTags={tags}
          className="bg-white text-indigo-700 shadow-sm hover:bg-indigo-50"
        />
      </section>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatDialog
          label="Vencidos"
          value={overdueCount}
          icon={<AlertTriangleIcon />}
          tone="red"
          title="Vencidos"
          description="Revisões, documentos e lembretes com prazo já passado."
        >
          {overdueCount === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum item vencido. 🎉</p>
          ) : (
            <BucketList bucket={data.overdue} timezone={user.timezone} today={data.today} />
          )}
        </StatDialog>
        <StatDialog
          label="Próximos do prazo"
          value={upcomingCount}
          icon={<ClockIcon />}
          tone="amber"
          title="Próximos do prazo"
          description="Vencem nos próximos dias, dentro da janela de aviso de cada item."
        >
          {upcomingCount === 0 ? (
            <p className="text-sm text-muted-foreground">Nada se aproximando do prazo.</p>
          ) : (
            <BucketList bucket={data.upcoming} timezone={user.timezone} today={data.today} />
          )}
        </StatDialog>
        <StatLink
          label="Registros hoje"
          value={data.activities.length}
          icon={<BookOpenIcon />}
          tone="sky"
          href="/diario"
        />
        <StatLink
          label="Melhorias em aberto"
          value={data.openImprovements}
          icon={<WrenchIcon />}
          tone="rose"
          href="/projetos"
        />
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card id="agenda" className="border-t-4 border-t-indigo-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarCheckIcon className="size-4 text-indigo-600 dark:text-indigo-400" />
              Programado para hoje
              {agendaCount > 0 && (
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-800 dark:bg-indigo-500/15 dark:text-indigo-300">
                  {agendaCount}
                </span>
              )}
            </CardTitle>
            <CardAction>
              <LinkButton href="/agenda" variant="ghost" size="sm" className="-my-1">
                Ver agenda <ChevronRightIcon />
              </LinkButton>
            </CardAction>
          </CardHeader>
          <CardContent>
            {agendaCount === 0 ? (
              <div className="flex flex-col items-center gap-2 py-6 text-center text-sm text-muted-foreground">
                <PartyPopperIcon className="size-6 text-indigo-500" />
                Nenhuma revisão, lembrete ou vencimento para hoje.
              </div>
            ) : (
              <BucketList bucket={data.agenda} timezone={user.timezone} today={data.today} showDue={false} />
            )}
          </CardContent>
        </Card>

        <DoneToday activities={data.activities} done={data.doneToday} timezone={user.timezone} />
      </div>
    </>
  );
}
