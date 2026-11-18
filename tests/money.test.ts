import { describe, expect, it } from "vitest";
import { centsToInput, formatBRL, parseMoney } from "@/lib/money";
import { addDays } from "@/lib/dates";
import { firstOccurrenceFrom } from "@/lib/recurrence";

describe("dinheiro", () => {
  it("lê o que a pessoa digita", () => {
    expect(parseMoney("1.234,56")).toBe(123456);
    expect(parseMoney("R$ 89,90")).toBe(8990);
    expect(parseMoney("120")).toBe(12000);
    expect(parseMoney("89.90")).toBe(8990);
    expect(parseMoney("1.234")).toBe(123400);
    expect(parseMoney("0,5")).toBe(50);
    expect(parseMoney("")).toBeNull();
    expect(parseMoney("abc")).toBeNaN();
    expect(parseMoney("1,234,5")).toBeNaN();
  });

  it("mostra em reais", () => {
    expect(formatBRL(123456)).toBe("R$ 1.234,56");
    expect(centsToInput(8990)).toBe("89,90");
    expect(centsToInput(null)).toBe("");
  });
});

describe("primeiro vencimento de uma conta", () => {
  const base = { intervalDays: 30, monthDay: null, weekOrdinal: null, weekday: null };
  it("cai na regra a partir da data escolhida", () => {
    expect(firstOccurrenceFrom({ ...base, kind: "MONTHLY_DAY", monthDay: 10 }, "2026-11-18", addDays)).toBe("2026-12-10");
    expect(firstOccurrenceFrom({ ...base, kind: "MONTHLY_DAY", monthDay: 10 }, "2026-11-10", addDays)).toBe("2026-11-10");
    expect(firstOccurrenceFrom({ ...base, kind: "WEEKLY", weekday: 5 }, "2026-11-18", addDays)).toBe("2026-11-20");
    expect(firstOccurrenceFrom({ ...base, kind: "INTERVAL_FIXED" }, "2026-11-18", addDays)).toBe("2026-11-18");
  });
});
