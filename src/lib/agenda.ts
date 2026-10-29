import { addDays } from "@/lib/dates";
import type { ActivityView } from "@/lib/queries/activities";
import type { ScheduledItem } from "@/lib/queries/dashboard";
import type { DocumentView } from "@/lib/queries/documents";
import type { RoutineView } from "@/lib/queries/routines";

export const AGENDA_SPANS = [7, 14, 30] as const;
export type AgendaSpan = (typeof AGENDA_SPANS)[number];

export type AgendaEntry =
  | { kind: "activity"; key: string; time: string | null; activity: ActivityView; past: boolean }
  | { kind: "item"; key: string; time: string; item: ScheduledItem }
  | { kind: "routine"; key: string; time: null; routine: RoutineView }
  | { kind: "document"; key: string; time: null; document: DocumentView };

export type AgendaDay = {
  date: string;
  entries: AgendaEntry[];
  /** Só em hoje: posição da linha "agora" (antes do primeiro item com horário ainda por vir) */
  nowIndex: number | null;
};

export type AgendaInput = {
  from: string;
  days: number;
  today: string;
  /** "HH:mm" atual no fuso do usuário */
  now: string;
  activities: ActivityView[];
  /** Lembretes/prazos já convertidos para dia e hora no fuso do usuário */
  items: { item: ScheduledItem; date: string; time: string }[];
  routines: RoutineView[];
  documents: DocumentView[];
};

// Sem horário (o dia todo) primeiro; depois por horário; no empate, atividade antes de lembrete
function compareEntries(a: AgendaEntry, b: AgendaEntry) {
  if (a.time === null || b.time === null) return a.time === b.time ? 0 : a.time === null ? -1 : 1;
  return a.time.localeCompare(b.time) || (a.kind === "activity" ? -1 : b.kind === "activity" ? 1 : 0);
}

/** Distribui atividades, lembretes, revisões e vencimentos pelos dias do período. */
export function buildAgendaDays(input: AgendaInput): AgendaDay[] {
  const byDate = new Map<string, AgendaEntry[]>();
  for (let i = 0; i < input.days; i++) byDate.set(addDays(input.from, i), []);
  const push = (date: string, entry: AgendaEntry) => byDate.get(date)?.push(entry);

  for (const a of input.activities) {
    // Atividade de hoje sem horário já foi registrada; com horário, passou se já começou
    const past = a.date < input.today || (a.date === input.today && (!a.startTime || a.startTime <= input.now));
    push(a.date, { kind: "activity", key: `act-${a.id}`, time: a.startTime, activity: a, past });
  }
  for (const { item, date, time } of input.items) push(date, { kind: "item", key: `item-${item.id}`, time, item });
  for (const r of input.routines) push(r.nextDueAt, { kind: "routine", key: `rt-${r.id}`, time: null, routine: r });
  for (const d of input.documents) push(d.expiresAt, { kind: "document", key: `doc-${d.id}`, time: null, document: d });

  return [...byDate].map(([date, entries]) => {
    entries.sort(compareEntries);
    let nowIndex: number | null = null;
    if (date === input.today && entries.some((e) => e.time !== null)) {
      const next = entries.findIndex((e) => e.time !== null && e.time > input.now);
      nowIndex = next === -1 ? entries.length : next;
    }
    return { date, entries, nowIndex };
  });
}

/** `?dias=` válido (padrão 7) e `?de=` nunca antes de hoje. */
export function parseAgendaParams(params: { de?: string | string[]; dias?: string | string[] }, today: string) {
  const days = AGENDA_SPANS.find((n) => String(n) === params.dias) ?? 7;
  const de = typeof params.de === "string" && /^\d{4}-\d{2}-\d{2}$/.test(params.de) ? params.de : today;
  return { from: de < today ? today : de, days: days as AgendaSpan };
}
