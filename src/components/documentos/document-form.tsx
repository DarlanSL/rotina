"use client";

import { useState } from "react";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FormField } from "@/components/form-field";
import { useAction } from "@/components/use-action";
import { createDocument, updateDocument } from "@/app/(app)/documentos/actions";
import type { DocumentView } from "@/lib/queries/documents";

const COMMON_TYPES = ["CNH", "RG", "Passaporte", "CRLV", "Alvará", "Certificado", "Licença", "Contrato", "Seguro", "Laudo"];

export function DocumentFormDialog({ document, trigger }: { document?: DocumentView; trigger?: React.ReactElement }) {
  const [open, setOpen] = useState(false);
  const { pending, run } = useAction();
  const p = document ? `doc-${document.id}` : "doc-new";

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    run(
      () => (document ? updateDocument(document.id, data) : createDocument(data)),
      () => setOpen(false),
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          trigger ?? (
            <Button>
              <PlusIcon /> Novo documento
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{document ? "Editar documento" : "Novo documento"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4">
          <FormField label="Nome" htmlFor={`${p}-name`}>
            <Input
              id={`${p}-name`}
              name="name"
              required
              maxLength={200}
              placeholder="Ex: CNH"
              defaultValue={document?.name}
            />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Tipo" htmlFor={`${p}-type`}>
              <Input
                id={`${p}-type`}
                name="type"
                required
                maxLength={80}
                list={`${p}-types`}
                defaultValue={document?.type}
                autoComplete="off"
              />
              <datalist id={`${p}-types`}>
                {COMMON_TYPES.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </FormField>
            <FormField label="Órgão emissor" htmlFor={`${p}-issuer`}>
              <Input
                id={`${p}-issuer`}
                name="issuer"
                maxLength={120}
                placeholder="Ex: DETRAN-SP"
                defaultValue={document?.issuer ?? ""}
              />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Vencimento" htmlFor={`${p}-expires`}>
              <Input id={`${p}-expires`} name="expiresAt" type="date" required defaultValue={document?.expiresAt} />
            </FormField>
            <FormField label="Avisar antes (dias)" htmlFor={`${p}-warn`}>
              <Input
                id={`${p}-warn`}
                name="warnDays"
                type="number"
                inputMode="numeric"
                min={0}
                max={365}
                required
                defaultValue={document?.warnDays ?? 30}
              />
            </FormField>
          </div>
          <FormField label="Observações" htmlFor={`${p}-notes`}>
            <Textarea id={`${p}-notes`} name="notes" rows={2} defaultValue={document?.notes ?? ""} />
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
