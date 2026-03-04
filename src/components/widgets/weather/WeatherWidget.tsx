import { useState, useEffect, useRef } from "react";
import {
  useWeather,
  getWeatherAccent,
  getConditionLabel,
  windDegToCardinal,
  formatHourLabel,
  formatDayLabel,
} from "@/hooks/useWeather";
import { WeatherIcon } from "./WeatherIcon";

interface WeatherWidgetProps {
  position?: "top" | "bottom";
  onCollapse?: () => void;
}

// ── Helpers internos ──────────────────────────────────────────────────────────

// Calcula la posición del fill de la barra de rango de temperatura
function getTempBarPosition(
  globalMin: number,
  globalMax: number,
  dayMin: number,
  dayMax: number
): { left: string; width: string } {
  const range = globalMax - globalMin;
  if (range === 0) return { left: "0%", width: "100%" };
  const leftPct = ((dayMin - globalMin) / range) * 100;
  const widthPct = ((dayMax - dayMin) / range) * 100;
  return {
    left: `${leftPct.toFixed(1)}%`,
    width: `${Math.max(widthPct, 4).toFixed(1)}%`,
  };
}

// ── Sub-componentes ───────────────────────────────────────────────────────────

function LoadingSkeleton() {
  const pulse: React.CSSProperties = {
    background: "var(--elevated)",
    borderRadius: 6,
    animation: "pulse 2s cubic-bezier(0.4,0,0.6,1) infinite",
  };
  return (
    <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ ...pulse, height: 52, width: 120 }} />
          <div style={{ ...pulse, height: 12, width: 160 }} />
          <div style={{ ...pulse, height: 12, width: 100 }} />
          <div style={{ ...pulse, height: 22, width: 80 }} />
        </div>
        <div style={{ ...pulse, width: 90, height: 90, borderRadius: "50%" }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 4, marginTop: 8 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{ ...pulse, height: 64, borderRadius: 8 }} />
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} style={{ ...pulse, height: 28, borderRadius: 6 }} />
        ))}
      </div>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: 200,
        gap: 10,
        color: "var(--text3)",
      }}
    >
      {/* Ícono nube con X */}
      <svg width={36} height={36} viewBox="0 0 24 24" fill="none" stroke="var(--text4)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25" />
        <line x1="8" y1="16" x2="16" y2="24" />
        <line x1="16" y1="16" x2="8" y2="24" />
      </svg>
      <div
        style={{
          fontSize: 10,
          color: "var(--text3)",
          fontFamily: "'Geist Mono', monospace",
          textAlign: "center",
        }}
      >
        No se pudo cargar el clima
      </div>
      <button
        onClick={onRetry}
        style={{
          height: 22,
          padding: "0 12px",
          borderRadius: 6,
          background: "var(--elevated)",
          border: "1px solid var(--border2)",
          fontSize: 9,
          color: "var(--text2)",
          fontFamily: "'Geist Mono', monospace",
          cursor: "pointer",
        }}
      >
        Reintentar
      </button>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export function WeatherWidget({ position = "bottom", onCollapse }: WeatherWidgetProps) {
  const { data, isLoading, isError, city, setCity, refetch, lastFetch } = useWeather();
  const [editingCity, setEditingCity] = useState(false);
  const [cityInput, setCityInput] = useState("");
  const [lastFetchDisplay, setLastFetchDisplay] = useState("...");
  const inputRef = useRef<HTMLInputElement>(null);

  // Color de acento según condición — fallback mientras carga
  const accent =
    data
      ? getWeatherAccent(data.current.weatherCode, data.current.isDay === 1)
      : { wx: "#60A5FA", wxDim: "rgba(96,165,250,0.08)", wxGlow: "rgba(96,165,250,0.2)" };

  // Actualizar texto "hace X min" cada 60 segundos
  useEffect(() => {
    function update() {
      if (!lastFetch) {
        setLastFetchDisplay("...");
        return;
      }
      const diffSec = Math.floor((Date.now() - lastFetch.getTime()) / 1000);
      if (diffSec < 60) {
        setLastFetchDisplay("ahora");
      } else {
        setLastFetchDisplay(`hace ${Math.floor(diffSec / 60)} min`);
      }
    }
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, [lastFetch]);

  // Focus en el input cuando se activa la edición
  useEffect(() => {
    if (editingCity) {
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [editingCity]);

  function handleCitySubmit() {
    const trimmed = cityInput.trim();
    if (trimmed) setCity(trimmed);
    setEditingCity(false);
  }

  function handleCityKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleCitySubmit();
    if (e.key === "Escape") setEditingCity(false);
  }

  // Calcular rango global de temperaturas para la barra de forecast
  const globalTempMin = data ? Math.min(...data.daily.map((d) => d.tempMin)) : 0;
  const globalTempMax = data ? Math.max(...data.daily.map((d) => d.tempMax)) : 1;

  // Ícono SVG de refresh (flecha circular pequeña)
  const RefreshIcon = () => (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );

  // Ícono de colapsar (chevron)
  const CollapseIcon = () => (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      {position === "top"
        ? <polyline points="18 15 12 9 6 15" />
        : <polyline points="6 9 12 15 18 9" />}
    </svg>
  );

  // Estilo compartido para botones de header
  const headerBtnStyle: React.CSSProperties = {
    width: 22,
    height: 22,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "transparent",
    border: "none",
    borderRadius: 5,
    color: "var(--text3)",
    cursor: "pointer",
    flexShrink: 0,
    padding: 0,
  };

  return (
    <div
      style={{
        "--wx": accent.wx,
        "--wx-dim": accent.wxDim,
        "--wx-glow": accent.wxGlow,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        background: "rgba(15,13,23,0.96)",
        fontFamily: "'Instrument Sans', sans-serif",
        overflow: "hidden",
        position: "relative",
      } as React.CSSProperties}
    >
      {/* Línea de acento (top o bottom según posición del overlay) */}
      <div
        style={{
          position: "absolute",
          ...(position === "top"
            ? { bottom: 0, left: 0, right: 0 }
            : { top: 0, left: 0, right: 0 }),
          height: 1,
          background: "linear-gradient(90deg, transparent, var(--wx), transparent)",
          opacity: 0.7,
          pointerEvents: "none",
          zIndex: 1,
        }}
      />

      {/* ── ZONA 1: HEADER ──────────────────────────────────────────────── */}
      <div
        style={{
          height: 32,
          display: "flex",
          alignItems: "center",
          padding: "0 10px",
          gap: 7,
          borderBottom: "1px solid rgba(46,43,62,0.6)",
          flexShrink: 0,
          background: "rgba(19,17,28,0.85)",
        }}
      >
        {/* Dot pulsante con color dinámico */}
        <div
          style={{
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: "var(--wx)",
            boxShadow: "0 0 6px var(--wx)",
            animation: "wx-pulse-dot 3s ease-in-out infinite",
            flexShrink: 0,
          }}
        />

        {/* Label "clima" */}
        <span
          style={{
            fontFamily: "'Geist Mono', monospace",
            fontSize: 9,
            fontWeight: 500,
            textTransform: "uppercase",
            letterSpacing: "0.14em",
            color: "var(--text3)",
            flexShrink: 0,
          }}
        >
          clima
        </span>

        {/* Location pill / input */}
        {editingCity ? (
          <input
            ref={inputRef}
            value={cityInput}
            onChange={(e) => setCityInput(e.target.value)}
            onBlur={handleCitySubmit}
            onKeyDown={handleCityKeyDown}
            placeholder="Ciudad..."
            style={{
              flex: 1,
              minWidth: 0,
              height: 18,
              background: "var(--elevated)",
              border: "1px solid var(--wx)",
              borderRadius: 20,
              padding: "0 8px",
              fontSize: 9,
              color: "var(--text)",
              fontFamily: "'Geist Mono', monospace",
              outline: "none",
            }}
          />
        ) : (
          <button
            onClick={() => {
              setCityInput(data?.resolvedName ?? city);
              setEditingCity(true);
            }}
            title="Click para cambiar ciudad"
            style={{
              flex: 1,
              minWidth: 0,
              height: 18,
              background: "var(--elevated)",
              border: "1px solid var(--border2)",
              borderRadius: 20,
              padding: "0 8px",
              fontSize: 9,
              color: "var(--text2)",
              fontFamily: "'Geist Mono', monospace",
              cursor: "pointer",
              textAlign: "left",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {data?.resolvedName ?? city}
          </button>
        )}

        {/* Tiempo desde última actualización + refresh */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontSize: 8,
            color: "var(--text4)",
            fontFamily: "'Geist Mono', monospace",
            flexShrink: 0,
          }}
        >
          <span>{lastFetchDisplay}</span>
          <button
            onClick={() => refetch()}
            title="Actualizar"
            style={{ ...headerBtnStyle, width: 16, height: 16 }}
          >
            <RefreshIcon />
          </button>
        </div>

        {/* Botón colapsar */}
        {onCollapse && (
          <button onClick={onCollapse} title="Colapsar" style={headerBtnStyle}>
            <CollapseIcon />
          </button>
        )}
      </div>

      {/* ── CONTENIDO SCROLLABLE ─────────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          scrollbarWidth: "thin",
          scrollbarColor: "var(--border2) transparent",
        }}
      >
        {/* Estado de carga */}
        {isLoading && !data && <LoadingSkeleton />}

        {/* Estado de error */}
        {isError && !data && <ErrorState onRetry={refetch} />}

        {/* Datos */}
        {data && (
          <>
            {/* ── ZONA 2: MAIN ──────────────────────────────────────────── */}
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                padding: "14px 12px 10px",
                gap: 0,
                animation: "wx-slide-up 0.45s ease both",
              }}
            >
              {/* Columna izquierda */}
              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Temperatura grande */}
                <div
                  style={{
                    fontSize: 52,
                    fontWeight: 300,
                    color: "var(--text)",
                    lineHeight: 1,
                    letterSpacing: "-0.04em",
                    fontFamily: "'Instrument Sans', sans-serif",
                    display: "flex",
                    alignItems: "flex-start",
                  }}
                >
                  {data.current.temperature}
                  <span
                    style={{
                      fontSize: 18,
                      color: "var(--text3)",
                      fontFamily: "'Geist Mono', monospace",
                      marginTop: 8,
                    }}
                  >
                    °C
                  </span>
                </div>

                {/* Condición + ícono inline */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    marginTop: 4,
                  }}
                >
                  <WeatherIcon
                    code={data.current.weatherCode}
                    size={14}
                    isDay={data.current.isDay === 1}
                    animated={false}
                  />
                  <span
                    style={{
                      fontSize: 11,
                      color: "var(--text2)",
                      fontWeight: 500,
                    }}
                  >
                    {getConditionLabel(data.current.weatherCode)}
                  </span>
                </div>

                {/* Sensación térmica + max/min */}
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--text3)",
                    fontFamily: "'Geist Mono', monospace",
                    marginTop: 5,
                  }}
                >
                  sensación{" "}
                  <span style={{ color: "var(--text2)" }}>
                    {data.current.apparentTemperature}°
                  </span>{" "}
                  · máx{" "}
                  <span style={{ color: "var(--text2)" }}>{data.daily[0]?.tempMax}°</span>{" "}
                  mín{" "}
                  <span style={{ color: "var(--text2)" }}>{data.daily[0]?.tempMin}°</span>
                </div>

                {/* Probabilidad de lluvia — métrica prominente */}
                <div
                  style={{
                    marginTop: 8,
                    display: "flex",
                    alignItems: "baseline",
                    gap: 4,
                  }}
                >
                  <span
                    style={{
                      fontSize: 22,
                      fontWeight: 600,
                      color: "var(--wx)",
                      fontFamily: "'Geist Mono', monospace",
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {data.current.precipitationProbability}%
                  </span>
                  <span
                    style={{
                      fontSize: 9,
                      color: "var(--text3)",
                      fontFamily: "'Geist Mono', monospace",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      lineHeight: 1.3,
                    }}
                  >
                    prob.
                    <br />
                    lluvia
                  </span>
                </div>
              </div>

              {/* Columna derecha: ícono hero animado */}
              <div
                style={{
                  width: 110,
                  display: "flex",
                  justifyContent: "center",
                  paddingTop: 4,
                  flexShrink: 0,
                }}
              >
                <WeatherIcon
                  code={data.current.weatherCode}
                  size={96}
                  animated={true}
                  isDay={data.current.isDay === 1}
                />
              </div>
            </div>

            {/* Divisor degradado */}
            <div
              style={{
                height: 1,
                margin: "0 12px",
                background: "linear-gradient(90deg, transparent, var(--border2), transparent)",
              }}
            />

            {/* ── ZONA 3: HOURLY FORECAST ───────────────────────────────── */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(6, 1fr)",
                padding: "8px 10px",
                gap: 4,
                animation: "wx-slide-up 0.45s 0.05s ease both",
              }}
            >
              {data.hourly.map((h, i) => (
                <div
                  key={h.time}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 4,
                    padding: "7px 3px",
                    borderRadius: 8,
                    background: i === 0 ? "var(--wx-dim)" : "transparent",
                    border: i === 0 ? "1px solid rgba(96,165,250,0.12)" : "1px solid transparent",
                  }}
                >
                  {/* Hora */}
                  <span
                    style={{
                      fontSize: 8,
                      color: i === 0 ? "var(--wx)" : "var(--text3)",
                      fontFamily: "'Geist Mono', monospace",
                      fontWeight: i === 0 ? 500 : 400,
                    }}
                  >
                    {formatHourLabel(h.time, i === 0)}
                  </span>
                  {/* Ícono 18px */}
                  <WeatherIcon
                    code={h.weatherCode}
                    size={18}
                    animated={false}
                    isDay={true}
                  />
                  {/* Temperatura */}
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: i === 0 ? "var(--text)" : "var(--text2)",
                      fontFamily: "'Geist Mono', monospace",
                    }}
                  >
                    {h.temperature}°
                  </span>
                  {/* % lluvia */}
                  <span
                    style={{
                      fontSize: 8,
                      color:
                        h.precipitationProbability > 30 ? "var(--wx)" : "var(--text4)",
                      fontFamily: "'Geist Mono', monospace",
                    }}
                  >
                    {h.precipitationProbability}%
                  </span>
                </div>
              ))}
            </div>

            {/* Divisor degradado */}
            <div
              style={{
                height: 1,
                margin: "0 12px",
                background: "linear-gradient(90deg, transparent, var(--border2), transparent)",
              }}
            />

            {/* ── ZONA 4: DAILY FORECAST (3 días) ──────────────────────── */}
            <div
              style={{
                padding: "4px 0 8px",
                animation: "wx-slide-up 0.45s 0.1s ease both",
              }}
            >
              {data.daily.map((day) => {
                const bar = getTempBarPosition(
                  globalTempMin,
                  globalTempMax,
                  day.tempMin,
                  day.tempMax
                );
                const isToday = formatDayLabel(day.date) === "hoy";
                return (
                  <div
                    key={day.date}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "52px 22px 1fr 36px 64px 28px 28px",
                      alignItems: "center",
                      gap: 2,
                      padding: "5px 12px",
                      background: isToday ? "var(--wx-dim)" : "transparent",
                    }}
                  >
                    {/* Nombre del día */}
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: isToday ? 600 : 400,
                        color: isToday ? "var(--text)" : "var(--text3)",
                        fontFamily: "'Geist Mono', monospace",
                      }}
                    >
                      {formatDayLabel(day.date)}
                    </span>

                    {/* Ícono */}
                    <WeatherIcon code={day.weatherCode} size={16} animated={false} isDay={true} />

                    {/* Descripción corta */}
                    <span
                      style={{
                        fontSize: 9.5,
                        color: "var(--text2)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        paddingLeft: 3,
                      }}
                    >
                      {getConditionLabel(day.weatherCode)}
                    </span>

                    {/* % lluvia */}
                    <span
                      style={{
                        fontSize: 9,
                        color: day.precipitationProbabilityMax >= 20
                          ? "var(--wx)"
                          : "var(--text4)",
                        fontFamily: "'Geist Mono', monospace",
                        textAlign: "right",
                        opacity: day.precipitationProbabilityMax < 20 ? 0.5 : 1,
                      }}
                    >
                      {day.precipitationProbabilityMax}%
                    </span>

                    {/* Barra de rango de temperatura */}
                    <div
                      style={{
                        position: "relative",
                        height: 3,
                        background: "var(--elevated2)",
                        borderRadius: 2,
                        margin: "0 4px",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          top: 0,
                          bottom: 0,
                          left: bar.left,
                          width: bar.width,
                          background: "linear-gradient(90deg, var(--wx-dim), var(--wx))",
                          borderRadius: 2,
                        }}
                      />
                    </div>

                    {/* Temp máxima */}
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: "var(--text)",
                        fontFamily: "'Geist Mono', monospace",
                        textAlign: "right",
                      }}
                    >
                      {day.tempMax}°
                    </span>

                    {/* Temp mínima */}
                    <span
                      style={{
                        fontSize: 10,
                        color: "var(--text3)",
                        fontFamily: "'Geist Mono', monospace",
                        textAlign: "right",
                      }}
                    >
                      {day.tempMin}°
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ── ZONA 5: FOOTER ──────────────────────────────────────────────── */}
      <div
        style={{
          height: 28,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 12px",
          borderTop: "1px solid rgba(46,43,62,0.5)",
          background: "rgba(15,13,23,0.6)",
          flexShrink: 0,
        }}
      >
        {data ? (
          <>
            {/* Estadísticas: viento · humedad · UV · presión */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 8.5,
                color: "var(--text3)",
                fontFamily: "'Geist Mono', monospace",
              }}
            >
              <span>
                <span style={{ color: "var(--text2)", fontWeight: 500 }}>
                  {data.current.windSpeed}
                </span>{" "}
                km/h {windDegToCardinal(data.current.windDirection)}
              </span>
              <span style={{ color: "var(--text4)" }}>·</span>
              <span>
                <span style={{ color: "var(--text2)", fontWeight: 500 }}>
                  {data.current.humidity}
                </span>
                % hum
              </span>
              <span style={{ color: "var(--text4)" }}>·</span>
              <span>
                UV{" "}
                <span style={{ color: "var(--text2)", fontWeight: 500 }}>
                  {data.current.uvIndex}
                </span>
              </span>
              <span style={{ color: "var(--text4)" }}>·</span>
              <span>
                <span style={{ color: "var(--text2)", fontWeight: 500 }}>
                  {data.current.surfacePressure}
                </span>{" "}
                hPa
              </span>
            </div>

            {/* Atribución */}
            <span
              style={{
                fontSize: 7.5,
                color: "var(--text4)",
                fontFamily: "'Geist Mono', monospace",
                opacity: 0.7,
              }}
            >
              open-meteo.com
            </span>
          </>
        ) : (
          <span
            style={{
              fontSize: 8,
              color: "var(--text4)",
              fontFamily: "'Geist Mono', monospace",
            }}
          >
            open-meteo.com
          </span>
        )}
      </div>
    </div>
  );
}
