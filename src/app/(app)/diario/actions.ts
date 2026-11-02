"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { addDays, fromDbDate, toDbDate, todayISO } from "@/lib/dates";
import { requireUser } from "@/lib/session";
import { activitySchema, firstError } from "@/lib/validations";
import { failure, success, type ActionResult } from "@/lib/action-result";
import { resolveUsers, visibleActivity } from "@/lib/queries/sharing";
import { insertSeriesActivities, SERIES_HORIZON_DAYS } from "@/lib/queries/series";
import { describeSeries, ruleFromChoice, seriesDates } from "@/lib/recurrence";

function tagsInput(userId: string, names: string[]) {
  return names.map((name) => ({
    where: { userId_name: { userId, name } },
    create: { userId, name },
  }));
}

/** Garante que as tags existem e devolve os ids (para ligar várias repetições de uma vez). */
async function tagIds(userId: string, names: string[]) {
  const tags = await Promise.all(
    names.map((name) =>
      db.tag.upsert({ where: { userId_name: { userId, name } }, create: { userId, name }, update: {}, select: { id: true } }),
    ),
  );
  return tags.map((t) => t.id);
}

export async function createActivity(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = activitySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failure(firstError(parsed.error));
  const { date, title, notes, startTime, endTime, notifyBefore, shareWith, tags, repeat, repeatEvery, repeatTimes } =
    parsed.data;
  const share = await resolveUsers(shareWith ?? "", user.id);
  if (!share.ok) return failure(share.error);
  const sharedMsg = share.ids.length ? " e compartilhada" : "";

  if (!repeat) {
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
    return success(`Atividade registrada${sharedMsg}`);
  }

  // Repetição: cria cada compromisso (com quantidade: todos; sem fim: os próximos ~3 meses)
  const rule = ruleFromChoice(repeat, date, repeatEvery);
  const today = todayISO(user.timezone);
  const horizon = addDays(date > today ? date : today, SERIES_HORIZON_DAYS);
  const dates = seriesDates(rule, date, repeatTimes ? { count: repeatTimes } : { untilIso: horizon }, addDays);
  const series = await db.activitySeries.create({
    data: {
      userId: user.id,
      repeatKind: rule.kind,
      intervalDays: rule.intervalDays,
      monthDay: rule.monthDay,
      weekOrdinal: rule.weekOrdinal,
      weekday: rule.weekday,
      startDate: toDbDate(date),
      repeatTimes: repeatTimes ?? null,
      generatedUntil: toDbDate(repeatTimes ? dates[dates.length - 1] : horizon),
    },
    select: { id: true },
  });
  await insertSeriesActivities(series.id, dates, {
    userId: user.id,
    title,
    notes: notes ?? null,
    startTime: startTime ?? null,
    endTime: endTime ?? null,
    notifyBefore: notifyBefore ?? null,
    tagIds: await tagIds(user.id, tags),
    shares: share.ids.map((userId) => ({ userId, notifyBefore: null })),
  });
  revalidatePath("/", "layout");
  return success(
    `Agendada${sharedMsg}: ${describeSeries(rule)}${repeatTimes ? `, ${repeatTimes} vezes` : ", sem fim"}`,
  );
}

/**
 * Dono e participantes editam título, data, horário e notas.
 * Tags e com quem compartilhar são só do dono; o "Avisar" é de cada um.
 * Numa repetição, "aplicar às próximas" leva título, horário, notas, aviso (e tags/participantes, se dono)
 * para as repetições seguintes — a data de cada uma não muda.
 */
export async function updateActivity(id: string, formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = activitySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failure(firstError(parsed.error));
  const { date, title, notes, startTime, endTime, notifyBefore, shareWith, tags, applyToFollowing } = parsed.data;

  const existing = await db.activity.findFirst({
    where: { id, ...visibleActivity(user.id) },
    select: { userId: true, date: true, seriesId: true },
  });
  if (!existing) return failure("Atividade não encontrada");
  const mine = existing.userId === user.id;

  const following =
    applyToFollowing && existing.seriesId
      ? await db.activity.findMany({
          where: { seriesId: existing.seriesId, date: { gt: existing.date }, ...visibleActivity(user.id) },
          select: { id: true },
        })
      : [];
  const targets = [id, ...following.map((a) => a.id)];

  const common = { title, notes: notes ?? null, startTime: startTime ?? null, endTime: endTime ?? null };

  if (!mine) {
    await db.$transaction([
      db.activity.update({ where: { id }, data: { ...common, date: toDbDate(date) } }),
      db.activity.updateMany({ where: { id: { in: targets.slice(1) } }, data: common }),
      db.activityShare.updateMany({
        where: { activityId: { in: targets }, userId: user.id },
        data: { notifyBefore: notifyBefore ?? null },
      }),
    ]);
  } else {
    const share = await resolveUsers(shareWith ?? "", user.id);
    if (!share.ok) return failure(share.error);
    const ids = await tagIds(user.id, tags);
    await db.$transaction([
      db.activity.update({ where: { id }, data: { date: toDbDate(date) } }),
      ...targets.map((activityId) =>
        db.activity.update({
          where: { id: activityId },
          data: { ...common, notifyBefore: notifyBefore ?? null, tags: { set: ids.map((tagId) => ({ id: tagId })) } },
        }),
      ),
      // mantém quem continua (e o "Avisar" dele); tira quem saiu; inclui os novos
      db.activityShare.deleteMany({ where: { activityId: { in: targets }, userId: { notIn: share.ids } } }),
      db.activityShare.createMany({
        data: targets.flatMap((activityId) => share.ids.map((userId) => ({ activityId, userId }))),
        skipDuplicates: true,
      }),
    ]);
  }
  revalidatePath("/", "layout");
  return success(following.length ? `Atualizada (e mais ${following.length} repetições)` : "Atividade atualizada");
}

/** Só quem criou exclui (para todos). Numa repetição, `following` apaga esta e as próximas e encerra a série. */
export async function deleteActivity(id: string, following = false): Promise<ActionResult> {
  const user = await requireUser();
  const activity = await db.activity.findFirst({ where: { id, userId: user.id }, select: { date: true, seriesId: true } });
  if (!activity) return failure("Atividade não encontrada");

  if (following && activity.seriesId) {
    const { count } = await db.activity.deleteMany({
      where: { seriesId: activity.seriesId, userId: user.id, date: { gte: activity.date } },
    });
    await db.activitySeries.update({ where: { id: activity.seriesId }, data: { active: false } });
    revalidatePath("/", "layout");
    return success(`${count} ${count === 1 ? "compromisso excluído" : "compromissos excluídos"} (a partir de ${fromDbDate(activity.date).split("-").reverse().join("/")})`);
  }
  await db.activity.delete({ where: { id } });
  revalidatePath("/", "layout");
  return success("Atividade excluída");
}

/** Participante deixa de ver um compromisso compartilhado com ele (e, se pedir, as próximas repetições). */
export async function leaveActivity(id: string, following = false): Promise<ActionResult> {
  const user = await requireUser();
  const activity = await db.activity.findFirst({
    where: { id, shares: { some: { userId: user.id } } },
    select: { date: true, seriesId: true },
  });
  if (!activity) return failure("Atividade não encontrada");
  await db.activityShare.deleteMany({
    where: {
      userId: user.id,
      activity:
        following && activity.seriesId ? { seriesId: activity.seriesId, date: { gte: activity.date } } : { id },
    },
  });
  revalidatePath("/", "layout");
  return success("Você saiu do compromisso");
}
