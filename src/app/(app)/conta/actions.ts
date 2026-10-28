"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { hashPassword, verifyPassword } from "@/lib/password";
import { changePasswordSchema, firstError, profileSchema } from "@/lib/validations";
import { failure, success, type ActionResult } from "@/lib/action-result";

export async function updateProfile(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failure(firstError(parsed.error));

  await db.user.update({ where: { id: user.id }, data: { name: parsed.data.name } });
  revalidatePath("/", "layout");
  return success("Dados atualizados");
}

export async function changePassword(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = changePasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failure(firstError(parsed.error));

  const { passwordHash } = await db.user.findUniqueOrThrow({ where: { id: user.id }, select: { passwordHash: true } });
  if (!(await verifyPassword(parsed.data.current, passwordHash))) return failure("Senha atual incorreta");

  await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(parsed.data.password) } });
  return success("Senha alterada");
}
