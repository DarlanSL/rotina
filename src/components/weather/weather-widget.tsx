"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  CloudDrizzleIcon,
  CloudFogIcon,
  CloudIcon,
  CloudLightningIcon,
  CloudRainIcon,
  CloudSunIcon,
  DropletIcon,
  LocateFixedIcon,
  MapPinIcon,
  MoonIcon,
  SnowflakeIcon,
  SunIcon,
  XIcon,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatWeekdayShortBR } from "@/lib/dates";
import { describeWeather, forecastUrl, parseForecast, type Forecast, type WeatherKind } from "@/lib/weather";

export type WeatherCity = { name: string; lat: number; lon: number };
type Place = WeatherCity & { gps?: boolean };

const GPS_KEY = "rotina:clima:gps";
const CACHE_KEY = "rotina:clima:cache";
const CACHE_MS = 30 * 60 * 1000;

const ICONS: Record<WeatherKind, { icon: LucideIcon; className: string }> = {
  clear: { icon: SunIcon, className: "text-amber-500" },
  partly: { icon: CloudSunIcon, className: "text-amber-500" },
  cloudy: { icon: CloudIcon, className: "text-slate-500 dark:text-slate-400" },
  fog: { icon: CloudFogIcon, className: "text-slate-500 dark:text-slate-400" },
  drizzle: { icon: CloudDrizzleIcon, className: "text-sky-500" },
  rain: { icon: CloudRainIcon, className: "text-blue-600 dark:text-blue-400" },
  snow: { icon: SnowflakeIcon, className: "text-cyan-500" },
  storm: { icon: CloudLightningIcon, className: "text-violet-600 dark:text-violet-400" },
};

function WeatherIcon({ code, isDay = true, className }: { code: number; isDay?: boolean; className?: string }) {
  const { kind } = describeWeather(code);
  if (kind === "clear" && !isDay) return <MoonIcon className={cn("text-indigo-400", className)} aria-hidden />;
  const { icon: Icon, className: tone } = ICONS[kind];
  return <Icon className={cn(tone, className)} aria-hidden />;
}

