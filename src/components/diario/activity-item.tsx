"use client";

import { useState } from "react";
import Link from "next/link";
import { ClockIcon, LogOutIcon, PencilIcon, UsersIcon } from "lucide-react";
import { formatTimeRange } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDelete } from "@/components/confirm-delete";
import { ConfirmAction } from "@/components/confirm-action";
import { ActivityForm } from "@/components/diario/activity-form";
import { deleteActivity, leaveActivity } from "@/app/(app)/diario/actions";
import type { ActivityView } from "@/lib/queries/activities";
import { sharedLabel } from "@/lib/shared-label";

export function ActivityItem({
  activity,
  today,
  knownTags,
}: {
  activity: ActivityView;
  today: string;
  knownTags: string[];
}) {
  const [editing, setEditing] = useState(false);
  const timeRange = formatTimeRange(activity.startTime, activity.endTime);
  const shared = sharedLabel(activity);

  return (
    <li className="group flex gap-3 py-3">
      <div className="min-w-0 flex-1">
        {timeRange && (
          <p className="mb-0.5 flex items-center gap-1 text-xs font-medium text-muted-foreground tabular-nums">
            <ClockIcon className="size-3" /> {timeRange}
          </p>
        )}
        <p className="font-medium">{activity.title}</p>
        {activity.notes && (
          <p className="mt-0.5 text-sm whitespace-pre-line text-muted-foreground">{activity.notes}</p>
        )}
        {(activity.tags.length > 0 || shared) && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {shared && (
              <span className="inline-flex items-center gap-1 rounded-full bg-pink-100 px-2 py-0.5 text-xs text-pink-800 dark:bg-pink-500/15 dark:text-pink-300">
                <UsersIcon className="size-3" /> {shared}
              </span>
            )}
            {activity.tags.map((tag) => (
              <Link
                key={tag}
                href={`/diario?tag=${encodeURIComponent(tag)}`}
                className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground"
              >
                #{tag}
              </Link>
            ))}
          </div>
        )}
      </div>
      <div className="flex shrink-0 items-start gap-0.5 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100">
        <Button variant="ghost" size="icon-sm" aria-label="Editar" onClick={() => setEditing(true)}>
          <PencilIcon />
        </Button>
        {activity.mine ? (
          <ConfirmDelete
            what="atividade"
            description={
              shared ? `Ela também some para ${activity.sharedWith.map((u) => `@${u}`).join(", ")}.` : undefined
            }
            action={() => deleteActivity(activity.id)}
          />
        ) : (
          <ConfirmAction
            title="Sair do compromisso?"
            description={`Ele deixa de aparecer para você, mas continua para @${activity.owner}.`}
            confirmLabel="Sair"
            action={() => leaveActivity(activity.id)}
            trigger={
              <Button variant="ghost" size="icon-sm" aria-label="Sair do compromisso">
                <LogOutIcon />
              </Button>
            }
          />
        )}
      </div>
      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar atividade</DialogTitle>
          </DialogHeader>
          <ActivityForm activity={activity} today={today} knownTags={knownTags} onDone={() => setEditing(false)} />
        </DialogContent>
      </Dialog>
    </li>
  );
}
