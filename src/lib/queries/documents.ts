import "server-only";
import { db } from "@/lib/db";
import { diffDays, fromDbDate, todayISO } from "@/lib/dates";
import { getDeadlineStatus } from "@/lib/deadlines";
import type { CurrentUser } from "@/lib/session";

type DocumentRow = {
  id: string;
  name: string;
  type: string;
  issuer: string | null;
  expiresAt: Date;
  warnDays: number;
  notes: string | null;
};

export function toDocumentView(d: DocumentRow, today: string) {
  const expires = fromDbDate(d.expiresAt);
  return {
    id: d.id,
    name: d.name,
    type: d.type,
    issuer: d.issuer,
    notes: d.notes,
    warnDays: d.warnDays,
    expiresAt: expires,
    daysLeft: diffDays(expires, today),
    status: getDeadlineStatus(expires, d.warnDays, today),
  };
}

export type DocumentView = ReturnType<typeof toDocumentView>;

export async function listDocuments(user: CurrentUser) {
  const today = todayISO(user.timezone);
  const rows = await db.document.findMany({
    where: { userId: user.id },
    orderBy: { expiresAt: "asc" },
  });
  return rows.map((d) => toDocumentView(d, today));
}
