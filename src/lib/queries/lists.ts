import "server-only";
import { db } from "@/lib/db";
import { visibleList } from "@/lib/queries/sharing";
import type { CurrentUser } from "@/lib/session";

export type ListSummary = {
  id: string;
  name: string;
  pending: number;
  done: number;
  preview: string[];
  /** Dono, quando a lista foi compartilhada comigo */
  sharedBy: string | null;
  /** Com quem eu compartilhei */
  sharedWith: string[];
};

const shareSelect = {
  user: { select: { username: true } },
  shares: { select: { user: { select: { id: true, username: true } } }, orderBy: { createdAt: "asc" } },
} as const;

export async function listLists(user: CurrentUser): Promise<ListSummary[]> {
  const lists = await db.list.findMany({
    where: visibleList(user.id),
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      userId: true,
      ...shareSelect,
      entries: { select: { text: true, done: true }, orderBy: { createdAt: "asc" } },
    },
  });
  return lists.map((l) => {
    const pending = l.entries.filter((e) => !e.done);
    const mine = l.userId === user.id;
    return {
      id: l.id,
      name: l.name,
      pending: pending.length,
      done: l.entries.length - pending.length,
      preview: pending.slice(0, 4).map((e) => e.text),
      sharedBy: mine ? null : l.user.username,
      sharedWith: mine ? l.shares.map((s) => s.user.username) : [],
    };
  });
}

export type ListEntryView = { id: string; text: string; done: boolean };

/** Lista com os itens: a comprar na ordem em que foram adicionados; os marcados por último, mais recentes primeiro. */
export async function getList(user: CurrentUser, id: string) {
  const list = await db.list.findFirst({
    where: { id, ...visibleList(user.id) },
    select: {
      id: true,
      name: true,
      userId: true,
      ...shareSelect,
      entries: { select: { id: true, text: true, done: true, doneAt: true, createdAt: true } },
    },
  });
  if (!list) return null;
  const pending = list.entries.filter((e) => !e.done).sort((a, b) => +a.createdAt - +b.createdAt);
  const done = list.entries.filter((e) => e.done).sort((a, b) => +(b.doneAt ?? 0) - +(a.doneAt ?? 0));
  return {
    id: list.id,
    name: list.name,
    mine: list.userId === user.id,
    owner: list.user.username,
    members: list.shares.map((s) => s.user),
    entries: [...pending, ...done].map(({ id, text, done }): ListEntryView => ({ id, text, done })),
  };
}

export type ListDetail = NonNullable<Awaited<ReturnType<typeof getList>>>;
