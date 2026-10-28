import "server-only";
import { db } from "@/lib/db";
import type { CurrentUser } from "@/lib/session";

/** Progresso das melhorias: realizadas / (total - descartadas). */
export function improvementProgress(statuses: string[]) {
  const relevant = statuses.filter((s) => s !== "DISCARDED");
  const done = relevant.filter((s) => s === "DONE").length;
  return { done, total: relevant.length, percent: relevant.length ? Math.round((done / relevant.length) * 100) : 0 };
}

export async function listProjects(user: CurrentUser, includeArchived = false) {
  const projects = await db.project.findMany({
    where: { userId: user.id, archived: includeArchived ? undefined : false },
    orderBy: [{ archived: "asc" }, { createdAt: "desc" }],
    include: { items: { select: { type: true, status: true } } },
  });
  return projects.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    color: p.color,
    archived: p.archived,
    progress: improvementProgress(p.items.filter((i) => i.type === "IMPROVEMENT").map((i) => i.status)),
    pendingItems: p.items.filter((i) => i.status === "OPEN" || i.status === "IN_PROGRESS").length,
  }));
}

export type ProjectSummary = Awaited<ReturnType<typeof listProjects>>[number];

export async function listProjectOptions(user: CurrentUser) {
  return db.project.findMany({
    where: { userId: user.id, archived: false },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

export async function getProject(user: CurrentUser, id: string) {
  return db.project.findFirst({ where: { id, userId: user.id } });
}
