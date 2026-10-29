import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { QuickLogDialog } from "@/components/dashboard/quick-log-dialog";
import { ListActions } from "@/components/listas/list-actions";
import { ListEntries } from "@/components/listas/list-entries";
import { requireUser } from "@/lib/session";
import { getList } from "@/lib/queries/lists";
import { listTags } from "@/lib/queries/activities";
import { todayISO } from "@/lib/dates";

export const metadata: Metadata = { title: "Lista" };

export default async function ListaPage(props: PageProps<"/listas/[id]">) {
  const user = await requireUser();
  const { id } = await props.params;
  const [list, tags] = await Promise.all([getList(user, id), listTags(user)]);
  if (!list) notFound();

  const pending = list.entries.filter((e) => !e.done).length;

  return (
    <>
      <Link href="/listas" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeftIcon className="size-4" /> Listas
      </Link>
      <PageHeader
        module="listas"
        title={list.name}
        description={pending ? `${pending} ${pending === 1 ? "item" : "itens"} a comprar` : "Nada pendente"}
      >
        {/* a lista não vai para o relatório; a ida às compras sim, se for agendada como atividade */}
        <QuickLogDialog
          today={todayISO(user.timezone)}
          knownTags={tags}
          label="Agendar ida"
          title={`Agendar: ${list.name}`}
          defaultTitle={`Compras: ${list.name}`}
          variant="outline"
        />
        <ListActions id={list.id} name={list.name} hasDone={list.entries.some((e) => e.done)} />
      </PageHeader>

      <ListEntries listId={list.id} entries={list.entries} />
    </>
  );
}
