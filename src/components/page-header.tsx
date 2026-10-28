import { cn } from "@/lib/utils";
import { getModule, TONES, type ModuleKey } from "@/components/layout/nav-items";

export function PageHeader({
  title,
  description,
  module,
  children,
}: {
  title: string;
  description?: string;
  /** Mostra o ícone colorido do módulo ao lado do título */
  module?: ModuleKey;
  children?: React.ReactNode;
}) {
  const mod = module ? getModule(module) : null;
  const Icon = mod?.icon;

  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        {Icon && mod && (
          <span
            className={cn(
              "hidden size-11 shrink-0 items-center justify-center rounded-xl sm:flex",
              TONES[mod.tone].tile,
            )}
          >
            <Icon className="size-5" />
          </span>
        )}
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed bg-card/50 p-8 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}
