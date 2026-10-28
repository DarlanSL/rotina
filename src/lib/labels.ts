import type { ItemStatus, ItemType, Priority } from "@/generated/prisma/enums";

export const ITEM_TYPE_LABEL: Record<ItemType, { singular: string; plural: string }> = {
  IDEA: { singular: "Ideia", plural: "Ideias" },
  NOTE: { singular: "Anotação", plural: "Anotações" },
  REMINDER: { singular: "Lembrete", plural: "Lembretes" },
  IMPROVEMENT: { singular: "Melhoria", plural: "Melhorias" },
};

export const ITEM_STATUS_LABEL: Record<ItemStatus, string> = {
  OPEN: "Aberto",
  IN_PROGRESS: "Em andamento",
  DONE: "Realizado",
  DISCARDED: "Descartado",
};

export const PRIORITY_LABEL: Record<Priority, string> = {
  LOW: "Baixa",
  MEDIUM: "Média",
  HIGH: "Alta",
};

export const PROJECT_COLORS = ["slate", "blue", "emerald", "amber", "rose", "violet"] as const;
export type ProjectColor = (typeof PROJECT_COLORS)[number];

export const PROJECT_COLOR_CLASS: Record<ProjectColor, string> = {
  slate: "bg-slate-500",
  blue: "bg-blue-500",
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
  violet: "bg-violet-500",
};

export function projectColorClass(color: string | null | undefined): string {
  return PROJECT_COLOR_CLASS[(color as ProjectColor) ?? "slate"] ?? PROJECT_COLOR_CLASS.slate;
}
