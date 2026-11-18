import "server-only";
import * as webpush from "web-push";
import { db } from "@/lib/db";
import { getDashboardData } from "@/lib/queries/dashboard";
import { digestText } from "@/lib/push-digest";
import type { CurrentUser } from "@/lib/session";

export const pushConfigured = () =>
  Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);

let ready = false;
function setup() {
  if (ready) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@example.com",
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  ready = true;
}

export type PushPayload = { title: string; body: string; url: string; tag?: string };

/** Envia para todos os aparelhos do usuário; apaga os que não existem mais (desinstalou, revogou). */
export async function sendPush(userId: string, payload: PushPayload) {
  setup();
  const subs = await db.pushSubscription.findMany({ where: { userId } });
  let sent = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload),
          { TTL: 6 * 60 * 60, urgency: "normal" },
        );
        sent++;
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) await db.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
        else console.error("push falhou", status, (error as Error).message);
      }
    }),
  );
  return sent;
}

/** Resumo do dia do usuário (agenda, o que vence hoje, atrasados). */
export async function morningDigest(user: CurrentUser) {
  const data = await getDashboardData(user);
  const { agenda, overdue, upcoming } = data;
  return digestText({
    activities: [...data.activities, ...agenda.activities],
    routinesToday: agenda.routines.map((r) => r.title),
    documentsToday: agenda.documents.map((d) => d.name),
    remindersToday: agenda.items.map((i) => i.title),
    billsToday: agenda.bills.map((b) => ({ title: b.title, kind: b.kind, amountCents: b.amountCents })),
    overdue: [
      ...overdue.routines.map((r) => r.title),
      ...overdue.documents.map((d) => d.name),
      ...overdue.items.map((i) => i.title),
      ...overdue.bills.map((b) => `${b.title} (conta)`),
    ],
    documentsSoon: upcoming.documents.map((d) => ({ name: d.name, daysLeft: d.daysLeft })),
  });
}
