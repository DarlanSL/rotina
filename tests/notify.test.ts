import { describe, expect, it } from "vitest";
import { dueNotifications, notificationText, type NotifyEvent } from "@/lib/notify";
import { minutesNowInTz, timeToInstant } from "@/lib/dates";

const at = "2026-10-28T17:00:00.000Z"; // 14:00 em São Paulo
const event: NotifyEvent = {
  key: "activity:1",
  kind: "activity",
  title: "Reunião",
  at,
  url: "/diario",
  detail: "14:00–15:00",
};
const t = (iso: string) => Date.parse(iso);
const none = new Set<string>();

describe("dueNotifications", () => {
  it("nada antes da antecedência", () => {
    expect(dueNotifications([event], t("2026-10-28T16:49:00Z"), 10, none)).toEqual([]);
  });

  it("aviso 'soon' dentro da antecedência", () => {
    const due = dueNotifications([event], t("2026-10-28T16:52:00Z"), 10, none);
    expect(due).toHaveLength(1);
    expect(due[0].phase).toBe("soon");
  });

  it("aviso 'now' no horário e até 15 min depois", () => {
    expect(dueNotifications([event], t("2026-10-28T17:00:00Z"), 10, none)[0].phase).toBe("now");
    expect(dueNotifications([event], t("2026-10-28T17:14:00Z"), 10, none)[0].phase).toBe("now");
    expect(dueNotifications([event], t("2026-10-28T17:16:00Z"), 10, none)).toEqual([]);
  });

  it("não repete o que já foi disparado", () => {
    const [first] = dueNotifications([event], t("2026-10-28T16:55:00Z"), 10, none);
    expect(dueNotifications([event], t("2026-10-28T16:58:00Z"), 10, new Set([first.id]))).toEqual([]);
    // mas o aviso "now" ainda vem
    expect(dueNotifications([event], t("2026-10-28T17:01:00Z"), 10, new Set([first.id]))[0].phase).toBe("now");
  });

  it("evento remarcado gera novos avisos", () => {
    const [first] = dueNotifications([event], t("2026-10-28T17:01:00Z"), 10, none);
    const moved = { ...event, at: "2026-10-28T18:00:00.000Z" };
    expect(dueNotifications([moved], t("2026-10-28T18:00:30Z"), 10, new Set([first.id]))).toHaveLength(1);
  });
});

describe("notificationText", () => {
  it("formata título e corpo", () => {
    const [soon] = dueNotifications([event], t("2026-10-28T16:50:00Z"), 10, none);
    expect(notificationText(soon, t("2026-10-28T16:50:00Z"))).toEqual({
      title: "Em 10 min: Reunião",
      body: "Atividade · 14:00–15:00",
    });
  });
});

describe("horários no fuso", () => {
  it("14:00 em São Paulo = 17:00 UTC", () => {
    expect(timeToInstant("2026-10-28", "14:00", "America/Sao_Paulo").toISOString()).toBe(at);
  });

  it("minutos do dia no fuso", () => {
    expect(minutesNowInTz("America/Sao_Paulo", new Date("2026-10-28T17:30:00Z"))).toBe(14 * 60 + 30);
  });
});
