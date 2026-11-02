"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { z } from "zod";
import { addDays, formatDateBR, fromDbDate, toDbDate, todayISO } from "@/lib/dates";
import { postponeError } from "@/lib/deadlines";
import { describeRecurrence, dueAfterCompletion, firstDueDate, type Recurrence } from "@/lib/recurrence";
import { requireUser } from "@/lib/session";
import { firstError, postponeSchema, routineSchema } from "@/lib/validations";
import { failure, success, type ActionResult } from "@/lib/action-result";

/** Campos de repetição gravados no banco: só os da regra escolhida (os outros ficam vazios). */
function repeatFields(data: z.infer<typeof routineSchema>): Recurrence & { repeatTimes: number | null } {
  return {
    kind: data.repeatKind,
    // coluna obrigatória: nas regras mensais guarda ~30 dias só como referência
    intervalDays: data.repeatKind === "INTERVAL" ? data.intervalDays! : 30,
    monthDay: data.repeatKind === "MONTHLY_DAY" ? data.monthDay! : null,
    weekOrdinal: data.repeatKind === "MONTHLY_WEEKDAY" ? data.weekOrdinal! : null,
    weekday: data.repeatKind === "MONTHLY_WEEKDAY" ? data.weekday! : null,
    repeatTimes: data.repeatTimes ?? null,
  };
}

function routineData(data: z.infer<typeof routineSchema>, today: string) {
  const { kind, ...repeat } = repeatFields(data);
  const lastCompletedAt = data.lastCompletedAt ?? null;
  return {
    title: data.title,
    description: data.description ?? null,
    alertDaysBefore: data.alertDaysBefore,
    repeatKind: kind,
    ...repeat,
    lastCompletedAt: lastCompletedAt ? toDbDate(lastCompletedAt) : null,
    // sem conclusão anterior, a ação já fica pendente (hoje, ou na próxima data da regra mensal)
    nextDueAt: toDbDate(firstDueDate({ kind, ...repeat }, lastCompletedAt, today, addDays)),
  };
}

const toRecurrence = (r: { repeatKind: Recurrence["kind"]; intervalDays: number; monthDay: number | null; weekOrdinal: number | null; weekday: number | null }): Recurrence => ({
  kind: r.repeatKind,
  intervalDays: r.intervalDays,
  monthDay: r.monthDay,
  weekOrdinal: r.weekOrdinal,
  weekday: r.weekday,
});

export async function createRoutine(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = routineSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failure(firstError(parsed.error));
  await db.routine.create({ data: { ...routineData(parsed.data, todayISO(user.timezone)), userId: user.id } });
  revalidatePath("/", "layout");
  return success("Rotina criada");
}

export async function updateRoutine(id: string, formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = routineSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failure(firstError(parsed.error));
  const routine = await db.routine.findFirst({
    where: { id, userId: user.id },
    select: { _count: { select: { completions: true } } },
  });
  if (!routine) return failure("Rotina não encontrada");
  const data = routineData(parsed.data, todayISO(user.timezone));
  const done = routine._count.completions;
  if (data.repeatTimes !== null && data.repeatTimes < done) {
    return failure(`Ela já foi feita ${done} vezes; escolha ${done} ou mais`);
  }
  // atingiu o total: encerra
  await db.routine.update({ where: { id }, data: { ...data, active: data.repeatTimes === null || done < data.repeatTimes } });
  revalidatePath("/", "layout");
  return success("Rotina atualizada");
}

/** "Concluir hoje": registra no histórico e recalcula a próxima revisão. */
export async function completeRoutine(id: string): Promise<ActionResult> {
  const user = await requireUser();
  const routine = await db.routine.findFirst({
    where: { id, userId: user.id },
    include: { _count: { select: { completions: true } } },
  });
  if (!routine) return failure("Rotina não encontrada");

  const today = todayISO(user.timezone);
  const rule = toRecurrence(routine);
  const next = dueAfterCompletion(rule, fromDbDate(routine.nextDueAt), today, addDays);
  const doneCount = routine._count.completions + 1;
  const finished = routine.repeatTimes !== null && doneCount >= routine.repeatTimes;

  await db.$transaction([
    db.routineCompletion.create({ data: { routineId: id, completedAt: toDbDate(today) } }),
    db.routine.update({
      where: { id },
      data: { lastCompletedAt: toDbDate(today), nextDueAt: toDbDate(next), active: !finished },
    }),
  ]);
  revalidatePath("/", "layout");
  if (finished) return success(`Concluída! Era a última (${doneCount} de ${routine.repeatTimes}); rotina encerrada`);
  const count = routine.repeatTimes ? ` · ${doneCount} de ${routine.repeatTimes}` : "";
  return success(
    rule.kind === "INTERVAL"
      ? `Concluída! Próxima em ${routine.intervalDays} dia(s)${count}`
      : `Concluída! Próxima em ${formatDateBR(next)} (${describeRecurrence(rule)})${count}`,
  );
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
