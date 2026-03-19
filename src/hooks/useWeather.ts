import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { getDb } from "@/lib/db";
import type {
  WeatherData,
  WeatherAccent,
  CurrentWeather,
  HourlyPoint,
  DailyPoint,
  GeocodingResult,
} from "@/types/weather";

// ── Constantes ────────────────────────────────────────────────────────────────

const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const STALE_TIME = 10 * 60 * 1000;        // 10 minutos
const REFETCH_INTERVAL = 15 * 60 * 1000;   // 15 minutos
const SETTINGS_KEY = "weather_city";
const DEFAULT_CITY = "Madrid";

// ── Helpers exportados ────────────────────────────────────────────────────────

// Devuelve los colores de acento según el código WMO y si es de día
export function getWeatherAccent(code: number, isDay: boolean): WeatherAccent {
  if (code === 0 && isDay)
    return { wx: "#FCD34D", wxDim: "rgba(252,211,77,0.08)", wxGlow: "rgba(252,211,77,0.2)" };
  if (code === 0 && !isDay)
    return { wx: "#93C5FD", wxDim: "rgba(147,197,253,0.08)", wxGlow: "rgba(147,197,253,0.2)" };
  if ([1, 2, 3].includes(code))
    return { wx: "#60A5FA", wxDim: "rgba(96,165,250,0.08)", wxGlow: "rgba(96,165,250,0.2)" };
  if ([61, 63, 65, 80, 81, 82].includes(code))
    return { wx: "#60A5FA", wxDim: "rgba(96,165,250,0.08)", wxGlow: "rgba(96,165,250,0.2)" };
  if ([95, 96, 99].includes(code))
    return { wx: "#A78BFA", wxDim: "rgba(167,139,250,0.08)", wxGlow: "rgba(167,139,250,0.2)" };
  // default — nublado / otros
  return { wx: "#60A5FA", wxDim: "rgba(96,165,250,0.08)", wxGlow: "rgba(96,165,250,0.2)" };
}

// Texto legible en español para cada código WMO
export function getConditionLabel(code: number): string {
  if (code === 0) return "despejado";
  if (code === 1) return "mayormente despejado";
  if (code === 2) return "parcialmente nublado";
  if (code === 3) return "nublado";
  if ([45, 48].includes(code)) return "niebla";
  if ([51, 53, 55].includes(code)) return "llovizna";
  if ([61, 63, 65].includes(code)) return "lluvia";
  if ([71, 73, 75, 77].includes(code)) return "nieve";
  if ([80, 81, 82].includes(code)) return "chubascos";
  if ([95, 96, 99].includes(code)) return "tormenta";
  return "nublado";
}

// Convierte grados a punto cardinal (8 direcciones)
export function windDegToCardinal(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];
  const idx = Math.round(((deg % 360) + 360) % 360 / 45) % 8;
  return dirs[idx];
}

// Formatea hora de "2026-03-03T14:00" → "14:00", o "ahora" si es la primera
export function formatHourLabel(isoTime: string, isFirst: boolean): string {
  if (isFirst) return "ahora";
  const parts = isoTime.split("T");
  if (parts.length < 2) return isoTime;
  return parts[1].slice(0, 5); // "14:00"
}

// Nombre corto del día: "hoy", "mañana", o día de la semana
export function formatDayLabel(dateStr: string): string {
  // Usar T12:00:00 para evitar off-by-one en zonas horarias oeste de UTC
  const d = new Date(dateStr + "T12:00:00");
  const days = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "hoy";
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (d.toDateString() === tomorrow.toDateString()) return "mañana";
  return days[d.getDay()];
}

// ── Fetcher principal ─────────────────────────────────────────────────────────

