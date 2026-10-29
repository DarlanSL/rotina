"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/native-select";
import { FormField } from "@/components/form-field";
import { NotifyBeforeField } from "@/components/notifications/notify-before-select";
import { ITEM_TYPE_LABEL, PRIORITY_LABEL } from "@/lib/labels";
import { ITEM_TYPES, PRIORITIES } from "@/lib/validations";
import type { ItemType, Priority } from "@/generated/prisma/enums";

export type ProjectOption = { id: string; name: string };

/** Date → "yyyy-MM-ddTHH:mm" no fuso do navegador (para <input type="datetime-local">). */
export function toLocalInput(date: Date | null | undefined) {
  if (!date) return "";
  const d = new Date(date);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** O servidor recebe ISO com fuso; o input datetime-local não tem fuso, então convertemos aqui. */
export function withRemindAtIso(form: HTMLFormElement) {
  const data = new FormData(form);
  const local = data.get("remindAtLocal");
  data.delete("remindAtLocal");
  data.set("remindAt", typeof local === "string" && local ? new Date(local).toISOString() : "");
  return data;
}

export function ItemFields({
  prefix,
  type,
  onTypeChange,
  projects,
  defaults,
  showType = true,
}: {
  prefix: string;
  type: ItemType;
  onTypeChange: (t: ItemType) => void;
  projects: ProjectOption[];
  defaults?: {
    title?: string;
    content?: string | null;
    priority?: Priority;
    projectId?: string | null;
    remindAt?: Date | null;
    notifyBefore?: number | null;
  };
  showType?: boolean;
}) {
  const needsDate = type === "REMINDER" || type === "IMPROVEMENT";

  return (
    <>
      <FormField label="Título" htmlFor={`${prefix}-title`}>
        <Input
          id={`${prefix}-title`}
          name="title"
          required
          maxLength={300}
          defaultValue={defaults?.title}
          autoComplete="off"
        />
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        {showType ? (
          <FormField label="Tipo" htmlFor={`${prefix}-type`}>
            <NativeSelect
              id={`${prefix}-type`}
              name="type"
              value={type}
              onChange={(e) => onTypeChange(e.target.value as ItemType)}
            >
              {ITEM_TYPES.map((t) => (
                <option key={t} value={t}>
                  {ITEM_TYPE_LABEL[t].singular}
                </option>
              ))}
            </NativeSelect>
          </FormField>
        ) : (
          <input type="hidden" name="type" value={type} />
        )}
        <FormField label="Prioridade" htmlFor={`${prefix}-priority`}>
          <NativeSelect id={`${prefix}-priority`} name="priority" defaultValue={defaults?.priority ?? "MEDIUM"}>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABEL[p]}
              </option>
            ))}
          </NativeSelect>
        </FormField>
        <FormField label="Projeto" htmlFor={`${prefix}-project`} className={showType ? "col-span-2" : undefined}>
          <NativeSelect id={`${prefix}-project`} name="projectId" defaultValue={defaults?.projectId ?? ""}>
            <option value="">Sem projeto</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </NativeSelect>
        </FormField>
      </div>
      {needsDate && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_12rem]">
          <FormField label={type === "REMINDER" ? "Lembrar em" : "Prazo (opcional)"} htmlFor={`${prefix}-remind`}>
            <Input
              id={`${prefix}-remind`}
              name="remindAtLocal"
              type="datetime-local"
              required={type === "REMINDER"}
              defaultValue={toLocalInput(defaults?.remindAt)}
            />
          </FormField>
          <NotifyBeforeField id={`${prefix}-notify`} defaultValue={defaults?.notifyBefore} />
        </div>
      )}
      <FormField label="Detalhes" htmlFor={`${prefix}-content`}>
        <Textarea
          id={`${prefix}-content`}
          name="content"
          rows={4}
          placeholder="Contexto, passos, links…"
          defaultValue={defaults?.content ?? ""}
        />
      </FormField>
    </>
  );
}
