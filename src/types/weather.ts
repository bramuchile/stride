export interface CurrentWeather {
  temperature: number;
  apparentTemperature: number;
  weatherCode: number;
  windSpeed: number;
  windDirection: number;
  humidity: number;
  precipitationProbability: number;
  uvIndex: number;
  surfacePressure: number;
  isDay: number; // 0 | 1
}

export interface HourlyPoint {
  time: string; // "2026-03-03T14:00"
  temperature: number;
  weatherCode: number;
  precipitationProbability: number;
}

export interface DailyPoint {
  date: string; // "2026-03-03"
  weatherCode: number;
  tempMax: number;
  tempMin: number;
  precipitationProbabilityMax: number;
}

export interface WeatherData {
  city: string;         // ciudad guardada por el usuario
  resolvedName: string; // nombre devuelto por geocoding API
  current: CurrentWeather;
  hourly: HourlyPoint[]; // 6 puntos desde la hora actual
  daily: DailyPoint[];   // 3 días: hoy + 2
  fetchedAt: Date;
}

export interface WeatherAccent {
  wx: string;     // color primario dinámico
  wxDim: string;  // rgba con 0.08 opacity
  wxGlow: string; // rgba con 0.2 opacity
}

// Respuesta de la API geocoding de Open-Meteo
export interface GeocodingResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  admin1?: string;
}
