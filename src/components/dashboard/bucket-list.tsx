import Link from "next/link";
import { AlarmClockIcon, CalendarClockIcon, FileTextIcon, RefreshCwIcon, WrenchIcon } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { CompleteButton } from "@/components/rotinas/complete-button";
import { PostponeDialog } from "@/components/rotinas/postpone-dialog";
import { ItemDoneButton } from "@/components/dashboard/item-done-button";
import { TONES, type Tone } from "@/components/layout/nav-items";
import { formatDateBR, formatDateTimeBR, formatTimeOfDay } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { Bucket, ScheduledItem } from "@/lib/queries/dashboard";
import type { ActivityView } from "@/lib/queries/activities";
import type { DocumentView } from "@/lib/queries/documents";
import type { RoutineView } from "@/lib/queries/routines";

function Row({
  icon: Icon,
  tone,
  title,
  subtitle,
  href,
  badge,
  actions,
  muted,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tone: Tone;
  title: string;
  subtitle: string;
  href: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  /** Já passou (ex: atividade de hoje que já começou) */
  muted?: boolean;
}) {
  return (
    <li className={cn("flex flex-wrap items-center gap-x-3 gap-y-2 py-3", muted && "opacity-60")}>
      <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", TONES[tone].tile)}>
        <Icon className="size-4" />
      </span>
      <Link href={href} className="min-w-0 flex-1 hover:underline">
        <p className="line-clamp-2 text-sm font-medium">{title}</p>
        <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
      </Link>
      {(badge || actions) && (
        <div className="flex flex-wrap items-center justify-end gap-1.5 max-sm:w-full max-sm:justify-between max-sm:pl-12">
          {badge}
          <div className="flex items-center gap-1">{actions}</div>
        </div>
      )}
    </li>
  );
}

type RowContext = { timezone: string; today: string; showDue: boolean };

export function ActivityRow({ activity: a, muted }: { activity: ActivityView; muted?: boolean }) {
  return (
    <Row
      icon={CalendarClockIcon}
      tone="sky"
      title={a.title}
      subtitle={`Atividade${a.startTime ? ` · ${a.startTime}${a.endTime ? `–${a.endTime}` : ""}` : ""}${
        a.tags.length ? ` · ${a.tags.map((t) => `#${t}`).join(" ")}` : ""
      }`}
      href="/diario"
      muted={muted}
    />
  );
}

export function ItemRow({ item: i, timezone, showDue }: { item: ScheduledItem } & Omit<RowContext, "today">) {
  const isReminder = i.type === "REMINDER";
  const when = showDue ? formatDateTimeBR(i.remindAt, timezone) : formatTimeOfDay(i.remindAt, timezone);
  return (
    <Row
      icon={isReminder ? AlarmClockIcon : WrenchIcon}
      tone={isReminder ? "emerald" : "rose"}
      title={i.title}
      subtitle={`${isReminder ? "Lembrete" : "Prazo de melhoria"} · ${when}${i.project ? ` · ${i.project.name}` : ""}`}
      href={i.project ? `/projetos/${i.project.id}` : `/ideias?tipo=${i.type}`}
      badge={
        i.priority === "HIGH" ? (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-500/15 dark:text-red-300">
            Alta
          </span>
        ) : undefined
      }
      actions={<ItemDoneButton itemId={i.id} title={i.title} />}
    />
  );
}

export function RoutineRow({ routine: r, today, showDue }: { routine: RoutineView } & Omit<RowContext, "timezone">) {
  return (
    <Row
      icon={RefreshCwIcon}
      tone="violet"
      title={r.title}
      subtitle={`Revisão · a cada ${r.intervalDays} dia(s)${showDue ? ` · prevista ${formatDateBR(r.nextDueAt)}` : ""}`}
      href="/rotinas"
      badge={showDue ? <StatusBadge status={r.status} daysLeft={r.daysLeft} /> : undefined}
      actions={
        <>
          <PostponeDialog routine={r} today={today} size="xs" />
          <CompleteButton routineId={r.id} />
        </>
      }
    />
  );
}

export function DocumentRow({ document: d }: { document: DocumentView }) {
  return (
    <Row
      icon={FileTextIcon}
      tone="amber"
      title={d.name}
      subtitle={`${d.type}${d.issuer ? ` · ${d.issuer}` : ""} · vence ${formatDateBR(d.expiresAt)}`}
      href={`/documentos?status=${d.status}`}
      badge={<StatusBadge status={d.status} daysLeft={d.daysLeft} />}
    />
  );
}

/**
 * Lista unificada de pendências com prazo.
 * `showDue` mostra a data/selo de prazo (útil em vencidos e próximos; em "hoje" é redundante).
 */
export function BucketList({
  bucket,
  timezone,
  today,
  showDue = true,
}: {
  bucket: Bucket;
  timezone: string;
  today: string;
  showDue?: boolean;
}) {
  return (
    <ul className="-my-3 divide-y">
      {bucket.activities.map((a) => (
        <ActivityRow key={`act-${a.id}`} activity={a} />
      ))}
      {bucket.items.map((i) => (
        <ItemRow key={`item-${i.id}`} item={i} timezone={timezone} showDue={showDue} />
      ))}
      {bucket.routines.map((r) => (
        <RoutineRow key={`rt-${r.id}`} routine={r} today={today} showDue={showDue} />
      ))}
      {bucket.documents.map((d) => (
        <DocumentRow key={`doc-${d.id}`} document={d} />
      ))}
    </ul>
  );
}
