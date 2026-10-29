import "server-only";
import { db } from "@/lib/db";
import { fromDbDate, toDbDate } from "@/lib/dates";
import type { CurrentUser } from "@/lib/session";
import type { Prisma } from "@/generated/prisma/client";

export type ActivityFilters = { from?: string; to?: string; tag?: string };

// Dias mais recentes primeiro; dentro do dia, em ordem cronológica (sem horário no fim)
const activityOrder = [
  { date: "desc" },
  { startTime: { sort: "asc", nulls: "last" } },
  { createdAt: "asc" },
] satisfies Prisma.ActivityOrderByWithRelationInput[];

const activityInclude = { tags: { select: { id: true, name: true }, orderBy: { name: "asc" } } } as const;

type ActivityRow = {
  id: string;
  date: Date;
  title: string;
  notes: string | null;
  startTime: string | null;
  endTime: string | null;
  notifyBefore: number | null;
  tags: { id: string; name: string }[];
};

export function toActivityView(a: ActivityRow) {
  return {
    id: a.id,
    date: fromDbDate(a.date),
    title: a.title,
    notes: a.notes,
    startTime: a.startTime,
    endTime: a.endTime,
    notifyBefore: a.notifyBefore,
    tags: a.tags.map((t) => t.name),
  };
}

export type ActivityView = ReturnType<typeof toActivityView>;

export async function listActivities(user: CurrentUser, filters: ActivityFilters) {
  const rows = await db.activity.findMany({
    where: {
      userId: user.id,
      date: {
        gte: filters.from ? toDbDate(filters.from) : undefined,
        lte: filters.to ? toDbDate(filters.to) : undefined,
      },
      tags: filters.tag ? { some: { name: filters.tag } } : undefined,
    },
    orderBy: activityOrder,
    include: activityInclude,
    take: 200,
  });
  return rows.map(toActivityView);
}

export async function listTags(user: CurrentUser) {
  const tags = await db.tag.findMany({ where: { userId: user.id }, orderBy: { name: "asc" }, select: { name: true } });
  return tags.map((t) => t.name);
}

export { activityInclude, activityOrder };
