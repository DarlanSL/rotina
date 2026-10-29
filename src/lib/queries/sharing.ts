import "server-only";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

/** Atividades do usuário ou compartilhadas com ele. */
export const visibleActivity = (userId: string) =>
  ({ OR: [{ userId }, { shares: { some: { userId } } }] }) satisfies Prisma.ActivityWhereInput;

/** Listas do usuário ou compartilhadas com ele. */
export const visibleList = (userId: string) =>
  ({ OR: [{ userId }, { shares: { some: { userId } } }] }) satisfies Prisma.ListWhereInput;

export const MAX_SHARES = 10;

/** "ana, @bruno" → ["ana", "bruno"] (sem repetidos). */
export function parseUsernames(raw: string): string[] {
  return [
    ...new Set(
      raw
        .split(/[\s,;]+/)
        .map((u) => u.replace(/^@/, "").trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
}

/** Converte nomes de usuário em ids; ignora o próprio usuário. Erro se algum não existir. */
export async function resolveUsers(
  raw: string,
  selfId: string,
): Promise<{ ok: true; ids: string[] } | { ok: false; error: string }> {
  const names = parseUsernames(raw);
  if (names.length > MAX_SHARES) return { ok: false, error: `Compartilhe com até ${MAX_SHARES} pessoas` };
  if (!names.length) return { ok: true, ids: [] };
  const users = await db.user.findMany({ where: { username: { in: names } }, select: { id: true, username: true } });
  const missing = names.filter((n) => !users.some((u) => u.username === n));
  if (missing.length) {
    return { ok: false, error: `Usuário não encontrado: ${missing.map((m) => `@${m}`).join(", ")}` };
  }
  return { ok: true, ids: users.map((u) => u.id).filter((id) => id !== selfId) };
}
