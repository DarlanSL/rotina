"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { formatDateBR, fromDbDate, toDbDate, todayISO } from "@/lib/dates";
import { nextDueDate, postponeError } from "@/lib/deadlines";
import { requireUser } from "@/lib/session";
import { firstError, postponeSchema, routineSchema } from "@/lib/validations";
import { failure, success, type ActionResult } from "@/lib/action-result";

/** Sem conclusão anterior, a ação já fica pendente hoje para iniciar o ciclo. */
function computeNextDue(lastCompletedAt: string | undefined, intervalDays: number, today: string) {
  return lastCompletedAt ? nextDueDate(lastCompletedAt, intervalDays) : today;
}

export async function createRoutine(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = routineSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failure(firstError(parsed.error));
  const { lastCompletedAt, ...data } = parsed.data;
  const today = todayISO(user.timezone);

  await db.routine.create({
    data: {
      ...data,
      userId: user.id,
      lastCompletedAt: lastCompletedAt ? toDbDate(lastCompletedAt) : null,
      nextDueAt: toDbDate(computeNextDue(lastCompletedAt, data.intervalDays, today)),
    },
  });
  revalidatePath("/", "layout");
  return success("Rotina criada");
}

export async function updateRoutine(id: string, formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = routineSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failure(firstError(parsed.error));
  const { lastCompletedAt, ...data } = parsed.data;
  const today = todayISO(user.timezone);

  const { count } = await db.routine.updateMany({
    where: { id, userId: user.id },
    data: {
      ...data,
      description: data.description ?? null,
      lastCompletedAt: lastCompletedAt ? toDbDate(lastCompletedAt) : null,
      nextDueAt: toDbDate(computeNextDue(lastCompletedAt, data.intervalDays, today)),
    },
  });
  if (!count) return failure("Rotina não encontrada");
  revalidatePath("/", "layout");
  return success("Rotina atualizada");
}

/** "Concluir hoje": registra no histórico e recalcula a próxima revisão. */
export async function completeRoutine(id: string): Promise<ActionResult> {
  const user = await requireUser();
  const routine = await db.routine.findFirst({ where: { id, userId: user.id } });
  if (!routine) return failure("Rotina não encontrada");

  const today = todayISO(user.timezone);
  const next = nextDueDate(today, routine.intervalDays);

  await db.$transaction([
    db.routineCompletion.create({ data: { routineId: id, completedAt: toDbDate(today) } }),
    db.routine.update({
      where: { id },
      data: { lastCompletedAt: toDbDate(today), nextDueAt: toDbDate(next) },
    }),
  ]);
  revalidatePath("/", "layout");
  return success(`Concluída! Próxima em ${routine.intervalDays} dia(s)`);
}

/** Adia a próxima revisão para uma nova data, registrando a justificativa no histórico. */
export async function postponeRoutine(id: string, formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = postponeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failure(firstError(parsed.error));
  const { newDate, reason } = parsed.data;

  const routine = await db.routine.findFirst({ where: { id, userId: user.id } });
  if (!routine) return failure("Rotina não encontrada");

  const currentDue = fromDbDate(routine.nextDueAt);
  const error = postponeError(newDate, currentDue, todayISO(user.timezone));
  if (error) return failure(error);

  await db.$transaction([
    db.routinePostponement.create({
      data: { routineId: id, fromDate: routine.nextDueAt, toDate: toDbDate(newDate), reason },
    }),
    db.routine.update({ where: { id }, data: { nextDueAt: toDbDate(newDate) } }),
  ]);
  revalidatePath("/", "layout");
  return success(`Prorrogada para ${formatDateBR(newDate)}`);
}

export async function deleteRoutine(id: string): Promise<ActionResult> {
  const user = await requireUser();
  const { count } = await db.routine.deleteMany({ where: { id, userId: user.id } });
  if (!count) return failure("Rotina não encontrada");
  revalidatePath("/", "layout");
  return success("Rotina excluída");
}
