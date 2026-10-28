import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { QuickCapture } from "@/components/ideias/quick-capture";
import { ItemCard } from "@/components/ideias/item-card";
import { ProgressBar } from "@/components/projetos/progress-bar";
import { ProjectActions } from "@/components/projetos/project-actions";
import { requireUser } from "@/lib/session";
import { listItems, type ItemView } from "@/lib/queries/items";
import { getProject, improvementProgress, listProjectOptions } from "@/lib/queries/projects";
import { ITEM_TYPE_LABEL } from "@/lib/labels";

export const metadata: Metadata = { title: "Projeto" };

function Section({
  title,
  items,
  render,
}: {
  title: string;
  items: ItemView[];
  render: (item: ItemView) => React.ReactNode;
}) {
  if (items.length === 0) return null;
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold text-muted-foreground">
        {title} <span className="font-normal">· {items.length}</span>
      </h2>
      <ul className="grid gap-2">{items.map(render)}</ul>
    </section>
  );
}

export default async function ProjetoPage(props: PageProps<"/projetos/[id]">) {
  const user = await requireUser();
  const { id } = await props.params;
  const project = await getProject(user, id);
  if (!project) notFound();

  const [items, projects] = await Promise.all([
    listItems(user, { projectId: id, status: "all" }),
    listProjectOptions(user),
  ]);

  const improvements = items.filter((i) => i.type === "IMPROVEMENT");
  const progress = improvementProgress(improvements.map((i) => i.status));
  const pendingImprovements = improvements.filter((i) => i.status === "OPEN" || i.status === "IN_PROGRESS");
  const doneImprovements = improvements.filter((i) => i.status === "DONE");
  const others = (type: "NOTE" | "IDEA" | "REMINDER") =>
    items.filter((i) => i.type === type && i.status !== "DISCARDED");
  const discarded = items.filter((i) => i.status === "DISCARDED");

  const card = (item: ItemView) => (
    <ItemCard
      key={item.id}
      item={item}
      projects={projects}
      timezone={user.timezone}
      showProject={false}
    />
  );

  return (
    <>
      <Link
        href="/projetos"
        className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" /> Projetos
      </Link>
      <PageHeader title={project.name} description={project.description ?? undefined}>
        <ProjectActions
          project={{
            id: project.id,
            name: project.name,
            description: project.description,
            color: project.color,
            archived: project.archived,
          }}
        />
      </PageHeader>

      <div className="mb-6 rounded-xl border bg-card p-4">
        <ProgressBar {...progress} />
      </div>

      <div className="mb-6">
        <QuickCapture defaultType="IMPROVEMENT" projects={projects} projectId={id} />
      </div>

      <div className="space-y-6">
        {items.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">
            Adicione a primeira melhoria ou anotação deste projeto.
          </p>
        )}
        <Section title="Melhorias pendentes" items={pendingImprovements} render={card} />
        <Section title="Melhorias realizadas" items={doneImprovements} render={card} />
        <Section title={ITEM_TYPE_LABEL.NOTE.plural} items={others("NOTE")} render={card} />
        <Section title={ITEM_TYPE_LABEL.IDEA.plural} items={others("IDEA")} render={card} />
        <Section title={ITEM_TYPE_LABEL.REMINDER.plural} items={others("REMINDER")} render={card} />
        <Section title="Descartados" items={discarded} render={card} />
      </div>
    </>
  );
}
