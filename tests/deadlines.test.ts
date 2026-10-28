import { describe, expect, it } from "vitest";
import { getDeadlineStatus, nextDueDate, postponeError } from "@/lib/deadlines";
import { addDays, diffDays, formatTimeRange, isoDateInTz, startOfDayInTz } from "@/lib/dates";

describe("getDeadlineStatus", () => {
  const today = "2026-10-28";

  it("vencido quando o prazo foi ontem", () => {
    expect(getDeadlineStatus("2026-10-27", 30, today)).toBe("expired");
  });

  it("amarelo quando vence hoje", () => {
    expect(getDeadlineStatus(today, 30, today)).toBe("warning");
  });

  it("amarelo exatamente no limite da janela", () => {
    expect(getDeadlineStatus("2026-11-27", 30, today)).toBe("warning");
  });

  it("verde um dia depois da janela", () => {
    expect(getDeadlineStatus("2026-11-28", 30, today)).toBe("ok");
  });

  it("janela zero só alerta no próprio dia", () => {
    expect(getDeadlineStatus("2026-10-29", 0, today)).toBe("ok");
    expect(getDeadlineStatus(today, 0, today)).toBe("warning");
  });
});

describe("nextDueDate", () => {
  it("soma o intervalo à data de conclusão", () => {
    expect(nextDueDate("2026-10-28", 7)).toBe("2026-11-04");
  });

  it("atravessa virada de ano e ano bissexto", () => {
    expect(nextDueDate("2027-12-30", 3)).toBe("2028-01-02");
    expect(nextDueDate("2028-02-28", 1)).toBe("2028-02-29");
  });
});

describe("datas", () => {
  it("diffDays e addDays são inversos", () => {
    expect(diffDays(addDays("2026-10-28", 45), "2026-10-28")).toBe(45);
  });

  it("'hoje' respeita o fuso do usuário", () => {
    // 01:30 UTC de 29/10 ainda é 28/10 em São Paulo (UTC-3)
    const instant = new Date("2026-10-29T01:30:00Z");
    expect(isoDateInTz(instant, "America/Sao_Paulo")).toBe("2026-10-28");
    expect(isoDateInTz(instant, "UTC")).toBe("2026-10-29");
  });

  it("meia-noite em São Paulo é 03:00 UTC", () => {
    expect(startOfDayInTz("2026-10-28", "America/Sao_Paulo").toISOString()).toBe("2026-10-28T03:00:00.000Z");
  });
});

describe("horários", () => {
  it("formata intervalo com duração", () => {
    expect(formatTimeRange("09:00", "10:30")).toBe("09:00–10:30 · 1h30");
    expect(formatTimeRange("14:00", "14:45")).toBe("14:00–14:45 · 45 min");
    expect(formatTimeRange("08:00", "10:00")).toBe("08:00–10:00 · 2h");
  });

  it("só início ou nenhum horário", () => {
    expect(formatTimeRange("09:00", null)).toBe("a partir de 09:00");
    expect(formatTimeRange(null, null)).toBeNull();
  });
});

describe("postponeError", () => {
  const today = "2026-10-28";

  it("aceita adiar uma revisão futura para depois", () => {
    expect(postponeError("2026-11-10", "2026-11-02", today)).toBeNull();
  });

  it("recusa a mesma data ou antecipação", () => {
    expect(postponeError("2026-11-02", "2026-11-02", today)).toMatch(/depois/);
    expect(postponeError("2026-10-30", "2026-11-02", today)).toMatch(/depois/);
  });

  it("revisão vencida: nova data a partir de hoje", () => {
    expect(postponeError("2026-10-28", "2026-10-20", today)).toBeNull();
    expect(postponeError("2026-10-25", "2026-10-20", today)).toMatch(/passado/);
  });
});
