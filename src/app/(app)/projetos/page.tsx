import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/page-header";
import { ProjectFormDialog } from "@/components/projetos/project-form";
import { ProgressBar } from "@/components/projetos/progress-bar";
import { requireUser } from "@/lib/session";
import { listProjects } from "@/lib/queries/projects";
import { projectColorClass } from "@/lib/labels";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Projetos" };

export default async function ProjetosPage(props: PageProps<"/projetos">) {
  const user = await requireUser();
  const { arquivados } = await props.searchParams;
  const showArchived = arquivados === "1";
  const projects = await listProjects(user, showArchived);

  return (
    <>
      <PageHeader module="projetos" title="Projetos" description="Agrupe anotações e acompanhe melhorias até serem realizadas.">
        <ProjectFormDialog />
      </PageHeader>

      {projects.length === 0 ? (
        <EmptyState>Nenhum projeto ainda. Crie um para organizar ideias e melhorias.</EmptyState>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <li key={p.id}>
              <Link
                href={`/projetos/${p.id}`}
                className={cn(
                  "flex h-full flex-col gap-3 rounded-xl border bg-card p-4 transition-colors hover:border-foreground/30",
                  p.archived && "opacity-60",
                )}
              >
                <div className="flex items-center gap-2">
                  <span className={cn("size-2.5 shrink-0 rounded-full", projectColorClass(p.color))} />
                  <span className="truncate font-medium">{p.name}</span>
                  {p.archived && <span className="ml-auto text-xs text-muted-foreground">Arquivado</span>}
                </div>
                {p.description && <p className="line-clamp-2 text-sm text-muted-foreground">{p.description}</p>}
                <div className="mt-auto grid gap-2">
                  <ProgressBar {...p.progress} />
                  <p className="text-xs text-muted-foreground">{p.pendingItems} item(ns) pendente(s)</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-6 text-center text-sm">
        <Link
          href={showArchived ? "/projetos" : "/projetos?arquivados=1"}
          className="text-muted-foreground hover:text-foreground"
        >
          {showArchived ? "Ocultar arquivados" : "Mostrar arquivados"}
        </Link>
      </p>
    </>
  );
}
