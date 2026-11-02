"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { dueNotifications, notificationText, type NotifyEvent } from "@/lib/notify";
import {
  addHistory,
  getLeadMinutes,
  loadFired,
  markSummaryShown,
  noticesSince,
  saveFired,
  summaryShownOn,
} from "@/components/notifications/store";

type Feed = {
  today: string;
  events: NotifyEvent[];
  summary: { overdue: number; today: number; upcoming: number; lines: string[] };
  notices?: { id: string; title: string; body: string; url: string; at: string }[];
};

const TICK_MS = 20_000;
const REFETCH_MS = 3 * 60_000;

/** Mostra um aviso: no sistema se o app não está em foco (e há permissão); senão, dentro do app. */
export async function showNotice(id: string, title: string, body: string, url: string, push: (url: string) => void) {
  addHistory({ id, title, body, url, at: Date.now() });

  const appFocused = document.visibilityState === "visible" && document.hasFocus();
  const canSystem = "Notification" in window && Notification.permission === "granted";

  if (canSystem && !appFocused) {
    try {
      const reg = await navigator.serviceWorker?.getRegistration();
      if (reg) {
        await reg.showNotification(title, { body, tag: id, icon: "/icon.svg", data: { url } });
        return;
      }
      const n = new Notification(title, { body, tag: id, icon: "/icon.svg" });
      n.onclick = () => {
        window.focus();
        push(url);
      };
      return;
    } catch {
      // cai para o aviso dentro do app
    }
  }

  toast(title, {
    description: body,
    duration: 12_000,
    classNames: { description: "whitespace-pre-line" },
    action: { label: "Abrir", onClick: () => push(url) },
  });
}

export function NotificationEngine() {
  const router = useRouter();
  const feed = useRef<Feed | null>(null);

  useEffect(() => {
    let cancelled = false;
    const push = (url: string) => router.push(url);

    navigator.serviceWorker?.register("/sw.js").catch(() => {});
    const onSwMessage = (e: MessageEvent) => {
      if (e.data?.type === "rotina:navigate") router.push(new URL(e.data.url).pathname + new URL(e.data.url).search);
    };
    navigator.serviceWorker?.addEventListener("message", onSwMessage);

    function tick() {
      const current = feed.current;
      if (!current) return;
      const fired = loadFired();
      const now = Date.now();
      const due = dueNotifications(current.events, now, getLeadMinutes(), new Set(fired.keys()));
      if (!due.length) return;
      for (const n of due) fired.set(n.id, now);
      saveFired(fired); // grava antes de mostrar: outra aba não repete
      for (const n of due) {
        const { title, body } = notificationText(n, now);
        void showNotice(n.id, title, body, n.event.url, push);
      }
    }

    function maybeSummary(f: Feed) {
      const { summary } = f;
      if (summaryShownOn(f.today) || (!summary.overdue && !summary.today && !summary.upcoming)) return;
      markSummaryShown(f.today);
      const parts = [
        summary.overdue && `${summary.overdue} vencido(s)`,
        summary.today && `${summary.today} para hoje`,
        summary.upcoming && `${summary.upcoming} próximo(s) do prazo`,
      ].filter(Boolean);
      void showNotice(`summary:${f.today}`, `Prazos: ${parts.join(" · ")}`, summary.lines.join("\n"), "/", push);
    }

    /** Mudanças de outra pessoa em compromissos/listas compartilhados: cada uma uma vez por aparelho. */
    function deliverNotices(f: Feed) {
      if (!f.notices?.length) return;
      const since = noticesSince(); // aparelho novo não recebe avisos antigos
      const fired = loadFired();
      const fresh = f.notices.filter((n) => !fired.has(`notice:${n.id}`) && Date.parse(n.at) >= since);
      if (!fresh.length) return;
      const now = Date.now();
      for (const n of fresh) fired.set(`notice:${n.id}`, now);
      saveFired(fired);
      for (const n of fresh) void showNotice(`notice:${n.id}`, n.title, n.body, n.url, push);
      router.refresh(); // a tela aberta mostra a mudança
    }

    async function load() {
      try {
        const res = await fetch("/api/notificacoes", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as Feed;
        feed.current = data;
        maybeSummary(data);
        deliverNotices(data);
        tick();
      } catch {
        // offline: tenta de novo no próximo ciclo
      }
    }

    void load();
    const tickTimer = setInterval(tick, TICK_MS);
    const fetchTimer = setInterval(load, REFETCH_MS);
    const onVisible = () => document.visibilityState === "visible" && void load();
    document.addEventListener("visibilitychange", onVisible);
    // Após salvar algo no app (ex: nova atividade), recarrega o feed
    window.addEventListener("rotina:data-changed", load);

    return () => {
      cancelled = true;
      clearInterval(tickTimer);
      clearInterval(fetchTimer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("rotina:data-changed", load);
      navigator.serviceWorker?.removeEventListener("message", onSwMessage);
    };
  }, [router]);

  return null;
}
