"use client";

import { useState } from "react";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ActivityForm } from "@/components/diario/activity-form";

export function QuickLogDialog({
  today,
  knownTags,
  className,
  label = "Registrar atividade",
  title = "O que você fez hoje?",
}: {
  today: string;
  knownTags: string[];
  className?: string;
  label?: string;
  title?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className={className}>
            <PlusIcon /> {label}
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <ActivityForm today={today} knownTags={knownTags} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
