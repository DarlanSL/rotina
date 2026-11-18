import "server-only";
import { db } from "@/lib/db";
import { addDays, diffDays, fromDbDate, startOfMonthISO, todayISO, toDbDate } from "@/lib/dates";
import { getDeadlineStatus } from "@/lib/deadlines";
import { describeRecurrence, type RepeatKind } from "@/lib/recurrence";
import type { CurrentUser } from "@/lib/session";
import type { BillKind } from "@/generated/prisma/enums";

type BillRow = {
  id: string;
  kind: BillKind;
  title: string;
  notes: string | null;
  amountCents: number | null;
  repeatKind: RepeatKind | null;
  intervalDays: number;
  monthDay: number | null;
  weekOrdinal: number | null;
  weekday: number | null;
  repeatTimes: number | null;
  alertDaysBefore: number;
  nextDueAt: Date;
  active: boolean;
};

export function toBillView(b: BillRow, today: string) {
  const nextDue = fromDbDate(b.nextDueAt);
  return {
    id: b.id,
    kind: b.kind,
    title: b.title,
    notes: b.notes,
    amountCents: b.amountCents,
    repeatKind: b.repeatKind,
    intervalDays: b.intervalDays,
    monthDay: b.monthDay,
    weekOrdinal: b.weekOrdinal,
    weekday: b.weekday,
    repeatTimes: b.repeatTimes,
    /** "todo dia 10 do mês"…; null = conta única */
    repeatLabel: b.repeatKind ? describeRecurrence({ ...b, kind: b.repeatKind }) : null,
    alertDaysBefore: b.alertDaysBefore,
    nextDueAt: nextDue,
    daysLeft: diffDays(nextDue, today),
    status: getDeadlineStatus(nextDue, b.alertDaysBefore, today),
    active: b.active,
  };
}

export type BillView = ReturnType<typeof toBillView>;

export type BillPaymentView = { id: string; dueDate: string; paidAt: string; amountCents: number | null };

const endOfMonthISO = (iso: string) => addDays(startOfMonthISO(addDays(startOfMonthISO(iso), 32)), -1);

/** Contas de um tipo (a pagar ou a receber) com histórico e totais do mês. */
export async function listBills(user: CurrentUser, kind: BillKind, showClosed: boolean) {
  const today = todayISO(user.timezone);
  const monthStart = startOfMonthISO(today);
  const monthEnd = endOfMonthISO(today);

  const [rows, paidThisMonth] = await Promise.all([
    db.bill.findMany({
      where: { userId: user.id, kind, active: showClosed ? undefined : true },
      orderBy: [{ active: "desc" }, { nextDueAt: "asc" }],
      include: {
        payments: { orderBy: { paidAt: "desc" }, take: 24 },
        _count: { select: { payments: true } },
      },
    }),
    db.billPayment.findMany({
      where: { bill: { userId: user.id, kind }, paidAt: { gte: toDbDate(monthStart), lte: toDbDate(monthEnd) } },
      select: { amountCents: true },
    }),
  ]);

  const bills = rows.map((b) => ({
    ...toBillView(b, today),
    paidCount: b._count.payments,
    payments: b.payments.map(
      (p): BillPaymentView => ({
        id: p.id,
        dueDate: fromDbDate(p.dueDate),
        paidAt: fromDbDate(p.paidAt),
        amountCents: p.amountCents,
      }),
    ),
  }));

  const open = bills.filter((b) => b.active);
  const sum = (list: { amountCents: number | null }[]) => list.reduce((t, b) => t + (b.amountCents ?? 0), 0);
  const overdue = open.filter((b) => b.daysLeft < 0);
  const dueThisMonth = open.filter((b) => b.daysLeft >= 0 && b.nextDueAt <= monthEnd);

  return {
    today,
    bills,
    totals: {
      overdue: { count: overdue.length, cents: sum(overdue) },
      month: { count: dueThisMonth.length, cents: sum(dueThisMonth) },
      done: { count: paidThisMonth.length, cents: sum(paidThisMonth) },
    },
  };
}

export type BillWithHistory = Awaited<ReturnType<typeof listBills>>["bills"][number];
