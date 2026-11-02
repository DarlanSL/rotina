import "server-only";
import { db } from "@/lib/db";
import { mergeNoticeLines, NOTICE_SETTLE_MS, NOTICE_WINDOW_MS, noticeBody } from "@/lib/share-notice";

export type ShareNoticeInput = {
  actorId: string;
  /** Todos os envolvidos; quem fez a mudança é tirado automaticamente */
  recipients: string[];
  targetKey: string;
  title: string;
  lines: string[];
  url: string;
};

/**
 * Registra um aviso para cada participante. Se a mesma pessoa ainda está mexendo no mesmo item
 * (aviso ainda não entregue), junta as mudanças no aviso aberto.
 */
export async function notifyShare(n: ShareNoticeInput) {
  const recipients = [...new Set(n.recipients)].filter((id) => id !== n.actorId);
  if (!recipients.length) return;
  const open = new Date(Date.now() - NOTICE_SETTLE_MS);
  await Promise.all(
    recipients.map(async (userId) => {
      const pending = await db.shareNotice.findFirst({
        where: { userId, actorId: n.actorId, targetKey: n.targetKey, updatedAt: { gt: open } },
        orderBy: { updatedAt: "desc" },
        select: { id: true, lines: true },
      });
      if (pending) {
        await db.shareNotice.update({
          where: { id: pending.id },
          data: { title: n.title, url: n.url, lines: mergeNoticeLines(pending.lines, n.lines) },
        });
      } else {
        await db.shareNotice.create({
          data: { userId, actorId: n.actorId, targetKey: n.targetKey, title: n.title, url: n.url, lines: n.lines },
        });
      }
    }),
  );
}

/** Dono + quem recebeu a lista. */
export async function listMembers(listId: string) {
  const list = await db.list.findUnique({
    where: { id: listId },
    select: { name: true, userId: true, shares: { select: { userId: true } } },
  });
  return list ? { name: list.name, ids: [list.userId, ...list.shares.map((s) => s.userId)] } : null;
}

export type DeliverableNotice = { id: string; title: string; body: string; url: string; at: string };

/** Avisos prontos para entregar (já sem mudanças em andamento) e limpeza dos antigos. */
export async function deliverableNotices(userId: string): Promise<DeliverableNotice[]> {
  const now = Date.now();
  await db.shareNotice.deleteMany({ where: { userId, updatedAt: { lt: new Date(now - 7 * NOTICE_WINDOW_MS) } } });
  const rows = await db.shareNotice.findMany({
    where: { userId, updatedAt: { gte: new Date(now - NOTICE_WINDOW_MS), lte: new Date(now - NOTICE_SETTLE_MS) } },
    orderBy: { updatedAt: "asc" },
    take: 30,
  });
  return rows
    .filter((r) => r.lines.length) // marcou e desmarcou: nada mudou
    .map((r) => ({ id: r.id, title: r.title, body: noticeBody(r.lines), url: r.url, at: r.updatedAt.toISOString() }));
}
