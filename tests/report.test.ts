import { describe, expect, it } from "vitest";
import { buildReportCsv, buildReportText, type ReportData } from "@/lib/report";
import { endOfPreviousMonthISO, startOfMonthISO, startOfWeekISO } from "@/lib/dates";
import { parsePeriod } from "@/lib/report-period";

const base: ReportData = {
  from: "2026-10-28",
  to: "2026-10-28",
  userName: "Ana",
  days: [
    {
      date: "2026-10-28",
      minutes: 130,
      activities: [
        {
          id: "1",
          date: "2026-10-28",
          title: "Caminhada",
          notes: null,
          startTime: "07:00",
          endTime: "07:40",
          minutes: 40,
          tags: ["saúde"],
        },
        {
          id: "2",
          date: "2026-10-28",
          title: "Reunião; orçamento",
          notes: 'Disse "ok"\nfechado',
          startTime: "09:00",
          endTime: "10:30",
          minutes: 90,
          tags: ["trabalho"],
        },
      ],
    },
  ],
  totals: { activities: 2, minutes: 130, days: 1 },
  byTag: [
    { tag: "trabalho", count: 1, minutes: 90 },
    { tag: "saúde", count: 1, minutes: 40 },
  ],
  routinesDone: [{ id: "r", date: "2026-10-28", title: "Regar plantas" }],
  itemsDone: [],
  postponements: [{ id: "p", title: "Extintores", from: "2026-10-23", to: "2026-10-31", reason: "Sem agenda" }],
};

describe("buildReportText", () => {
  const text = buildReportText(base);

  it("cabeçalho do dia e resumo", () => {
    expect(text).toContain("*Relatório do dia*");
    expect(text).toContain("Quarta-feira, 28 de outubro (28/10/2026)");
    expect(text).toContain("• 2 atividades");
    expect(text).toContain("• 2h10 registradas");
    expect(text).toContain("#trabalho (1 · 1h30)");
  });

  it("lista atividades com horário, tags e notas", () => {
    expect(text).toContain("• 07:00–07:40 Caminhada #saúde");
    expect(text).toContain('  _Disse "ok" fechado_');
  });

  it("inclui revisões e prorrogações", () => {
    expect(text).toContain("• 28/10 Regar plantas");
    expect(text).toContain("• Extintores: 23/10 → 31/10 — Sem agenda");
  });

  it("período mostra intervalo e dias", () => {
    const t = buildReportText({ ...base, from: "2026-10-01", to: "2026-10-28" });
    expect(t).toContain("*Relatório de atividades*");
    expect(t).toContain("01/10/2026 a 28/10/2026");
    expect(t).toContain("2 atividades em 1 dia");
  });
});

describe("buildReportCsv", () => {
  const csv = buildReportCsv(base);

  it("tem BOM, cabeçalho e separador ;", () => {
    expect(csv.startsWith("﻿Data;Início;Fim;Duração (min);Atividade;Notas;Tags")).toBe(true);
    expect(csv).toContain("28/10/2026;07:00;07:40;40;Caminhada;;saúde");
  });

  it("escapa ; aspas e quebras de linha", () => {
    expect(csv).toContain('"Reunião; orçamento";"Disse ""ok""\nfechado"');
  });
});

describe("períodos", () => {
  it("semana começa na segunda", () => {
    expect(startOfWeekISO("2026-10-28")).toBe("2026-10-26"); // quarta → segunda
    expect(startOfWeekISO("2026-11-01")).toBe("2026-10-26"); // domingo → segunda anterior
  });

  it("mês atual e anterior", () => {
    expect(startOfMonthISO("2026-10-28")).toBe("2026-10-01");
    expect(endOfPreviousMonthISO("2026-03-15")).toBe("2026-02-28");
  });
});

describe("parsePeriod", () => {
  const today = "2026-10-28";

  it("padrão é hoje", () => {
    expect(parsePeriod({}, today)).toEqual({ from: today, to: today, preset: "hoje" });
  });

  it("presets", () => {
    expect(parsePeriod({ p: "semana" }, today)).toMatchObject({ from: "2026-10-26", to: today });
    expect(parsePeriod({ p: "mes-passado" }, today)).toMatchObject({ from: "2026-09-01", to: "2026-09-30" });
    expect(parsePeriod({ p: "7d" }, today)).toMatchObject({ from: "2026-10-22", to: today });
  });

  it("datas livres: inverte se necessário e reconhece preset", () => {
    expect(parsePeriod({ de: "2026-10-10", ate: "2026-10-05" }, today)).toEqual({
      from: "2026-10-05",
      to: "2026-10-10",
      preset: null,
    });
    expect(parsePeriod({ de: "2026-10-01", ate: today }, today).preset).toBe("mes");
  });

  it("limita a 1 ano e ignora lixo", () => {
    expect(parsePeriod({ de: "2020-01-01", ate: today }, today).from).toBe("2025-10-28");
    expect(parsePeriod({ de: "abc" }, today).preset).toBe("hoje");
  });
});
