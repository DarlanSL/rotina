import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

async function RedirectIfLoggedIn() {
  const session = await auth();
  if (session?.user?.id) redirect("/");
  return null;
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-linear-to-br from-indigo-50 via-background to-violet-50 p-4 dark:from-indigo-950/40 dark:to-violet-950/40">
      <Suspense>
        <RedirectIfLoggedIn />
      </Suspense>
      <div className="flex items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon.svg" alt="" className="size-9" />
        <span className="text-2xl font-semibold tracking-tight">Rotina</span>
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </main>
  );
}
