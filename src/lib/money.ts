/** Valores em centavos (inteiros) — sem erro de arredondamento. Lógica pura, coberta por testes. */

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** 123456 → "R$ 1.234,56" */
export function formatBRL(cents: number): string {
  return BRL.format(cents / 100).replace(/ /g, " ");
}

/** 123456 → "1234,56" (para preencher o campo do formulário) */
export function centsToInput(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "";
  return (cents / 100).toFixed(2).replace(".", ",");
}

/**
 * Lê o que a pessoa digitou: "1.234,56", "1234,5", "R$ 89,90", "120" ou "89.90".
 * Retorna centavos, ou null se vazio; NaN se inválido.
 */
export function parseMoney(raw: string): number | null {
  let s = raw.replace(/R\$|\s/g, "");
  if (!s) return null;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, ""); // "1.234" = mil duzentos e trinta e quatro
  if (!/^\d+(\.\d{0,2})?$/.test(s)) return Number.NaN;
  return Math.round(Number(s) * 100);
}
