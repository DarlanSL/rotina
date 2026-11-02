import { describe, expect, it } from "vitest";
import { activityChangeLines, activitySummary, mergeNoticeLines, noticeBody } from "@/lib/share-notice";

describe("mergeNoticeLines", () => {
  it("junta sem repetir", () => {
    expect(mergeNoticeLines(["Adicionou: arroz"], ["Adicionou: feijão", "Adicionou: arroz"])).toEqual([
      "Adicionou: feijão",
      "Adicionou: arroz",
    ]);
  });

  it("marcar e desmarcar o mesmo item se anula", () => {
    expect(mergeNoticeLines(["Marcou: café", "Marcou: leite"], ["Desmarcou: café"])).toEqual(["Marcou: leite"]);
    expect(mergeNoticeLines(["Marcou: café"], ["Desmarcou: café"])).toEqual([]);
  });
});

describe("noticeBody", () => {
  it("agrupa pela ação", () => {
    expect(noticeBody(["Adicionou: arroz", "Marcou: café", "Adicionou: feijão"])).toBe(
      "Adicionou: arroz, feijão\nMarcou: café",
    );
  });

  it("limita a 5 grupos", () => {
    const lines = ["A", "B", "C", "D", "E", "F", "G"];
    expect(noticeBody(lines).split("\n")).toEqual(["A", "B", "C", "D", "E", "e mais 2"]);
  });
});

describe("compromisso", () => {
  const base = { title: "Reunião", date: "2026-11-04", startTime: "10:00", endTime: null, notes: null };

  it("descreve o que mudou", () => {
    expect(activityChangeLines(base, { ...base, date: "2026-11-05", startTime: "11:00", endTime: "12:00" })).toEqual([
      "Data: 04/11 → 05/11",
      "Horário: 10:00 → 11:00–12:00",
    ]);
    expect(activityChangeLines(base, { ...base, notes: "levar notebook" })).toEqual(["Observações alteradas"]);
    expect(activityChangeLines(base, base)).toEqual([]);
  });

  it("resumo", () => {
    expect(activitySummary(base)).toBe("Reunião · 04/11 às 10:00");
    expect(activitySummary({ ...base, startTime: null })).toBe("Reunião · 04/11");
  });
});
