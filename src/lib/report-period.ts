import { addDays, diffDays, endOfPreviousMonthISO, startOfMonthISO, startOfWeekISO } from "@/lib/dates";

export const PRESETS = [
  { key: "hoje", label: "Hoje" },
  { key: "ontem", label: "Ontem" },
  { key: "semana", label: "Esta semana" },
  { key: "7d", label: "Últimos 7 dias" },
  { key: "mes", label: "Este mês" },
  { key: "mes-passado", label: "Mês passado" },
  { key: "30d", label: "Últimos 30 dias" },
] as const;

export type PresetKey = (typeof PRESETS)[number]["key"];

export function presetRange(key: PresetKey, today: string): { from: string; to: string } {
  switch (key) {
    case "hoje":
      return { from: today, to: today };
    case "ontem":
      return { from: addDays(today, -1), to: addDays(today, -1) };
    case "semana":
      return { from: startOfWeekISO(today), to: today };
    case "7d":
      return { from: addDays(today, -6), to: today };
    case "mes":
      return { from: startOfMonthISO(today), to: today };
    case "mes-passado": {
      const end = endOfPreviousMonthISO(today);
      return { from: startOfMonthISO(end), to: end };
    }
    case "30d":
      return { from: addDays(today, -29), to: today };
  }
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const MAX_DAYS = 366;

/**
 * Lê ?p=preset ou ?de=&ate= da URL. Período inválido cai em "hoje";
 * datas invertidas são trocadas; períodos acima de 1 ano são cortados.
 */
export function parsePeriod(
  params: Record<string, string | string[] | undefined>,
  today: string,
): { from: string; to: string; preset: PresetKey | null } {
  const p = typeof params.p === "string" ? params.p : undefined;
  const preset = PRESETS.find((x) => x.key === p)?.key;
  if (preset) return { ...presetRange(preset, today), preset };

  let from = typeof params.de === "string" && ISO.test(params.de) ? params.de : undefined;
  let to = typeof params.ate === "string" && ISO.test(params.ate) ? params.ate : undefined;
  if (!from && !to) return { from: today, to: today, preset: "hoje" };
  from ??= to!;
  to ??= from;
  if (diffDays(to, from) < 0) [from, to] = [to, from];
  if (diffDays(to, from) >= MAX_DAYS) from = addDays(to, -(MAX_DAYS - 1));

  // Se as datas batem com um preset, destaca o botão correspondente
  const match = PRESETS.find((x) => {
    const r = presetRange(x.key, today);
    return r.from === from && r.to === to;
  });
  return { from, to, preset: match?.key ?? null };
}

export function periodQuery(from: string, to: string) {
  return `de=${from}&ate=${to}`;
}
