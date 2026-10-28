"use client";

import { useState } from "react";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FormField } from "@/components/form-field";
import { useAction } from "@/components/use-action";
import { createRoutine, updateRoutine } from "@/app/(app)/rotinas/actions";
import type { RoutineView } from "@/lib/queries/routines";

export function RoutineFormDialog({ routine, trigger }: { routine?: RoutineView; trigger?: React.ReactElement }) {
  const [open, setOpen] = useState(false);
  const { pending, run } = useAction();
  const p = routine ? `rt-${routine.id}` : "rt-new";

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
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Repetir a cada (dias)" htmlFor={`${p}-interval`}>
              <Input
                id={`${p}-interval`}
                name="intervalDays"
                type="number"
                inputMode="numeric"
                min={1}
                max={3650}
                required
                defaultValue={routine?.intervalDays ?? 30}
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
            hint="Em branco: a ação fica pendente hoje para iniciar o ciclo."
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
