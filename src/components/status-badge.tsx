import { cn } from "@/lib/utils";
import { relativeDaysLabel } from "@/lib/dates";
import { STATUS_META, type DeadlineStatus } from "@/lib/deadlines";

export function StatusBadge({
  status,
  daysLeft,
  className,
}: {
  status: DeadlineStatus;
  daysLeft?: number;
  className?: string;
}) {
  const meta = STATUS_META[status];
  const label =
    daysLeft === undefined
      ? meta.label
      : status === "expired"
        ? `Venceu ${relativeDaysLabel(daysLeft)}`
        : `Vence ${relativeDaysLabel(daysLeft)}`;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        meta.className,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", meta.dot)} aria-hidden />
      {label}
    </span>
  );
}
