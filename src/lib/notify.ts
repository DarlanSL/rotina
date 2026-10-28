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
};

export type NotifyPhase = "soon" | "now";

export type DueNotification = { id: string; event: NotifyEvent; phase: NotifyPhase };

/** Depois disso, o aviso "na hora" não é mais mostrado (o item aparece como vencido no resumo). */
export const GRACE_MINUTES = 15;

export const LEAD_OPTIONS = [5, 10, 15, 30, 60] as const;

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
    const at = Date.parse(event.at);
    const nowId = `${event.key}@${event.at}:now`;
    const soonId = `${event.key}@${event.at}:soon`;

    if (nowMs >= at && nowMs < at + GRACE_MINUTES * 60_000) {
      if (!fired.has(nowId)) due.push({ id: nowId, event, phase: "now" });
    } else if (leadMinutes > 0 && nowMs >= at - leadMinutes * 60_000 && nowMs < at) {
      if (!fired.has(soonId)) due.push({ id: soonId, event, phase: "soon" });
    }
  }
  return due;
}

/** Texto do aviso: título "Em 10 min: Reunião" / "Agora: Reunião". */
export function notificationText(n: DueNotification, nowMs: number): { title: string; body: string } {
  const minutes = Math.max(1, Math.round((Date.parse(n.event.at) - nowMs) / 60_000));
  const prefix = n.phase === "now" ? "Agora" : `Em ${minutes} min`;
  const body = [KIND_LABEL[n.event.kind], n.event.detail].filter(Boolean).join(" · ");
  return { title: `${prefix}: ${n.event.title}`, body };
}
