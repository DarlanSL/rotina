"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCheckIcon, MoreHorizontalIcon, PencilIcon, RotateCcwIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAction } from "@/components/use-action";
import { clearDoneEntries, deleteList, renameList, uncheckAllEntries } from "@/app/(app)/listas/actions";

export function ListActions({ id, name, hasDone }: { id: string; name: string; hasDone: boolean }) {
  const [renaming, setRenaming] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [newName, setNewName] = useState(name);
  const { pending, run } = useAction();
  const router = useRouter();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="outline" size="icon" aria-label="Ações da lista">
              <MoreHorizontalIcon />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem
            onClick={() => {
              setNewName(name);
              setRenaming(true);
            }}
          >
            <PencilIcon /> Renomear
          </DropdownMenuItem>
          {hasDone && (
            <>
              <DropdownMenuItem onClick={() => run(() => uncheckAllEntries(id))}>
                <RotateCcwIcon /> Desmarcar tudo (reusar a lista)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => run(() => clearDoneEntries(id))}>
                <CheckCheckIcon /> Remover os marcados
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => setConfirmDelete(true)}>
            <Trash2Icon /> Excluir lista
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={renaming} onOpenChange={setRenaming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renomear lista</DialogTitle>
          </DialogHeader>
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              run(
                () => renameList(id, newName),
                () => setRenaming(false),
              );
            }}
          >
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} required maxLength={60} aria-label="Nome" />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRenaming(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={pending}>
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir a lista &quot;{name}&quot;?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Os itens dela também serão apagados.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() => run(() => deleteList(id), () => router.push("/listas"))}
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
