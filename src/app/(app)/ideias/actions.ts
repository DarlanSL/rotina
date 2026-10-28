"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { firstError, ITEM_STATUSES, itemSchema } from "@/lib/validations";
import { failure, success, type ActionResult } from "@/lib/action-result";
import type { ItemStatus } from "@/generated/prisma/enums";

async function ownsProject(userId: string, projectId: string | undefined) {
  if (!projectId) return true;
  return Boolean(await db.project.findFirst({ where: { id: projectId, userId }, select: { id: true } }));
}

export async function createItem(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = itemSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failure(firstError(parsed.error));
  const { remindAt, projectId, ...data } = parsed.data;
  if (!(await ownsProject(user.id, projectId))) return failure("Projeto inválido");

  await db.item.create({
    data: { ...data, userId: user.id, projectId, remindAt: remindAt ? new Date(remindAt) : null },
  });
  revalidatePath("/", "layout");
  return success("Salvo");
}

export async function updateItem(id: string, formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = itemSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failure(firstError(parsed.error));
  const { remindAt, projectId, content, ...data } = parsed.data;
  if (!(await ownsProject(user.id, projectId))) return failure("Projeto inválido");

  const { count } = await db.item.updateMany({
    where: { id, userId: user.id },
    data: {
      ...data,
      content: content ?? null,
      projectId: projectId ?? null,
      remindAt: remindAt ? new Date(remindAt) : null,
    },
  });
  if (!count) return failure("Item não encontrado");
  revalidatePath("/", "layout");
  return success("Atualizado");
}

export async function setItemStatus(id: string, status: ItemStatus): Promise<ActionResult> {
  const user = await requireUser();
  if (!ITEM_STATUSES.includes(status)) return failure("Status inválido");

  const { count } = await db.item.updateMany({
    where: { id, userId: user.id },
    data: { status, completedAt: status === "DONE" ? new Date() : null },
  });
  if (!count) return failure("Item não encontrado");
  revalidatePath("/", "layout");
  return success(status === "DONE" ? "Marcado como realizado" : "Status atualizado");
}

/** Transforma uma ideia/anotação em melhoria acompanhável de um projeto. */
export async function promoteToImprovement(id: string, projectId: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!(await ownsProject(user.id, projectId))) return failure("Projeto inválido");

  const { count } = await db.item.updateMany({
    where: { id, userId: user.id },
    data: { type: "IMPROVEMENT", projectId, status: "OPEN", completedAt: null },
  });
  if (!count) return failure("Item não encontrado");
  revalidatePath("/", "layout");
  return success("Promovida a melhoria");
}

export async function deleteItem(id: string): Promise<ActionResult> {
  const user = await requireUser();
  const { count } = await db.item.deleteMany({ where: { id, userId: user.id } });
  if (!count) return failure("Item não encontrado");
  revalidatePath("/", "layout");
  return success("Excluído");
}
