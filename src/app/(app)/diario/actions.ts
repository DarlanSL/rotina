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
import { notifyShare } from "@/lib/queries/share-notices";
import { activityChangeLines, activitySummary } from "@/lib/share-notice";

const agendaUrl = (date: string) => `/agenda?de=${date}`;
/** Uma série inteira conta como um item só nos avisos. */
const activityKey = (a: { id: string; seriesId: string | null }) =>
  a.seriesId ? `series:${a.seriesId}` : `activity:${a.id}`;
const moreRepeats = (n: number) => (n ? [`Também nas próximas ${n} repetições`] : []);

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

  const shareNotice = (key: string, extra: string[]) =>
    notifyShare({
      actorId: user.id,
      recipients: share.ids,
      targetKey: key,
      title: `@${user.username} compartilhou um compromisso com você`,
      lines: [activitySummary({ title, date, startTime: startTime ?? null }), ...extra],
      url: agendaUrl(date),
    });

  if (!repeat) {
    const created = await db.activity.create({
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
      select: { id: true },
    });
    await shareNotice(`activity:${created.id}`, []);
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
  await shareNotice(`series:${series.id}`, [
    `Repete ${describeSeries(rule)}${repeatTimes ? `, ${repeatTimes} vezes` : ", sem fim"}`,
  ]);
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
    select: {
      userId: true,
      date: true,
      seriesId: true,
      title: true,
      notes: true,
      startTime: true,
      endTime: true,
      shares: { select: { userId: true } },
    },
  });
  if (!existing) return failure("Atividade não encontrada");
  const mine = existing.userId === user.id;
  const membersBefore = [existing.userId, ...existing.shares.map((s) => s.userId)];

  const following =
    applyToFollowing && existing.seriesId
      ? await db.activity.findMany({
          where: { seriesId: existing.seriesId, date: { gt: existing.date }, ...visibleActivity(user.id) },
          select: { id: true },
        })
      : [];
  const targets = [id, ...following.map((a) => a.id)];

  const common = { title, notes: notes ?? null, startTime: startTime ?? null, endTime: endTime ?? null };

  let added: string[] = [];
  let removed: string[] = [];
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
    added = share.ids.filter((u) => !membersBefore.includes(u));
    removed = membersBefore.filter((u) => u !== user.id && !share.ids.includes(u));
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
  const after = { title, date, startTime: startTime ?? null, endTime: endTime ?? null, notes: notes ?? null };
  const changes = activityChangeLines(
    {
      title: existing.title,
      date: fromDbDate(existing.date),
      startTime: existing.startTime,
      endTime: existing.endTime,
      notes: existing.notes,
    },
    after,
  );
  const key = activityKey({ id, seriesId: existing.seriesId });
  const stay = membersBefore.filter((u) => !removed.includes(u));
  if (changes.length) {
    await notifyShare({
      actorId: user.id,
      recipients: stay,
      targetKey: key,
      title: `@${user.username} mudou o compromisso ${title}`,
      lines: [...changes, ...moreRepeats(following.length)],
      url: agendaUrl(date),
    });
  }
  if (added.length) {
    await notifyShare({
      actorId: user.id,
      recipients: added,
      targetKey: key,
      title: `@${user.username} compartilhou um compromisso com você`,
      lines: [activitySummary(after), ...moreRepeats(following.length)],
      url: agendaUrl(date),
    });
  }
  if (removed.length) {
    await notifyShare({
      actorId: user.id,
      recipients: removed,
      targetKey: key,
      title: `@${user.username} tirou você de um compromisso`,
      lines: [activitySummary({ title: existing.title, date: fromDbDate(existing.date), startTime: existing.startTime })],
      url: "/agenda",
    });
  }
  revalidatePath("/", "layout");
  return success(following.length ? `Atualizada (e mais ${following.length} repetições)` : "Atividade atualizada");
}

/** Só quem criou exclui (para todos). Numa repetição, `following` apaga esta e as próximas e encerra a série. */
export async function deleteActivity(id: string, following = false): Promise<ActionResult> {
  const user = await requireUser();
  const activity = await db.activity.findFirst({
    where: { id, userId: user.id },
    select: { date: true, seriesId: true, title: true, startTime: true, shares: { select: { userId: true } } },
  });
  if (!activity) return failure("Atividade não encontrada");
  const date = fromDbDate(activity.date);
  const notifyDeleted = (extra: string[]) =>
    notifyShare({
      actorId: user.id,
      recipients: activity.shares.map((s) => s.userId),
      targetKey: activityKey({ id, seriesId: activity.seriesId }),
      title: `@${user.username} excluiu um compromisso`,
      lines: [activitySummary({ title: activity.title, date, startTime: activity.startTime }), ...extra],
      url: agendaUrl(date),
    });

  if (following && activity.seriesId) {
    const { count } = await db.activity.deleteMany({
      where: { seriesId: activity.seriesId, userId: user.id, date: { gte: activity.date } },
    });
    await db.activitySeries.update({ where: { id: activity.seriesId }, data: { active: false } });
    await notifyDeleted(count > 1 ? ["E todas as próximas repetições"] : []);
    revalidatePath("/", "layout");
    return success(`${count} ${count === 1 ? "compromisso excluído" : "compromissos excluídos"} (a partir de ${fromDbDate(activity.date).split("-").reverse().join("/")})`);
  }
  await db.activity.delete({ where: { id } });
  await notifyDeleted([]);
  revalidatePath("/", "layout");
  return success("Atividade excluída");
}

/** Participante deixa de ver um compromisso compartilhado com ele (e, se pedir, as próximas repetições). */
export async function leaveActivity(id: string, following = false): Promise<ActionResult> {
  const user = await requireUser();
  const activity = await db.activity.findFirst({
    where: { id, shares: { some: { userId: user.id } } },
    select: { date: true, seriesId: true, title: true, startTime: true, userId: true, shares: { select: { userId: true } } },
  });
  if (!activity) return failure("Atividade não encontrada");
  await db.activityShare.deleteMany({
    where: {
      userId: user.id,
      activity:
        following && activity.seriesId ? { seriesId: activity.seriesId, date: { gte: activity.date } } : { id },
    },
  });
  const date = fromDbDate(activity.date);
  await notifyShare({
    actorId: user.id,
    recipients: [activity.userId, ...activity.shares.map((s) => s.userId)],
    targetKey: activityKey({ id, seriesId: activity.seriesId }),
    title: `@${user.username} saiu de um compromisso`,
    lines: [
      activitySummary({ title: activity.title, date, startTime: activity.startTime }),
      ...(following && activity.seriesId ? ["E das próximas repetições"] : []),
    ],
    url: agendaUrl(date),
  });
  revalidatePath("/", "layout");
  return success("Você saiu do compromisso");
}
