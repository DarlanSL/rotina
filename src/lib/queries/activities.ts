import "server-only";
import { db } from "@/lib/db";
import { fromDbDate, toDbDate } from "@/lib/dates";
import { visibleActivity } from "@/lib/queries/sharing";
import type { CurrentUser } from "@/lib/session";
import type { Prisma } from "@/generated/prisma/client";

export type ActivityFilters = { from?: string; to?: string; tag?: string };

// Dias mais recentes primeiro; dentro do dia, em ordem cronológica (sem horário no fim)
const activityOrder = [
  { date: "desc" },
  { startTime: { sort: "asc", nulls: "last" } },
  { createdAt: "asc" },
] satisfies Prisma.ActivityOrderByWithRelationInput[];

const activityInclude = {
  tags: { select: { id: true, name: true }, orderBy: { name: "asc" } },
  user: { select: { username: true } },
  shares: { select: { userId: true, notifyBefore: true, user: { select: { username: true } } }, orderBy: { createdAt: "asc" } },
} as const;

type ActivityRow = {
  id: string;
  userId: string;
  date: Date;
  title: string;
  notes: string | null;
  startTime: string | null;
  endTime: string | null;
  notifyBefore: number | null;
  tags: { id: string; name: string }[];
  user: { username: string };
  shares: { userId: string; notifyBefore: number | null; user: { username: string } }[];
};

/** Visão de quem está olhando (`viewerId`): o aviso é o dele; as tags são só do dono. */
export function toActivityView(a: ActivityRow, viewerId: string) {
  const mine = a.userId === viewerId;
  const myShare = a.shares.find((s) => s.userId === viewerId);
  return {
    id: a.id,
    date: fromDbDate(a.date),
    title: a.title,
    notes: a.notes,
    startTime: a.startTime,
    endTime: a.endTime,
    notifyBefore: mine ? a.notifyBefore : (myShare?.notifyBefore ?? null),
    tags: mine ? a.tags.map((t) => t.name) : [],
    /** Criada por mim? Se não, `owner` é quem compartilhou. */
    mine,
    owner: a.user.username,
    /** Com quem está compartilhada (sem o dono) */
    sharedWith: a.shares.map((s) => s.user.username),
  };
}

export type ActivityView = ReturnType<typeof toActivityView>;

export async function listActivities(user: CurrentUser, filters: ActivityFilters) {
  const rows = await db.activity.findMany({
    where: {
      ...visibleActivity(user.id),
      date: {
        gte: filters.from ? toDbDate(filters.from) : undefined,
        lte: filters.to ? toDbDate(filters.to) : undefined,
      },
      // tags são do dono: filtrar por tag mostra só as minhas
      ...(filters.tag ? { userId: user.id, tags: { some: { name: filters.tag } } } : {}),
    },
    orderBy: activityOrder,
    include: activityInclude,
    take: 200,
  });
  return rows.map((r) => toActivityView(r, user.id));
}

export async function listTags(user: CurrentUser) {
  const tags = await db.tag.findMany({ where: { userId: user.id }, orderBy: { name: "asc" }, select: { name: true } });
  return tags.map((t) => t.name);
}

export { activityInclude, activityOrder };
