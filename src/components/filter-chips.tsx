import Link from "next/link";
import { cn } from "@/lib/utils";

/** Chips de filtro baseados em links (estado na URL). */
export function FilterChips({
  options,
  active,
}: {
  options: { label: string; href: string; value: string; count?: number }[];
  active: string;
}) {
  return (
    <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
      {options.map((o) => (
        <Link
          key={o.value}
          href={o.href}
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors hover:bg-muted",
            active === o.value && "border-foreground bg-foreground text-background hover:bg-foreground/90",
          )}
        >
          {o.label}
          {o.count !== undefined && <span className="text-xs opacity-70">{o.count}</span>}
        </Link>
      ))}
    </div>
  );
}
