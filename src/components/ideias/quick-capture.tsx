"use client";

import { useRef, useState } from "react";
import { ChevronDownIcon, ImagePlusIcon, PlusIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/native-select";
import { useAction } from "@/components/use-action";
import { ItemFields, withRemindAtIso, type ProjectOption } from "@/components/ideias/item-fields";
import { useMediaPicker, useMediaUpload } from "@/components/ideias/attachments";
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
  // fotos/vídeos escolhidos antes de salvar; são enviados assim que o item existe
  const [files, setFiles] = useState<File[]>([]);
  const { uploads, uploadFiles } = useMediaUpload();
  const picker = useMediaPicker((picked) => setFiles((f) => [...f, ...picked]));

  const showFull = expanded || type === "REMINDER";

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = withRemindAtIso(event.currentTarget);
    if (projectId && !data.get("projectId")) data.set("projectId", projectId);
    run(
      () => createItem(data),
      (result) => {
        if (result.id && files.length) uploadFiles(result.id, files);
        setFiles([]);
        setFormKey((k) => k + 1); // remonta o form limpo, mantendo o tipo escolhido
        setExpanded(false);
      },
    );
  }

  return (
    <form key={formKey} ref={formRef} onSubmit={onSubmit} className="rounded-xl border bg-card p-3">
      {picker.input}
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
            <Button type="button" variant="ghost" className="mr-auto" onClick={picker.open}>
              <ImagePlusIcon /> Foto ou vídeo
            </Button>
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
          <Button type="button" variant="ghost" size="icon" aria-label="Adicionar foto ou vídeo" onClick={picker.open}>
            <ImagePlusIcon />
          </Button>
          <Button type="button" variant="ghost" size="icon" aria-label="Mais opções" onClick={() => setExpanded(true)}>
            <ChevronDownIcon />
          </Button>
          <Button type="submit" disabled={pending} size="icon" aria-label="Adicionar">
            <PlusIcon />
          </Button>
        </div>
      )}
      {files.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5 text-xs" aria-label="Arquivos escolhidos">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="inline-flex max-w-56 items-center gap-1 rounded-full bg-muted py-0.5 pr-1 pl-2.5">
              <span className="truncate">{f.name}</span>
              <button
                type="button"
                aria-label={`Remover ${f.name}`}
                className="rounded-full p-0.5 hover:bg-background"
                onClick={() => setFiles((all) => all.filter((_, j) => j !== i))}
              >
                <XIcon className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {uploads.length > 0 && (
        <p className="mt-2 text-xs text-muted-foreground" role="status">
          Enviando {uploads.length === 1 ? "1 anexo" : `${uploads.length} anexos`}… {Math.round(uploads[0].percent)}%
        </p>
      )}
    </form>
  );
}
