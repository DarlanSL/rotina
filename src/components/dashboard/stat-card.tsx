"use client";

import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type StatTone = "red" | "amber" | "sky" | "rose";

const TONE: Record<StatTone, { card: string; icon: string; value: string }> = {
  red: {
    card: "border-red-200 bg-red-50 hover:border-red-300 dark:border-red-500/30 dark:bg-red-500/10",
    icon: "bg-red-500 text-white",
    value: "text-red-700 dark:text-red-300",
  },
  amber: {
    card: "border-amber-200 bg-amber-50 hover:border-amber-300 dark:border-amber-500/30 dark:bg-amber-500/10",
    icon: "bg-amber-500 text-white",
    value: "text-amber-700 dark:text-amber-300",
  },
  sky: {
    card: "border-sky-200 bg-sky-50 hover:border-sky-300 dark:border-sky-500/30 dark:bg-sky-500/10",
    icon: "bg-sky-500 text-white",
    value: "text-sky-700 dark:text-sky-300",
  },
  rose: {
    card: "border-rose-200 bg-rose-50 hover:border-rose-300 dark:border-rose-500/30 dark:bg-rose-500/10",
    icon: "bg-rose-500 text-white",
    value: "text-rose-700 dark:text-rose-300",
  },
};

type CardProps = { label: string; value: number; icon: React.ReactNode; tone: StatTone };

function CardBody({ label, value, icon, tone, muted }: CardProps & { muted: boolean }) {
  const t = TONE[tone];
  return (
    <>
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "flex size-8 items-center justify-center rounded-lg [&_svg]:size-4",
            muted ? "bg-muted text-muted-foreground" : t.icon,
          )}
        >
          {icon}
        </span>
        <ChevronRightIcon className="size-4 text-muted-foreground" />
      </div>
      <div>
        <span className={cn("block text-2xl font-semibold tabular-nums", !muted && t.value)}>{value}</span>
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
    </>
  );
}

const cardClass = (tone: StatTone, muted: boolean) =>
  cn(
    "flex w-full flex-col gap-3 rounded-xl border p-4 text-left transition-colors",
    muted ? "bg-card hover:border-foreground/20" : TONE[tone].card,
  );

/** Card que navega para outra página. */
export function StatLink({ href, ...props }: CardProps & { href: string }) {
  const muted = props.value === 0;
  return (
    <Link href={href} className={cardClass(props.tone, muted)}>
      <CardBody {...props} muted={muted} />
    </Link>
  );
}

/** Card que abre a lista detalhada num diálogo (ex: vencidos). */
export function StatDialog({
  title,
  description,
  children,
  ...props
}: CardProps & { title: string; description?: string; children: React.ReactNode }) {
  const muted = props.value === 0;
  return (
    <Dialog>
      <DialogTrigger className={cardClass(props.tone, muted)} aria-label={`${props.label}: ${props.value}`}>
        <CardBody {...props} muted={muted} />
      </DialogTrigger>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="py-2">{children}</div>
      </DialogContent>
    </Dialog>
  );
}
