import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { morningDigest, pushConfigured, sendPush } from "@/lib/push";

/** Manda agora o resumo do dia para os aparelhos do usuário (botão "Testar"). */
export async function POST() {
  const userId = (await auth())?.user?.id;
  if (!userId) return Response.json({ error: "Não autenticado" }, { status: 401 });
  if (!pushConfigured()) return Response.json({ error: "Push não configurado no servidor" }, { status: 503 });
  const user = await db.user.findUnique({ where: { id: userId }, select: { id: true, name: true, username: true, timezone: true } });
  if (!user) return Response.json({ error: "Não autenticado" }, { status: 401 });

  const digest = await morningDigest(user);
  const sent = await sendPush(user.id, {
    title: digest?.title ?? "Teste: notificações ligadas",
    body: digest?.body ?? "Nada para hoje. O resumo chega todo dia por volta das 9h quando houver algo.",
    url: "/",
    tag: "resumo",
  });
  return Response.json({ sent });
}
