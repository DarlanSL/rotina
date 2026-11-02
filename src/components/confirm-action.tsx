"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAction } from "@/components/use-action";
import type { ActionResult } from "@/lib/action-result";

/** Botão que pede confirmação antes de executar a ação (ex.: sair de algo compartilhado). */
export function ConfirmAction({
  title,
  description,
  confirmLabel,
  action,
  secondary,
  trigger,
}: {
  title: string;
  description?: string;
  confirmLabel: string;
  action: () => Promise<ActionResult>;
  /** Segunda opção (ex.: "Esta e as próximas") */
  secondary?: { label: string; action: () => Promise<ActionResult> };
  trigger: React.ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const { pending, run } = useAction();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          {secondary && (
            <Button variant="destructive" disabled={pending} onClick={() => run(secondary.action, () => setOpen(false))}>
              {secondary.label}
            </Button>
          )}
          <Button variant="destructive" disabled={pending} onClick={() => run(action, () => setOpen(false))}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
