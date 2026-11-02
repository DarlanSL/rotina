import { describe, expect, it } from "vitest";
import { addDays } from "@/lib/dates";
import {
  describeRecurrence,
  describeSeries,
  repeatChoiceLabel,
  ruleFromChoice,
  seriesDates,
  dueAfterCompletion,
  firstDueDate,
  nextMonthlyOccurrence,
  occurrenceInMonth,
  type Recurrence,
} from "@/lib/recurrence";

const rule = (r: Partial<Recurrence>): Recurrence => ({
  kind: "INTERVAL",
  intervalDays: 30,
  monthDay: null,
  weekOrdinal: null,
  weekday: null,
  ...r,
});
const day10 = rule({ kind: "MONTHLY_DAY", monthDay: 10 });
const day31 = rule({ kind: "MONTHLY_DAY", monthDay: 31 });
const firstWed = rule({ kind: "MONTHLY_WEEKDAY", weekOrdinal: 1, weekday: 3 });
const lastFri = rule({ kind: "MONTHLY_WEEKDAY", weekOrdinal: -1, weekday: 5 });

describe("occurrenceInMonth", () => {
  it("dia fixo; 31 vira o último dia em meses curtos", () => {
    expect(occurrenceInMonth(day10, 2026, 10)).toBe("2026-11-10");
    expect(occurrenceInMonth(day31, 2026, 10)).toBe("2026-11-30");
    expect(occurrenceInMonth(day31, 2027, 1)).toBe("2027-02-28");
    expect(occurrenceInMonth(day31, 2028, 1)).toBe("2028-02-29");
  });

  it("1ª quarta e última sexta", () => {
    expect(occurrenceInMonth(firstWed, 2026, 10)).toBe("2026-11-04");
    expect(occurrenceInMonth(firstWed, 2026, 11)).toBe("2026-12-02");
    expect(occurrenceInMonth(lastFri, 2026, 10)).toBe("2026-11-27");
    expect(occurrenceInMonth(lastFri, 2026, 6)).toBe("2026-07-31");
    // 3ª segunda de novembro/2026
    expect(occurrenceInMonth(rule({ kind: "MONTHLY_WEEKDAY", weekOrdinal: 3, weekday: 1 }), 2026, 10)).toBe("2026-11-16");
  });
});

describe("nextMonthlyOccurrence", () => {
  it("inclusivo aceita o próprio dia; exclusivo pula para o mês seguinte", () => {
    expect(nextMonthlyOccurrence(day10, "2026-11-10", true)).toBe("2026-11-10");
    expect(nextMonthlyOccurrence(day10, "2026-11-10", false)).toBe("2026-12-10");
    expect(nextMonthlyOccurrence(day10, "2026-11-02", false)).toBe("2026-11-10");
  });

  it("vira o ano", () => {
    expect(nextMonthlyOccurrence(day10, "2026-12-15", false)).toBe("2027-01-10");
    expect(nextMonthlyOccurrence(firstWed, "2026-12-03", false)).toBe("2027-01-06");
  });
});

describe("firstDueDate", () => {
  it("sem última vez: a partir de hoje (inclusive)", () => {
    expect(firstDueDate(day10, null, "2026-11-02", addDays)).toBe("2026-11-10");
    expect(firstDueDate(firstWed, null, "2026-11-04", addDays)).toBe("2026-11-04");
    expect(firstDueDate(rule({ intervalDays: 7 }), null, "2026-11-02", addDays)).toBe("2026-11-02");
  });

  it("com última vez: a próxima depois dela", () => {
    expect(firstDueDate(day10, "2026-10-10", "2026-11-02", addDays)).toBe("2026-11-10");
    expect(firstDueDate(rule({ intervalDays: 7 }), "2026-10-30", "2026-11-02", addDays)).toBe("2026-11-06");
  });
});

describe("dueAfterCompletion", () => {
  it("intervalo: hoje + X dias", () => {
    expect(dueAfterCompletion(rule({ intervalDays: 7 }), "2026-11-05", "2026-11-02", addDays)).toBe("2026-11-09");
  });

  it("mensal: concluir antes não pula mês; com atraso não fica no passado", () => {
    expect(dueAfterCompletion(day10, "2026-11-10", "2026-11-08", addDays)).toBe("2026-12-10");
    expect(dueAfterCompletion(day10, "2026-11-10", "2026-11-10", addDays)).toBe("2026-12-10");
    expect(dueAfterCompletion(day10, "2026-09-10", "2026-11-12", addDays)).toBe("2026-12-10");
    expect(dueAfterCompletion(firstWed, "2026-11-04", "2026-11-04", addDays)).toBe("2026-12-02");
  });
});

describe("describeRecurrence", () => {
  it("textos", () => {
    expect(describeRecurrence(rule({ intervalDays: 30 }))).toBe("a cada 30 dias");
    expect(describeRecurrence(rule({ intervalDays: 1 }))).toBe("todo dia");
    expect(describeRecurrence(day10)).toBe("todo dia 10 do mês");
    expect(describeRecurrence(firstWed)).toBe("toda 1ª quarta-feira do mês");
    expect(describeRecurrence(lastFri)).toBe("toda última sexta-feira do mês");
    expect(describeRecurrence(rule({ kind: "MONTHLY_WEEKDAY", weekOrdinal: 2, weekday: 6 }))).toBe("todo 2º sábado do mês");
  });
});

describe("séries de compromissos", () => {
  it("regra a partir da data escolhida", () => {
    // 04/11/2026 é a 1ª quarta-feira
    expect(describeSeries(ruleFromChoice("MONTHLY_WEEKDAY", "2026-11-04"))).toBe("toda 1ª quarta-feira do mês");
    expect(describeSeries(ruleFromChoice("MONTHLY_DAY", "2026-11-10"))).toBe("todo dia 10 do mês");
    expect(describeSeries(ruleFromChoice("WEEKLY", "2026-11-04"))).toBe("toda semana");
    // 30/11/2026 (segunda) é a 5ª segunda: vira "última"
    expect(describeSeries(ruleFromChoice("MONTHLY_WEEKDAY", "2026-11-30"))).toBe("toda última segunda-feira do mês");
    expect(repeatChoiceLabel("WEEKLY", "2026-11-04")).toBe("Toda semana (quarta-feira)");
  });

  it("10 vezes, toda 1ª quarta", () => {
    const dates = seriesDates(ruleFromChoice("MONTHLY_WEEKDAY", "2026-11-04"), "2026-11-04", { count: 10 }, addDays);
    expect(dates).toHaveLength(10);
    expect(dates.slice(0, 3)).toEqual(["2026-11-04", "2026-12-02", "2027-01-06"]);
  });

  it("sem fim: gera até o limite de datas", () => {
    const dates = seriesDates(ruleFromChoice("WEEKLY", "2026-11-02"), "2026-11-02", { untilIso: "2026-11-30" }, addDays);
    expect(dates).toEqual(["2026-11-02", "2026-11-09", "2026-11-16", "2026-11-23", "2026-11-30"]);
    expect(seriesDates(ruleFromChoice("DAILY", "2026-11-02"), "2026-11-02", { count: 3 }, addDays)).toEqual([
      "2026-11-02",
      "2026-11-03",
      "2026-11-04",
    ]);
  });

  it("dia 31 todo mês", () => {
    const dates = seriesDates(ruleFromChoice("MONTHLY_DAY", "2027-01-31"), "2027-01-31", { count: 3 }, addDays);
    expect(dates).toEqual(["2027-01-31", "2027-02-28", "2027-03-31"]);
  });
});
