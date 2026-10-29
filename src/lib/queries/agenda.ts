import "server-only";
import { db } from "@/lib/db";
import { addDays, formatTimeOfDay, isoDateInTz, startOfDayInTz, toDbDate, todayISO } from "@/lib/dates";
import { buildAgendaDays } from "@/lib/agenda";
import type { CurrentUser } from "@/lib/session";
import { activityInclude, toActivityView } from "@/lib/queries/activities";
import { visibleActivity } from "@/lib/queries/sharing";
import { toDocumentView } from "@/lib/queries/documents";
import { toRoutineView } from "@/lib/queries/routines";
import type { Bucket, ScheduledItem } from "@/lib/queries/dashboard";

const itemSelect = {
  id: true,
  title: true,
  type: true,
  priority: true,
  remindAt: true,
  project: { select: { id: true, name: true } },
} as const;

const pendingItem = { status: { in: ["OPEN", "IN_PROGRESS"] as ("OPEN" | "IN_PROGRESS")[] } };

/** Agenda de `days` dias a partir de `from` + o que já venceu (só quando o período começa hoje). */
export async function getAgenda(user: CurrentUser, from: string, days: number) {
  const tz = user.timezone;
  const today = todayISO(tz);
  const to = addDays(from, days - 1);
  const withOverdue = from === today;
  const rangeStart = startOfDayInTz(from, tz);
  const rangeEnd = startOfDayInTz(addDays(to, 1), tz);
  const startOfToday = startOfDayInTz(today, tz);

  const [activities, items, routines, documents, overdueItems, overdueRoutines, overdueDocuments] = await Promise.all([
    db.activity.findMany({
      where: { ...visibleActivity(user.id), date: { gte: toDbDate(from), lte: toDbDate(to) } },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
      include: activityInclude,
    }),
    db.item.findMany({
      where: { userId: user.id, ...pendingItem, remindAt: { gte: rangeStart, lt: rangeEnd } },
      orderBy: { remindAt: "asc" },
      select: itemSelect,
    }),
    db.routine.findMany({
      where: { userId: user.id, active: true, nextDueAt: { gte: toDbDate(from), lte: toDbDate(to) } },
      orderBy: { title: "asc" },
    }),
    db.document.findMany({
      where: { userId: user.id, expiresAt: { gte: toDbDate(from), lte: toDbDate(to) } },
      orderBy: { name: "asc" },
    }),
    withOverdue
      ? db.item.findMany({
          where: { userId: user.id, ...pendingItem, remindAt: { lt: startOfToday } },
          orderBy: { remindAt: "asc" },
          select: itemSelect,
        })
      : [],
    withOverdue
      ? db.routine.findMany({
          where: { userId: user.id, active: true, nextDueAt: { lt: toDbDate(today) } },
          orderBy: { nextDueAt: "asc" },
        })
      : [],
    withOverdue
      ? db.document.findMany({
          where: { userId: user.id, expiresAt: { lt: toDbDate(today) } },
          orderBy: { expiresAt: "asc" },
        })
      : [],
  ]);

  const now = formatTimeOfDay(new Date(), tz);

  const agendaDays = buildAgendaDays({
    from,
    days,
    today,
    now,
    activities: activities.map((a) => toActivityView(a, user.id)),
    items: (items as ScheduledItem[]).map((item) => ({
      item,
      date: isoDateInTz(item.remindAt, tz),
      time: formatTimeOfDay(item.remindAt, tz),
    })),
    routines: routines.map((r) => toRoutineView(r, today)),
    documents: documents.map((d) => toDocumentView(d, today)),
  });

  const overdue: Bucket = {
    activities: [],
    items: overdueItems as ScheduledItem[],
    routines: overdueRoutines.map((r) => toRoutineView(r, today)),
    documents: overdueDocuments.map((d) => toDocumentView(d, today)),
  };

  return { today, from, to, now, days: agendaDays, overdue };
}

export type AgendaData = Awaited<ReturnType<typeof getAgenda>>;