async function fetchWeatherForCity(city: string): Promise<WeatherData | null> {
  // 1. Geocoding: ciudad → lat/lon
  const geoRes = await fetch(
    `${GEOCODING_URL}?name=${encodeURIComponent(city)}&count=1&language=es`
  );
  if (!geoRes.ok) throw new Error(`Geocoding error: ${geoRes.status}`);
  const geoJson = (await geoRes.json()) as { results?: GeocodingResult[] };

  if (!geoJson.results || geoJson.results.length === 0) return null;
  const { latitude, longitude, name: resolvedName } = geoJson.results[0];

  // 2. Forecast con todos los campos necesarios
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: [
      "temperature_2m",
      "apparent_temperature",
      "weather_code",
      "wind_speed_10m",
      "wind_direction_10m",
      "relative_humidity_2m",
      "precipitation_probability",
      "uv_index",
      "surface_pressure",
      "is_day",
    ].join(","),
    hourly: "temperature_2m,weather_code,precipitation_probability,is_day",
    daily:
      "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
    forecast_days: "7",
    timezone: "auto",
    wind_speed_unit: "kmh",
  });

  const forecastRes = await fetch(`${FORECAST_URL}?${params}`);
  if (!forecastRes.ok) throw new Error(`Forecast error: ${forecastRes.status}`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = (await forecastRes.json()) as any;

  const c = data.current;
  const h = data.hourly;
  const d = data.daily;

  const current: CurrentWeather = {
    temperature: Math.round(c.temperature_2m),
    apparentTemperature: Math.round(c.apparent_temperature),
    weatherCode: c.weather_code,
    windSpeed: Math.round(c.wind_speed_10m),
    windDirection: c.wind_direction_10m,
    humidity: c.relative_humidity_2m,
    precipitationProbability: c.precipitation_probability ?? 0,
    uvIndex: Math.round(c.uv_index ?? 0),
    surfacePressure: Math.round(c.surface_pressure ?? 0),
    isDay: c.is_day,
  };

  // Filtrar las próximas 6 horas desde ahora
  const hourly = getNext6Hours(
    h.time as string[],
    h.temperature_2m as number[],
    h.weather_code as number[],
    h.precipitation_probability as number[],
    h.is_day as number[]
  );

  const daily: DailyPoint[] = (d.time as string[]).map(
    (date: string, i: number) => ({
      date,
      weatherCode: d.weather_code[i],
      tempMax: Math.round(d.temperature_2m_max[i]),
      tempMin: Math.round(d.temperature_2m_min[i]),
      precipitationProbabilityMax: d.precipitation_probability_max[i] ?? 0,
    })
  );

  return {
    city,
    resolvedName,
    current,
    hourly,
    daily,
    fetchedAt: new Date(),
  };
}

// Selecciona los próximos 6 puntos horarios a partir de la hora actual
function getNext6Hours(
  times: string[],
  temperatures: number[],
  codes: number[],
  precipProbs: number[],
  isDayValues: number[]
): HourlyPoint[] {
  const now = new Date();
  // Truncar al inicio de la hora actual
  const nowHour = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    now.getHours()
  );

  const points: HourlyPoint[] = [];
  for (let i = 0; i < times.length && points.length < 6; i++) {
    // Parsear "2026-03-03T14:00" como hora local (sin 'Z')
    const t = new Date(times[i] + ":00");
    if (t >= nowHour) {
      points.push({
        time: times[i],
        temperature: Math.round(temperatures[i]),
        weatherCode: codes[i],
        precipitationProbability: precipProbs[i] ?? 0,
        isDay: isDayValues[i] ?? 1,
      });
    }
  }
  return points;
}

// ── Hook público ──────────────────────────────────────────────────────────────

interface UseWeatherReturn {
  data: WeatherData | null | undefined;
  isLoading: boolean;
  isError: boolean;
  city: string;
  setCity: (city: string) => Promise<void>;
  refetch: () => void;
  lastFetch: Date | null;
}

export function useWeather(): UseWeatherReturn {
  const [city, setCityState] = useState(DEFAULT_CITY);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // Cargar ciudad guardada en SQLite al montar
  useEffect(() => {
    async function loadCity() {
      try {
        const db = await getDb();
        const rows = await db.select<{ value: string }[]>(
          "SELECT value FROM settings WHERE key = $1",
          [SETTINGS_KEY]
        );
        if (rows.length > 0 && rows[0].value.trim()) {
          setCityState(rows[0].value.trim());
        }
      } catch {
        // Usar ciudad por defecto si falla la lectura
      } finally {
        setSettingsLoaded(true);
      }
    }
    loadCity();
  }, []);

  const { data, isLoading, isError, refetch, dataUpdatedAt } = useQuery({
    queryKey: ["weather", city],
    queryFn: () => fetchWeatherForCity(city),
    staleTime: STALE_TIME,
    refetchInterval: REFETCH_INTERVAL,
    // No hacer fetch hasta que la ciudad se haya cargado desde SQLite
    enabled: settingsLoaded,
    retry: 2,
  });

  const setCity = async (newCity: string) => {
    setCityState(newCity);
    try {
      const db = await getDb();
      await db.execute(
        "INSERT OR REPLACE INTO settings (key, value) VALUES ($1, $2)",
        [SETTINGS_KEY, newCity]
      );
    } catch (e) {
      console.error("Error guardando ciudad:", e);
    }
  };

  // dataUpdatedAt es un number (epoch ms) en TanStack Query v5
  const lastFetch = dataUpdatedAt ? new Date(dataUpdatedAt) : null;

  return {
    data: data ?? null,
    isLoading: isLoading && settingsLoaded,
    isError,
    city,
    setCity,
    refetch,
    lastFetch,
  };
}
