"use client";

import { useState } from "react";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FormField } from "@/components/form-field";
import { useAction } from "@/components/use-action";
import { createProject, updateProject } from "@/app/(app)/projetos/actions";
import { PROJECT_COLOR_CLASS, PROJECT_COLORS } from "@/lib/labels";
import { cn } from "@/lib/utils";

type ProjectData = { id: string; name: string; description: string | null; color: string | null };

export function ProjectFormDialog({ project, trigger }: { project?: ProjectData; trigger?: React.ReactElement }) {
  const [open, setOpen] = useState(false);
  const { pending, run } = useAction();
  const p = project ? `pj-${project.id}` : "pj-new";

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    run(
      () => (project ? updateProject(project.id, data) : createProject(data)),
      () => setOpen(false),
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          trigger ?? (
            <Button>
              <PlusIcon /> Novo projeto
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{project ? "Editar projeto" : "Novo projeto"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4">
          <FormField label="Nome" htmlFor={`${p}-name`}>
            <Input id={`${p}-name`} name="name" required maxLength={120} defaultValue={project?.name} />
          </FormField>
          <FormField label="Descrição" htmlFor={`${p}-desc`}>
            <Textarea id={`${p}-desc`} name="description" rows={3} defaultValue={project?.description ?? ""} />
          </FormField>
          <fieldset className="grid gap-1.5">
            <legend className="mb-1.5 text-sm font-medium">Cor</legend>
            <div className="flex gap-2">
              {PROJECT_COLORS.map((c) => (
                <label key={c} className="cursor-pointer">
                  <input
                    type="radio"
                    name="color"
                    value={c}
                    defaultChecked={(project?.color ?? "slate") === c}
                    className="peer sr-only"
                  />
                  <span
                    className={cn(
                      "block size-7 rounded-full ring-offset-2 ring-offset-background peer-checked:ring-2 peer-checked:ring-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-ring",
                      PROJECT_COLOR_CLASS[c],
                    )}
                  />
                  <span className="sr-only">{c}</span>
                </label>
              ))}
            </div>
          </fieldset>
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
