/** "com @ana" (eu compartilhei) ou "de @bruno" (compartilharam comigo); vazio se não é compartilhada. */
export function sharedLabel(a: { mine: boolean; owner: string; sharedWith: string[] }) {
  if (!a.mine) return `de @${a.owner}`;
  return a.sharedWith.length ? `com ${a.sharedWith.map((u) => `@${u}`).join(", ")}` : "";
}
