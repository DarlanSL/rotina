"use client";

import { useRef } from "react";
import { UsersIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/form-field";
import { NotifyBeforeField } from "@/components/notifications/notify-before-select";
import { useAction } from "@/components/use-action";
import { createActivity, updateActivity } from "@/app/(app)/diario/actions";
import type { ActivityView } from "@/lib/queries/activities";

export function ActivityForm({
  today,
  knownTags,
  activity,
  onDone,
  compact,
  defaultTitle,
}: {
  today: string;
  knownTags: string[];
  activity?: ActivityView;
  onDone?: () => void;
  compact?: boolean;
  /** Título já preenchido ao criar (ex.: agendar a ida às compras a partir de uma lista) */
  defaultTitle?: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const { pending, run } = useAction();
  const prefix = activity ? `act-${activity.id}` : "act-new";
  // tags e com quem compartilhar são de quem criou
  const owner = !activity || activity.mine;

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
    <form ref={formRef} onSubmit={onSubmit} className="@container grid gap-3">
      <div className="grid grid-cols-2 gap-3 @md:grid-cols-[1fr_7rem_7rem] @3xl:grid-cols-[1fr_10rem_7rem_7rem]">
        <FormField label="Atividade" htmlFor={`${prefix}-title`} className="col-span-full @3xl:col-span-1">
          <Input
            id={`${prefix}-title`}
            name="title"
            required
            maxLength={200}
            placeholder="Ex: Reunião com fornecedor"
            defaultValue={activity?.title ?? defaultTitle}
            autoComplete="off"
          />
        </FormField>
        <FormField label="Data" htmlFor={`${prefix}-date`} className="col-span-2 @md:col-span-1">
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
        {owner ? (
          <>
            <FormField label="Tags" htmlFor={`${prefix}-tags`} className="min-w-48 flex-1">
              <Input
                id={`${prefix}-tags`}
                name="tags"
                list={`${prefix}-tag-options`}
                placeholder="ex: trabalho, saúde"
                defaultValue={activity?.tags.join(", ")}
                autoComplete="off"
                autoCapitalize="none"
              />
              <datalist id={`${prefix}-tag-options`}>
                {knownTags.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </FormField>
            <FormField label="Compartilhar com" htmlFor={`${prefix}-share`} className="min-w-48 flex-1">
              <Input
                id={`${prefix}-share`}
                name="shareWith"
                placeholder="usuário (ex: ana)"
                defaultValue={activity?.sharedWith.join(", ")}
                autoComplete="off"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
            </FormField>
          </>
        ) : (
          <p className="flex min-w-48 flex-1 items-center gap-1.5 self-center text-sm text-muted-foreground">
            <UsersIcon className="size-4 shrink-0" />
            Compartilhada por @{activity?.owner}
          </p>
        )}
        <NotifyBeforeField id={`${prefix}-notify`} defaultValue={activity?.notifyBefore} className="w-52" />
        <Button type="submit" disabled={pending} className="h-8">
          {activity ? "Salvar" : "Registrar"}
        </Button>
      </div>
    </form>
  );
}
