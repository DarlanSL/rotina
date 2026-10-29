"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { failure, success, type ActionResult } from "@/lib/action-result";

/** Tag "pessoal": atividades com ela passam a vir desmarcadas no relatório enviado. */
export async function setTagHiddenInReport(tag: string, hidden: boolean): Promise<ActionResult> {
  const user = await requireUser();
  const { count } = await db.tag.updateMany({ where: { userId: user.id, name: tag }, data: { reportHidden: hidden } });
  if (!count) return failure("Tag não encontrada");
  revalidatePath("/relatorios");
  return success(hidden ? `#${tag} não sai mais no relatório` : `#${tag} volta a sair no relatório`);
}
