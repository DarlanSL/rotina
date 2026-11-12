"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { SunriseIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { refreshPermission } from "@/components/notifications/store";

type Status = "loading" | "unsupported" | "ios-install" | "off" | "on";

function keyBytes(base64url: string) {
  const base64 = (base64url + "=".repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

async function registration() {
  await navigator.serviceWorker.register("/sw.js").catch(() => {});
  return navigator.serviceWorker.ready;
}

/** Liga/desliga o resumo das 9h por push neste aparelho (chega com o app fechado). */
export function PushToggle() {
  const [status, setStatus] = useState<Status>("loading");
  const [busy, setBusy] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const key = await fetch("/api/push")
        .then((r) => (r.ok ? (r.json() as Promise<{ publicKey: string | null }>) : { publicKey: null }))
        .then((d) => d.publicKey)
        .catch(() => null);
      if (cancelled) return;
      setPublicKey(key);
      const supported = key && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
      if (!supported) {
        // iPhone só tem push com o app adicionado à Tela de Início
        const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
        if (!cancelled) setStatus(ios && key ? "ios-install" : "unsupported");
        return;
      }
      const reg = await registration();
      const sub = await reg.pushManager.getSubscription();
      if (!cancelled) setStatus(sub && Notification.permission === "granted" ? "on" : "off");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function enable() {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      refreshPermission();
      if (permission !== "granted") {
        toast.error("Permissão de notificações negada. Libere nas configurações do site.");
        return;
      }
      const reg = await registration();
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey!) }));
      const res = await fetch("/api/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      if (!res.ok) throw new Error();
      setStatus("on");
      toast.success("Pronto! O resumo do dia chega por volta das 9h neste aparelho.");
    } catch {
      toast.error("Não foi possível ativar neste aparelho.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const reg = await registration();
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setStatus("off");
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setBusy(true);
    try {
      const res = await fetch("/api/push/teste", { method: "POST" });
      const data = (await res.json()) as { sent?: number; error?: string };
      if (!res.ok) toast.error(data.error ?? "Falhou");
      else if (!data.sent) toast.error("Nenhum aparelho recebeu. Desative e ative de novo.");
      else toast.success("Enviado! Deve aparecer em instantes.");
    } finally {
      setBusy(false);
    }
  }

  if (status === "loading" || status === "unsupported") return null;

  return (
    <div className="border-b p-3">
      <p className="mb-1 flex items-center gap-1.5 text-sm font-medium">
        <SunriseIcon className="size-4 text-amber-500" /> Resumo do dia às 9h
      </p>
      {status === "ios-install" ? (
        <p className="text-xs text-muted-foreground">
          No iPhone, adicione o app à Tela de Início (Compartilhar → Adicionar à Tela de Início) e abra por lá para
          ativar.
        </p>
      ) : (
        <>
          <p className="mb-2 text-xs text-muted-foreground">
            {status === "on"
              ? "Ligado neste aparelho: chega mesmo com o app fechado."
              : "Receba a agenda e os prazos do dia neste aparelho, mesmo com o app fechado."}
          </p>
          <div className="flex gap-2">
            {status === "on" ? (
              <>
                <Button size="xs" variant="outline" disabled={busy} onClick={test}>
                  Enviar agora (teste)
                </Button>
                <Button size="xs" variant="ghost" disabled={busy} onClick={disable}>
                  Desligar
                </Button>
              </>
            ) : (
              <Button size="xs" disabled={busy} onClick={enable}>
                Ativar neste aparelho
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
