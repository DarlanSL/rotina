import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getNotificationFeed } from "@/lib/queries/notifications";

/** Feed de eventos para os avisos do navegador (consultado periodicamente pelo cliente). */
export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return Response.json({ error: "Não autenticado" }, { status: 401 });

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, username: true, timezone: true },
  });
  if (!user) return Response.json({ error: "Não autenticado" }, { status: 401 });

  return Response.json(await getNotificationFeed(user), { headers: { "Cache-Control": "no-store" } });
}
