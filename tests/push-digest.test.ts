import { describe, expect, it } from "vitest";
import { digestText } from "@/lib/push-digest";

const empty = { activities: [], routinesToday: [], documentsToday: [], remindersToday: [], overdue: [], documentsSoon: [] };

describe("digestText", () => {
  it("sem nada: não manda", () => {
    expect(digestText(empty)).toBeNull();
  });

  it("agenda em ordem de horário e contagens no título", () => {
    const d = digestText({
      ...empty,
      activities: [
        { title: "Almoço", startTime: "12:00" },
        { title: "Ligar banco", startTime: null },
        { title: "Reunião", startTime: "10:00" },
      ],
      routinesToday: ["Regar plantas"],
      overdue: ["Trocar filtro"],
    })!;
    expect(d.title).toBe("Bom dia! Hoje: 3 na agenda · 1 para fazer · 1 atrasado(s)");
    expect(d.body).toBe(
      "Agenda: 10:00 Reunião, 12:00 Almoço, Ligar banco\nPara hoje: Regar plantas\nAtrasados: Trocar filtro",
    );
  });

  it("só documentos vencendo", () => {
    const d = digestText({ ...empty, documentsSoon: [{ name: "CNH", daysLeft: 5 }] })!;
    expect(d.title).toBe("Bom dia! Prazos chegando");
    expect(d.body).toBe("Vencem logo: CNH em 5 dia(s)");
  });

  it("listas longas são cortadas", () => {
    const d = digestText({ ...empty, overdue: ["a", "b", "c", "d", "e", "f"] })!;
    expect(d.body).toBe("Atrasados: a, b, c, d e mais 2");
  });
});
