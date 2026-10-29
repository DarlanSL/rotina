import "server-only";
import { db } from "@/lib/db";
import { addDays, fromDbDate, timeToInstant, toDbDate, todayISO } from "@/lib/dates";
import { bucketSize, getDashboardData } from "@/lib/queries/dashboard";
import type { NotifyEvent } from "@/lib/notify";
import type { CurrentUser } from "@/lib/session";

// Janela de eventos enviada ao navegador (ele consulta de novo a cada poucos minutos)
const LOOKBACK_MS = 60 * 60_000;
// cobre o maior aviso antecipado (2 dias) com folga
const LOOKAHEAD_MS = 3 * 24 * 60 * 60_000;

export type NotificationFeed = {
  today: string;
  events: NotifyEvent[];
  /** Resumo diário de prazos, mostrado uma vez por dia */
  summary: { overdue: number; today: number; upcoming: number; lines: string[] };
};

export async function getNotificationFeed(user: CurrentUser): Promise<NotificationFeed> {
  const now = Date.now();
  const today = todayISO(user.timezone);
  const from = new Date(now - LOOKBACK_MS);
  const to = new Date(now + LOOKAHEAD_MS);

  const [activities, items, dashboard] = await Promise.all([
    db.activity.findMany({
      where: {
        userId: user.id,
        date: { gte: toDbDate(addDays(today, -1)), lte: toDbDate(addDays(today, 4)) },
        startTime: { not: null },
      },
      select: { id: true, date: true, title: true, startTime: true, endTime: true, notifyBefore: true },
    }),
    db.item.findMany({
      where: {
        userId: user.id,
        type: { in: ["REMINDER", "IMPROVEMENT"] },
        status: { in: ["OPEN", "IN_PROGRESS"] },
        remindAt: { gte: from, lte: to },
      },
      select: { id: true, type: true, title: true, remindAt: true, notifyBefore: true, project: { select: { id: true, name: true } } },
    }),
    getDashboardData(user),
  ]);

  const events: NotifyEvent[] = [];

  for (const a of activities) {
    const at = timeToInstant(fromDbDate(a.date), a.startTime!, user.timezone);
    if (at < from || at > to) continue;
    events.push({
      key: `activity:${a.id}`,
      kind: "activity",
      title: a.title,
      at: at.toISOString(),
      url: "/diario",
      detail: a.endTime ? `${a.startTime}–${a.endTime}` : a.startTime!,
      lead: a.notifyBefore,
    });
  }

  for (const i of items) {
    events.push({
      key: `item:${i.id}`,
      kind: i.type === "REMINDER" ? "reminder" : "improvement",
      title: i.title,
      at: i.remindAt!.toISOString(),
      url: i.project ? `/projetos/${i.project.id}` : `/ideias?tipo=${i.type}`,
      detail: i.project?.name,
      lead: i.notifyBefore,
    });
  }

  events.sort((a, b) => a.at.localeCompare(b.at));

  const { overdue, agenda, upcoming } = dashboard;
  const lines: string[] = [];
  const names = (b: typeof overdue) => [
    ...b.routines.map((r) => r.title),
    ...b.documents.map((d) => d.name),
    ...b.items.map((i) => i.title),
  ];
  if (bucketSize(overdue)) lines.push(`Vencidos: ${names(overdue).join(", ")}`);
  const todayNames = [...agenda.routines.map((r) => r.title), ...agenda.documents.map((d) => `${d.name} (vence hoje)`)];
  if (todayNames.length) lines.push(`Hoje: ${todayNames.join(", ")}`);
  const soonDocs = upcoming.documents.map((d) => `${d.name} em ${d.daysLeft} dia(s)`);
  if (soonDocs.length) lines.push(`Documentos: ${soonDocs.join(", ")}`);

  return {
    today,
    events,
    summary: {
      overdue: bucketSize(overdue),
      today: agenda.routines.length + agenda.documents.length,
      upcoming: bucketSize(upcoming),
      lines,
    },
  };
}
