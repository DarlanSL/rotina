"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { firstError, projectSchema } from "@/lib/validations";
import { failure, success, type ActionResult } from "@/lib/action-result";

function isDuplicateName(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export async function createProject(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = projectSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failure(firstError(parsed.error));

  try {
    await db.project.create({ data: { ...parsed.data, userId: user.id } });
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
  const { description, color, name } = parsed.data;

  try {
    const { count } = await db.project.updateMany({
      where: { id, userId: user.id },
      data: { name, description: description ?? null, color: color ?? null },
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

/** Exclui o projeto; os itens ficam soltos (projectId = null). */
export async function deleteProject(id: string): Promise<ActionResult> {
  const user = await requireUser();
  const { count } = await db.project.deleteMany({ where: { id, userId: user.id } });
  if (!count) return failure("Projeto não encontrado");
  revalidatePath("/", "layout");
  redirect("/projetos");
}
