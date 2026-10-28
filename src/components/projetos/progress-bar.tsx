import { cn } from "@/lib/utils";

export function ProgressBar({
  done,
  total,
  percent,
  className,
}: {
  done: number;
  total: number;
  percent: number;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>
          {done} de {total} melhoria(s) realizada(s)
        </span>
        <span className="font-medium text-foreground tabular-nums">{percent}%</span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
