/** Regras de repetição das rotinas — lógica pura (datas ISO "yyyy-MM-dd"), coberta por testes. */

export const REPEAT_KINDS = ["INTERVAL", "MONTHLY_DAY", "MONTHLY_WEEKDAY"] as const;
export type RepeatKind = (typeof REPEAT_KINDS)[number];

/** -1 = última semana do mês */
export const WEEK_ORDINALS = [1, 2, 3, 4, -1] as const;
export const LAST_WEEK = -1;

export type Recurrence = {
  kind: RepeatKind;
  intervalDays: number;
  monthDay: number | null;
  weekOrdinal: number | null;
  /** 0 = domingo … 6 = sábado */
  weekday: number | null;
};

export const WEEKDAY_NAMES = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
const ORDINAL_LABEL: Record<number, string> = { 1: "1ª", 2: "2ª", 3: "3ª", 4: "4ª", [LAST_WEEK]: "última" };

export function ordinalLabel(n: number) {
  return ORDINAL_LABEL[n] ?? `${n}ª`;
}

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();

/** Data da repetição dentro de um mês (`m` de 0 a 11). */
export function occurrenceInMonth(r: Recurrence, y: number, m: number): string {
  if (r.kind === "MONTHLY_DAY") {
    // dia 31 em mês de 30 dias (ou 29/30/31 em fevereiro) cai no último dia do mês
    return iso(y, m, Math.min(r.monthDay ?? 1, daysInMonth(y, m)));
  }
  const weekday = r.weekday ?? 0;
  if (r.weekOrdinal === LAST_WEEK) {
    const last = daysInMonth(y, m);
    const lastWeekday = new Date(Date.UTC(y, m, last)).getUTCDay();
    return iso(y, m, last - ((lastWeekday - weekday + 7) % 7));
  }
  const firstWeekday = new Date(Date.UTC(y, m, 1)).getUTCDay();
  const first = 1 + ((weekday - firstWeekday + 7) % 7);
  return iso(y, m, first + 7 * ((r.weekOrdinal ?? 1) - 1));
}

/**
 * Próxima data de uma regra mensal a partir de `fromIso`.
 * `inclusive`: a própria `fromIso` vale se cair na regra.
 */
export function nextMonthlyOccurrence(r: Recurrence, fromIso: string, inclusive: boolean): string {
  let [y, m] = fromIso.split("-").map(Number);
  m -= 1;
  for (let i = 0; i < 3; i++) {
    const candidate = occurrenceInMonth(r, y, m);
    if (candidate > fromIso || (inclusive && candidate === fromIso)) return candidate;
    m += 1;
    if (m === 12) {
      m = 0;
      y += 1;
    }
  }
  throw new Error("Regra de repetição inválida");
}

/** Primeira data ao criar/editar: depois da última vez feita ou, sem ela, a partir de hoje. */
export function firstDueDate(r: Recurrence, lastCompletedIso: string | null, todayIso: string, addDays: (iso: string, n: number) => string) {
  if (r.kind === "INTERVAL") return lastCompletedIso ? addDays(lastCompletedIso, r.intervalDays) : todayIso;
  return lastCompletedIso ? nextMonthlyOccurrence(r, lastCompletedIso, false) : nextMonthlyOccurrence(r, todayIso, true);
}

/**
 * Próxima data depois de concluir hoje.
 * - Intervalo: hoje + X dias.
 * - Mensal: a próxima data da regra depois da que estava prevista (concluir antes não "pula" um mês;
 *   concluir com atraso não deixa a próxima no passado).
 */
export function dueAfterCompletion(
  r: Recurrence,
  currentDueIso: string,
  todayIso: string,
  addDays: (iso: string, n: number) => string,
): string {
  if (r.kind === "INTERVAL") return addDays(todayIso, r.intervalDays);
  return nextMonthlyOccurrence(r, currentDueIso > todayIso ? currentDueIso : todayIso, false);
}

