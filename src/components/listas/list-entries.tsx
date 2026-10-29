"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";
import { PlusIcon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { addListEntries, deleteListEntry, setListEntryDone } from "@/app/(app)/listas/actions";
import { splitListEntries } from "@/lib/validations";
import { cn } from "@/lib/utils";
import type { ActionResult } from "@/lib/action-result";
import type { ListEntryView } from "@/lib/queries/lists";

type Change =
  | { type: "add"; texts: string[] }
  | { type: "toggle"; id: string; done: boolean }
  | { type: "delete"; id: string };

function applyChange(entries: ListEntryView[], change: Change): ListEntryView[] {
  switch (change.type) {
    case "add": {
      const pending = entries.filter((e) => !e.done);
      const added = change.texts.map((text, i) => ({ id: `novo-${i}-${text}`, text, done: false }));
      return [...pending, ...added, ...entries.filter((e) => e.done)];
    }
    case "toggle": {
      const entry = entries.find((e) => e.id === change.id);
      if (!entry) return entries;
      const rest = entries.filter((e) => e.id !== change.id);
      // marcado vai para o topo dos marcados; desmarcado volta para o fim dos que faltam
      return [...rest.filter((e) => !e.done), { ...entry, done: change.done }, ...rest.filter((e) => e.done)];
    }
    case "delete":
      return entries.filter((e) => e.id !== change.id);
  }
}

/**
 * Itens da lista. As marcações aparecem na hora (otimista) — no mercado não dá para esperar a rede.
 */
export function ListEntries({ listId, entries }: { listId: string; entries: ListEntryView[] }) {
  const [optimistic, change] = useOptimistic(entries, applyChange);
  const [, startTransition] = useTransition();
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function send(update: Change, action: () => Promise<ActionResult>) {
    startTransition(async () => {
      change(update);
      try {
        const result = await action();
        if (!result.ok) toast.error(result.error);
      } catch {
        toast.error("Sem conexão? Não foi possível salvar.");
      }
    });
  }

  function onAdd(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const texts = splitListEntries(text);
    if (texts.length === 0) return;
    setText("");
    inputRef.current?.focus();
    send({ type: "add", texts }, () => addListEntries(listId, text));
  }

  const pending = optimistic.filter((e) => !e.done);
  const done = optimistic.filter((e) => e.done);

  const row = (e: ListEntryView) => (
    <li key={e.id} className="flex items-center gap-3 py-2.5">
      <Checkbox
        checked={e.done}
        aria-label={e.done ? `Desmarcar ${e.text}` : `Marcar ${e.text}`}
        className="size-5"
        onCheckedChange={(checked) =>
          send({ type: "toggle", id: e.id, done: checked }, () => setListEntryDone(e.id, checked))
        }
      />
      <span className={cn("min-w-0 flex-1 wrap-break-word", e.done && "text-muted-foreground line-through")}>{e.text}</span>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Remover ${e.text}`}
        className="text-muted-foreground"
        onClick={() => send({ type: "delete", id: e.id }, () => deleteListEntry(e.id))}
      >
        <XIcon />
      </Button>
    </li>
  );

  return (
    <div className="grid gap-4">
      <form onSubmit={onAdd} className="flex gap-2">
        <Input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Adicionar item (ou vários, separados por vírgula)"
          aria-label="Novo item"
          autoComplete="off"
          enterKeyHint="done"
          className="flex-1"
        />
        <Button type="submit" size="icon" aria-label="Adicionar item">
          <PlusIcon />
        </Button>
      </form>

      <section className="rounded-xl border bg-card px-4 py-1">
        {pending.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            {done.length ? "Tudo pego! 🎉" : "Lista vazia. Adicione o primeiro item acima."}
          </p>
        ) : (
          <ul className="divide-y" aria-label="A comprar">
            {pending.map(row)}
          </ul>
        )}
      </section>

      {done.length > 0 && (
        <section>
          <h2 className="mb-1 text-sm font-semibold text-muted-foreground">
            Marcados <span className="font-normal">· {done.length}</span>
          </h2>
          <ul className="divide-y rounded-xl border bg-muted/30 px-4 py-1" aria-label="Marcados">
            {done.map(row)}
          </ul>
        </section>
      )}
    </div>
  );
}
