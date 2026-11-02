"use client";

import { useState } from "react";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FormField } from "@/components/form-field";
import { NativeSelect } from "@/components/native-select";
import { LAST_WEEK, ordinalLabel, WEEK_ORDINALS, WEEKDAY_NAMES, type RepeatKind } from "@/lib/recurrence";
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
          <FormField label="Repetir" htmlFor={`${p}-kind`}>
            <NativeSelect
              id={`${p}-kind`}
              name="repeatKind"
              value={kind}
              onChange={(e) => setKind(e.target.value as RepeatKind)}
            >
              <option value="INTERVAL">A cada X dias (contando da conclusão)</option>
              <option value="MONTHLY_DAY">Todo mês num dia fixo (ex.: dia 10)</option>
              <option value="MONTHLY_WEEKDAY">Todo mês numa semana (ex.: 1ª quarta)</option>
            </NativeSelect>
          </FormField>
          {kind === "INTERVAL" && (
            <FormField label="A cada quantos dias" htmlFor={`${p}-interval`}>
              <Input
                id={`${p}-interval`}
                name="intervalDays"
                type="number"
                inputMode="numeric"
                min={1}
                max={3650}
                required
                defaultValue={routine?.repeatKind === "INTERVAL" ? routine.intervalDays : 30}
              />
            </FormField>
          )}
          {kind === "MONTHLY_DAY" && (
            <FormField
              label="Dia do mês"
              htmlFor={`${p}-monthday`}
              hint="Nos meses sem esse dia (ex.: 31), cai no último dia do mês."
            >
              <Input
                id={`${p}-monthday`}
                name="monthDay"
                type="number"
                inputMode="numeric"
                min={1}
                max={31}
                required
                defaultValue={routine?.monthDay ?? 10}
              />
            </FormField>
          )}
          {kind === "MONTHLY_WEEKDAY" && (
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Semana" htmlFor={`${p}-ordinal`}>
                <NativeSelect id={`${p}-ordinal`} name="weekOrdinal" defaultValue={routine?.weekOrdinal ?? 1}>
                  {WEEK_ORDINALS.map((n) => (
                    <option key={n} value={n}>
                      {n === LAST_WEEK ? "Última" : ordinalLabel(n)}
                    </option>
                  ))}
                </NativeSelect>
              </FormField>
              <FormField label="Dia da semana" htmlFor={`${p}-weekday`}>
                <NativeSelect id={`${p}-weekday`} name="weekday" defaultValue={routine?.weekday ?? 3}>
                  {WEEKDAY_NAMES.map((name, i) => (
                    <option key={name} value={i}>
                      {name.charAt(0).toUpperCase() + name.slice(1)}
                    </option>
                  ))}
                </NativeSelect>
              </FormField>
            </div>
          )}
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
            hint={kind === "INTERVAL" ? "Em branco: a ação fica pendente hoje para iniciar o ciclo." : "Em branco: a primeira vez é a próxima data da regra (pode ser hoje)."}
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
