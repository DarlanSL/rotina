"use client";

import { useRef, useState } from "react";
import { CalendarClockIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { postponeRoutine } from "@/app/(app)/rotinas/actions";
import { addDays, diffDays, formatDateBR } from "@/lib/dates";

const QUICK_OPTIONS = [1, 3, 7, 15, 30];

export function PostponeDialog({
  routine,
  today,
  size = "sm",
}: {
  routine: { id: string; title: string; nextDueAt: string };
  today: string;
  size?: "sm" | "xs";
}) {
  const [open, setOpen] = useState(false);
  const dateRef = useRef<HTMLInputElement>(null);
  const { pending, run } = useAction();
  const p = `pp-${routine.id}`;

  // Menor data aceita: dia seguinte ao previsto, mas nunca antes de hoje
  const minDate = diffDays(routine.nextDueAt, today) >= 0 ? addDays(routine.nextDueAt, 1) : today;
  // Atalhos contam a partir da maior entre hoje e a data prevista
  const base = diffDays(routine.nextDueAt, today) >= 0 ? routine.nextDueAt : today;

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    run(
      () => postponeRoutine(routine.id, data),
      () => setOpen(false),
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size={size} variant="ghost" className="text-muted-foreground">
            <CalendarClockIcon /> Prorrogar
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Prorrogar &quot;{routine.title}&quot;</DialogTitle>
          <DialogDescription>
            Prevista para {formatDateBR(routine.nextDueAt)}. O adiamento fica registrado no histórico.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4">
          <FormField label="Nova data" htmlFor={`${p}-date`}>
            <Input
              ref={dateRef}
              id={`${p}-date`}
              name="newDate"
              type="date"
              required
              min={minDate}
              defaultValue={addDays(base, 7)}
            />
            <div className="flex flex-wrap gap-1.5">
              {QUICK_OPTIONS.map((days) => (
                <Button
                  key={days}
                  type="button"
                  size="xs"
                  variant="secondary"
                  onClick={() => {
                    if (dateRef.current) dateRef.current.value = addDays(base, days);
                  }}
                >
                  +{days} {days === 1 ? "dia" : "dias"}
                </Button>
              ))}
            </div>
          </FormField>
          <FormField label="Justificativa" htmlFor={`${p}-reason`}>
            <Textarea
              id={`${p}-reason`}
              name="reason"
              required
              minLength={5}
              maxLength={500}
              rows={3}
              placeholder="Ex: Aguardando peça do fornecedor"
            />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              Prorrogar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
