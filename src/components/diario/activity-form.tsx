"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/form-field";
import { useAction } from "@/components/use-action";
import { createActivity, updateActivity } from "@/app/(app)/diario/actions";
import type { ActivityView } from "@/lib/queries/activities";

export function ActivityForm({
  today,
  knownTags,
  activity,
  onDone,
  compact,
}: {
  today: string;
  knownTags: string[];
  activity?: ActivityView;
  onDone?: () => void;
  compact?: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const { pending, run } = useAction();
  const prefix = activity ? `act-${activity.id}` : "act-new";

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    run(
      () => (activity ? updateActivity(activity.id, data) : createActivity(data)),
      () => {
        if (!activity) {
          // mantém data e tags para registrar várias seguidas
          const form = formRef.current;
          if (form) {
            (form.elements.namedItem("title") as HTMLInputElement).value = "";
            (form.elements.namedItem("notes") as HTMLTextAreaElement).value = "";
            // a próxima atividade costuma começar quando a anterior terminou
            const start = form.elements.namedItem("startTime") as HTMLInputElement;
            const end = form.elements.namedItem("endTime") as HTMLInputElement;
            start.value = end.value;
            end.value = "";
            (form.elements.namedItem("title") as HTMLInputElement).focus();
          }
        }
        onDone?.();
      },
    );
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="grid gap-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1fr_10rem_7rem_7rem]">
        <FormField label="Atividade" htmlFor={`${prefix}-title`} className="col-span-2 sm:col-span-1">
          <Input
            id={`${prefix}-title`}
            name="title"
            required
            maxLength={200}
            placeholder="Ex: Reunião com fornecedor"
            defaultValue={activity?.title}
            autoComplete="off"
          />
        </FormField>
        <FormField label="Data" htmlFor={`${prefix}-date`} className="col-span-2 sm:col-span-1">
          <Input id={`${prefix}-date`} name="date" type="date" required defaultValue={activity?.date ?? today} />
        </FormField>
        <FormField label="Das" htmlFor={`${prefix}-start`}>
          <Input id={`${prefix}-start`} name="startTime" type="time" defaultValue={activity?.startTime ?? ""} />
        </FormField>
        <FormField label="Até" htmlFor={`${prefix}-end`}>
          <Input id={`${prefix}-end`} name="endTime" type="time" defaultValue={activity?.endTime ?? ""} />
        </FormField>
      </div>
      {!compact && (
        <FormField label="Notas" htmlFor={`${prefix}-notes`}>
          <Textarea
            id={`${prefix}-notes`}
            name="notes"
            rows={3}
            placeholder="Detalhes, decisões, próximos passos…"
            defaultValue={activity?.notes ?? ""}
          />
        </FormField>
      )}
      {compact && <input type="hidden" name="notes" defaultValue="" />}
      <div className="flex flex-wrap items-end gap-3">
        <FormField label="Tags" htmlFor={`${prefix}-tags`} className="min-w-48 flex-1">
          <Input
            id={`${prefix}-tags`}
            name="tags"
            list={`${prefix}-tag-options`}
            placeholder="ex: trabalho, saúde"
            defaultValue={activity?.tags.join(", ")}
            autoComplete="off"
          />
          <datalist id={`${prefix}-tag-options`}>
            {knownTags.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </FormField>
        <Button type="submit" disabled={pending} className="h-8">
          {activity ? "Salvar" : "Registrar"}
        </Button>
      </div>
    </form>
  );
}