/** "a cada 30 dias", "todo dia 10", "toda 1ª quarta-feira do mês", "todo último domingo do mês". */
export function describeRecurrence(r: Recurrence): string {
  if (r.kind === "INTERVAL") return r.intervalDays === 1 ? "todo dia" : `a cada ${r.intervalDays} dias`;
  if (r.kind === "MONTHLY_DAY") return `todo dia ${r.monthDay} do mês`;
  const day = WEEKDAY_NAMES[r.weekday ?? 0];
  // sábado e domingo são masculinos: "todo 1º sábado"
  const male = r.weekday === 0 || r.weekday === 6;
  const ord = r.weekOrdinal === LAST_WEEK ? (male ? "último" : "última") : `${r.weekOrdinal}${male ? "º" : "ª"}`;
  return `${male ? "todo" : "toda"} ${ord} ${day} do mês`;
}

// ---------- Compromissos que se repetem (séries) ----------

/** Opções de "Repetir" no compromisso; as mensais usam o dia da data escolhida. */
export const ACTIVITY_REPEATS = ["DAILY", "WEEKLY", "EVERY_DAYS", "MONTHLY_DAY", "MONTHLY_WEEKDAY"] as const;
export type ActivityRepeat = (typeof ACTIVITY_REPEATS)[number];

/** No máximo esse número de compromissos numa série com quantidade definida. */
export const MAX_SERIES_TIMES = 366;

/** Semana do mês da data (1–4); a 5ª vira "última". */
function weekOrdinalOf(dateIso: string) {
  const n = Math.ceil(Number(dateIso.slice(8, 10)) / 7);
  return n >= 5 ? LAST_WEEK : n;
}
const weekdayOf = (dateIso: string) => new Date(`${dateIso}T12:00:00Z`).getUTCDay();

/** Regra a partir da escolha e da data do primeiro compromisso. */
export function ruleFromChoice(choice: ActivityRepeat, dateIso: string, everyDays = 2): Recurrence {
  const base = { intervalDays: 1, monthDay: null, weekOrdinal: null, weekday: null };
  switch (choice) {
    case "DAILY":
      return { ...base, kind: "INTERVAL", intervalDays: 1 };
    case "WEEKLY":
      return { ...base, kind: "INTERVAL", intervalDays: 7 };
    case "EVERY_DAYS":
      return { ...base, kind: "INTERVAL", intervalDays: everyDays };
    case "MONTHLY_DAY":
      return { ...base, kind: "MONTHLY_DAY", intervalDays: 30, monthDay: Number(dateIso.slice(8, 10)) };
    case "MONTHLY_WEEKDAY":
      return { ...base, kind: "MONTHLY_WEEKDAY", intervalDays: 30, weekOrdinal: weekOrdinalOf(dateIso), weekday: weekdayOf(dateIso) };
  }
}

/** Texto da opção no formulário, já com o dia da data escolhida. */
export function repeatChoiceLabel(choice: ActivityRepeat, dateIso: string): string {
  switch (choice) {
    case "DAILY":
      return "Todo dia";
    case "WEEKLY":
      return `Toda semana (${WEEKDAY_NAMES[weekdayOf(dateIso)]})`;
    case "EVERY_DAYS":
      return "A cada X dias";
    default: {
      const text = describeRecurrence(ruleFromChoice(choice, dateIso));
      return text.charAt(0).toUpperCase() + text.slice(1);
    }
  }
}

/** Texto da regra de uma série: "toda semana", "todo dia 10 do mês"… */
export function describeSeries(r: Recurrence): string {
  if (r.kind === "INTERVAL" && r.intervalDays === 7) return "toda semana";
  if (r.kind === "INTERVAL" && r.intervalDays > 1) return `a cada ${r.intervalDays} dias`;
  return describeRecurrence(r);
}

/**
 * Datas da série, começando em `startIso` (que já é a primeira).
 * Para em `count` datas ou na última até `untilIso` (inclusive) — o que vier primeiro.
 */
export function seriesDates(
  r: Recurrence,
  startIso: string,
  { count, untilIso }: { count?: number; untilIso?: string },
  addDays: (iso: string, n: number) => string,
): string[] {
  const dates: string[] = [];
  const limit = Math.min(count ?? MAX_SERIES_TIMES * 10, MAX_SERIES_TIMES * 10);
  let date = startIso;
  while (dates.length < limit && (!untilIso || date <= untilIso)) {
    dates.push(date);
    date = r.kind === "INTERVAL" ? addDays(date, r.intervalDays) : nextMonthlyOccurrence(r, date, false);
  }
  return dates;
}
