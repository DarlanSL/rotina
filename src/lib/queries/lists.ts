import "server-only";
import { db } from "@/lib/db";
import type { CurrentUser } from "@/lib/session";

export type ListSummary = { id: string; name: string; pending: number; done: number; preview: string[] };

export async function listLists(user: CurrentUser): Promise<ListSummary[]> {
  const lists = await db.list.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      entries: { select: { text: true, done: true }, orderBy: { createdAt: "asc" } },
    },
  });
  return lists.map((l) => {
    const pending = l.entries.filter((e) => !e.done);
    return {
      id: l.id,
      name: l.name,
      pending: pending.length,
      done: l.entries.length - pending.length,
      preview: pending.slice(0, 4).map((e) => e.text),
    };
  });
}

export type ListEntryView = { id: string; text: string; done: boolean };

/** Lista com os itens: a comprar na ordem em que foram adicionados; os marcados por último, mais recentes primeiro. */
export async function getList(user: CurrentUser, id: string) {
  const list = await db.list.findFirst({
    where: { id, userId: user.id },
    select: {
      id: true,
      name: true,
      entries: { select: { id: true, text: true, done: true, doneAt: true, createdAt: true } },
    },
  });
  if (!list) return null;
  const pending = list.entries.filter((e) => !e.done).sort((a, b) => +a.createdAt - +b.createdAt);
  const done = list.entries.filter((e) => e.done).sort((a, b) => +(b.doneAt ?? 0) - +(a.doneAt ?? 0));
  return {
    id: list.id,
    name: list.name,
    entries: [...pending, ...done].map(({ id, text, done }): ListEntryView => ({ id, text, done })),
  };
}
