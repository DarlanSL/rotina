"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { BellIcon, BellOffIcon, BellRingIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { NativeSelect } from "@/components/native-select";
import { showNotice } from "@/components/notifications/engine";
import { markAllSeen, refreshPermission, setLeadMinutes, useNotificationState } from "@/components/notifications/store";
import { LEAD_OPTIONS } from "@/lib/notify";
import { cn } from "@/lib/utils";

function timeAgo(at: number) {
  const min = Math.round((Date.now() - at) / 60_000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(at);
}

export function NotificationBell({ className }: { className?: string }) {
  const router = useRouter();
  const { history, lastSeen, leadMinutes, permission } = useNotificationState();
  const unread = history.filter((h) => h.at > lastSeen).length;

  async function enableSystem() {
    try {
      await Notification.requestPermission();
    } finally {
      refreshPermission();
    }
  }

  return (
    <Popover onOpenChange={(open) => !open && unread && markAllSeen()}>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className={cn("relative", className)}
            aria-label={unread ? `Notificações (${unread} novas)` : "Notificações"}
          />
        }
      >
        {unread ? <BellRingIcon className="text-indigo-600 dark:text-indigo-400" /> : <BellIcon />}
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(22rem,calc(100vw-2rem))] p-0">
        <div className="border-b p-3">
          <p className="text-sm font-semibold">Notificações</p>
          <p className="text-xs text-muted-foreground">Avisos de atividades, lembretes e prazos.</p>
        </div>

        {permission === "default" && (
          <div className="border-b bg-indigo-50 p-3 dark:bg-indigo-500/10">
            <p className="mb-2 text-xs text-indigo-900 dark:text-indigo-200">
              Ative os avisos do sistema para ser lembrado mesmo com o app em segundo plano.
            </p>
            <Button size="sm" onClick={enableSystem}>
              <BellRingIcon /> Ativar avisos do sistema
            </Button>
          </div>
        )}
        {permission === "denied" && (
          <p className="flex gap-2 border-b bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
            <BellOffIcon className="size-4 shrink-0" />
            Avisos do sistema bloqueados. Libere em Configurações do site (ícone ao lado do endereço). Enquanto isso, os
            avisos aparecem dentro do app.
          </p>
        )}
        {permission === "unsupported" && (
          <p className="border-b p-3 text-xs text-muted-foreground">
            Este navegador não oferece avisos do sistema; eles aparecerão dentro do app. No iPhone, adicione o app à
            Tela de Início para habilitar.
          </p>
        )}

        <div className="flex items-center justify-between gap-2 border-b p-3">
          <label htmlFor="notif-lead" className="text-xs text-muted-foreground">
            Avisar antes
          </label>
          <div className="flex items-center gap-2">
            <NativeSelect
              id="notif-lead"
              value={leadMinutes}
              onChange={(e) => setLeadMinutes(Number(e.target.value))}
              className="h-7 w-auto text-xs"
            >
              {LEAD_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {m} min
                </option>
              ))}
            </NativeSelect>
            <Button
              size="xs"
              variant="outline"
              onClick={() =>
                showNotice(`test:${Date.now()}`, "Teste de aviso", "As notificações estão funcionando.", "/", (url) =>
                  router.push(url),
                )
              }
            >
              Testar
            </Button>
          </div>
        </div>

        <ul className="max-h-80 divide-y overflow-y-auto">
          {history.length === 0 && (
            <li className="p-6 text-center text-xs text-muted-foreground">Nenhum aviso ainda.</li>
          )}
          {history.map((h) => (
            <li key={`${h.id}-${h.at}`}>
              <Link
                href={h.url}
                className={cn(
                  "flex gap-2 p-3 hover:bg-muted",
                  h.at > lastSeen && "bg-indigo-50/60 dark:bg-indigo-500/5",
                )}
              >
                <span
                  className={cn(
                    "mt-1.5 size-2 shrink-0 rounded-full",
                    h.at > lastSeen ? "bg-indigo-500" : "bg-transparent",
                  )}
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{h.title}</span>
                  {h.body && <span className="block text-xs whitespace-pre-line text-muted-foreground">{h.body}</span>}
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">{timeAgo(h.at)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
