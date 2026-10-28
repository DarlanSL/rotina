import { addDays, diffDays } from "@/lib/dates";

export type DeadlineStatus = "ok" | "warning" | "expired";

/**
 * Status visual de um prazo:
 * - expired (vermelho): prazo já passou
 * - warning (amarelo): faltam `warnDays` dias ou menos (inclui "vence hoje")
 * - ok (verde): fora da janela de alerta
 */
export function getDeadlineStatus(dueIso: string, warnDays: number, todayIso: string): DeadlineStatus {
  const days = diffDays(dueIso, todayIso);
  if (days < 0) return "expired";
  if (days <= warnDays) return "warning";
  return "ok";
}

/** Próxima revisão = data da conclusão + intervalo do ciclo. */
export function nextDueDate(completedIso: string, intervalDays: number): string {
  return addDays(completedIso, intervalDays);
}

export const STATUS_META: Record<DeadlineStatus, { label: string; className: string; dot: string }> = {
  ok: {
    label: "Válido",
    className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  warning: {
    label: "Próximo do prazo",
    className: "bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-300",
    dot: "bg-amber-500",
  },
  expired: {
    label: "Vencido",
    className: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300",
    dot: "bg-red-500",
  },
};

/** Borda lateral colorida para cards. */
export const STATUS_ACCENT: Record<DeadlineStatus, string> = {
  ok: "border-l-emerald-500",
  warning: "border-l-amber-500",
  expired: "border-l-red-500",
};

/**
 * Prorrogação: a nova data deve ser posterior à data prevista e não pode estar no passado.
 * Retorna a mensagem de erro ou null se for válida.
 */
export function postponeError(newIso: string, currentDueIso: string, todayIso: string): string | null {
  if (diffDays(newIso, currentDueIso) <= 0) return "A nova data deve ser depois da data prevista";
  if (diffDays(newIso, todayIso) < 0) return "A nova data não pode estar no passado";
  return null;
}
