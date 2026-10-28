import { Suspense } from "react";
import { ActiveBottomLinks, BottomLinks } from "@/components/layout/nav-links";

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t print:hidden! bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <Suspense fallback={<BottomLinks pathname={null} />}>
        <ActiveBottomLinks />
      </Suspense>
    </nav>
  );
}
