"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { firstError, listNameSchema, splitListEntries } from "@/lib/validations";
import { failure, success, type ActionResult } from "@/lib/action-result";
import { MAX_SHARES, resolveUsers, visibleList } from "@/lib/queries/sharing";
import { Prisma } from "@/generated/prisma/client";

const DUPLICATE = "Já existe uma lista com esse nome";

/** Dono ou alguém com quem a lista foi compartilhada. */
async function canEditList(userId: string, listId: string) {
  return Boolean(await db.list.findFirst({ where: { id: listId, ...visibleList(userId) }, select: { id: true } }));
}

/** Marca a lista como mexida agora (ela sobe na tela de listas). */
const touch = (listId: string) => db.list.update({ where: { id: listId }, data: { updatedAt: new Date() } });

function done(message?: string, id?: string) {
  revalidatePath("/listas", "layout");
  return success(message, id);
}

export async function createList(name: string): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = listNameSchema.safeParse(name);
  if (!parsed.success) return failure(firstError(parsed.error));
  try {
    const list = await db.list.create({ data: { userId: user.id, name: parsed.data }, select: { id: true } });
    // sem aviso: a lista abre em seguida, e no celular o aviso cobriria o campo de itens
    return done(undefined, list.id);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return failure(DUPLICATE);
    throw error;
  }
}

export async function renameList(id: string, name: string): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = listNameSchema.safeParse(name);
  if (!parsed.success) return failure(firstError(parsed.error));
  if (!(await canEditList(user.id, id))) return failure("Lista não encontrada");
  try {
    await db.list.update({ where: { id }, data: { name: parsed.data } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return failure(DUPLICATE);
    throw error;
  }
  return done("Lista renomeada");
}

/** Só o dono exclui (some para todos). */
export async function deleteList(id: string): Promise<ActionResult> {
  const user = await requireUser();
  const { count } = await db.list.deleteMany({ where: { id, userId: user.id } });
  if (!count) return failure("Lista não encontrada");
  return done("Lista excluída");
}

/** Adiciona um ou vários itens (uma linha ou vírgula/ponto e vírgula por item). */
export async function addListEntries(listId: string, text: string): Promise<ActionResult> {
  const user = await requireUser();
  const texts = splitListEntries(text);
  if (texts.length === 0) return failure("Escreva o item");
  if (!(await canEditList(user.id, listId))) return failure("Lista não encontrada");

  await db.listEntry.createMany({ data: texts.map((t) => ({ listId, text: t })) });
  await touch(listId);
  return done();
}

export async function setListEntryDone(id: string, isDone: boolean): Promise<ActionResult> {
  const user = await requireUser();
  const { count } = await db.listEntry.updateMany({
    where: { id, list: visibleList(user.id) },
    data: { done: isDone, doneAt: isDone ? new Date() : null },
  });
  if (!count) return failure("Item não encontrado");
  return done();
}

export async function deleteListEntry(id: string): Promise<ActionResult> {
  const user = await requireUser();
  const { count } = await db.listEntry.deleteMany({ where: { id, list: visibleList(user.id) } });
  if (!count) return failure("Item não encontrado");
  return done();
}

/** Tira da lista o que já foi marcado. */
export async function clearDoneEntries(listId: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!(await canEditList(user.id, listId))) return failure("Lista não encontrada");
  const { count } = await db.listEntry.deleteMany({ where: { listId, done: true } });
  return done(count ? `${count} ${count === 1 ? "item removido" : "itens removidos"}` : "Nada marcado");
}

/** Desmarca tudo para reaproveitar a lista na próxima compra. */
export async function uncheckAllEntries(listId: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!(await canEditList(user.id, listId))) return failure("Lista não encontrada");
  await db.listEntry.updateMany({ where: { listId, done: true }, data: { done: false, doneAt: null } });
  return done("Tudo desmarcado");
}

/** Dono compartilha a lista com outro usuário (pelo nome de usuário). */
export async function shareList(listId: string, username: string): Promise<ActionResult> {
  const user = await requireUser();
  const list = await db.list.findFirst({
    where: { id: listId, userId: user.id },
    select: { _count: { select: { shares: true } } },
  });
  if (!list) return failure("Lista não encontrada");
  const resolved = await resolveUsers(username, user.id);
  if (!resolved.ok) return failure(resolved.error);
  if (!resolved.ids.length) return failure("Informe o usuário de outra pessoa");
  if (list._count.shares + resolved.ids.length > MAX_SHARES) return failure(`Compartilhe com até ${MAX_SHARES} pessoas`);

  await db.listShare.createMany({ data: resolved.ids.map((userId) => ({ listId, userId })), skipDuplicates: true });
  return done("Lista compartilhada");
}

/** Dono tira alguém da lista. */
export async function unshareList(listId: string, userId: string): Promise<ActionResult> {
  const user = await requireUser();
  const { count } = await db.listShare.deleteMany({ where: { listId, userId, list: { userId: user.id } } });
  if (!count) return failure("Não encontrado");
  return done("Acesso removido");
}

/** Quem recebeu a lista deixa de vê-la. */
export async function leaveList(listId: string): Promise<ActionResult> {
  const user = await requireUser();
  const { count } = await db.listShare.deleteMany({ where: { listId, userId: user.id } });
  if (!count) return failure("Lista não encontrada");
  return done("Você saiu da lista");
}
