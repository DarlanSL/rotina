"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { firstError, listNameSchema, splitListEntries } from "@/lib/validations";
import { failure, success, type ActionResult } from "@/lib/action-result";
import { Prisma } from "@/generated/prisma/client";

const DUPLICATE = "Já existe uma lista com esse nome";

async function ownsList(userId: string, listId: string) {
  return Boolean(await db.list.findFirst({ where: { id: listId, userId }, select: { id: true } }));
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
  try {
    const { count } = await db.list.updateMany({ where: { id, userId: user.id }, data: { name: parsed.data } });
    if (!count) return failure("Lista não encontrada");
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return failure(DUPLICATE);
    throw error;
  }
  return done("Lista renomeada");
}

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
  if (!(await ownsList(user.id, listId))) return failure("Lista não encontrada");

  await db.listEntry.createMany({ data: texts.map((t) => ({ listId, text: t })) });
  await touch(listId);
  return done();
}

export async function setListEntryDone(id: string, isDone: boolean): Promise<ActionResult> {
  const user = await requireUser();
  const { count } = await db.listEntry.updateMany({
    where: { id, list: { userId: user.id } },
    data: { done: isDone, doneAt: isDone ? new Date() : null },
  });
  if (!count) return failure("Item não encontrado");
  return done();
}

export async function deleteListEntry(id: string): Promise<ActionResult> {
  const user = await requireUser();
  const { count } = await db.listEntry.deleteMany({ where: { id, list: { userId: user.id } } });
  if (!count) return failure("Item não encontrado");
  return done();
}

/** Tira da lista o que já foi marcado. */
export async function clearDoneEntries(listId: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!(await ownsList(user.id, listId))) return failure("Lista não encontrada");
  const { count } = await db.listEntry.deleteMany({ where: { listId, done: true } });
  return done(count ? `${count} ${count === 1 ? "item removido" : "itens removidos"}` : "Nada marcado");
}

/** Desmarca tudo para reaproveitar a lista na próxima compra. */
export async function uncheckAllEntries(listId: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!(await ownsList(user.id, listId))) return failure("Lista não encontrada");
  await db.listEntry.updateMany({ where: { listId, done: true }, data: { done: false, doneAt: null } });
  return done("Tudo desmarcado");
}
