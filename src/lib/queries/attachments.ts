import "server-only";
import { db } from "@/lib/db";
import { MAX_ATTACHMENTS_PER_ITEM } from "@/lib/attachments";

/** Confere se o item é do usuário e ainda cabe mais um anexo. Devolve a mensagem de erro, se houver. */
export async function checkItemAcceptsAttachment(userId: string, itemId: string): Promise<string | null> {
  const item = await db.item.findFirst({
    where: { id: itemId, userId },
    select: { _count: { select: { attachments: true } } },
  });
  if (!item) return "Item não encontrado";
  if (item._count.attachments >= MAX_ATTACHMENTS_PER_ITEM) {
    return `Limite de ${MAX_ATTACHMENTS_PER_ITEM} anexos por item`;
  }
  return null;
}
