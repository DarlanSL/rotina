import "server-only";
import { db } from "@/lib/db";
import { diffDays, fromDbDate, todayISO } from "@/lib/dates";
import { getDeadlineStatus } from "@/lib/deadlines";
import type { CurrentUser } from "@/lib/session";

type RoutineRow = {
  id: string;
  title: string;
  description: string | null;
  intervalDays: number;
  alertDaysBefore: number;
  lastCompletedAt: Date | null;
  nextDueAt: Date;
};

export function toRoutineView(r: RoutineRow, today: string) {
  const nextDue = fromDbDate(r.nextDueAt);
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    intervalDays: r.intervalDays,
    alertDaysBefore: r.alertDaysBefore,
    lastCompletedAt: r.lastCompletedAt ? fromDbDate(r.lastCompletedAt) : null,
    nextDueAt: nextDue,
    daysLeft: diffDays(nextDue, today),
    status: getDeadlineStatus(nextDue, r.alertDaysBefore, today),
    completedToday: r.lastCompletedAt ? fromDbDate(r.lastCompletedAt) === today : false,
  };
}

export type RoutineView = ReturnType<typeof toRoutineView>;

export type RoutineHistoryEvent =
  | { kind: "done"; id: string; date: string; at: Date }
  | { kind: "postponed"; id: string; from: string; to: string; reason: string; at: Date };

export async function listRoutines(user: CurrentUser) {
  const today = todayISO(user.timezone);
  const rows = await db.routine.findMany({
    where: { userId: user.id, active: true },
    orderBy: { nextDueAt: "asc" },
    include: {
      completions: { orderBy: { completedAt: "desc" }, take: 20 },
      postponements: { orderBy: { createdAt: "desc" } },
    },
  });
  return rows.map((r) => {
    // Linha do tempo: conclusões e adiamentos, mais recentes primeiro
    const history: RoutineHistoryEvent[] = [
      ...r.completions.map((c) => ({
        kind: "done" as const,
        id: c.id,
        date: fromDbDate(c.completedAt),
        at: c.createdAt,
      })),
      ...r.postponements.map((p) => ({
        kind: "postponed" as const,
        id: p.id,
        from: fromDbDate(p.fromDate),
        to: fromDbDate(p.toDate),
        reason: p.reason,
        at: p.createdAt,
      })),
    ].sort((a, b) => b.at.getTime() - a.at.getTime());

    return { ...toRoutineView(r, today), history, postponeCount: r.postponements.length, today };
  });
}

export type RoutineWithHistory = Awaited<ReturnType<typeof listRoutines>>[number];
