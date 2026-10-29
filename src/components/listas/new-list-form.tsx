"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAction } from "@/components/use-action";
import { createList } from "@/app/(app)/listas/actions";

/** Cria a lista e já abre para adicionar os itens. */
export function NewListForm() {
  const [name, setName] = useState("");
  const { pending, run } = useAction();
  const router = useRouter();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    run(
      () => createList(name),
      (result) => {
        setName("");
        if (result.id) router.push(`/listas/${result.id}`);
      },
    );
  }

  return (
    <form onSubmit={onSubmit} className="mb-6 flex gap-2 rounded-xl border bg-card p-3">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        maxLength={60}
        placeholder="Nova lista: Mercado, Papelaria…"
        aria-label="Nome da nova lista"
        autoComplete="off"
        className="flex-1"
      />
      <Button type="submit" disabled={pending}>
        <PlusIcon /> Criar lista
      </Button>
    </form>
  );
}
