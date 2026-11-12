import { db } from "@/lib/db";
import { morningDigest, pushConfigured, sendPush } from "@/lib/push";

/**
 * Resumo da manhã (agendado em vercel.json, ~9h de Brasília).
 * A Vercel chama com "Authorization: Bearer <CRON_SECRET>".
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Não autorizado" }, { status: 401 });
  }
  if (!pushConfigured()) return Response.json({ error: "Push não configurado" }, { status: 503 });

  const users = await db.user.findMany({
    where: { pushSubscriptions: { some: {} } },
    select: { id: true, name: true, username: true, timezone: true },
  });
  let sent = 0;
  for (const user of users) {
    try {
      const digest = await morningDigest(user);
      if (digest) sent += await sendPush(user.id, { ...digest, url: "/", tag: "resumo" });
    } catch (error) {
      console.error("resumo falhou para", user.username, error);
    }
  }
  return Response.json({ users: users.length, sent });
}
