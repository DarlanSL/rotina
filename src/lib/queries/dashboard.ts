import "server-only";
import { db } from "@/lib/db";
import { addDays, durationMinutes, minutesNowInTz, startOfDayInTz, toDbDate, todayISO } from "@/lib/dates";
import type { CurrentUser } from "@/lib/session";
import { activityInclude, activityOrder, toActivityView, type ActivityView } from "@/lib/queries/activities";
import { toDocumentView, type DocumentView } from "@/lib/queries/documents";
import { toRoutineView, type RoutineView } from "@/lib/queries/routines";
import type { ItemType, Priority } from "@/generated/prisma/enums";

// Maior janela de alerta permitida pelos formulários
const MAX_WINDOW_DAYS = 365;
// Lembretes e prazos de melhorias aparecem em "próximos" com esta antecedência
const ITEM_LOOKAHEAD_DAYS = 7;

export type ScheduledItem = {
  id: string;
  title: string;
  type: ItemType;
  priority: Priority;
  remindAt: Date;
  project: { id: string; name: string } | null;
};

/** Um grupo de pendências com prazo (hoje, vencidos ou próximos). */
export type Bucket = {
  /** Atividades do diário agendadas para mais tarde (só na agenda de hoje) */
  activities: ActivityView[];
  routines: RoutineView[];
  documents: DocumentView[];
  items: ScheduledItem[];
};

export type DoneToday =
  | { kind: "routine"; id: string; title: string; at: Date }
  | { kind: "item"; id: string; title: string; type: ItemType; at: Date };

const emptyBucket = (): Bucket => ({ activities: [], routines: [], documents: [], items: [] });

export function bucketSize(b: Bucket) {
  return b.activities.length + b.routines.length + b.documents.length + b.items.length;
}

export async function getDashboardData(user: CurrentUser) {
  const tz = user.timezone;
  const today = todayISO(tz);
  const horizon = toDbDate(addDays(today, MAX_WINDOW_DAYS));
  const startOfToday = startOfDayInTz(today, tz);
  const startOfTomorrow = startOfDayInTz(addDays(today, 1), tz);
  const itemHorizon = startOfDayInTz(addDays(today, ITEM_LOOKAHEAD_DAYS + 1), tz);

  const [activities, routines, documents, items, routinesDone, itemsDone, openImprovements] = await Promise.all([
    db.activity.findMany({
      where: { userId: user.id, date: toDbDate(today) },
      orderBy: activityOrder,
      include: activityInclude,
    }),
    db.routine.findMany({
      where: { userId: user.id, active: true, nextDueAt: { lte: horizon } },
      orderBy: { nextDueAt: "asc" },
    }),
    db.document.findMany({
      where: { userId: user.id, expiresAt: { lte: horizon } },
      orderBy: { expiresAt: "asc" },
    }),
    // Lembretes e melhorias com data, pendentes, até o horizonte
    db.item.findMany({
      where: {
        userId: user.id,
        status: { in: ["OPEN", "IN_PROGRESS"] },
        remindAt: { not: null, lt: itemHorizon },
      },
      orderBy: { remindAt: "asc" },
      select: {
        id: true,
        title: true,
        type: true,
        priority: true,
        remindAt: true,
        project: { select: { id: true, name: true } },
      },
    }),
    db.routineCompletion.findMany({
      where: { completedAt: toDbDate(today), routine: { userId: user.id } },
      orderBy: { createdAt: "asc" },
      select: { id: true, createdAt: true, routine: { select: { title: true } } },
    }),
    db.item.findMany({
      where: { userId: user.id, status: "DONE", completedAt: { gte: startOfToday } },
      orderBy: { completedAt: "asc" },
      select: { id: true, title: true, type: true, completedAt: true },
    }),
    db.item.count({
      where: { userId: user.id, type: "IMPROVEMENT", status: { in: ["OPEN", "IN_PROGRESS"] } },
    }),
  ]);

  const agenda = emptyBucket();
  const overdue = emptyBucket();
  const upcoming = emptyBucket();

  for (const r of routines.map((r) => toRoutineView(r, today))) {
    if (r.daysLeft < 0) overdue.routines.push(r);
    else if (r.daysLeft === 0) agenda.routines.push(r);
    else if (r.status === "warning") upcoming.routines.push(r);
  }
  for (const d of documents.map((d) => toDocumentView(d, today))) {
    if (d.daysLeft < 0) overdue.documents.push(d);
    else if (d.daysLeft === 0) agenda.documents.push(d);
    else if (d.status === "warning") upcoming.documents.push(d);
  }
  for (const i of items as ScheduledItem[]) {
    if (i.remindAt < startOfToday) overdue.items.push(i);
    else if (i.remindAt < startOfTomorrow) agenda.items.push(i);
    else upcoming.items.push(i);
  }

  // Atividade com início ainda por vir = programada; as demais já foram feitas
  const nowMinutes = minutesNowInTz(tz);
  const doneActivities: ActivityView[] = [];
  for (const a of activities.map(toActivityView)) {
    if (a.startTime && durationMinutes("00:00", a.startTime) > nowMinutes) agenda.activities.push(a);
    else doneActivities.push(a);
  }

  const doneToday: DoneToday[] = [
    ...routinesDone.map((c) => ({ kind: "routine" as const, id: c.id, title: c.routine.title, at: c.createdAt })),
    ...itemsDone.map((i) => ({ kind: "item" as const, id: i.id, title: i.title, type: i.type, at: i.completedAt! })),
  ].sort((a, b) => a.at.getTime() - b.at.getTime());

  return {
    today,
    activities: doneActivities,
    agenda,
    overdue,
    upcoming,
    doneToday,
    openImprovements,
  };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;
