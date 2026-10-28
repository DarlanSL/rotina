"use client";

/**
 * Estado das notificações no navegador (por dispositivo), compartilhado entre o
 * motor que dispara os avisos e o sininho. Persistido em localStorage.
 */

import { useSyncExternalStore } from "react";
import { LEAD_OPTIONS } from "@/lib/notify";

export type HistoryEntry = { id: string; title: string; body: string; url: string; at: number };
export type Permission = NotificationPermission | "unsupported";

type State = {
  history: HistoryEntry[];
  lastSeen: number;
  leadMinutes: number;
  permission: Permission;
};

const KEYS = {
  history: "rotina:notif:history",
  lastSeen: "rotina:notif:lastSeen",
  lead: "rotina:notif:lead",
  fired: "rotina:notif:fired",
  summary: "rotina:notif:summaryDay",
};

const MAX_HISTORY = 30;
const FIRED_TTL_MS = 3 * 24 * 60 * 60_000;
const DEFAULT_LEAD = 10;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // modo privado / armazenamento cheio: segue só em memória
  }
}

function currentPermission(): Permission {
  return typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported";
}

const SERVER_STATE: State = { history: [], lastSeen: 0, leadMinutes: DEFAULT_LEAD, permission: "default" };
let state: State = SERVER_STATE;
let loaded = false;
const listeners = new Set<() => void>();

function emit(next: Partial<State>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

function ensureLoaded() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  const lead = read<number>(KEYS.lead, DEFAULT_LEAD);
  state = {
    history: read<HistoryEntry[]>(KEYS.history, []),
    lastSeen: read<number>(KEYS.lastSeen, 0),
    leadMinutes: (LEAD_OPTIONS as readonly number[]).includes(lead) ? lead : DEFAULT_LEAD,
    permission: currentPermission(),
  };
  // Outra aba mostrou um aviso ou mudou ajustes
  window.addEventListener("storage", (e) => {
    if (e.key === KEYS.history) emit({ history: read(KEYS.history, []) });
    if (e.key === KEYS.lastSeen) emit({ lastSeen: read(KEYS.lastSeen, 0) });
    if (e.key === KEYS.lead) emit({ leadMinutes: read(KEYS.lead, DEFAULT_LEAD) });
  });
}

function subscribe(listener: () => void) {
  ensureLoaded();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useNotificationState(): State {
  return useSyncExternalStore(
    subscribe,
    () => (ensureLoaded(), state),
    () => SERVER_STATE,
  );
}

export function getLeadMinutes() {
  ensureLoaded();
  return state.leadMinutes;
}

export function setLeadMinutes(minutes: number) {
  write(KEYS.lead, minutes);
  emit({ leadMinutes: minutes });
}

export function addHistory(entry: HistoryEntry) {
  const history = [entry, ...read<HistoryEntry[]>(KEYS.history, [])].slice(0, MAX_HISTORY);
  write(KEYS.history, history);
  emit({ history });
}

export function markAllSeen() {
  const now = Date.now();
  write(KEYS.lastSeen, now);
  emit({ lastSeen: now });
}

export function refreshPermission() {
  emit({ permission: currentPermission() });
}

/** Ids já disparados (lidos do storage a cada vez para evitar duplicar entre abas). */
export function loadFired(): Map<string, number> {
  const now = Date.now();
  const entries = Object.entries(read<Record<string, number>>(KEYS.fired, {})).filter(
    ([, t]) => now - t < FIRED_TTL_MS,
  );
  return new Map(entries);
}

export function saveFired(fired: Map<string, number>) {
  write(KEYS.fired, Object.fromEntries(fired));
}

export function summaryShownOn(day: string) {
  return read<string | null>(KEYS.summary, null) === day;
}

export function markSummaryShown(day: string) {
  write(KEYS.summary, day);
}
