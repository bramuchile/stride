
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
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

type HeightMode = "compact" | "hourly" | "weekly" | "full";

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

function getHeightMode(height: number): HeightMode {
  if (height < 80) return "compact";
  if (height <= 340) return "hourly";
  if (height <= 480) return "weekly";
  return "full";
}

function getUvLevel(uvIndex: number): string {
  if (uvIndex >= 8) return "muy alto";
  if (uvIndex >= 6) return "alto";
  if (uvIndex >= 3) return "moderado";
  return "bajo";
}

function LoadingSkeleton() {
  const pulse: CSSProperties = {
    background: "var(--elevated)",
    borderRadius: 6,
    animation: "pulse 2s cubic-bezier(0.4,0,0.6,1) infinite",
  };

  return (
    <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ ...pulse, height: 64 }} />
      <div style={{ ...pulse, height: 54 }} />
      <div style={{ ...pulse, height: 120 }} />
    </div>
  );
}

function ErrorState({ compact = false, onRetry }: { compact?: boolean; onRetry: () => void }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: compact ? "row" : "column",
        alignItems: "center",
        justifyContent: "center",
        height: compact ? "100%" : 180,
        gap: compact ? 8 : 10,
        color: "var(--text3)",
        padding: compact ? "0 10px" : 12,
      }}
    >
      <svg width={compact ? 18 : 36} height={compact ? 18 : 36} viewBox="0 0 24 24" fill="none" stroke="var(--text4)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25" />
        <line x1="8" y1="16" x2="16" y2="24" />
        <line x1="16" y1="16" x2="8" y2="24" />
      </svg>
      <div
        style={{
          fontSize: compact ? 9 : 10,
          color: "var(--text3)",
          fontFamily: "'Geist Mono', monospace",
          textAlign: "center",
        }}
      >
        No se pudo cargar el clima
      </div>
      {!compact && (
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
      )}
    </div>
  );
}

