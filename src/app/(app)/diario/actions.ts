"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { toDbDate } from "@/lib/dates";
import { requireUser } from "@/lib/session";
import { activitySchema, firstError } from "@/lib/validations";
import { failure, success, type ActionResult } from "@/lib/action-result";
import { resolveUsers, visibleActivity } from "@/lib/queries/sharing";

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
  const { date, title, notes, startTime, endTime, notifyBefore, shareWith, tags } = parsed.data;
  const share = await resolveUsers(shareWith ?? "", user.id);
  if (!share.ok) return failure(share.error);

  await db.activity.create({
    data: {
      userId: user.id,
      date: toDbDate(date),
      title,
      notes,
      startTime,
      endTime,
      notifyBefore,
      tags: { connectOrCreate: tagsInput(user.id, tags) },
      shares: { create: share.ids.map((userId) => ({ userId })) },
    },
  });
  revalidatePath("/", "layout");
  return success(share.ids.length ? "Atividade registrada e compartilhada" : "Atividade registrada");
}

/**
 * Dono e participantes editam título, data, horário e notas.
 * Tags e com quem compartilhar são só do dono; o "Avisar" é de cada um.
 */
export async function updateActivity(id: string, formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = activitySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failure(firstError(parsed.error));
  const { date, title, notes, startTime, endTime, notifyBefore, shareWith, tags } = parsed.data;

  const existing = await db.activity.findFirst({
    where: { id, ...visibleActivity(user.id) },
    select: { userId: true, shares: { select: { userId: true } } },
  });
  if (!existing) return failure("Atividade não encontrada");
  const mine = existing.userId === user.id;

  const common = {
    date: toDbDate(date),
    title,
    notes: notes ?? null,
    startTime: startTime ?? null,
    endTime: endTime ?? null,
  };

  if (!mine) {
    await db.$transaction([
      db.activity.update({ where: { id }, data: common }),
      db.activityShare.update({
        where: { activityId_userId: { activityId: id, userId: user.id } },
        data: { notifyBefore: notifyBefore ?? null },
      }),
    ]);
  } else {
    const share = await resolveUsers(shareWith ?? "", user.id);
    if (!share.ok) return failure(share.error);
    const current = existing.shares.map((s) => s.userId);
    await db.activity.update({
      where: { id },
      data: {
        ...common,
        notifyBefore: notifyBefore ?? null,
        tags: { set: [], connectOrCreate: tagsInput(user.id, tags) },
        // mantém quem continua (e o "Avisar" dele); tira quem saiu; inclui os novos
        shares: {
          deleteMany: { userId: { notIn: share.ids } },
          create: share.ids.filter((u) => !current.includes(u)).map((userId) => ({ userId })),
        },
      },
    });
  }
  revalidatePath("/", "layout");
  return success("Atividade atualizada");
}

/** Só quem criou exclui (para todos). */
export async function deleteActivity(id: string): Promise<ActionResult> {
  const user = await requireUser();
  const { count } = await db.activity.deleteMany({ where: { id, userId: user.id } });
  if (!count) return failure("Atividade não encontrada");
  revalidatePath("/", "layout");
  return success("Atividade excluída");
}

/** Participante deixa de ver um compromisso compartilhado com ele. */
export async function leaveActivity(id: string): Promise<ActionResult> {
  const user = await requireUser();
  const { count } = await db.activityShare.deleteMany({ where: { activityId: id, userId: user.id } });
  if (!count) return failure("Atividade não encontrada");
  revalidatePath("/", "layout");
  return success("Você saiu do compromisso");
}
