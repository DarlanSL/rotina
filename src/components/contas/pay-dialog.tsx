"use client";

import { useState } from "react";
import { CheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FormField } from "@/components/form-field";
import { useAction } from "@/components/use-action";
import { payBill } from "@/app/(app)/contas/actions";
import { formatDateBR } from "@/lib/dates";
import { centsToInput } from "@/lib/money";

type PayableBill = { id: string; kind: "PAYABLE" | "RECEIVABLE"; title: string; amountCents: number | null; nextDueAt: string };

/** "Pagar" / "Receber": confirma data e valor (pode ser diferente do previsto, ex.: conta de luz). */
export function PayDialog({ bill, today, size = "sm" }: { bill: PayableBill; today: string; size?: "sm" | "xs" }) {
  const [open, setOpen] = useState(false);
  const { pending, run } = useAction();
  const payable = bill.kind === "PAYABLE";
  const p = `pay-${bill.id}`;

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    run(
      () => payBill(bill.id, data),
      () => setOpen(false),
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size={size} variant="outline">
            <CheckIcon /> {payable ? "Pagar" : "Receber"}
          </Button>
        }
      />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{payable ? "Registrar pagamento" : "Registrar recebimento"}</DialogTitle>
          <DialogDescription>
            {bill.title} · vencimento {formatDateBR(bill.nextDueAt)}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField label={payable ? "Pago em" : "Recebido em"} htmlFor={`${p}-date`}>
              <Input id={`${p}-date`} name="paidAt" type="date" required max={today} defaultValue={today} />
            </FormField>
            <FormField label="Valor (R$)" htmlFor={`${p}-amount`}>
              <Input
                id={`${p}-amount`}
                name="amount"
                inputMode="decimal"
                placeholder="0,00"
                autoComplete="off"
                defaultValue={centsToInput(bill.amountCents)}
              />
            </FormField>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              <CheckIcon /> Confirmar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
