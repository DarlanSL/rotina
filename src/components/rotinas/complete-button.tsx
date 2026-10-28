"use client";

import { CheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAction } from "@/components/use-action";
import { completeRoutine } from "@/app/(app)/rotinas/actions";

export function CompleteButton({ routineId, completedToday }: { routineId: string; completedToday?: boolean }) {
  const { pending, run } = useAction();

  if (completedToday) {
    return (
      <span className="inline-flex h-7 items-center gap-1 px-2 text-xs font-medium text-emerald-700 dark:text-emerald-400">
        <CheckIcon className="size-3.5" /> Feita hoje
      </span>
    );
  }

  return (
    <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => completeRoutine(routineId))}>
      <CheckIcon />
      Concluir hoje
    </Button>
  );
}
