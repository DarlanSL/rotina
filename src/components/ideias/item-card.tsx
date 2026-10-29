"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlarmClockIcon,
  ArrowUpRightIcon,
  BanIcon,
  CircleDotIcon,
  ImagePlusIcon,
  MoreHorizontalIcon,
  PencilIcon,
  RotateCcwIcon,
  Trash2Icon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAction } from "@/components/use-action";
import { ConfirmDoneDialog } from "@/components/ideias/confirm-done-dialog";
import { AttachmentGallery, useMediaPicker, useMediaUpload } from "@/components/ideias/attachments";
import { MAX_ATTACHMENTS_PER_ITEM } from "@/lib/attachments";
import {
  ItemFields,
  withRemindAtIso,
  type ProjectOption,
} from "@/components/ideias/item-fields";
import {
  deleteItem,
  promoteToImprovement,
  setItemStatus,
  updateItem,
} from "@/app/(app)/ideias/actions";
import { formatDateTimeBR } from "@/lib/dates";
import {
  ITEM_STATUS_LABEL,
  ITEM_TYPE_LABEL,
  PRIORITY_LABEL,
  projectColorClass,
} from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { ItemView } from "@/lib/queries/items";
import type { ItemType } from "@/generated/prisma/enums";

/** Cor de cada tipo: ideia, anotação, lembrete, melhoria */
const TYPE_ACCENT: Record<ItemType, string> = {
  IDEA: "border-l-yellow-400",
  NOTE: "border-l-sky-400",
  REMINDER: "border-l-emerald-500",
  IMPROVEMENT: "border-l-rose-500",
};

export function ItemCard({
  item,
  projects,
  timezone,
  showType,
  showProject = true,
}: {
  item: ItemView;
  projects: ProjectOption[];
  timezone: string;
  showType?: boolean;
  showProject?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmDone, setConfirmDone] = useState(false);
  const [editType, setEditType] = useState<ItemType>(item.type);
  const { pending, run } = useAction();
  const { uploads, uploadFiles } = useMediaUpload();
  const canAttach = item.attachments.length + uploads.length < MAX_ATTACHMENTS_PER_ITEM;
  const picker = useMediaPicker((files) => uploadFiles(item.id, files, item.attachments.length + uploads.length));

  const done = item.status === "DONE";
  const discarded = item.status === "DISCARDED";

  function onEditSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = withRemindAtIso(event.currentTarget);
    run(
      () => updateItem(item.id, data),
      () => setEditing(false),
    );
  }

  return (
    <li
      className={cn(
        "flex gap-3 rounded-xl border border-l-4 bg-card p-3",
        TYPE_ACCENT[item.type],
        (done || discarded) && "border-l-border bg-muted/40",
      )}
    >
      <Checkbox
        className="mt-0.5"
        checked={done}
        disabled={pending || discarded}
        aria-label={done ? "Marcar como pendente" : "Marcar como realizado"}
        onCheckedChange={(checked) =>
          checked
            ? setConfirmDone(true)
            : run(() => setItemStatus(item.id, "OPEN"))
        }
      />

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "font-medium wrap-break-word",
            (done || discarded) && "text-muted-foreground line-through",
          )}
        >
          {item.title}
        </p>
        {item.content && (
          <p className="mt-0.5 line-clamp-3 text-sm whitespace-pre-line text-muted-foreground">
            {item.content}
          </p>
        )}
        {picker.input}
        <AttachmentGallery attachments={item.attachments} uploads={uploads} onAdd={picker.open} />

        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
          {showType && (
            <span className="rounded-full bg-muted px-2 py-0.5">
              {ITEM_TYPE_LABEL[item.type].singular}
            </span>
          )}
          {item.status === "IN_PROGRESS" && (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300">
              Em andamento
            </span>
          )}
          {discarded && (
            <span className="rounded-full bg-muted px-2 py-0.5">
              Descartado
            </span>
          )}
          {item.priority === "HIGH" && !done && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-red-800 dark:bg-red-500/15 dark:text-red-300">
              Prioridade alta
            </span>
          )}
          {item.remindAt && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5",
                item.overdue &&
                  "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300",
              )}
            >
              <AlarmClockIcon className="size-3" />
              {formatDateTimeBR(new Date(item.remindAt), timezone)}
            </span>
          )}
          {showProject && item.project && (
            <Link
              href={`/projetos/${item.project.id}`}
              className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 hover:bg-muted"
            >
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  projectColorClass(item.project.color),
                )}
              />
              {item.project.name}
            </Link>
          )}
          {done && item.completedAt && (
            <span className="text-muted-foreground">
              Realizado em{" "}
              {formatDateTimeBR(new Date(item.completedAt), timezone)}
            </span>
          )}
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon-sm" aria-label="Ações">
              <MoreHorizontalIcon />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onClick={() => setEditing(true)}>
            <PencilIcon /> Editar
          </DropdownMenuItem>
          {canAttach && (
            <DropdownMenuItem onClick={picker.open}>
              <ImagePlusIcon /> Adicionar foto ou vídeo
            </DropdownMenuItem>
          )}
          {item.status === "OPEN" && (
            <DropdownMenuItem
              onClick={() => run(() => setItemStatus(item.id, "IN_PROGRESS"))}
            >
              <CircleDotIcon /> Em andamento
            </DropdownMenuItem>
          )}
          {item.status !== "OPEN" && (
            <DropdownMenuItem
              onClick={() => run(() => setItemStatus(item.id, "OPEN"))}
            >
              <RotateCcwIcon /> Reabrir
            </DropdownMenuItem>
          )}
          {!discarded && (
            <DropdownMenuItem
              onClick={() => run(() => setItemStatus(item.id, "DISCARDED"))}
            >
              <BanIcon /> Descartar
            </DropdownMenuItem>
          )}
          {item.type !== "IMPROVEMENT" && projects.length > 0 && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <ArrowUpRightIcon /> Promover a melhoria
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {projects.map((p) => (
                  <DropdownMenuItem
                    key={p.id}
                    onClick={() =>
                      run(() => promoteToImprovement(item.id, p.id))
                    }
                  >
                    {p.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2Icon /> Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Editar {ITEM_TYPE_LABEL[editType].singular.toLowerCase()}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={onEditSubmit} className="grid gap-3">
            <ItemFields
              prefix={`it-${item.id}`}
              type={editType}
              onTypeChange={setEditType}
              projects={projects}
              defaults={{
                title: item.title,
                content: item.content,
                priority: item.priority,
                projectId: item.project?.id,
                remindAt: item.remindAt,
              }}
            />
            <p className="text-xs text-muted-foreground">
              Status: {ITEM_STATUS_LABEL[item.status]} · Prioridade:{" "}
              {PRIORITY_LABEL[item.priority]}
            </p>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditing(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={pending}>
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDoneDialog
        title={item.title}
        open={confirmDone}
        onOpenChange={setConfirmDone}
        pending={pending}
        onConfirm={() =>
          run(
            () => setItemStatus(item.id, "DONE"),
            () => setConfirmDone(false),
          )
        }
      />

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir &quot;{item.title}&quot;?</DialogTitle>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() =>
                run(
                  () => deleteItem(item.id),
                  () => setConfirmDelete(false),
                )
              }
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </li>
  );
}
