import "server-only";
import { db } from "@/lib/db";
import { addDays, fromDbDate, toDbDate } from "@/lib/dates";
import { seriesDates, type Recurrence } from "@/lib/recurrence";

/** "Sem fim": mantém compromissos criados até ~3 meses à frente; renova quando faltar menos de 2. */
export const SERIES_HORIZON_DAYS = 90;
const SERIES_RENEW_DAYS = 60;

/** Campos copiados para cada repetição. */
export type SeriesTemplate = {
  userId: string;
  title: string;
  notes: string | null;
  startTime: string | null;
  endTime: string | null;
  notifyBefore: number | null;
  tagIds: string[];
  shares: { userId: string; notifyBefore: number | null }[];
};

export async function insertSeriesActivities(seriesId: string, dates: string[], t: SeriesTemplate) {
  if (!dates.length) return;
  await db.$transaction(
    dates.map((date) =>
      db.activity.create({
        data: {
          seriesId,
          userId: t.userId,
          date: toDbDate(date),
          title: t.title,
          notes: t.notes,
          startTime: t.startTime,
          endTime: t.endTime,
          notifyBefore: t.notifyBefore,
          tags: { connect: t.tagIds.map((id) => ({ id })) },
          shares: { create: t.shares },
        },
        select: { id: true },
      }),
    ),
  );
}

export const seriesRule = (s: {
  repeatKind: Recurrence["kind"];
  intervalDays: number;
  monthDay: number | null;
  weekOrdinal: number | null;
  weekday: number | null;
}): Recurrence => ({
  kind: s.repeatKind,
  intervalDays: s.intervalDays,
  monthDay: s.monthDay,
  weekOrdinal: s.weekOrdinal,
  weekday: s.weekday,
});

/**
 * Séries "sem fim" do usuário (ou compartilhadas com ele) que estão perto do fim do que já foi criado:
 * cria as próximas repetições copiando a última (título, horário, tags, com quem está compartilhada).
 * `through`: a tela vai mostrar até essa data (ex.: Agenda olhando meses à frente).
 */
export async function extendSeries(userId: string, today: string, through?: string) {
  const maxThrough = addDays(today, 400);
  const want = through && through > today ? (through < maxThrough ? through : maxThrough) : today;
  const renewBefore = [addDays(today, SERIES_RENEW_DAYS), want].sort()[1];
  const until = [addDays(today, SERIES_HORIZON_DAYS), want].sort()[1];
  const series = await db.activitySeries.findMany({
    where: {
      active: true,
      repeatTimes: null,
      generatedUntil: { lt: toDbDate(renewBefore) },
      OR: [{ userId }, { activities: { some: { shares: { some: { userId } } } } }],
    },
    include: {
      activities: {
        orderBy: { date: "desc" },
        take: 1,
        include: { tags: { select: { id: true } }, shares: { select: { userId: true, notifyBefore: true } } },
      },
    },
  });

  for (const s of series) {
    const last = s.activities[0];
    if (!last) {
      // todas as repetições foram apagadas
      await db.activitySeries.update({ where: { id: s.id }, data: { active: false } });
      continue;
    }
    const from = fromDbDate(s.generatedUntil);
    // reserva o trecho antes de criar: duas telas abertas ao mesmo tempo não duplicam
    const { count } = await db.activitySeries.updateMany({
      where: { id: s.id, generatedUntil: s.generatedUntil },
      data: { generatedUntil: toDbDate(until) },
    });
    if (!count) continue;

    const dates = seriesDates(seriesRule(s), fromDbDate(s.startDate), { untilIso: until }, addDays).filter((d) => d > from);
    await insertSeriesActivities(s.id, dates, {
      userId: last.userId,
      title: last.title,
      notes: last.notes,
      startTime: last.startTime,
      endTime: last.endTime,
      notifyBefore: last.notifyBefore,
      tagIds: last.tags.map((t) => t.id),
      shares: last.shares,
    });
  }
}
