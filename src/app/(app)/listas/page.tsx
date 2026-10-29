import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/page-header";
import { NewListForm } from "@/components/listas/new-list-form";
import { requireUser } from "@/lib/session";
import { listLists } from "@/lib/queries/lists";

export const metadata: Metadata = { title: "Listas" };

export default async function ListasPage() {
  const user = await requireUser();
  const lists = await listLists(user);

  return (
    <>
      <PageHeader
        module="listas"
        title="Listas"
        description="Compras e listas avulsas (mercado, papelaria…). Não entram no relatório."
      />
      <NewListForm />

      {lists.length === 0 ? (
        <EmptyState>Nenhuma lista ainda. Crie uma acima, por exemplo &quot;Mercado&quot;.</EmptyState>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {lists.map((l) => (
            <li key={l.id}>
              <Link
                href={`/listas/${l.id}`}
                className="flex h-full flex-col gap-2 rounded-xl border border-t-4 border-t-teal-500 bg-card p-4 transition-colors hover:border-foreground/30 hover:border-t-teal-500"
              >
                <div className="flex items-baseline gap-2">
                  <span className="truncate font-medium">{l.name}</span>
                  <span className="ml-auto shrink-0 rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-800 dark:bg-teal-500/15 dark:text-teal-300">
                    {l.pending}
                  </span>
                </div>
                {l.preview.length > 0 ? (
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {l.preview.join(" · ")}
                    {l.pending > l.preview.length && " …"}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">{l.done ? "Tudo marcado." : "Vazia."}</p>
                )}
                <p className="mt-auto text-xs text-muted-foreground">
                  {l.pending} a comprar
                  {l.done > 0 && ` · ${l.done} ${l.done === 1 ? "marcado" : "marcados"}`}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
