import { Suspense } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { NotificationBell } from "@/components/notifications/bell";
import { NotificationEngine } from "@/components/notifications/engine";
import { MobileUser, SidebarUser, UserSkeleton } from "@/components/layout/user-menu";

/**
 * O shell (navegação) é estático e aparece instantaneamente;
 * tudo que depende do usuário logado é transmitido dentro de <Suspense>.
 */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh">
      <Sidebar
        footer={
          <Suspense fallback={<UserSkeleton />}>
            <SidebarUser />
          </Suspense>
        }
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-background/95 px-4 py-2.5 backdrop-blur md:hidden print:hidden!">
          <span className="text-base font-semibold tracking-tight">Rotina</span>
          <div className="flex items-center gap-1">
            <NotificationBell />
            <Suspense fallback={<span className="size-8 animate-pulse rounded-full bg-muted" />}>
              <MobileUser />
            </Suspense>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-5 pb-28 md:px-8 md:pt-8 md:pb-10 print:max-w-none print:p-0">
          <Suspense fallback={<PageSkeleton />}>{children}</Suspense>
        </main>
      </div>
      <BottomNav />
      <NotificationEngine />
    </div>
  );
}
