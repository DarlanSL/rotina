import Link from "next/link";
import { LogOutIcon } from "lucide-react";
import { signOut } from "@/lib/auth";
import { requireUser, type CurrentUser } from "@/lib/session";
import { Button } from "@/components/ui/button";

function Avatar({ user }: { user: CurrentUser }) {
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
      {(user.name || user.username).charAt(0).toUpperCase()}
    </span>
  );
}

function SignOutButton() {
  return (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/login" });
      }}
    >
      <Button type="submit" variant="ghost" size="icon-sm" aria-label="Sair">
        <LogOutIcon />
      </Button>
    </form>
  );
}

export async function SidebarUser() {
  const user = await requireUser();
  return (
    <div className="flex items-center gap-2 border-t px-2 pt-4">
      <Link href="/conta" title="Minha conta" className="flex min-w-0 flex-1 items-center gap-2 rounded-lg p-1 -m-1 hover:bg-muted">
        <Avatar user={user} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{user.name || user.username}</p>
          <p className="truncate text-xs text-muted-foreground">@{user.username}</p>
        </div>
      </Link>
      <SignOutButton />
    </div>
  );
}

export async function MobileUser() {
  const user = await requireUser();
  return (
    <div className="flex items-center gap-1">
      <Link href="/conta" aria-label="Minha conta">
        <Avatar user={user} />
      </Link>
      <SignOutButton />
    </div>
  );
}

export function UserSkeleton() {
  return (
    <div className="flex items-center gap-2 border-t px-2 pt-4">
      <span className="size-8 animate-pulse rounded-full bg-muted" />
      <span className="h-4 flex-1 animate-pulse rounded bg-muted" />
    </div>
  );
}
