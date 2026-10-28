"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { toDbDate } from "@/lib/dates";
import { requireUser } from "@/lib/session";
import { activitySchema, firstError } from "@/lib/validations";
import { failure, success, type ActionResult } from "@/lib/action-result";

function tagsInput(userId: string, names: string[]) {
  return names.map((name) => ({
    where: { userId_name: { userId, name } },
    create: { userId, name },
  }));
}

export async function createActivity(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = activitySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failure(firstError(parsed.error));
  const { date, title, notes, startTime, endTime, tags } = parsed.data;

  await db.activity.create({
    data: {
      userId: user.id,
      date: toDbDate(date),
      title,
      notes,
      startTime,
      endTime,
      tags: { connectOrCreate: tagsInput(user.id, tags) },
    },
  });
  revalidatePath("/", "layout");
  return success("Atividade registrada");
}

export async function updateActivity(id: string, formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = activitySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failure(firstError(parsed.error));
  const { date, title, notes, startTime, endTime, tags } = parsed.data;

  const existing = await db.activity.findFirst({ where: { id, userId: user.id }, select: { id: true } });
  if (!existing) return failure("Atividade não encontrada");

  await db.activity.update({
    where: { id },
    data: {
      date: toDbDate(date),
      title,
      notes: notes ?? null,
      startTime: startTime ?? null,
      endTime: endTime ?? null,
      tags: { set: [], connectOrCreate: tagsInput(user.id, tags) },
    },
  });
  revalidatePath("/", "layout");
  return success("Atividade atualizada");
}

export async function deleteActivity(id: string): Promise<ActionResult> {
  const user = await requireUser();
  const { count } = await db.activity.deleteMany({ where: { id, userId: user.id } });
  if (!count) return failure("Atividade não encontrada");
  revalidatePath("/", "layout");
  return success("Atividade excluída");
}
