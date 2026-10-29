import { describe, expect, it } from "vitest";
import { listNameSchema, splitListEntries } from "@/lib/validations";

describe("splitListEntries", () => {
  it("um item por vírgula, ponto e vírgula ou linha", () => {
    expect(splitListEntries("arroz, feijão; café\nleite")).toEqual(["arroz", "feijão", "café", "leite"]);
  });
  it("ignora vazios, espaços extras e repetidos", () => {
    expect(splitListEntries("  2 kg   arroz ,, arroz,\n\n ")).toEqual(["2 kg arroz", "arroz"]);
    expect(splitListEntries("pão, pão")).toEqual(["pão"]);
    expect(splitListEntries("   ")).toEqual([]);
  });
  it("corta textos longos", () => {
    expect(splitListEntries("x".repeat(500))[0]).toHaveLength(200);
  });
});

describe("listNameSchema", () => {
  it("exige nome e limita o tamanho", () => {
    expect(listNameSchema.safeParse("  Mercado ").data).toBe("Mercado");
    expect(listNameSchema.safeParse("  ").success).toBe(false);
    expect(listNameSchema.safeParse("x".repeat(61)).success).toBe(false);
  });
});
