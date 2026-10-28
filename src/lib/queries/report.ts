import "server-only";
import { db } from "@/lib/db";
import { addDays, durationMinutes, fromDbDate, isoDateInTz, startOfDayInTz, toDbDate } from "@/lib/dates";
import { ITEM_TYPE_LABEL } from "@/lib/labels";
import type { ReportActivity, ReportData } from "@/lib/report";
import type { CurrentUser } from "@/lib/session";

export async function getReport(user: CurrentUser, from: string, to: string): Promise<ReportData> {
  const tz = user.timezone;
  const rangeStart = startOfDayInTz(from, tz);
  const rangeEnd = startOfDayInTz(addDays(to, 1), tz);

  const [activities, completions, items, postponements] = await Promise.all([
    db.activity.findMany({
      where: { userId: user.id, date: { gte: toDbDate(from), lte: toDbDate(to) } },
      // relatório lê de cima para baixo: dias e horários em ordem crescente
      orderBy: [{ date: "asc" }, { startTime: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
      include: { tags: { select: { name: true }, orderBy: { name: "asc" } } },
    }),
    db.routineCompletion.findMany({
      where: { routine: { userId: user.id }, completedAt: { gte: toDbDate(from), lte: toDbDate(to) } },
      orderBy: [{ completedAt: "asc" }, { createdAt: "asc" }],
      select: { id: true, completedAt: true, routine: { select: { title: true } } },
    }),
    db.item.findMany({
      where: { userId: user.id, status: "DONE", completedAt: { gte: rangeStart, lt: rangeEnd } },
      orderBy: { completedAt: "asc" },
      select: { id: true, title: true, type: true, completedAt: true },
    }),
    db.routinePostponement.findMany({
      where: { routine: { userId: user.id }, createdAt: { gte: rangeStart, lt: rangeEnd } },
      orderBy: { createdAt: "asc" },
      select: { id: true, fromDate: true, toDate: true, reason: true, routine: { select: { title: true } } },
    }),
  ]);

  const days = new Map<string, ReportActivity[]>();
  const tagStats = new Map<string, { count: number; minutes: number }>();
  let totalMinutes = 0;

  for (const a of activities) {
    const minutes = a.startTime && a.endTime ? durationMinutes(a.startTime, a.endTime) : 0;
    const view: ReportActivity = {
      id: a.id,
      date: fromDbDate(a.date),
      title: a.title,
      notes: a.notes,
      startTime: a.startTime,
      endTime: a.endTime,
      minutes,
      tags: a.tags.map((t) => t.name),
    };
    days.set(view.date, [...(days.get(view.date) ?? []), view]);
    totalMinutes += minutes;
    for (const tag of view.tags) {
      const s = tagStats.get(tag) ?? { count: 0, minutes: 0 };
      tagStats.set(tag, { count: s.count + 1, minutes: s.minutes + minutes });
    }
  }

  return {
    from,
    to,
    userName: user.name,
    days: [...days].map(([date, list]) => ({
      date,
      activities: list,
      minutes: list.reduce((sum, a) => sum + a.minutes, 0),
    })),
    totals: { activities: activities.length, minutes: totalMinutes, days: days.size },
    byTag: [...tagStats]
      .map(([tag, s]) => ({ tag, ...s }))
      .sort((a, b) => b.minutes - a.minutes || b.count - a.count || a.tag.localeCompare(b.tag)),
    routinesDone: completions.map((c) => ({ id: c.id, date: fromDbDate(c.completedAt), title: c.routine.title })),
    itemsDone: items.map((i) => ({
      id: i.id,
      date: isoDateInTz(i.completedAt!, tz),
      title: i.title,
      typeLabel: ITEM_TYPE_LABEL[i.type].singular,
    })),
    postponements: postponements.map((p) => ({
      id: p.id,
      title: p.routine.title,
      from: fromDbDate(p.fromDate),
      to: fromDbDate(p.toDate),
      reason: p.reason,
    })),
  };
}
