import type { Metadata } from "next";
import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/page-header";
import { ProjectFormDialog } from "@/components/projetos/project-form";
import { GroupsDialog } from "@/components/projetos/groups-dialog";
import { ProgressBar } from "@/components/projetos/progress-bar";
import { requireUser } from "@/lib/session";
import { listProjectGroups, listProjects, type ProjectSummary } from "@/lib/queries/projects";
import { projectColorClass } from "@/lib/labels";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Projetos" };

function ProjectGrid({ projects }: { projects: ProjectSummary[] }) {
  return (
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
  );
}

export default async function ProjetosPage(props: PageProps<"/projetos">) {
  const user = await requireUser();
  const { arquivados } = await props.searchParams;
  const showArchived = arquivados === "1";
  const [projects, groups] = await Promise.all([listProjects(user, showArchived), listProjectGroups(user)]);

  const sections = [
    ...groups.map((g) => ({ id: g.id, name: g.name, projects: projects.filter((p) => p.groupId === g.id) })),
    { id: null, name: "Sem grupo", projects: projects.filter((p) => !p.groupId || !groups.some((g) => g.id === p.groupId)) },
  ];
  const groupCounts = groups.map((g) => ({ ...g, count: projects.filter((p) => p.groupId === g.id).length }));

  return (
    <>
      <PageHeader module="projetos" title="Projetos" description="Agrupe anotações e acompanhe melhorias até serem realizadas.">
        <GroupsDialog groups={groupCounts} />
        <ProjectFormDialog groups={groups} />
      </PageHeader>

      {projects.length === 0 && groups.length === 0 ? (
        <EmptyState>
          Nenhum projeto ainda. Crie um para organizar ideias e melhorias — e use Grupos para separar, por exemplo,
          Pessoais, Trabalho e Viagem.
        </EmptyState>
      ) : groups.length === 0 ? (
        <ProjectGrid projects={projects} />
      ) : (
        <div className="space-y-8">
          {sections.map((s) =>
            s.id === null && s.projects.length === 0 ? null : (
              <section key={s.id ?? "none"} aria-labelledby={`grupo-${s.id ?? "none"}`}>
                <div className="mb-3 flex items-center gap-2">
                  <h2 id={`grupo-${s.id ?? "none"}`} className="text-base font-semibold">
                    {s.name}
                  </h2>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{s.projects.length}</span>
                  {s.id && (
                    <ProjectFormDialog
                      groups={groups}
                      defaultGroupId={s.id}
                      trigger={
                        <Button variant="ghost" size="icon-sm" className="ml-auto" aria-label={`Novo projeto em ${s.name}`}>
                          <PlusIcon />
                        </Button>
                      }
                    />
                  )}
                </div>
                {s.projects.length === 0 ? (
                  <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                    Nenhum projeto neste grupo.
                  </p>
                ) : (
                  <ProjectGrid projects={s.projects} />
                )}
              </section>
            ),
          )}
        </div>
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
