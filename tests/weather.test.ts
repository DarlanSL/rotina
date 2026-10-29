import { describe, expect, it } from "vitest";
import { describeWeather, forecastUrl, parseCities, parseForecast } from "@/lib/weather";

describe("describeWeather", () => {
  it("traduz os principais códigos WMO", () => {
    expect(describeWeather(0)).toEqual({ kind: "clear", label: "Céu limpo" });
    expect(describeWeather(2).kind).toBe("partly");
    expect(describeWeather(3).kind).toBe("cloudy");
    expect(describeWeather(45).kind).toBe("fog");
    expect(describeWeather(53).kind).toBe("drizzle");
    expect(describeWeather(63)).toEqual({ kind: "rain", label: "Chuva" });
    expect(describeWeather(81).label).toBe("Pancadas de chuva");
    expect(describeWeather(95).kind).toBe("storm");
  });
  it("código fora da tabela vira nublado", () => {
    expect(describeWeather(10).kind).toBe("cloudy");
    expect(describeWeather(-1).kind).toBe("cloudy");
  });
});

describe("parseForecast", () => {
  const json = {
    current: { temperature_2m: 27.6, weather_code: 2, is_day: 1 },
    daily: {
      time: ["2026-10-29", "2026-10-30"],
      weather_code: [2, 61],
      temperature_2m_max: [29.4, 24.5],
      temperature_2m_min: [18.2, 17.6],
      precipitation_probability_max: [10, 80],
    },
  };
  it("arredonda temperaturas e monta os dias", () => {
    expect(parseForecast(json)).toEqual({
      current: { temp: 28, code: 2, isDay: true },
      days: [
        { date: "2026-10-29", code: 2, max: 29, min: 18, rain: 10 },
        { date: "2026-10-30", code: 61, max: 25, min: 18, rain: 80 },
      ],
    });
  });
  it("resposta incompleta vira null", () => {
    expect(parseForecast({})).toBeNull();
    expect(parseForecast({ current: json.current, daily: { time: ["2026-10-29"] } })).toBeNull();
  });
});

describe("parseCities", () => {
  it("monta 'Cidade, Estado, País' sem repetir", () => {
    const cities = parseCities({
      results: [
        { name: "Campinas", latitude: -22.9, longitude: -47.06, admin1: "São Paulo", country: "Brasil" },
        { name: "São Paulo", latitude: -23.55, longitude: -46.63, admin1: "São Paulo", country: "Brasil" },
      ],
    });
    expect(cities.map((c) => c.label)).toEqual(["Campinas, São Paulo, Brasil", "São Paulo, Brasil"]);
  });
  it("sem resultados, lista vazia", () => {
    expect(parseCities({})).toEqual([]);
  });
});

it("forecastUrl pede 7 dias no fuso do local", () => {
  const url = new URL(forecastUrl(-22.9056, -47.0608));
  expect(url.searchParams.get("latitude")).toBe("-22.906");
  expect(url.searchParams.get("forecast_days")).toBe("7");
  expect(url.searchParams.get("timezone")).toBe("auto");
});
