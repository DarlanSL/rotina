"use client";

import { useState } from "react";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FormField } from "@/components/form-field";
import { RepeatFields } from "@/components/repeat-fields";
import type { RepeatKind } from "@/lib/recurrence";
import { useAction } from "@/components/use-action";
import { createRoutine, updateRoutine } from "@/app/(app)/rotinas/actions";
import type { RoutineView } from "@/lib/queries/routines";

export function RoutineFormDialog({ routine, trigger }: { routine?: RoutineView; trigger?: React.ReactElement }) {
  const [open, setOpen] = useState(false);
  const { pending, run } = useAction();
  const p = routine ? `rt-${routine.id}` : "rt-new";
  const [kind, setKind] = useState<RepeatKind>(routine?.repeatKind ?? "INTERVAL");

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    run(
      () => (routine ? updateRoutine(routine.id, data) : createRoutine(data)),
      () => setOpen(false),
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          trigger ?? (
            <Button>
              <PlusIcon /> Nova rotina
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{routine ? "Editar rotina" : "Nova rotina"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4">
          <FormField label="Ação" htmlFor={`${p}-title`}>
            <Input
              id={`${p}-title`}
              name="title"
              required
              maxLength={200}
              placeholder="Ex: Revisar extintores"
              defaultValue={routine?.title}
            />
          </FormField>
          <RepeatFields
            prefix={p}
            kind={kind}
            onKindChange={(k) => setKind(k || "INTERVAL")}
            defaults={routine && { ...routine, intervalDays: routine.repeatKind === "INTERVAL" || routine.repeatKind === "INTERVAL_FIXED" ? routine.intervalDays : 30 }}
          />
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Quantas vezes" htmlFor={`${p}-times`} hint="Em branco: sem fim.">
              <Input
                id={`${p}-times`}
                name="repeatTimes"
                type="number"
                inputMode="numeric"
                min={1}
                max={999}
                placeholder="Sem fim"
                defaultValue={routine?.repeatTimes ?? ""}
              />
            </FormField>
            <FormField label="Avisar antes (dias)" htmlFor={`${p}-alert`}>
              <Input
                id={`${p}-alert`}
                name="alertDaysBefore"
                type="number"
                inputMode="numeric"
                min={0}
                max={365}
                required
                defaultValue={routine?.alertDaysBefore ?? 3}
              />
            </FormField>
          </div>
          <FormField
            label="Última vez feita"
            htmlFor={`${p}-last`}
            hint={kind === "INTERVAL" || kind === "INTERVAL_FIXED" ? "Em branco: a ação fica pendente hoje para iniciar o ciclo." : "Em branco: a primeira vez é a próxima data da regra (pode ser hoje)."}
          >
            <Input id={`${p}-last`} name="lastCompletedAt" type="date" defaultValue={routine?.lastCompletedAt ?? ""} />
          </FormField>
          <FormField label="Descrição" htmlFor={`${p}-desc`}>
            <Textarea id={`${p}-desc`} name="description" rows={2} defaultValue={routine?.description ?? ""} />
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