export function WeatherWidget({ position = "bottom", onCollapse }: WeatherWidgetProps) {
  const { data, isLoading, isError, city, setCity, refetch, lastFetch } = useWeather();
  const [editingCity, setEditingCity] = useState(false);
  const [cityInput, setCityInput] = useState("");
  const [lastFetchDisplay, setLastFetchDisplay] = useState("...");
  const [containerHeight, setContainerHeight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const accent =
    data
      ? getWeatherAccent(data.current.weatherCode, data.current.isDay === 1)
      : { wx: "#60A5FA", wxDim: "rgba(96,165,250,0.08)", wxGlow: "rgba(96,165,250,0.2)" };

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

  useEffect(() => {
    if (!editingCity) return;
    const id = setTimeout(() => inputRef.current?.focus(), 30);
    return () => clearTimeout(id);
  }, [editingCity]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setContainerHeight(entry.contentRect.height);
    });

    observer.observe(node);
    setContainerHeight(node.getBoundingClientRect().height);

    return () => observer.disconnect();
  }, []);

  function handleCitySubmit() {
    const trimmed = cityInput.trim();
    if (trimmed) void setCity(trimmed);
    setEditingCity(false);
  }

  function handleCityKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") handleCitySubmit();
    if (e.key === "Escape") setEditingCity(false);
  }

  const globalTempMin = data ? Math.min(...data.daily.map((d) => d.tempMin)) : 0;
  const globalTempMax = data ? Math.max(...data.daily.map((d) => d.tempMax)) : 1;
  const mode = getHeightMode(containerHeight);
  const isCompact = mode === "compact";
  const showWeekly = mode === "weekly" || mode === "full";
  const showFull = mode === "full";

  const RefreshIcon = () => (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );

  const CollapseIcon = () => (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      {position === "top"
        ? <polyline points="18 15 12 9 6 15" />
        : <polyline points="6 9 12 15 18 9" />}
    </svg>
  );

  const headerBtnStyle: CSSProperties = {
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
      ref={containerRef}
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
      } as CSSProperties}
    >
      <style>{`
        @keyframes wx-pulse-dot { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes wx-spin-slow { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes wx-cloud-drift { 0%,100%{transform:translateX(0)} 50%{transform:translateX(4px)} }
        @keyframes wx-rain-fall { 0%{opacity:0;transform:translateY(-4px)} 40%{opacity:1} 100%{opacity:0;transform:translateY(6px)} }
        @keyframes wx-lightning-pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes wx-slide-up { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 1.5,
          background: "linear-gradient(90deg, transparent 5%, var(--wx) 50%, transparent 95%)",
          opacity: 0.6,
          pointerEvents: "none",
          zIndex: 1,
        }}
      />
      {isCompact ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            height: "100%",
            padding: "0 10px",
          }}
        >
          {data ? (
            <>
              <div
                style={{
                  width: 36,
                  height: 36,
                  background: "var(--wx-dim)",
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <WeatherIcon code={data.current.weatherCode} size={22} animated={false} isDay={data.current.isDay === 1} />
              </div>

              <div style={{ display: "flex", alignItems: "baseline", gap: 2, flexShrink: 0 }}>
                <span style={{ fontSize: 24, fontWeight: 300, color: "var(--text)", letterSpacing: "-0.04em", lineHeight: 1 }}>
                  {data.current.temperature}
                </span>
                <span style={{ fontSize: 11, color: "var(--text3)", fontFamily: "'Geist Mono', monospace" }}>
                  °C
                </span>
              </div>

              <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 1, flex: 1 }}>
                <span
                  style={{
                    fontSize: 11,
                    color: "var(--text2)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {getConditionLabel(data.current.weatherCode)}
                </span>
                {editingCity ? (
                  <input
                    ref={inputRef}
                    value={cityInput}
                    onChange={(e) => setCityInput(e.target.value)}
                    onBlur={handleCitySubmit}
                    onKeyDown={handleCityKeyDown}
                    placeholder="Ciudad..."
                    style={{ height: 16, background: "transparent", border: "none", padding: 0, fontSize: 10, color: "var(--text3)", fontFamily: "'Geist Mono', monospace", outline: "none" }}
                  />
                ) : (
                  <button
                    onClick={() => {
                      setCityInput(data.resolvedName ?? city);
                      setEditingCity(true);
                    }}
                    title="Cambiar ciudad"
                    style={{ background: "transparent", border: "none", padding: 0, margin: 0, textAlign: "left", fontSize: 10, color: "var(--text3)", fontFamily: "'Geist Mono', monospace", cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                  >
                    {data.resolvedName}
                  </button>
                )}
              </div>

              <div style={{ marginLeft: "auto", background: "rgba(96,165,250,0.12)", borderRadius: 10, padding: "4px 8px", fontSize: 10, color: "#60A5FA", fontFamily: "'Geist Mono', monospace", flexShrink: 0 }}>
                {data.current.precipitationProbability}%
              </div>
            </>
          ) : isError ? (
            <ErrorState compact onRetry={refetch} />
          ) : (
            <LoadingSkeleton />
          )}
        </div>
      ) : (
        <>
          <div style={{ height: 28, display: "flex", alignItems: "center", padding: "0 10px", gap: 7, borderBottom: "1px solid rgba(46,43,62,0.6)", background: "rgba(19,17,28,0.85)", flexShrink: 0 }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--wx)", boxShadow: "0 0 6px var(--wx)", animation: "wx-pulse-dot 3s ease-in-out infinite", flexShrink: 0 }} />
            <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text3)", flexShrink: 0 }}>
              clima
            </span>

            {editingCity ? (
              <input
                ref={inputRef}
                value={cityInput}
                onChange={(e) => setCityInput(e.target.value)}
                onBlur={handleCitySubmit}
                onKeyDown={handleCityKeyDown}
                placeholder="Ciudad..."
                style={{ flex: 1, minWidth: 0, height: 17, background: "var(--elevated)", border: "0.5px solid var(--wx)", borderRadius: 20, padding: "0 8px", fontSize: 9, color: "var(--text)", fontFamily: "'Geist Mono', monospace", outline: "none" }}
              />
            ) : (
              <button
                onClick={() => {
                  setCityInput(data?.resolvedName ?? city);
                  setEditingCity(true);
                }}
                title="Cambiar ciudad"
                style={{ flex: 1, minWidth: 0, height: 17, background: "var(--elevated)", border: "0.5px solid var(--border2)", borderRadius: 20, padding: "0 8px", fontSize: 9, color: "var(--text2)", fontFamily: "'Geist Mono', monospace", cursor: "pointer", textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
              >
                {data?.resolvedName ?? city}
              </button>
            )}

            <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 9, color: "var(--text4)", fontFamily: "'Geist Mono', monospace", flexShrink: 0 }}>
              <span>{lastFetchDisplay}</span>
              <button onClick={() => refetch()} title="Actualizar" style={{ ...headerBtnStyle, width: 16, height: 16 }}>
                <RefreshIcon />
              </button>
            </div>

            {onCollapse && (
              <button onClick={onCollapse} title="Colapsar" style={headerBtnStyle}>
                <CollapseIcon />
              </button>
            )}
          </div>

          <div style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden", scrollbarWidth: "thin", scrollbarColor: "var(--border2) transparent" }}>
            {isLoading && !data && <LoadingSkeleton />}
            {isError && !data && <ErrorState onRetry={refetch} />}

            {data && (
              <>
                <div style={{ display: "flex", padding: "14px 12px 10px", gap: 0, animation: "wx-slide-up 0.45s ease both" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "flex-start", color: "var(--text)", letterSpacing: "-0.04em", lineHeight: 1 }}>
                      <span style={{ fontSize: 50, fontWeight: 300 }}>{data.current.temperature}</span>
                      <span style={{ fontSize: 18, marginTop: 8, color: "var(--text3)", fontFamily: "'Geist Mono', monospace" }}>
                        °C
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                      <WeatherIcon code={data.current.weatherCode} size={15} isDay={data.current.isDay === 1} animated={false} />
                      <span style={{ fontSize: 11.5, fontWeight: 500, color: "var(--text2)" }}>
                        {getConditionLabel(data.current.weatherCode)}
                      </span>
                    </div>

                    <div style={{ marginTop: 6, fontSize: 10, color: "var(--text3)", fontFamily: "'Geist Mono', monospace" }}>
                      sensación {data.current.apparentTemperature}° · máx {data.daily[0]?.tempMax}° mín {data.daily[0]?.tempMin}°
                    </div>

                    <div style={{ marginTop: 9 }}>
                      <div style={{ fontSize: 22, fontWeight: 600, color: "var(--wx)", fontFamily: "'Geist Mono', monospace", lineHeight: 1 }}>
                        {data.current.precipitationProbability}%
                      </div>
                      <div style={{ marginTop: 4, fontSize: 8.5, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text3)", fontFamily: "'Geist Mono', monospace" }}>
                        prob. lluvia
                      </div>
                    </div>
                  </div>

                  <div style={{ width: 116, flexShrink: 0, paddingTop: 2, display: "flex", alignItems: "flex-start", justifyContent: "center" }}>
                    <WeatherIcon code={data.current.weatherCode} size={96} animated={true} isDay={data.current.isDay === 1} />
                  </div>
                </div>

                <div style={{ height: 1, margin: "0 10px", background: "linear-gradient(90deg, transparent, var(--border2), transparent)" }} />

                <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", padding: "8px 10px", gap: 3, animation: "wx-slide-up 0.45s 0.05s ease both" }}>
                  {data.hourly.map((hour, index) => (
                    <div key={hour.time} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "6px 3px", borderRadius: 7, background: index === 0 ? "var(--wx-dim)" : "transparent" }}>
                      <span style={{ fontSize: 8.5, color: index === 0 ? "var(--wx)" : "var(--text3)", fontFamily: "'Geist Mono', monospace" }}>
                        {formatHourLabel(hour.time, index === 0)}
                      </span>
                      <WeatherIcon code={hour.weatherCode} size={16} animated={false} isDay={hour.isDay === 1} />
                      <span style={{ fontSize: 10, fontWeight: 600, color: index === 0 ? "var(--text)" : "var(--text2)", fontFamily: "'Geist Mono', monospace" }}>
                        {hour.temperature}°
                      </span>
                      <span style={{ fontSize: 7.5, color: hour.precipitationProbability > 30 ? "var(--wx)" : "var(--text4)", fontFamily: "'Geist Mono', monospace" }}>
                        {hour.precipitationProbability}%
                      </span>
                    </div>
                  ))}
                </div>

                {showWeekly && (
                  <>
                    <div style={{ height: 1, margin: "0 10px", background: "linear-gradient(90deg, transparent, var(--border2), transparent)" }} />

                    <div style={{ padding: "3px 0 4px", animation: "wx-slide-up 0.45s 0.1s ease both" }}>
                      {data.daily.map((day) => {
                        const bar = getTempBarPosition(globalTempMin, globalTempMax, day.tempMin, day.tempMax);
                        const label = formatDayLabel(day.date);
                        const isToday = label === "hoy";

                        return (
                          <div key={day.date} style={{ display: "grid", gridTemplateColumns: "56px 20px 1fr 34px 68px 30px 28px", alignItems: "center", gap: 3, padding: "6px 10px", background: isToday ? "var(--wx-dim)" : "transparent" }}>
                            <span style={{ fontSize: 10, fontWeight: isToday ? 600 : 400, color: isToday ? "var(--text)" : "var(--text3)", fontFamily: "'Geist Mono', monospace" }}>
                              {label}
                            </span>
                            <WeatherIcon code={day.weatherCode} size={18} animated={false} isDay={true} />
                            <span style={{ fontSize: 9.5, color: "var(--text2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingLeft: 2 }}>
                              {getConditionLabel(day.weatherCode)}
                            </span>
                            <span style={{ fontSize: 9, textAlign: "right", color: day.precipitationProbabilityMax >= 20 ? "var(--wx)" : "var(--text4)", opacity: day.precipitationProbabilityMax >= 20 ? 1 : 0.5, fontFamily: "'Geist Mono', monospace" }}>
                              {day.precipitationProbabilityMax}%
                            </span>
                            <div style={{ position: "relative", height: 3, background: "var(--elevated2)", borderRadius: 2, margin: "0 3px" }}>
                              <div style={{ position: "absolute", top: 0, bottom: 0, left: bar.left, width: bar.width, background: "linear-gradient(90deg, var(--wx-dim), var(--wx))", borderRadius: 2 }} />
                            </div>
                            <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text)", textAlign: "right", fontFamily: "'Geist Mono', monospace" }}>
                              {day.tempMax}°
                            </span>
                            <span style={{ fontSize: 10, color: "var(--text3)", textAlign: "right", fontFamily: "'Geist Mono', monospace" }}>
                              {day.tempMin}°
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                {showFull && (
                  <>
                    <div style={{ height: 1, margin: "0 10px", background: "linear-gradient(90deg, transparent, var(--border2), transparent)" }} />

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4, padding: "5px 10px 8px", animation: "wx-slide-up 0.45s 0.14s ease both" }}>
                      {[
                        { label: "viento", value: `${data.current.windSpeed} km/h`, subLabel: windDegToCardinal(data.current.windDirection), valueColor: "var(--text2)" },
                        { label: "humedad", value: `${data.current.humidity}%`, subLabel: "humedad", valueColor: "var(--text2)" },
                        { label: "uv", value: `${data.current.uvIndex}`, subLabel: getUvLevel(data.current.uvIndex), valueColor: data.current.uvIndex >= 6 ? "#FCD34D" : "var(--text2)" },
                        { label: "presión", value: `${data.current.surfacePressure}`, subLabel: "hPa", valueColor: "var(--text2)" },
                      ].map((stat) => (
                        <div key={stat.label} style={{ background: "rgba(28,24,44,0.9)", borderRadius: 6, padding: "6px 7px", display: "flex", flexDirection: "column", gap: 3 }}>
                          <span style={{ fontSize: 7.5, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text3)", fontFamily: "'Geist Mono', monospace" }}>
                            {stat.label}
                          </span>
                          <span style={{ fontSize: 12, fontWeight: 600, color: stat.valueColor, fontFamily: "'Geist Mono', monospace" }}>
                            {stat.value}
                          </span>
                          <span style={{ fontSize: 8.5, color: "var(--text3)", fontFamily: "'Geist Mono', monospace" }}>
                            {stat.subLabel}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
          <div style={{ height: 28, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 12px", borderTop: "1px solid rgba(46,43,62,0.5)", background: "rgba(13,11,22,0.7)", flexShrink: 0, gap: 8 }}>
            {data ? (
              <>
                <div style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 8.5, color: "var(--text3)", fontFamily: "'Geist Mono', monospace" }}>
                  <span style={{ color: "var(--text2)", fontWeight: 500 }}>{data.current.windSpeed}</span> km/h <span style={{ color: "var(--text2)", fontWeight: 500 }}>{windDegToCardinal(data.current.windDirection)}</span>
                  <span style={{ color: "var(--text4)" }}> · </span>
                  <span style={{ color: "var(--text2)", fontWeight: 500 }}>{data.current.humidity}</span>% hum
                  <span style={{ color: "var(--text4)" }}> · </span>
                  UV <span style={{ color: "var(--text2)", fontWeight: 500 }}>{data.current.uvIndex}</span>
                  <span style={{ color: "var(--text4)" }}> · </span>
                  <span style={{ color: "var(--text2)", fontWeight: 500 }}>{data.current.surfacePressure}</span> hPa
                </div>
                <span style={{ flexShrink: 0, fontSize: 7.5, color: "var(--text4)", opacity: 0.7, fontFamily: "'Geist Mono', monospace" }}>
                  open-meteo.com
                </span>
              </>
            ) : (
              <span style={{ fontSize: 7, color: "var(--text4)", opacity: 0.7, fontFamily: "'Geist Mono', monospace" }}>
                open-meteo.com
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
