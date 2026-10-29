"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCheckIcon,
  LogOutIcon,
  MoreHorizontalIcon,
  PencilIcon,
  RotateCcwIcon,
  Trash2Icon,
  UserPlusIcon,
  XIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAction } from "@/components/use-action";
import {
  clearDoneEntries,
  deleteList,
  leaveList,
  renameList,
  shareList,
  uncheckAllEntries,
  unshareList,
} from "@/app/(app)/listas/actions";

type Member = { id: string; username: string };

export function ListActions({
  id,
  name,
  hasDone,
  mine,
  owner,
  members,
}: {
  id: string;
  name: string;
  hasDone: boolean;
  /** Sou o dono? (só o dono compartilha e exclui) */
  mine: boolean;
  owner: string;
  members: Member[];
}) {
  const [renaming, setRenaming] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [sharing, setSharing] = useState(false);
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
          {mine && (
            <DropdownMenuItem onClick={() => setSharing(true)}>
              <UserPlusIcon /> Compartilhar
            </DropdownMenuItem>
          )}
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
          {mine ? (
            <DropdownMenuItem variant="destructive" onClick={() => setConfirmDelete(true)}>
              <Trash2Icon /> Excluir lista
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem variant="destructive" onClick={() => setConfirmLeave(true)}>
              <LogOutIcon /> Sair da lista
            </DropdownMenuItem>
          )}
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

      {mine && <ShareDialog open={sharing} onOpenChange={setSharing} listId={id} members={members} />}

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir a lista &quot;{name}&quot;?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Os itens dela também serão apagados
            {members.length > 0 && <>, inclusive para {members.map((m) => `@${m.username}`).join(", ")}</>}.
          </p>
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

      <Dialog open={confirmLeave} onOpenChange={setConfirmLeave}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sair da lista &quot;{name}&quot;?</DialogTitle>
            <DialogDescription>Ela deixa de aparecer para você, mas continua para @{owner}.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmLeave(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() => run(() => leaveList(id), () => router.push("/listas"))}
            >
              Sair
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ShareDialog({
  open,
  onOpenChange,
  listId,
  members,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listId: string;
  members: Member[];
}) {
  const [username, setUsername] = useState("");
  const { pending, run } = useAction();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Compartilhar lista</DialogTitle>
          <DialogDescription>Quem receber vê e edita os mesmos itens.</DialogDescription>
        </DialogHeader>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            run(
              () => shareList(listId, username),
              () => setUsername(""),
            );
          }}
        >
          <Input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="usuário (ex: ana)"
            aria-label="Usuário"
            required
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
          <Button type="submit" disabled={pending}>
            Compartilhar
          </Button>
        </form>
        {members.length > 0 && (
          <ul className="grid gap-1" aria-label="Pessoas com acesso">
            {members.map((m) => (
              <li key={m.id} className="flex items-center justify-between rounded-lg bg-muted/60 py-1 pr-1 pl-3 text-sm">
                @{m.username}
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remover @${m.username}`}
                  disabled={pending}
                  onClick={() => run(() => unshareList(listId, m.id))}
                >
                  <XIcon />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
