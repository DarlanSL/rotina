"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { firstError, groupNameSchema, projectSchema } from "@/lib/validations";
import { failure, success, type ActionResult } from "@/lib/action-result";

function isDuplicateName(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

/** Grupo escolhido no formulário, se for do usuário ("" = sem grupo). */
async function ownGroupId(userId: string, groupId: string | undefined) {
  if (!groupId) return null;
  const group = await db.projectGroup.findFirst({ where: { id: groupId, userId }, select: { id: true } });
  return group?.id ?? null;
}

export async function createProject(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = projectSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failure(firstError(parsed.error));
  const { groupId, ...data } = parsed.data;

  try {
    await db.project.create({ data: { ...data, groupId: await ownGroupId(user.id, groupId), userId: user.id } });
  } catch (error) {
    if (isDuplicateName(error)) return failure("Já existe um projeto com esse nome");
    throw error;
  }
  revalidatePath("/", "layout");
  return success("Projeto criado");
}

export async function updateProject(id: string, formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = projectSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failure(firstError(parsed.error));
  const { description, color, name, groupId } = parsed.data;

  try {
    const { count } = await db.project.updateMany({
      where: { id, userId: user.id },
      data: { name, description: description ?? null, color: color ?? null, groupId: await ownGroupId(user.id, groupId) },
    });
    if (!count) return failure("Projeto não encontrado");
  } catch (error) {
    if (isDuplicateName(error)) return failure("Já existe um projeto com esse nome");
    throw error;
  }
  revalidatePath("/", "layout");
  return success("Projeto atualizado");
}

export async function setProjectArchived(id: string, archived: boolean): Promise<ActionResult> {
  const user = await requireUser();
  const { count } = await db.project.updateMany({ where: { id, userId: user.id }, data: { archived } });
  if (!count) return failure("Projeto não encontrado");
  revalidatePath("/", "layout");
  return success(archived ? "Projeto arquivado" : "Projeto reativado");
}

// ---------- Grupos de projetos ----------

export async function createProjectGroup(name: string): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = groupNameSchema.safeParse(name);
  if (!parsed.success) return failure(firstError(parsed.error));
  try {
    const group = await db.projectGroup.create({ data: { userId: user.id, name: parsed.data }, select: { id: true } });
    revalidatePath("/projetos", "layout");
    return success(`Grupo "${parsed.data}" criado`, group.id);
  } catch (error) {
    if (isDuplicateName(error)) return failure("Já existe um grupo com esse nome");
    throw error;
  }
}

export async function renameProjectGroup(id: string, name: string): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = groupNameSchema.safeParse(name);
  if (!parsed.success) return failure(firstError(parsed.error));
  try {
    const { count } = await db.projectGroup.updateMany({ where: { id, userId: user.id }, data: { name: parsed.data } });
    if (!count) return failure("Grupo não encontrado");
  } catch (error) {
    if (isDuplicateName(error)) return failure("Já existe um grupo com esse nome");
    throw error;
  }
  revalidatePath("/projetos", "layout");
  return success("Grupo renomeado");
}

/** Exclui o grupo; os projetos dele ficam "Sem grupo". */
export async function deleteProjectGroup(id: string): Promise<ActionResult> {
  const user = await requireUser();
  const { count } = await db.projectGroup.deleteMany({ where: { id, userId: user.id } });
  if (!count) return failure("Grupo não encontrado");
  revalidatePath("/projetos", "layout");
  return success("Grupo excluído (os projetos ficaram sem grupo)");
}

/** Exclui o projeto; os itens ficam soltos (projectId = null). */
export async function deleteProject(id: string): Promise<ActionResult> {
  const user = await requireUser();
  const { count } = await db.project.deleteMany({ where: { id, userId: user.id } });
  if (!count) return failure("Projeto não encontrado");
  revalidatePath("/", "layout");
  redirect("/projetos");
}