// localStorage pode não existir (aba anônima, bloqueio): tudo com try/catch
function readStorage<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function writeStorage(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

type CacheEntry = { key: string; at: number; data: Forecast };
const CACHE_PLACES = 3; // cidade + localização atual + uma folga, para alternar sem buscar de novo

async function loadForecast(place: Place): Promise<Forecast> {
  const key = `${place.lat.toFixed(2)},${place.lon.toFixed(2)}`;
  const stored = readStorage<CacheEntry[]>(CACHE_KEY);
  const cache = Array.isArray(stored) ? stored.filter((e) => Date.now() - e.at < CACHE_MS) : [];
  const hit = cache.find((e) => e.key === key);
  if (hit) return hit.data;

  const res = await fetch(forecastUrl(place.lat, place.lon));
  const data = res.ok ? parseForecast(await res.json()) : null;
  if (!data) throw new Error("Previsão indisponível");
  writeStorage(CACHE_KEY, [{ key, at: Date.now(), data }, ...cache.filter((e) => e.key !== key)].slice(0, CACHE_PLACES));
  return data;
}

/**
 * Bolinha flutuante com o tempo de agora; ao tocar, abre para o lado com os próximos dias.
 * Local: cidade de "Minha conta" ou, se escolhido neste aparelho, a localização atual (GPS).
 */
export function WeatherWidget({ city }: { city: WeatherCity | null }) {
  const [open, setOpen] = useState(false);
  const [gps, setGps] = useState<WeatherCity | null>(null);
  // só busca depois de ler a preferência do aparelho (senão buscaria a cidade e logo depois o GPS)
  const [ready, setReady] = useState(false);
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [failed, setFailed] = useState(false);
  const [locating, setLocating] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // preferência de GPS fica só neste aparelho
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lê o localStorage após montar
    setGps(readStorage<WeatherCity>(GPS_KEY));
    setReady(true);
  }, []);

  const place: Place | null = gps ? { ...gps, gps: true } : city;
  const placeKey = place ? `${place.lat},${place.lon}` : null;

  const [attempt, setAttempt] = useState(0); // "Tentar de novo" incrementa e refaz a busca

  useEffect(() => {
    if (!ready || !place) return;
    let alive = true;
    loadForecast(place).then(
      (data) => {
        if (!alive) return;
        setForecast(data);
        setFailed(false);
      },
      () => alive && setFailed(true),
    );
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recarrega só quando o lugar muda
  }, [ready, placeKey, attempt]);

  // fecha ao tocar fora ou com Esc
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function pickCurrentLocation() {
    if (!("geolocation" in navigator)) {
      toast.error("Este navegador não informa a localização");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const here = { name: "Sua localização", lat: pos.coords.latitude, lon: pos.coords.longitude };
        writeStorage(GPS_KEY, here);
        setGps(here);
        setLocating(false);
      },
      () => {
        setLocating(false);
        toast.error("Não foi possível obter sua localização. Verifique a permissão do navegador.");
      },
      { timeout: 10_000, maximumAge: CACHE_MS },
    );
  }

  function pickAccountCity() {
    writeStorage(GPS_KEY, null);
    setGps(null);
  }

  const today = forecast?.days[0];
  const now = forecast?.current;
  const summary = now ? `${now.temp}°, ${describeWeather(now.code).label.toLowerCase()}` : null;

  return (
    <div
      ref={rootRef}
      className="fixed right-4 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-40 flex items-end gap-2 md:right-6 md:bottom-6 print:hidden!"
    >
      {open && (
        <section
          aria-label="Previsão do tempo"
          className="order-first w-[min(30rem,calc(100vw-6.5rem))] origin-bottom-right animate-in rounded-2xl border bg-card p-3 text-card-foreground shadow-lg duration-150 fade-in-0 zoom-in-95"
        >
          <header className="mb-2 flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1 truncate text-sm font-semibold">
                {place?.gps ? <LocateFixedIcon className="size-3.5 shrink-0" /> : <MapPinIcon className="size-3.5 shrink-0" />}
                <span className="truncate">{place?.name ?? "Previsão do tempo"}</span>
              </p>
              {summary && today && (
                <p className="text-xs text-muted-foreground">
                  Agora {summary} · máx {today.max}° mín {today.min}°
                </p>
              )}
            </div>
            <Button variant="ghost" size="icon-sm" aria-label="Fechar previsão" onClick={() => setOpen(false)}>
              <XIcon />
            </Button>
          </header>

          {!place ? (
            <p className="mb-2 text-sm text-muted-foreground">
              Para ver a previsão, escolha sua cidade ou use a localização deste aparelho.
            </p>
          ) : failed ? (
            <p className="mb-2 text-sm text-muted-foreground">
              Não foi possível carregar a previsão.{" "}
              <button type="button" className="font-medium text-foreground underline" onClick={() => {
                  setFailed(false);
                  setAttempt((a) => a + 1);
                }}>
                Tentar de novo
              </button>
            </p>
          ) : !forecast ? (
            <div className="mb-2 h-24 animate-pulse rounded-xl bg-muted" />
          ) : (
            <ol className="-mx-1 mb-2 flex gap-1 overflow-x-auto px-1 pb-1" aria-label="Próximos dias">
              {forecast.days.map((d, i) => (
                <li
                  key={d.date}
                  title={describeWeather(d.code).label}
                  className={cn(
                    "flex min-w-14 flex-1 flex-col items-center gap-1 rounded-xl px-1.5 py-2 text-center",
                    i === 0 ? "bg-sky-50 dark:bg-sky-500/10" : "bg-muted/50",
                  )}
                >
                  <span className="text-[11px] font-medium text-muted-foreground uppercase">
                    {i === 0 ? "hoje" : formatWeekdayShortBR(d.date)}
                  </span>
                  <WeatherIcon code={d.code} className="size-6" />
                  <span className="text-sm leading-none font-semibold tabular-nums">{d.max}°</span>
                  <span className="text-xs leading-none text-muted-foreground tabular-nums">{d.min}°</span>
                  {d.rain !== null && (
                    <span className="flex items-center gap-0.5 text-[11px] text-sky-700 tabular-nums dark:text-sky-300">
                      <DropletIcon className="size-2.5" />
                      {d.rain}%
                    </span>
                  )}
                </li>
              ))}
            </ol>
          )}

          <footer className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            {place?.gps && city ? (
              <button type="button" className="flex items-center gap-1 hover:underline" onClick={pickAccountCity}>
                <MapPinIcon className="size-3" /> Usar {city.name}
              </button>
            ) : (
              <button
                type="button"
                className="flex items-center gap-1 hover:underline disabled:opacity-50"
                disabled={locating}
                onClick={pickCurrentLocation}
              >
                <LocateFixedIcon className="size-3" /> {locating ? "Localizando…" : "Usar minha localização"}
              </button>
            )}
            <Link href="/conta#previsao" className="text-muted-foreground hover:underline" onClick={() => setOpen(false)}>
              {city ? "Trocar cidade" : "Escolher cidade"}
            </Link>
            <span className="ml-auto text-muted-foreground">Open-Meteo</span>
          </footer>
        </section>
      )}

      <button
        type="button"
        aria-expanded={open}
        aria-label={summary ? `Previsão do tempo: ${summary}` : "Previsão do tempo"}
        onClick={() => setOpen((o) => !o)}
        className="flex size-14 shrink-0 flex-col items-center justify-center rounded-full border bg-card shadow-lg transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        {now ? (
          <>
            <WeatherIcon code={now.code} isDay={now.isDay} className="size-5" />
            <span className="text-xs leading-tight font-semibold tabular-nums">{now.temp}°</span>
          </>
        ) : (
          <CloudSunIcon className={cn("size-6 text-muted-foreground", place && !failed && "animate-pulse")} aria-hidden />
        )}
      </button>
    </div>
  );
}
