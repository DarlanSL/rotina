"use client";

import { CheckIcon, HistoryIcon, PencilIcon, RepeatIcon, Undo2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/status-badge";
import { ConfirmDelete } from "@/components/confirm-delete";
import { useAction } from "@/components/use-action";
import { BillFormDialog } from "@/components/contas/bill-form";
import { PayDialog } from "@/components/contas/pay-dialog";
import { deleteBill, undoLastPayment } from "@/app/(app)/contas/actions";
import { formatDateBR } from "@/lib/dates";
import { STATUS_ACCENT } from "@/lib/deadlines";
import { formatBRL } from "@/lib/money";
import type { BillWithHistory } from "@/lib/queries/bills";
import { cn } from "@/lib/utils";

function PaymentsDialog({ bill }: { bill: BillWithHistory }) {
  const { pending, run } = useAction();
  const payable = bill.kind === "PAYABLE";
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button variant="ghost" size="icon-sm" aria-label="Histórico">
            <HistoryIcon />
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Histórico · {bill.title}</DialogTitle>
        </DialogHeader>
        {bill.payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum {payable ? "pagamento" : "recebimento"} registrado ainda.
          </p>
        ) : (
          <ol className="max-h-[60vh] divide-y overflow-y-auto">
            {bill.payments.map((p, i) => (
              <li key={p.id} className="flex items-center gap-3 py-2.5">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                  <CheckIcon className="size-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {payable ? "Pago" : "Recebido"} em {formatDateBR(p.paidAt)}
                    {p.amountCents !== null && <span className="ml-1.5 tabular-nums">· {formatBRL(p.amountCents)}</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">Vencimento {formatDateBR(p.dueDate)}</p>
                </div>
                {i === 0 && (
                  <Button
                    size="xs"
                    variant="ghost"
                    disabled={pending}
                    onClick={() => run(() => undoLastPayment(bill.id))}
                  >
                    <Undo2Icon /> Desfazer
                  </Button>
                )}
              </li>
            ))}
          </ol>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function BillCard({ bill, today }: { bill: BillWithHistory; today: string }) {
  const payable = bill.kind === "PAYABLE";
  const last = bill.payments[0];

  return (
    <li
      className={cn(
        "rounded-xl border border-l-4 bg-card p-4 shadow-xs",
        bill.active ? STATUS_ACCENT[bill.status] : "border-l-muted-foreground/30 opacity-70",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium">{bill.title}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
            {bill.repeatLabel ? (
              <span className="inline-flex items-center gap-1">
                <RepeatIcon className="size-3" /> {bill.repeatLabel}
                {bill.repeatTimes && (
                  <span className="font-medium text-foreground/80">
                    · {bill.paidCount} de {bill.repeatTimes}
                  </span>
                )}
              </span>
            ) : (
              <span>Conta única</span>
            )}
          </p>
        </div>
        <div className="text-right">
          {bill.amountCents !== null && (
            <p
              className={cn(
                "text-base font-semibold tabular-nums",
                payable ? "text-foreground" : "text-emerald-700 dark:text-emerald-400",
              )}
            >
              {formatBRL(bill.amountCents)}
            </p>
          )}
          {bill.active ? (
            <StatusBadge status={bill.status} daysLeft={bill.daysLeft} />
          ) : (
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
              {payable ? "Quitada" : "Recebida"}
            </span>
          )}
        </div>
      </div>

      {bill.notes && <p className="mt-2 text-sm whitespace-pre-line text-muted-foreground">{bill.notes}</p>}

      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">{payable ? "Último pagamento" : "Último recebimento"}</dt>
          <dd>
            {last ? formatDateBR(last.paidAt) : "—"}
            {last?.amountCents != null && (
              <span className="ml-1 text-xs text-muted-foreground tabular-nums">{formatBRL(last.amountCents)}</span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">{bill.active ? "Vencimento" : "Último vencimento"}</dt>
          <dd className="font-medium">{formatDateBR(bill.nextDueAt)}</dd>
        </div>
      </dl>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3">
        <div>{bill.active && <PayDialog bill={bill} today={today} />}</div>
        <div className="flex items-center gap-0.5">
          <PaymentsDialog bill={bill} />
          <BillFormDialog
            bill={bill}
            kind={bill.kind}
            today={today}
            trigger={
              <Button variant="ghost" size="icon-sm" aria-label="Editar">
                <PencilIcon />
              </Button>
            }
          />
          <ConfirmDelete what="conta (e o histórico de pagamentos)" action={deleteBill.bind(null, bill.id)} />
        </div>
      </div>
    </li>
  );
}
