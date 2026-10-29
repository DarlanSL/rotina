import { describe, expect, it } from "vitest";
import { buildAgendaDays, parseAgendaParams, type AgendaInput } from "@/lib/agenda";
import type { ActivityView } from "@/lib/queries/activities";
import type { RoutineView } from "@/lib/queries/routines";
import type { ScheduledItem } from "@/lib/queries/dashboard";

const today = "2026-10-28";
const activity = (id: string, date: string, startTime: string | null): ActivityView => ({
  id,
  date,
  title: id,
  notes: null,
  startTime,
  endTime: null,
  notifyBefore: null,
  mine: true,
  owner: "demo",
  sharedWith: [],
  tags: [],
});
const item = (id: string): ScheduledItem => ({
  id,
  title: id,
  type: "REMINDER",
  priority: "MEDIUM",
  remindAt: new Date(),
  project: null,
});
const routine = (id: string, nextDueAt: string) => ({ id, title: id, nextDueAt }) as RoutineView;

const base: AgendaInput = { from: today, days: 3, today, now: "12:00", activities: [], items: [], routines: [], documents: [] };

describe("buildAgendaDays", () => {
  it("cria um dia para cada data do período, mesmo vazio", () => {
    expect(buildAgendaDays(base).map((d) => d.date)).toEqual(["2026-10-28", "2026-10-29", "2026-10-30"]);
  });

  it("ordena: dia todo primeiro, depois por horário", () => {
    const [day] = buildAgendaDays({
      ...base,
      activities: [activity("tarde", today, "15:00"), activity("manha", today, "08:00")],
      items: [{ item: item("lembrete"), date: today, time: "09:30" }],
      routines: [routine("revisao", today)],
    });
    expect(day.entries.map((e) => e.key)).toEqual(["rt-revisao", "act-manha", "item-lembrete", "act-tarde"]);
  });

  it("linha 'agora' antes do primeiro horário ainda por vir; atividades passadas marcadas", () => {
    const [day] = buildAgendaDays({
      ...base,
      activities: [activity("manha", today, "08:00"), activity("tarde", today, "15:00"), activity("sem-hora", today, null)],
    });
    expect(day.entries.map((e) => e.key)).toEqual(["act-sem-hora", "act-manha", "act-tarde"]);
    expect(day.nowIndex).toBe(2);
    expect(day.entries.map((e) => e.kind === "activity" && e.past)).toEqual([true, true, false]);
  });

  it("sem linha 'agora' em outros dias ou sem horários", () => {
    const days = buildAgendaDays({ ...base, activities: [activity("amanha", "2026-10-29", "08:00")] });
    expect(days.map((d) => d.nowIndex)).toEqual([null, null, null]);
    expect(days[1].entries[0].kind === "activity" && days[1].entries[0].past).toBe(false);
  });

  it("ignora o que cai fora do período", () => {
    const days = buildAgendaDays({ ...base, routines: [routine("longe", "2026-11-30")] });
    expect(days.every((d) => d.entries.length === 0)).toBe(true);
  });
});

describe("parseAgendaParams", () => {
  it("padrão: hoje, 7 dias", () => {
    expect(parseAgendaParams({}, today)).toEqual({ from: today, days: 7 });
  });
  it("aceita 14/30 e recusa outros valores", () => {
    expect(parseAgendaParams({ dias: "30" }, today).days).toBe(30);
    expect(parseAgendaParams({ dias: "100" }, today).days).toBe(7);
  });
  it("não deixa começar antes de hoje", () => {
    expect(parseAgendaParams({ de: "2026-01-01" }, today).from).toBe(today);
    expect(parseAgendaParams({ de: "2026-11-05" }, today).from).toBe("2026-11-05");
    expect(parseAgendaParams({ de: "lixo" }, today).from).toBe(today);
  });
});
