// Bloqueio simples contra força bruta: após MAX_FAILURES erros seguidos para o mesmo
// usuário, novas tentativas são recusadas por LOCK_MS. Fica em memória (por instância
// do servidor) — suficiente para um app pequeno; com várias instâncias, mover para o banco/Redis.
export const MAX_FAILURES = 5;
export const LOCK_MS = 15 * 60_000;

type Entry = { count: number; lockedUntil: number };
const failures = new Map<string, Entry>();

/** Minutos restantes de bloqueio (0 = liberado). */
export function lockedMinutes(username: string, now = Date.now()) {
  const entry = failures.get(username);
  if (!entry || entry.lockedUntil <= now) return 0;
  return Math.ceil((entry.lockedUntil - now) / 60_000);
}

export function registerFailure(username: string, now = Date.now()) {
  const entry = failures.get(username);
  // bloqueio vencido: recomeça a contagem
  const count = entry && entry.lockedUntil <= now && entry.count >= MAX_FAILURES ? 1 : (entry?.count ?? 0) + 1;
  failures.set(username, { count, lockedUntil: count >= MAX_FAILURES ? now + LOCK_MS : 0 });
  // não deixa o mapa crescer sem limite
  if (failures.size > 10_000) failures.delete(failures.keys().next().value!);
}

export function clearFailures(username: string) {
  failures.delete(username);
}
