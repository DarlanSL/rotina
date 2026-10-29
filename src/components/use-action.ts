"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import type { ActionResult } from "@/lib/action-result";

/** Executa uma Server Action com estado de "pendente" e feedback via toast. */
export function useAction() {
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<ActionResult>, onSuccess?: (result: Extract<ActionResult, { ok: true }>) => void) {
    startTransition(async () => {
      try {
        const result = await action();
        if (result.ok) {
          if (result.message) toast.success(result.message);
          // avisa o motor de notificações para recarregar os horários
          window.dispatchEvent(new Event("rotina:data-changed"));
          onSuccess?.(result);
        } else {
          toast.error(result.error);
        }
      } catch (error) {
        // redirect() de Server Action lança um erro especial que precisa propagar
        if (error instanceof Error && "digest" in error && String(error.digest).startsWith("NEXT_REDIRECT")) throw error;
        toast.error("Algo deu errado. Tente novamente.");
      }
    });
  }

  return { pending, run };
}
