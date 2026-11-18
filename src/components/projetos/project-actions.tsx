"use client";

import { ArchiveIcon, ArchiveRestoreIcon, PencilIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDelete } from "@/components/confirm-delete";
import { useAction } from "@/components/use-action";
import { ProjectFormDialog } from "@/components/projetos/project-form";
import { deleteProject, setProjectArchived } from "@/app/(app)/projetos/actions";

type ProjectData = {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  archived: boolean;
  groupId: string | null;
};

export function ProjectActions({ project, groups }: { project: ProjectData; groups: { id: string; name: string }[] }) {
  const { pending, run } = useAction();

  return (
    <>
      <ProjectFormDialog
        project={project}
        groups={groups}
        trigger={
          <Button variant="outline" size="sm">
            <PencilIcon /> Editar
          </Button>
        }
      />
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => run(() => setProjectArchived(project.id, !project.archived))}
      >
        {project.archived ? <ArchiveRestoreIcon /> : <ArchiveIcon />}
        {project.archived ? "Reativar" : "Arquivar"}
      </Button>
      <ConfirmDelete what="projeto (os itens serão mantidos sem projeto)" action={() => deleteProject(project.id)} />
    </>
  );
}
