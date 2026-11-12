import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const subscriptionSchema = z.object({
  endpoint: z.url().max(2000),
  keys: z.object({ p256dh: z.string().min(1).max(500), auth: z.string().min(1).max(500) }),
});

/** Chave pública para o navegador se inscrever (null = push não configurado no servidor). */
export async function GET() {
  return Response.json({ publicKey: process.env.VAPID_PUBLIC_KEY || null });
}

/** Este aparelho passa a receber o resumo das 9h. */
export async function POST(request: Request) {
  const userId = (await auth())?.user?.id;
  if (!userId) return Response.json({ error: "Não autenticado" }, { status: 401 });
  const parsed = subscriptionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Inscrição inválida" }, { status: 400 });
  const { endpoint, keys } = parsed.data;
  // o mesmo aparelho pode trocar de conta: fica com quem se inscreveu por último
  await db.pushSubscription.upsert({
    where: { endpoint },
    create: { userId, endpoint, p256dh: keys.p256dh, auth: keys.auth },
    update: { userId, p256dh: keys.p256dh, auth: keys.auth },
  });
  return Response.json({ ok: true });
}

/** Este aparelho deixa de receber. */
export async function DELETE(request: Request) {
  const userId = (await auth())?.user?.id;
  if (!userId) return Response.json({ error: "Não autenticado" }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { endpoint?: string } | null;
  if (body?.endpoint) await db.pushSubscription.deleteMany({ where: { endpoint: body.endpoint, userId } });
  return Response.json({ ok: true });
}
