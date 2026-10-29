"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { isActive, NAV_ITEMS, TONES } from "@/components/layout/nav-items";

/** `pathname` nulo = render estático (sem item ativo), usado como fallback do Suspense. */
export function SidebarLinks({ pathname }: { pathname: string | null }) {
  return (
    <>
      {NAV_ITEMS.map(({ href, label, icon: Icon, tone }) => {
        const active = pathname !== null && isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              active && TONES[tone].active,
            )}
          >
            <Icon className={cn("size-4", TONES[tone].icon)} />
            {label}
          </Link>
        );
      })}
    </>
  );
}

export function BottomLinks({ pathname }: { pathname: string | null }) {
  return (
    <ul className="grid grid-cols-7">
      {NAV_ITEMS.filter((i) => i.mobile).map((item) => {
        const Icon = item.icon;
        const active =
          pathname !== null &&
          (isActive(pathname, item.href) || (item.href === "/ideias" && pathname.startsWith("/projetos")));
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 py-2 text-[11px] font-medium text-muted-foreground",
                active && "text-foreground",
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-10 items-center justify-center rounded-full transition-colors",
                  active && TONES[item.tone].tile,
                )}
              >
                <Icon className={cn("size-5", active && "stroke-[2.25]")} />
              </span>
              {"shortLabel" in item ? item.shortLabel : item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function ActiveSidebarLinks() {
  return <SidebarLinks pathname={usePathname()} />;
}

export function ActiveBottomLinks() {
  return <BottomLinks pathname={usePathname()} />;
}
