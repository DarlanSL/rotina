import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { WeatherWidget } from "@/components/weather/weather-widget";

/** Lê a cidade e a preferência do usuário e mostra (ou não) a bolinha de previsão. */
export async function WeatherSlot() {
  const user = await requireUser();
  const prefs = await db.user.findUnique({
    where: { id: user.id },
    select: { showWeather: true, weatherCity: true, weatherLat: true, weatherLon: true },
  });
  if (!prefs?.showWeather) return null;

  const city =
    prefs.weatherCity && prefs.weatherLat !== null && prefs.weatherLon !== null
      ? { name: prefs.weatherCity, lat: prefs.weatherLat, lon: prefs.weatherLon }
      : null;
  return <WeatherWidget city={city} />;
}
