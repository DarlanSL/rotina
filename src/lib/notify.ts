/** Lógica pura de notificações — usada no navegador e coberta por testes. */

export type NotifyKind = "activity" | "reminder" | "improvement";

export type NotifyEvent = {
  /** Identificador estável (ex: "activity:abc") */
  key: string;
  kind: NotifyKind;
  title: string;
  /** Instante do evento, ISO UTC */
  at: string;
  url: string;
  detail?: string;
  /** Antecedência escolhida na tarefa (min); null/ausente = padrão do aparelho, NO_NOTIFY = não avisar */
  lead?: number | null;
};

export type NotifyPhase = "soon" | "now";

export type DueNotification = { id: string; event: NotifyEvent; phase: NotifyPhase };

/** Depois disso, o aviso "na hora" não é mais mostrado (o item aparece como vencido no resumo). */
export const GRACE_MINUTES = 15;

export const LEAD_OPTIONS = [5, 10, 15, 30, 60] as const;

/** Valor de "não avisar" na antecedência de uma tarefa. */
export const NO_NOTIFY = -1;
/** Antecedências que dá para escolher em cada tarefa (minutos; 0 = só na hora). */
export const NOTIFY_BEFORE_OPTIONS = [NO_NOTIFY, 0, 5, 10, 15, 30, 60, 120, 1440, 2880] as const;

/** 90 → "1 h 30 min", 1440 → "1 dia". */
export function formatLead(minutes: number): string {
  if (minutes >= 1440 && minutes % 1440 === 0) return minutes === 1440 ? "1 dia" : `${minutes / 1440} dias`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** Rótulo da escolha de antecedência numa tarefa. */
export function notifyBeforeLabel(minutes: number): string {
  if (minutes === NO_NOTIFY) return "Não avisar";
  if (minutes === 0) return "Só na hora";
  return `${formatLead(minutes)} antes`;
}

const KIND_LABEL: Record<NotifyKind, string> = {
  activity: "Atividade",
  reminder: "Lembrete",
  improvement: "Prazo de melhoria",
};

/**
 * Quais avisos devem disparar agora.
 * - "soon": dentro da antecedência configurada, antes do horário
 * - "now": a partir do horário, por até GRACE_MINUTES
 * Cada (evento, fase) dispara uma única vez — `fired` guarda os ids já mostrados.
 */
export function dueNotifications(
  events: NotifyEvent[],
  nowMs: number,
  leadMinutes: number,
  fired: ReadonlySet<string>,
): DueNotification[] {
  const due: DueNotification[] = [];
  for (const event of events) {
    const lead = event.lead ?? leadMinutes;
    if (lead === NO_NOTIFY) continue;
    const at = Date.parse(event.at);
    const nowId = `${event.key}@${event.at}:now`;
    const soonId = `${event.key}@${event.at}:soon`;

    if (nowMs >= at && nowMs < at + GRACE_MINUTES * 60_000) {
      if (!fired.has(nowId)) due.push({ id: nowId, event, phase: "now" });
    } else if (lead > 0 && nowMs >= at - lead * 60_000 && nowMs < at) {
      if (!fired.has(soonId)) due.push({ id: soonId, event, phase: "soon" });
    }
  }
  return due;
}

/** Texto do aviso: título "Em 10 min: Reunião" / "Em 1 dia: Reunião" / "Agora: Reunião". */
export function notificationText(n: DueNotification, nowMs: number): { title: string; body: string } {
  const minutes = Math.max(1, Math.round((Date.parse(n.event.at) - nowMs) / 60_000));
  // arredonda para a unidade maior quando o aviso é com horas/dias de antecedência
  const shown = minutes >= 1440 ? Math.round(minutes / 1440) * 1440 : minutes >= 120 ? Math.round(minutes / 60) * 60 : minutes;
  const prefix = n.phase === "now" ? "Agora" : `Em ${formatLead(shown)}`;
  const body = [KIND_LABEL[n.event.kind], n.event.detail].filter(Boolean).join(" · ");
  return { title: `${prefix}: ${n.event.title}`, body };
}
