"use client";

import { useRef, useState } from "react";
import { ChevronDownIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/native-select";
import { useAction } from "@/components/use-action";
import { ItemFields, withRemindAtIso, type ProjectOption } from "@/components/ideias/item-fields";
import { createItem } from "@/app/(app)/ideias/actions";
import { ITEM_TYPE_LABEL } from "@/lib/labels";
import { ITEM_TYPES } from "@/lib/validations";
import type { ItemType } from "@/generated/prisma/enums";

/**
 * Captura rápida: digita e Enter. "Mais opções" abre os demais campos.
 * Lembretes exigem data, então já abrem expandidos.
 */
export function QuickCapture({
  defaultType = "IDEA",
  projects,
  projectId,
  lockType,
}: {
  defaultType?: ItemType;
  projects: ProjectOption[];
  projectId?: string;
  lockType?: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [type, setType] = useState<ItemType>(defaultType);
  const [expanded, setExpanded] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const { pending, run } = useAction();

  const showFull = expanded || type === "REMINDER";

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = withRemindAtIso(event.currentTarget);
    if (projectId && !data.get("projectId")) data.set("projectId", projectId);
    run(
      () => createItem(data),
      () => {
        setFormKey((k) => k + 1); // remonta o form limpo, mantendo o tipo escolhido
        setExpanded(false);
      },
    );
  }

  return (
    <form key={formKey} ref={formRef} onSubmit={onSubmit} className="rounded-xl border bg-card p-3">
      {showFull ? (
        <div className="grid gap-3">
          <ItemFields
            prefix="qc"
            type={type}
            onTypeChange={setType}
            projects={projects}
            defaults={{ projectId }}
            showType={!lockType}
          />
          <div className="flex justify-end gap-2">
            {type !== "REMINDER" && (
              <Button type="button" variant="ghost" onClick={() => setExpanded(false)}>
                Menos opções
              </Button>
            )}
            {type === "REMINDER" && !lockType && (
              <Button type="button" variant="ghost" onClick={() => setType("IDEA")}>
                Cancelar
              </Button>
            )}
            <Button type="submit" disabled={pending}>
              Salvar
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Input
            name="title"
            required
            maxLength={300}
            placeholder={`Nova ${ITEM_TYPE_LABEL[type].singular.toLowerCase()}…`}
            aria-label="Título"
            autoComplete="off"
            className="min-w-48 flex-1"
          />
          {lockType ? (
            <input type="hidden" name="type" value={type} />
          ) : (
            <NativeSelect
              name="type"
              aria-label="Tipo"
              value={type}
              onChange={(e) => setType(e.target.value as ItemType)}
              className="w-auto"
            >
              {ITEM_TYPES.map((t) => (
                <option key={t} value={t}>
                  {ITEM_TYPE_LABEL[t].singular}
                </option>
              ))}
            </NativeSelect>
          )}
          <input type="hidden" name="projectId" value={projectId ?? ""} />
          <Button type="button" variant="ghost" size="icon" aria-label="Mais opções" onClick={() => setExpanded(true)}>
            <ChevronDownIcon />
          </Button>
          <Button type="submit" disabled={pending} size="icon" aria-label="Adicionar">
            <PlusIcon />
          </Button>
        </div>
      )}
    </form>
  );
}
