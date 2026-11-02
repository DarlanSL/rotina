/** Lógica pura dos avisos de compartilhamento (mudanças feitas por outra pessoa). Coberta por testes. */

/**
 * Um aviso só é entregue depois de 2 min sem novas mudanças da mesma pessoa no mesmo item:
 * marcar 10 itens no mercado vira um aviso só, e não 10.
 */
export const NOTICE_SETTLE_MS = 2 * 60_000;
/** Avisos mais antigos que isso não são mais entregues (aparelho ficou dias sem abrir o app). */
export const NOTICE_WINDOW_MS = 2 * 24 * 60 * 60_000;
const MAX_STORED_LINES = 60;
const MAX_SHOWN_GROUPS = 5;

/** Ações que se anulam (marcou e desmarcou o mesmo item). */
const OPPOSITES: Record<string, string> = { Marcou: "Desmarcou", Desmarcou: "Marcou" };

function split(line: string): [string, string] | null {
  const i = line.indexOf(": ");
  return i > 0 ? [line.slice(0, i), line.slice(i + 2)] : null;
}

/** Junta as mudanças novas às já guardadas: sem repetir, e marcar+desmarcar o mesmo item se anula. */
export function mergeNoticeLines(prev: string[], add: string[]): string[] {
  const out = [...prev];
  for (const line of add) {
    const parts = split(line);
    const opposite = parts && OPPOSITES[parts[0]] ? `${OPPOSITES[parts[0]]}: ${parts[1]}` : null;
    const o = opposite ? out.indexOf(opposite) : -1;
    if (o >= 0) {
      out.splice(o, 1);
      continue;
    }
    const same = out.indexOf(line);
    if (same >= 0) out.splice(same, 1);
    out.push(line);
  }
  return out.slice(-MAX_STORED_LINES);
}

/**
 * Texto do aviso: agrupa "Adicionou: arroz" + "Adicionou: feijão" em "Adicionou: arroz, feijão".
 * Mostra no máximo 5 grupos.
 */
export function noticeBody(lines: string[]): string {
  const groups: { prefix: string | null; items: string[] }[] = [];
  for (const line of lines) {
    const parts = split(line);
    const g = parts && groups.find((x) => x.prefix === parts[0]);
    if (parts && g) g.items.push(parts[1]);
    else groups.push(parts ? { prefix: parts[0], items: [parts[1]] } : { prefix: null, items: [line] });
  }
  const text = groups.map((g) => (g.prefix ? `${g.prefix}: ${g.items.join(", ")}` : g.items[0]));
  const extra = text.length - MAX_SHOWN_GROUPS;
  return (extra > 0 ? [...text.slice(0, MAX_SHOWN_GROUPS), `e mais ${extra}`] : text).join("\n");
}

type ActivityFields = { title: string; date: string; startTime: string | null; endTime: string | null; notes: string | null };

const br = (iso: string) => iso.split("-").reverse().slice(0, 2).join("/");
const time = (a: ActivityFields) => (a.startTime ? (a.endTime ? `${a.startTime}–${a.endTime}` : a.startTime) : "sem horário");

/** O que mudou num compromisso, em linhas curtas. */
export function activityChangeLines(before: ActivityFields, after: ActivityFields): string[] {
  const lines: string[] = [];
  if (before.title !== after.title) lines.push(`Título: ${before.title} → ${after.title}`);
  if (before.date !== after.date) lines.push(`Data: ${br(before.date)} → ${br(after.date)}`);
  if (time(before) !== time(after)) lines.push(`Horário: ${time(before)} → ${time(after)}`);
  if ((before.notes ?? "") !== (after.notes ?? "")) lines.push("Observações alteradas");
  return lines;
}

/** "Reunião · 04/11 às 10:00" */
export function activitySummary(a: Pick<ActivityFields, "title" | "date" | "startTime">): string {
  return `${a.title} · ${br(a.date)}${a.startTime ? ` às ${a.startTime}` : ""}`;
}
