"use client";

import { CheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAction } from "@/components/use-action";
import { setItemStatus } from "@/app/(app)/ideias/actions";

export function ItemDoneButton({ itemId }: { itemId: string }) {
  const { pending, run } = useAction();
  return (
    <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => setItemStatus(itemId, "DONE"))}>
      <CheckIcon /> Feito
    </Button>
  );
}
