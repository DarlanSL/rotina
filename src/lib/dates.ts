/**
 * Datas "só dia" (vencimentos, registros do diário) são guardadas como meia-noite UTC
 * em colunas @db.Date e manipuladas como strings ISO "yyyy-MM-dd". Isso elimina
 * erros de fuso ("vence ontem" às 22h). "Hoje" é sempre calculado no fuso do usuário.
 */

const DAY_MS = 86_400_000;

export const DEFAULT_TZ = "America/Sao_Paulo";

/** "yyyy-MM-dd" de um instante, no fuso informado. */
export function isoDateInTz(instant: Date, timeZone = DEFAULT_TZ): string {
  // en-CA formata como yyyy-MM-dd
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

export function todayISO(timeZone = DEFAULT_TZ): string {
  return isoDateInTz(new Date(), timeZone);
}

/** "yyyy-MM-dd" → Date (meia-noite UTC) para colunas @db.Date. */
export function toDbDate(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

/** Date vinda de coluna @db.Date → "yyyy-MM-dd". */
export function fromDbDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  return fromDbDate(new Date(toDbDate(iso).getTime() + days * DAY_MS));
}

/** Diferença em dias de calendário (to - from). */
export function diffDays(toIso: string, fromIso: string): number {
  return Math.round((toDbDate(toIso).getTime() - toDbDate(fromIso).getTime()) / DAY_MS);
}

/** Offset (ms) do fuso em relação a UTC num dado instante. */
function tzOffsetMs(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/** Instante UTC correspondente à meia-noite de `iso` no fuso informado. */
export function startOfDayInTz(iso: string, timeZone = DEFAULT_TZ): Date {
  const utcMidnight = toDbDate(iso);
  return new Date(utcMidnight.getTime() - tzOffsetMs(utcMidnight, timeZone));
}

/** "28/10/2026" */
export function formatDateBR(value: string | Date): string {
  const iso = typeof value === "string" ? value : fromDbDate(value);
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/** "terça-feira, 28 de outubro" */
export function formatLongDateBR(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(toDbDate(iso));
}

/** "28/10 09:30" no fuso do usuário. */
export function formatDateTimeBR(instant: Date, timeZone = DEFAULT_TZ): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(instant);
}

/** Texto relativo: "hoje", "amanhã", "em 5 dias", "há 2 dias". */
export function relativeDaysLabel(days: number): string {
  if (days === 0) return "hoje";
  if (days === 1) return "amanhã";
  if (days === -1) return "ontem";
  return days > 0 ? `em ${days} dias` : `há ${-days} dias`;
}

/** "HH:mm" → minutos desde 00:00. */
function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function durationMinutes(start: string, end: string): number {
  return toMinutes(end) - toMinutes(start);
}

/** Duração legível entre dois "HH:mm": "45 min", "1h", "1h30". */
export function formatDuration(start: string, end: string): string {
  return formatMinutes(durationMinutes(start, end));
}

/** 90 → "1h30" */
export function formatMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}`;
}

/** "09:00–10:30 · 1h30", "a partir de 09:00" ou null se não houver horário. */
export function formatTimeRange(start: string | null, end: string | null): string | null {
  if (start && end) return `${start}–${end} · ${formatDuration(start, end)}`;
  if (start) return `a partir de ${start}`;
  return null;
}

export function isTimeBefore(a: string, b: string): boolean {
  return toMinutes(a) < toMinutes(b);
}

/** "09:30" no fuso do usuário. */
export function formatTimeOfDay(instant: Date, timeZone = DEFAULT_TZ): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone, hour: "2-digit", minute: "2-digit" }).format(instant);
}

/** Segunda-feira da semana de `iso`. */
export function startOfWeekISO(iso: string): string {
  const weekday = toDbDate(iso).getUTCDay(); // 0 = domingo
  return addDays(iso, weekday === 0 ? -6 : 1 - weekday);
}

export function startOfMonthISO(iso: string): string {
  return `${iso.slice(0, 7)}-01`;
}

/** Último dia do mês anterior a `iso`. */
export function endOfPreviousMonthISO(iso: string): string {
  return addDays(startOfMonthISO(iso), -1);
}

/** Instante UTC de "HH:mm" no dia `iso`, no fuso do usuário. */
export function timeToInstant(iso: string, time: string, timeZone = DEFAULT_TZ): Date {
  return new Date(startOfDayInTz(iso, timeZone).getTime() + toMinutes(time) * 60_000);
}

/** Minutos desde 00:00 agora, no fuso do usuário. */
export function minutesNowInTz(timeZone = DEFAULT_TZ, now = new Date()): number {
  const [h, m] = new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    .format(now)
    .split(":")
    .map(Number);
  return h * 60 + m;
}

/** "qui" */
export function formatWeekdayShortBR(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", weekday: "short" }).format(toDbDate(iso)).replace(".", "");
}
