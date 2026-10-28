import { formatDateBR, formatLongDateBR, formatMinutes } from "@/lib/dates";

/** Dados do relatório — serializáveis, usados na tela, no texto (WhatsApp/e-mail) e no CSV. */
export type ReportActivity = {
  id: string;
  date: string;
  title: string;
  notes: string | null;
  startTime: string | null;
  endTime: string | null;
  minutes: number;
  tags: string[];
};

export type ReportData = {
  from: string;
  to: string;
  userName: string | null;
  days: { date: string; activities: ReportActivity[]; minutes: number }[];
  totals: { activities: number; minutes: number; days: number };
  byTag: { tag: string; count: number; minutes: number }[];
  routinesDone: { id: string; date: string; title: string }[];
  itemsDone: { id: string; date: string; title: string; typeLabel: string }[];
  postponements: { id: string; title: string; from: string; to: string; reason: string }[];
};

export function periodLabel(from: string, to: string): string {
  return from === to ? formatDateBR(from) : `${formatDateBR(from)} a ${formatDateBR(to)}`;
}

export function reportTitle(data: Pick<ReportData, "from" | "to">): string {
  return data.from === data.to ? "Relatório do dia" : "Relatório de atividades";
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const NOTE_LIMIT = 160;

function timeRange(a: ReportActivity) {
  if (a.startTime && a.endTime) return `${a.startTime}–${a.endTime} `;
  if (a.startTime) return `${a.startTime} `;
  return "";
}

/**
 * Texto do relatório para WhatsApp e e-mail.
 * Usa a marcação do WhatsApp (*negrito*, _itálico_), que fica legível também como texto puro.
 */
export function buildReportText(data: ReportData): string {
  const lines: string[] = [];
  const { totals } = data;

  lines.push(`*${reportTitle(data)}*`);
  lines.push(
    data.from === data.to
      ? capitalize(formatLongDateBR(data.from)) + ` (${formatDateBR(data.from)})`
      : periodLabel(data.from, data.to),
  );
  if (data.userName) lines.push(data.userName);
  lines.push("");

  lines.push("*Resumo*");
  lines.push(
    `• ${totals.activities} ${totals.activities === 1 ? "atividade" : "atividades"}` +
      (data.from !== data.to ? ` em ${totals.days} ${totals.days === 1 ? "dia" : "dias"}` : ""),
  );
  if (totals.minutes > 0) lines.push(`• ${formatMinutes(totals.minutes)} registradas`);
  if (data.routinesDone.length) lines.push(`• ${data.routinesDone.length} revisão(ões) concluída(s)`);
  if (data.itemsDone.length) lines.push(`• ${data.itemsDone.length} item(ns) realizado(s)`);
  if (data.byTag.length) {
    const tags = data.byTag
      .map((t) => `#${t.tag} (${t.count}${t.minutes ? ` · ${formatMinutes(t.minutes)}` : ""})`)
      .join(", ");
    lines.push(`• Tags: ${tags}`);
  }

  for (const day of data.days) {
    lines.push("");
    const header = capitalize(formatLongDateBR(day.date));
    lines.push(`*${header}*${day.minutes ? ` — ${formatMinutes(day.minutes)}` : ""}`);
    for (const a of day.activities) {
      const tags = a.tags.length ? ` ${a.tags.map((t) => `#${t}`).join(" ")}` : "";
      lines.push(`• ${timeRange(a)}${a.title}${tags}`);
      if (a.notes) {
        const note = a.notes.replace(/\s+/g, " ").trim();
        lines.push(`  _${note.length > NOTE_LIMIT ? `${note.slice(0, NOTE_LIMIT - 1)}…` : note}_`);
      }
    }
  }

  if (data.routinesDone.length) {
    lines.push("", "*Revisões concluídas*");
    for (const r of data.routinesDone) lines.push(`• ${formatDateBR(r.date).slice(0, 5)} ${r.title}`);
  }
  if (data.itemsDone.length) {
    lines.push("", "*Itens realizados*");
    for (const i of data.itemsDone) lines.push(`• ${formatDateBR(i.date).slice(0, 5)} ${i.typeLabel}: ${i.title}`);
  }
  if (data.postponements.length) {
    lines.push("", "*Prorrogações*");
    for (const p of data.postponements) {
      lines.push(`• ${p.title}: ${formatDateBR(p.from).slice(0, 5)} → ${formatDateBR(p.to).slice(0, 5)} — ${p.reason}`);
    }
  }

  if (totals.activities === 0 && !data.routinesDone.length && !data.itemsDone.length) {
    lines.push("", "_Nenhum registro no período._");
  }
  return lines.join("\n");
}

/** CSV para Excel pt-BR: separador ";", BOM UTF-8 e aspas quando necessário. */
export function buildReportCsv(data: ReportData): string {
  const esc = (v: string | number | null) => {
    const s = v === null ? "" : String(v);
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = ["Data", "Início", "Fim", "Duração (min)", "Atividade", "Notas", "Tags"];
  const rows = data.days.flatMap((d) =>
    d.activities.map((a) => [
      formatDateBR(a.date),
      a.startTime,
      a.endTime,
      a.minutes || null,
      a.title,
      a.notes,
      a.tags.join(", "),
    ]),
  );
  return "﻿" + [header, ...rows].map((r) => r.map(esc).join(";")).join("\r\n") + "\r\n";
}
