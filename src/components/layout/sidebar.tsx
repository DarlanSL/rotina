import { Suspense } from "react";
import Link from "next/link";
import { ActiveSidebarLinks, SidebarLinks } from "@/components/layout/nav-links";
import { NotificationBell } from "@/components/notifications/bell";

export function Sidebar({ footer }: { footer: React.ReactNode }) {
  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 print:hidden! flex-col border-r bg-sidebar px-3 py-5 md:flex">
      <div className="mb-6 flex items-center justify-between gap-2">
        <Link href="/" className="flex items-center gap-2.5 px-2 text-lg font-semibold tracking-tight">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.svg" alt="" className="size-8" />
          Rotina
        </Link>
        <NotificationBell />
      </div>
      <nav className="flex flex-1 flex-col gap-1">
        <Suspense fallback={<SidebarLinks pathname={null} />}>
          <ActiveSidebarLinks />
        </Suspense>
      </nav>
      {footer}
    </aside>
  );
}
