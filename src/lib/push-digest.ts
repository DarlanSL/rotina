/** Texto do resumo da manhã enviado por push — lógica pura, coberta por testes. */

import { formatBRL } from "@/lib/money";

export type DigestInput = {
  activities: { title: string; startTime: string | null }[];
  routinesToday: string[];
  documentsToday: string[];
  remindersToday: string[];
  billsToday?: { title: string; kind: "PAYABLE" | "RECEIVABLE"; amountCents: number | null }[];
  overdue: string[];
  documentsSoon: { name: string; daysLeft: number }[];
};

const list = (names: string[], max = 4) =>
  names.length > max ? `${names.slice(0, max).join(", ")} e mais ${names.length - max}` : names.join(", ");

/** null quando não há nada para avisar (não manda push vazio). */
export function digestText(d: DigestInput): { title: string; body: string } | null {
  const lines: string[] = [];
  const acts = [...d.activities].sort((a, b) => (a.startTime ?? "99").localeCompare(b.startTime ?? "99"));
  if (acts.length) lines.push(`Agenda: ${list(acts.map((a) => (a.startTime ? `${a.startTime} ${a.title}` : a.title)))}`);
  const todo = [...d.routinesToday, ...d.documentsToday.map((n) => `${n} (vence hoje)`), ...d.remindersToday];
  if (todo.length) lines.push(`Para hoje: ${list(todo)}`);
  const bills = d.billsToday ?? [];
  const money = (b: (typeof bills)[number]) => (b.amountCents !== null ? ` ${formatBRL(b.amountCents)}` : "");
  const pay = bills.filter((b) => b.kind === "PAYABLE").map((b) => `${b.title}${money(b)}`);
  const receive = bills.filter((b) => b.kind === "RECEIVABLE").map((b) => `${b.title}${money(b)}`);
  if (pay.length) lines.push(`Pagar hoje: ${list(pay)}`);
  if (receive.length) lines.push(`Receber hoje: ${list(receive)}`);
  if (d.overdue.length) lines.push(`Atrasados: ${list(d.overdue)}`);
  if (d.documentsSoon.length) {
    lines.push(`Vencem logo: ${list(d.documentsSoon.map((x) => `${x.name} em ${x.daysLeft} dia(s)`), 3)}`);
  }
  if (!lines.length) return null;

  const parts = [
    acts.length && `${acts.length} na agenda`,
    todo.length && `${todo.length} para fazer`,
    bills.length && `${bills.length} ${bills.length === 1 ? "conta" : "contas"}`,
    d.overdue.length && `${d.overdue.length} atrasado(s)`,
  ].filter(Boolean);
  return { title: parts.length ? `Bom dia! Hoje: ${parts.join(" · ")}` : "Bom dia! Prazos chegando", body: lines.join("\n") };
}
