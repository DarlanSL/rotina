"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { toDbDate } from "@/lib/dates";
import { requireUser } from "@/lib/session";
import { documentSchema, firstError } from "@/lib/validations";
import { failure, success, type ActionResult } from "@/lib/action-result";

export async function createDocument(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = documentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failure(firstError(parsed.error));

  await db.document.create({
    data: { ...parsed.data, userId: user.id, expiresAt: toDbDate(parsed.data.expiresAt) },
  });
  revalidatePath("/", "layout");
  return success("Documento cadastrado");
}

export async function updateDocument(id: string, formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = documentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failure(firstError(parsed.error));
  const { issuer, notes, ...data } = parsed.data;

  const { count } = await db.document.updateMany({
    where: { id, userId: user.id },
    data: { ...data, issuer: issuer ?? null, notes: notes ?? null, expiresAt: toDbDate(data.expiresAt) },
  });
  if (!count) return failure("Documento não encontrado");
  revalidatePath("/", "layout");
  return success("Documento atualizado");
}

export async function deleteDocument(id: string): Promise<ActionResult> {
  const user = await requireUser();
  const { count } = await db.document.deleteMany({ where: { id, userId: user.id } });
  if (!count) return failure("Documento não encontrado");
  revalidatePath("/", "layout");
  return success("Documento excluído");
}
