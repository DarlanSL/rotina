import {
  BookOpenIcon,
  CalendarDaysIcon,
  FileChartColumnIcon,
  FileTextIcon,
  FolderKanbanIcon,
  LayoutDashboardIcon,
  LightbulbIcon,
  RefreshCwIcon,
} from "lucide-react";

/** Cor de identidade de cada módulo (classes completas para o Tailwind detectar). */
export const TONES = {
  indigo: {
    icon: "text-indigo-600 dark:text-indigo-400",
    tile: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300",
    active: "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-200",
  },
  sky: {
    icon: "text-sky-600 dark:text-sky-400",
    tile: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
    active: "bg-sky-50 text-sky-800 dark:bg-sky-500/15 dark:text-sky-200",
  },
  violet: {
    icon: "text-violet-600 dark:text-violet-400",
    tile: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
    active: "bg-violet-50 text-violet-800 dark:bg-violet-500/15 dark:text-violet-200",
  },
  amber: {
    icon: "text-amber-600 dark:text-amber-400",
    tile: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    active: "bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200",
  },
  emerald: {
    icon: "text-emerald-600 dark:text-emerald-400",
    tile: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    active: "bg-emerald-50 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200",
  },
  cyan: {
    icon: "text-cyan-600 dark:text-cyan-400",
    tile: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300",
    active: "bg-cyan-50 text-cyan-800 dark:bg-cyan-500/15 dark:text-cyan-200",
  },
  fuchsia: {
    icon: "text-fuchsia-600 dark:text-fuchsia-400",
    tile: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-300",
    active: "bg-fuchsia-50 text-fuchsia-800 dark:bg-fuchsia-500/15 dark:text-fuchsia-200",
  },
  rose: {
    icon: "text-rose-600 dark:text-rose-400",
    tile: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
    active: "bg-rose-50 text-rose-800 dark:bg-rose-500/15 dark:text-rose-200",
  },
} as const;

export type Tone = keyof typeof TONES;

export const NAV_ITEMS = [
  { key: "inicio", href: "/", label: "Início", icon: LayoutDashboardIcon, tone: "indigo", mobile: true },
  { key: "agenda", href: "/agenda", label: "Agenda", icon: CalendarDaysIcon, tone: "fuchsia", mobile: true },
  { key: "diario", href: "/diario", label: "Diário", icon: BookOpenIcon, tone: "sky", mobile: true },
  { key: "rotinas", href: "/rotinas", label: "Rotinas", icon: RefreshCwIcon, tone: "violet", mobile: true },
  {
    key: "documentos",
    href: "/documentos",
    label: "Documentos",
    shortLabel: "Docs",
    icon: FileTextIcon,
    tone: "amber",
    mobile: true,
  },
  { key: "ideias", href: "/ideias", label: "Ideias", icon: LightbulbIcon, tone: "emerald", mobile: true },
  { key: "projetos", href: "/projetos", label: "Projetos", icon: FolderKanbanIcon, tone: "rose", mobile: false },
  {
    key: "relatorios",
    href: "/relatorios",
    label: "Relatórios",
    icon: FileChartColumnIcon,
    tone: "cyan",
    mobile: false,
  },
] as const satisfies readonly { key: string; href: string; tone: Tone; [k: string]: unknown }[];

export type ModuleKey = (typeof NAV_ITEMS)[number]["key"];

export function getModule(key: ModuleKey) {
  return NAV_ITEMS.find((i) => i.key === key)!;
}

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
