"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { firstError, ITEM_STATUSES, itemSchema } from "@/lib/validations";
import { failure, success, type ActionResult } from "@/lib/action-result";
import { isAttachmentPathFor, maxBytes, mediaKind } from "@/lib/attachments";
import { checkItemAcceptsAttachment } from "@/lib/queries/attachments";
import { deleteStoredFiles, storedSize } from "@/lib/storage";
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

  const item = await db.item.create({
    data: { ...data, userId: user.id, projectId, remindAt: remindAt ? new Date(remindAt) : null },
    select: { id: true },
  });
  revalidatePath("/", "layout");
  return success("Salvo", item.id);
}

export async function updateItem(id: string, formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = itemSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failure(firstError(parsed.error));
  const { remindAt, projectId, content, notifyBefore, ...data } = parsed.data;
  if (!(await ownsProject(user.id, projectId))) return failure("Projeto inválido");

  const { count } = await db.item.updateMany({
    where: { id, userId: user.id },
    data: {
      ...data,
      content: content ?? null,
      projectId: projectId ?? null,
      remindAt: remindAt ? new Date(remindAt) : null,
      notifyBefore: notifyBefore ?? null,
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
  const files = await db.attachment.findMany({ where: { itemId: id, userId: user.id }, select: { pathname: true } });
  const { count } = await db.item.deleteMany({ where: { id, userId: user.id } });
  if (!count) return failure("Item não encontrado");
  await deleteStoredFiles(files.map((f) => f.pathname));
  revalidatePath("/", "layout");
  return success("Excluído");
}

/** Registra uma foto/vídeo já enviado ao armazenamento. Tamanho é conferido no próprio arquivo guardado. */
export async function attachMedia(
  itemId: string,
  file: { pathname: string; name: string; contentType: string },
): Promise<ActionResult> {
  const user = await requireUser();
  const kind = mediaKind(file.contentType);
  if (!kind || !isAttachmentPathFor(itemId, file.pathname)) return failure("Anexo inválido");
  const problem = await checkItemAcceptsAttachment(user.id, itemId);
  if (problem) return failure(problem);

  const size = await storedSize(file.pathname);
  if (size === null) return failure("Arquivo não encontrado. Envie de novo.");
  if (size > maxBytes(kind)) {
    await deleteStoredFiles([file.pathname]);
    return failure("Arquivo grande demais");
  }

  await db.attachment.create({
    data: {
      userId: user.id,
      itemId,
      pathname: file.pathname,
      name: file.name.slice(0, 200) || "arquivo",
      contentType: file.contentType,
      size,
    },
  });
  revalidatePath("/", "layout");
  return success();
}

export async function deleteAttachment(id: string): Promise<ActionResult> {
  const user = await requireUser();
  const attachment = await db.attachment.findFirst({ where: { id, userId: user.id }, select: { pathname: true } });
  if (!attachment) return failure("Anexo não encontrado");
  await db.attachment.delete({ where: { id } });
  await deleteStoredFiles([attachment.pathname]);
  revalidatePath("/", "layout");
  return success("Anexo excluído");
}
