"use server";

import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { db } from "@/lib/db";
import { addDays, formatDateBR, fromDbDate, toDbDate, todayISO } from "@/lib/dates";
import { dueAfterCompletion, describeRecurrence, firstOccurrenceFrom, type Recurrence } from "@/lib/recurrence";
import { formatBRL } from "@/lib/money";
import { requireUser } from "@/lib/session";
import { billPaymentSchema, billSchema, firstError } from "@/lib/validations";
import { failure, success, type ActionResult } from "@/lib/action-result";

type BillInput = z.infer<typeof billSchema>;

function ruleOf(kind: Recurrence["kind"], b: { intervalDays: number; monthDay: number | null; weekOrdinal: number | null; weekday: number | null }): Recurrence {
  return { kind, ...b };
}

/** Campos gravados: só os da regra escolhida; o 1º vencimento cai na regra (ex.: próximo dia 10). */
function billData(data: BillInput) {
  const k = data.repeatKind ?? null;
  const fields = {
    intervalDays: k === "INTERVAL" || k === "INTERVAL_FIXED" ? data.intervalDays! : k === "WEEKLY" ? 7 : 30,
    monthDay: k === "MONTHLY_DAY" ? data.monthDay! : null,
    weekOrdinal: k === "MONTHLY_WEEKDAY" ? data.weekOrdinal! : null,
    weekday: k === "MONTHLY_WEEKDAY" || k === "WEEKLY" ? data.weekday! : null,
  };
  return {
    kind: data.kind,
    title: data.title,
    notes: data.notes ?? null,
    amountCents: data.amount ?? null,
    repeatKind: k,
    ...fields,
    repeatTimes: k ? (data.repeatTimes ?? null) : null,
    alertDaysBefore: data.alertDaysBefore,
    nextDueAt: toDbDate(k ? firstOccurrenceFrom(ruleOf(k, fields), data.dueDate, addDays) : data.dueDate),
  };
}

const verb = (kind: "PAYABLE" | "RECEIVABLE") => (kind === "PAYABLE" ? "paga" : "recebida");

function done(message: string) {
  revalidatePath("/", "layout");
  return success(message);
}

export async function createBill(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = billSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failure(firstError(parsed.error));
  const data = billData(parsed.data);
  await db.bill.create({ data: { ...data, userId: user.id } });
  return done(`Conta criada · vence ${formatDateBR(fromDbDate(data.nextDueAt))}`);
}

export async function updateBill(id: string, formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = billSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failure(firstError(parsed.error));
  const bill = await db.bill.findFirst({ where: { id, userId: user.id }, select: { _count: { select: { payments: true } } } });
  if (!bill) return failure("Conta não encontrada");
  const data = billData(parsed.data);
  const paid = bill._count.payments;
  if (data.repeatTimes !== null && data.repeatTimes < paid) {
    return failure(`Já foram ${paid} pagamentos; escolha ${paid} ou mais vezes`);
  }
  await db.bill.update({
    where: { id },
    data: { ...data, active: data.repeatTimes === null ? Boolean(data.repeatKind) || paid === 0 : paid < data.repeatTimes },
  });
  return done("Conta atualizada");
}

/** Registra o pagamento (ou recebimento) do vencimento atual e passa para o próximo. */
export async function payBill(id: string, formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = billPaymentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failure(firstError(parsed.error));
  const { paidAt } = parsed.data;
  const today = todayISO(user.timezone);
  if (paidAt > today) return failure("A data do pagamento não pode estar no futuro");

  const bill = await db.bill.findFirst({
    where: { id, userId: user.id, active: true },
    include: { _count: { select: { payments: true } } },
  });
  if (!bill) return failure("Conta não encontrada");

  const due = fromDbDate(bill.nextDueAt);
  const amount = parsed.data.amount === undefined ? bill.amountCents : parsed.data.amount;
  const count = bill._count.payments + 1;
  const rule = bill.repeatKind ? ruleOf(bill.repeatKind, bill) : null;
  const finished = !rule || (bill.repeatTimes !== null && count >= bill.repeatTimes);
  const next = rule && !finished ? dueAfterCompletion(rule, due, paidAt, addDays) : due;

  await db.$transaction([
    db.billPayment.create({
      data: { billId: id, dueDate: bill.nextDueAt, paidAt: toDbDate(paidAt), amountCents: amount },
    }),
    db.bill.update({ where: { id }, data: { nextDueAt: toDbDate(next), active: !finished } }),
  ]);

  const what = `${bill.title}${amount ? ` (${formatBRL(amount)})` : ""} ${verb(bill.kind)}`;
  if (finished) {
    return done(rule ? `${what}! Era a última (${count} de ${bill.repeatTimes})` : `${what}!`);
  }
  const times = bill.repeatTimes ? ` · ${count} de ${bill.repeatTimes}` : "";
  return done(`${what}! Próximo vencimento ${formatDateBR(next)} (${describeRecurrence(rule!)})${times}`);
}

/** Desfaz o último pagamento (clicou sem querer): volta o vencimento e reabre a conta. */
export async function undoLastPayment(billId: string): Promise<ActionResult> {
  const user = await requireUser();
  const last = await db.billPayment.findFirst({
    where: { billId, bill: { userId: user.id } },
    orderBy: { createdAt: "desc" },
  });
  if (!last) return failure("Nenhum pagamento para desfazer");
  await db.$transaction([
    db.billPayment.delete({ where: { id: last.id } }),
    db.bill.update({ where: { id: billId }, data: { nextDueAt: last.dueDate, active: true } }),
  ]);
  return done(`Pagamento desfeito · vence de novo em ${formatDateBR(fromDbDate(last.dueDate))}`);
}

export async function deleteBill(id: string): Promise<ActionResult> {
  const user = await requireUser();
  const { count } = await db.bill.deleteMany({ where: { id, userId: user.id } });
  if (!count) return failure("Conta não encontrada");
  return done("Conta excluída");
}
