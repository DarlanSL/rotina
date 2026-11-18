"use client";

import { useState } from "react";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FormField } from "@/components/form-field";
import { RepeatFields } from "@/components/repeat-fields";
import { useAction } from "@/components/use-action";
import { createBill, updateBill } from "@/app/(app)/contas/actions";
import { centsToInput } from "@/lib/money";
import type { RepeatKind } from "@/lib/recurrence";
import type { BillView } from "@/lib/queries/bills";

type Kind = "PAYABLE" | "RECEIVABLE";

export function BillFormDialog({
  bill,
  kind,
  today,
  trigger,
}: {
  bill?: BillView;
  kind: Kind;
  today: string;
  trigger?: React.ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const { pending, run } = useAction();
  const p = bill ? `bill-${bill.id}` : `bill-new-${kind}`;
  const [repeat, setRepeat] = useState<RepeatKind | "">(bill ? (bill.repeatKind ?? "") : "MONTHLY_DAY");
  const payable = kind === "PAYABLE";

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    run(
      () => (bill ? updateBill(bill.id, data) : createBill(data)),
      () => setOpen(false),
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          trigger ?? (
            <Button>
              <PlusIcon /> {payable ? "Conta a pagar" : "Conta a receber"}
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {bill ? "Editar conta" : payable ? "Nova conta a pagar" : "Nova conta a receber"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4">
          <input type="hidden" name="kind" value={kind} />
          <FormField label="Descrição" htmlFor={`${p}-title`}>
            <Input
              id={`${p}-title`}
              name="title"
              required
              maxLength={200}
              placeholder={payable ? "Ex: Aluguel, Luz, Cartão" : "Ex: Salário, Aluguel recebido"}
              defaultValue={bill?.title}
            />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Valor (R$)" htmlFor={`${p}-amount`} hint="Pode deixar em branco.">
              <Input
                id={`${p}-amount`}
                name="amount"
                inputMode="decimal"
                placeholder="0,00"
                autoComplete="off"
                defaultValue={centsToInput(bill?.amountCents)}
              />
            </FormField>
            <FormField label={bill ? "Próximo vencimento" : "Vencimento"} htmlFor={`${p}-due`}>
              <Input id={`${p}-due`} name="dueDate" type="date" required defaultValue={bill?.nextDueAt ?? today} />
            </FormField>
          </div>
          <RepeatFields
            prefix={p}
            kind={repeat}
            onKindChange={setRepeat}
            allowNone
            doneVerb={payable ? "pagar" : "receber"}
            defaults={bill ?? undefined}
          />
          {repeat && (
            <p className="-mt-2 text-xs text-muted-foreground">
              {repeat === "INTERVAL" || repeat === "INTERVAL_FIXED"
                ? "O primeiro vencimento é a data acima."
                : "O primeiro vencimento é a primeira data da regra a partir da data acima."}
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            {repeat ? (
              <FormField label="Quantas vezes" htmlFor={`${p}-times`} hint="Em branco: sem fim. Ex.: 12 parcelas.">
                <Input
                  id={`${p}-times`}
                  name="repeatTimes"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={999}
                  placeholder="Sem fim"
                  defaultValue={bill?.repeatTimes ?? ""}
                />
              </FormField>
            ) : (
              <div />
            )}
            <FormField label="Avisar antes (dias)" htmlFor={`${p}-alert`}>
              <Input
                id={`${p}-alert`}
                name="alertDaysBefore"
                type="number"
                inputMode="numeric"
                min={0}
                max={365}
                required
                defaultValue={bill?.alertDaysBefore ?? 3}
              />
            </FormField>
          </div>
          <FormField label="Observações" htmlFor={`${p}-notes`}>
            <Textarea
              id={`${p}-notes`}
              name="notes"
              rows={2}
              placeholder="Ex: código de barras, chave Pix, quem paga"
              defaultValue={bill?.notes ?? ""}
            />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
