import "server-only";
import { db } from "@/lib/db";
import type { ItemStatus, ItemType } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import type { CurrentUser } from "@/lib/session";

export type ItemFilters = {
  type?: ItemType;
  status?: "pending" | "done" | "all";
  projectId?: string;
};

const PENDING: ItemStatus[] = ["OPEN", "IN_PROGRESS"];
const FINISHED: ItemStatus[] = ["DONE", "DISCARDED"];

const itemSelect = {
  id: true,
  type: true,
  title: true,
  content: true,
  status: true,
  priority: true,
  remindAt: true,
  completedAt: true,
  createdAt: true,
  project: { select: { id: true, name: true, color: true } },
  attachments: { select: { id: true, name: true, contentType: true }, orderBy: { createdAt: "asc" } },
} satisfies Prisma.ItemSelect;

export type ItemView = Prisma.ItemGetPayload<{ select: typeof itemSelect }> & { overdue: boolean };

export async function listItems(user: CurrentUser, filters: ItemFilters = {}): Promise<ItemView[]> {
  const status = filters.status ?? "pending";
  const rows = await db.item.findMany({
    where: {
      userId: user.id,
      type: filters.type,
      projectId: filters.projectId,
      status: status === "all" ? undefined : { in: status === "pending" ? PENDING : FINISHED },
    },
    // Lembretes por data; demais por prioridade e mais recentes
    orderBy:
      filters.type === "REMINDER"
        ? [{ remindAt: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }]
        : [{ priority: "desc" }, { createdAt: "desc" }],
    select: itemSelect,
    take: 300,
  });
  const now = new Date();
  return rows.map((r) => ({
    ...r,
    overdue: Boolean(r.remindAt && r.remindAt < now && PENDING.includes(r.status)),
  }));
}

export async function countPendingByType(user: CurrentUser) {
  const groups = await db.item.groupBy({
    by: ["type"],
    where: { userId: user.id, status: { in: PENDING } },
    _count: { _all: true },
  });
  const counts: Record<ItemType, number> = { IDEA: 0, NOTE: 0, REMINDER: 0, IMPROVEMENT: 0 };
  for (const g of groups) counts[g.type] = g._count._all;
  return counts;
}
