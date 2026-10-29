/** Previsão do tempo (Open-Meteo, gratuito e sem chave). Regras puras, usadas no navegador. */

export type WeatherKind = "clear" | "partly" | "cloudy" | "fog" | "drizzle" | "rain" | "snow" | "storm";

export type ForecastDay = { date: string; code: number; max: number; min: number; rain: number | null };
export type Forecast = {
  current: { temp: number; code: number; isDay: boolean };
  days: ForecastDay[];
};

export const FORECAST_DAYS = 7;

export function forecastUrl(lat: number, lon: number) {
  const params = new URLSearchParams({
    latitude: lat.toFixed(3),
    longitude: lon.toFixed(3),
    current: "temperature_2m,weather_code,is_day",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
    timezone: "auto",
    forecast_days: String(FORECAST_DAYS),
  });
  return `https://api.open-meteo.com/v1/forecast?${params}`;
}

export function citySearchUrl(query: string) {
  const params = new URLSearchParams({ name: query, count: "6", language: "pt", format: "json" });
  return `https://geocoding-api.open-meteo.com/v1/search?${params}`;
}

/** Códigos WMO usados pelo Open-Meteo → tipo de tempo e rótulo. */
export function describeWeather(code: number): { kind: WeatherKind; label: string } {
  if (code === 0) return { kind: "clear", label: "Céu limpo" };
  if (code === 1 || code === 2) return { kind: "partly", label: code === 1 ? "Poucas nuvens" : "Parcialmente nublado" };
  if (code === 3) return { kind: "cloudy", label: "Nublado" };
  if (code === 45 || code === 48) return { kind: "fog", label: "Neblina" };
  if (code >= 51 && code <= 57) return { kind: "drizzle", label: "Garoa" };
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) {
    return { kind: "rain", label: code >= 80 ? "Pancadas de chuva" : code >= 65 ? "Chuva forte" : "Chuva" };
  }
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { kind: "snow", label: "Neve" };
  if (code >= 95) return { kind: "storm", label: "Tempestade" };
  return { kind: "cloudy", label: "Nublado" };
}

type OpenMeteoResponse = {
  current?: { temperature_2m?: number; weather_code?: number; is_day?: number };
  daily?: {
    time?: string[];
    weather_code?: number[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_probability_max?: (number | null)[];
  };
};

/** Converte a resposta do Open-Meteo; null se vier incompleta. */
export function parseForecast(json: unknown): Forecast | null {
  const { current, daily } = (json ?? {}) as OpenMeteoResponse;
  if (current?.temperature_2m === undefined || current.weather_code === undefined || !daily?.time?.length) return null;
  const days = daily.time.map((date, i) => ({
    date,
    code: daily.weather_code?.[i] ?? 3,
    max: Math.round(daily.temperature_2m_max?.[i] ?? NaN),
    min: Math.round(daily.temperature_2m_min?.[i] ?? NaN),
    rain: daily.precipitation_probability_max?.[i] ?? null,
  }));
  if (days.some((d) => Number.isNaN(d.max) || Number.isNaN(d.min))) return null;
  return {
    current: { temp: Math.round(current.temperature_2m), code: current.weather_code, isDay: current.is_day !== 0 },
    days,
  };
}

export type CityResult = { name: string; label: string; lat: number; lon: number };

type GeocodingResponse = {
  results?: { name: string; latitude: number; longitude: number; admin1?: string; country?: string }[];
};

/** Resultados da busca de cidade com rótulo "Cidade, Estado, País". */
export function parseCities(json: unknown): CityResult[] {
  const { results = [] } = (json ?? {}) as GeocodingResponse;
  return results.map((r) => ({
    name: r.name,
    label: [r.name, r.admin1 && r.admin1 !== r.name ? r.admin1 : null, r.country].filter(Boolean).join(", "),
    lat: r.latitude,
    lon: r.longitude,
  }));
}
