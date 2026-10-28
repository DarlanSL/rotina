import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * Usuário logado (id, nome, fuso). Redireciona para /login se não houver sessão.
 * Toda query e Server Action deve partir daqui para garantir o isolamento por usuário.
 */
export const requireUser = cache(async () => {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, username: true, timezone: true },
  });
  if (!user) redirect("/login");
  return user;
});

export type CurrentUser = Awaited<ReturnType<typeof requireUser>>;
