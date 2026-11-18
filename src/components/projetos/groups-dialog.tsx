"use client";

import { useState } from "react";
import { CheckIcon, FolderTreeIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ConfirmDelete } from "@/components/confirm-delete";
import { useAction } from "@/components/use-action";
import { createProjectGroup, deleteProjectGroup, renameProjectGroup } from "@/app/(app)/projetos/actions";

type Group = { id: string; name: string; count: number };

function GroupRow({ group }: { group: Group }) {
  const [name, setName] = useState(group.name);
  const { pending, run } = useAction();
  const changed = name.trim() !== group.name && name.trim() !== "";

  return (
    <li className="flex items-center gap-2 py-2">
      <form
        className="flex flex-1 items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (changed) run(() => renameProjectGroup(group.id, name));
        }}
      >
        <Input
          aria-label={`Nome do grupo ${group.name}`}
          value={name}
          maxLength={60}
          onChange={(e) => setName(e.target.value)}
          className="h-8"
        />
        {changed && (
          <Button type="submit" size="icon-sm" variant="outline" disabled={pending} aria-label="Salvar nome">
            <CheckIcon />
          </Button>
        )}
      </form>
      <span className="w-16 shrink-0 text-right text-xs text-muted-foreground">
        {group.count} {group.count === 1 ? "projeto" : "projetos"}
      </span>
      <ConfirmDelete
        what={`grupo "${group.name}"`}
        description="Os projetos dele não são apagados: ficam em Sem grupo."
        action={() => deleteProjectGroup(group.id)}
      />
    </li>
  );
}

/** Criar, renomear e excluir grupos de projetos. */
export function GroupsDialog({ groups }: { groups: Group[] }) {
  const [name, setName] = useState("");
  const { pending, run } = useAction();

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button variant="outline">
            <FolderTreeIcon /> Grupos
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Grupos de projetos</DialogTitle>
          <DialogDescription>Ex.: Pessoais, Trabalho, Viagem. Escolha o grupo ao criar ou editar um projeto.</DialogDescription>
        </DialogHeader>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            run(
              () => createProjectGroup(name),
              () => setName(""),
            );
          }}
        >
          <Input
            aria-label="Nome do novo grupo"
            placeholder="Novo grupo"
            value={name}
            maxLength={60}
            onChange={(e) => setName(e.target.value)}
          />
          <Button type="submit" disabled={pending || !name.trim()}>
            <PlusIcon /> Criar
          </Button>
        </form>
        {groups.length > 0 ? (
          <ul className="-my-1 max-h-[50vh] divide-y overflow-y-auto">
            {groups.map((g) => (
              <GroupRow key={`${g.id}-${g.name}`} group={g} />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhum grupo ainda.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
