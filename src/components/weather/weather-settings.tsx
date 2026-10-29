"use client";

import { useEffect, useState } from "react";
import { MapPinIcon, SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAction } from "@/components/use-action";
import { setShowWeather, setWeatherCity } from "@/app/(app)/conta/actions";
import { citySearchUrl, parseCities, type CityResult } from "@/lib/weather";

/** Minha conta → cidade da previsão (busca no Open-Meteo) e mostrar/esconder a bolinha. */
export function WeatherSettings({ city, show }: { city: string | null; show: boolean }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CityResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const { pending, run } = useAction();

  // busca enquanto digita, com uma pausa para não disparar a cada letra
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- limpa a lista quando o campo esvazia
      setResults(null);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(citySearchUrl(q), { signal: controller.signal });
        setResults(parseCities(await res.json()));
      } catch {
        if (!controller.signal.aborted) setResults([]);
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  function choose(c: CityResult) {
    run(
      () => setWeatherCity({ name: c.name, lat: c.lat, lon: c.lon }),
      () => {
        setQuery("");
        setResults(null);
      },
    );
  }

  return (
    <div className="grid gap-4">
      <p className="flex items-center gap-1.5 text-sm">
        <MapPinIcon className="size-4 text-muted-foreground" />
        {city ? (
          <>
            Cidade: <span className="font-medium">{city}</span>
            <Button
              variant="link"
              size="sm"
              className="h-auto px-1"
              disabled={pending}
              onClick={() => run(() => setWeatherCity(null))}
            >
              remover
            </Button>
          </>
        ) : (
          <span className="text-muted-foreground">Nenhuma cidade escolhida.</span>
        )}
      </p>

      <div className="grid gap-1.5">
        <Label htmlFor="weather-city">{city ? "Trocar cidade" : "Buscar cidade"}</Label>
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="weather-city"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ex.: Campinas"
            autoComplete="off"
            className="pl-8"
          />
        </div>
        {searching && <p className="text-xs text-muted-foreground">Buscando…</p>}
        {results && !searching && (
          <ul className="grid gap-1" aria-label="Cidades encontradas">
            {results.length === 0 && <li className="text-xs text-muted-foreground">Nenhuma cidade encontrada.</li>}
            {results.map((c) => (
              <li key={`${c.lat},${c.lon}`}>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => choose(c)}
                  className="w-full rounded-lg border px-3 py-2 text-left text-sm hover:bg-muted"
                >
                  {c.label}
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-muted-foreground">
          Na própria bolinha dá para usar a localização atual do aparelho em vez da cidade.
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={show} disabled={pending} onCheckedChange={(checked) => run(() => setShowWeather(checked))} />
        Mostrar a bolinha de previsão do tempo
      </label>
    </div>
  );
}
