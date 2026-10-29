"use client";

import { useState } from "react";
import { CheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDoneDialog } from "@/components/ideias/confirm-done-dialog";
import { useAction } from "@/components/use-action";
import { setItemStatus } from "@/app/(app)/ideias/actions";

export function ItemDoneButton({ itemId, title }: { itemId: string; title: string }) {
  const [confirming, setConfirming] = useState(false);
  const { pending, run } = useAction();
  return (
    <>
      <Button size="sm" variant="outline" disabled={pending} onClick={() => setConfirming(true)}>
        <CheckIcon /> Feito
      </Button>
      <ConfirmDoneDialog
        title={title}
        open={confirming}
        onOpenChange={setConfirming}
        pending={pending}
        onConfirm={() =>
          run(
            () => setItemStatus(itemId, "DONE"),
            () => setConfirming(false),
          )
        }
      />
    </>
  );
}
