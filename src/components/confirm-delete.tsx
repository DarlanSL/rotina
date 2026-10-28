"use client";

import { useState } from "react";
import { Trash2Icon } from "lucide-react";
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

export function ConfirmDelete({
  what,
  action,
  trigger,
}: {
  what: string;
  action: () => Promise<ActionResult>;
  trigger?: React.ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const { pending, run } = useAction();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          trigger ?? (
            <Button variant="ghost" size="icon-sm" aria-label={`Excluir ${what}`}>
              <Trash2Icon />
            </Button>
          )
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir {what}?</DialogTitle>
          <DialogDescription>Essa ação não pode ser desfeita.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button variant="destructive" disabled={pending} onClick={() => run(action, () => setOpen(false))}>
            Excluir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
