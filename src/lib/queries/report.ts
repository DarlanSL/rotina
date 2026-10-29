import "server-only";
import { db } from "@/lib/db";
import { addDays, durationMinutes, fromDbDate, isoDateInTz, startOfDayInTz, toDbDate } from "@/lib/dates";
import { ITEM_TYPE_LABEL } from "@/lib/labels";
import { summarizeActivities, type ReportActivity, type ReportData } from "@/lib/report";
import type { CurrentUser } from "@/lib/session";
import { visibleActivity } from "@/lib/queries/sharing";

export async function getReport(user: CurrentUser, from: string, to: string): Promise<ReportData> {
  const tz = user.timezone;
  const rangeStart = startOfDayInTz(from, tz);
  const rangeEnd = startOfDayInTz(addDays(to, 1), tz);

  const [activities, completions, items, postponements, hiddenTags] = await Promise.all([
    db.activity.findMany({
      where: { ...visibleActivity(user.id), date: { gte: toDbDate(from), lte: toDbDate(to) } },
      // relatório lê de cima para baixo: dias e horários em ordem crescente
      orderBy: [{ date: "asc" }, { startTime: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
      include: {
        tags: { select: { name: true }, orderBy: { name: "asc" } },
        _count: { select: { shares: true } },
      },
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
    db.tag.findMany({ where: { userId: user.id, reportHidden: true }, select: { name: true }, orderBy: { name: "asc" } }),
  ]);

  const views: ReportActivity[] = activities.map((a) => ({
    id: a.id,
    date: fromDbDate(a.date),
    title: a.title,
    notes: a.notes,
    startTime: a.startTime,
    endTime: a.endTime,
    minutes: a.startTime && a.endTime ? durationMinutes(a.startTime, a.endTime) : 0,
    // tags são do dono; compromisso compartilhado já entra desmarcado
    tags: a.userId === user.id ? a.tags.map((t) => t.name) : [],
    shared: a.userId !== user.id || a._count.shares > 0,
  }));

  return {
    from,
    to,
    userName: user.name,
    ...summarizeActivities(views),
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
    hiddenTags: hiddenTags.map((t) => t.name),
  };
}
