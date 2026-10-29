"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/** Confirma antes de marcar como realizado — evita marcar sem querer e "sujar" o relatório do dia. */
export function ConfirmDoneDialog({
  title,
  open,
  onOpenChange,
  onConfirm,
  pending,
}: {
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  pending?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Marcar como realizado?</DialogTitle>
          <DialogDescription>
            &quot;{title}&quot; vai entrar nas realizadas de hoje.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button disabled={pending} onClick={onConfirm}>
            Sim, realizado
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
