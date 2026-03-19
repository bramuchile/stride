import { invoke } from "@tauri-apps/api/core";
import { Activity, Cpu, HardDrive, MemoryStick } from "lucide-react";
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { MetricBar } from "@/components/widgets/shared/MetricBar";
import { formatBytes, formatUptime, pct } from "@/components/widgets/utils/formatters";
import type { ProcessInfo, SystemStats } from "@/types";

interface SystemMonitorWidgetProps {
  width: number;
  height: number;
}

type Tier = "micro" | "compact" | "full";
type SortBy = "cpu" | "memory";
type ActiveTab = "cpu" | "ram" | "disk";

const shellStyle: CSSProperties = {
  height: "100%",
  width: "100%",
  padding: "14px 16px",
  background: "linear-gradient(180deg, rgba(28,26,40,0.98), rgba(15,13,23,0.98))",
  border: "0.5px solid var(--border)",
  borderRadius: 12,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)",
};

const sectionLabelStyle: CSSProperties = {
  fontSize: 10,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--text3)",
  fontFamily: "'Geist Mono', monospace",
};

function Divider() {
  return <div style={{ height: 1, background: "rgba(61,57,82,0.65)", flexShrink: 0 }} />;
}

function StatCell({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div
      style={{
        background: "rgba(36,33,51,0.72)",
        borderRadius: 6,
        padding: "6px 8px",
        display: "flex",
        flexDirection: "column",
        gap: 3,
      }}
    >
      <span style={{ ...sectionLabelStyle, fontSize: 9 }}>{label}</span>
      <span
        style={{
          fontSize: value.length > 10 ? 12 : 14,
          fontWeight: 500,
          color: tone ?? "var(--text)",
          lineHeight: 1.2,
        }}
      >
        {value}
      </span>
    </div>
  );
}

function temperatureTone(temp: number): string {
  if (temp > 80) return "#E24B4A";
  if (temp >= 60) return "#EF9F27";
  return "#639922";
}

export function SystemMonitorWidget({ width, height }: SystemMonitorWidgetProps) {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [processes, setProcesses] = useState<ProcessInfo[]>([]);
  const [sortBy, setSortBy] = useState<SortBy>("cpu");
  const [activeTab, setActiveTab] = useState<ActiveTab>("cpu");

  const tier: Tier = width < 220 ? "micro" : width < 320 ? "compact" : "full";
  const processLimit = tier === "full" ? 5 : 3;

  useEffect(() => {
    let cancelled = false;

    const fetchStats = async () => {
      try {
        const next = await invoke<SystemStats>("get_system_stats");
        if (!cancelled) setStats(next);
      } catch (error) {
        console.error(error);
      }
    };

    void fetchStats();
    const id = window.setInterval(fetchStats, 2000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    invoke<ProcessInfo[]>("get_top_processes", { sortBy, limit: processLimit })
      .then((next) => {
        if (!cancelled) setProcesses(next);
      })
      .catch(console.error);

    return () => {
      cancelled = true;
    };
  }, [sortBy, stats, processLimit]);

  const primaryTemp = stats?.temperatures[0]?.temp_celsius ?? null;
  const diskPrimary = stats?.disks[0];
  const diskPct = diskPrimary ? pct(diskPrimary.used, diskPrimary.total) : 0;
  const ramPct = stats ? pct(stats.ram_used, stats.ram_total) : 0;
  const swapPct = stats ? pct(stats.swap_used, stats.swap_total) : 0;
  const visibleTemps = stats?.temperatures.slice(0, tier === "full" ? 6 : 1) ?? [];
  const visibleCores = useMemo(() => stats?.cpu_cores.slice(0, 8) ?? [], [stats?.cpu_cores]);
  const processRows = (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span style={sectionLabelStyle}>Procesos</span>
        <div style={{ display: "flex", gap: 4 }}>
          {(["cpu", "memory"] as const).map((value) => {
            const active = sortBy === value;
            return (
              <button
                key={value}
                onClick={() => setSortBy(value)}
                style={{
                  height: 22,
                  padding: "0 8px",
                  borderRadius: 999,
                  border: "1px solid rgba(61,57,82,0.7)",
                  background: active ? "rgba(36,33,51,0.92)" : "transparent",
                  color: active ? "var(--text)" : "var(--text3)",
                  fontSize: 10,
                  fontWeight: active ? 500 : 400,
                  cursor: "pointer",
                  fontFamily: "'Geist Mono', monospace",
                }}
              >
                {value === "cpu" ? "CPU" : "RAM"}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {processes.map((process, index) => (
          <div
            key={`${process.pid}-${process.name}`}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: 8,
              alignItems: "center",
              fontSize: 11,
              color: "var(--text2)",
              fontFamily: "'Geist Mono', monospace",
            }}
          >
            <span
              style={{
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {process.name}
            </span>
            <span
              style={{
                color: index === 0 ? "#7c6af5" : "var(--text3)",
                fontVariantNumeric: "tabular-nums",
                whiteSpace: "nowrap",
              }}
            >
              {sortBy === "cpu" ? `${Math.round(process.cpu_usage)}%` : formatBytes(process.memory, 0)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  const contentMinHeight = Math.max(height - 28, 0);

  const microContent = (() => {
    if (!stats) {
      return <span style={{ fontSize: 12, color: "var(--text3)" }}>Cargando métricas…</span>;
    }

    const tabButton = (value: ActiveTab, icon: ReactNode, label: string) => (
      <button
        key={value}
        onClick={() => setActiveTab(value)}
        style={{
          flex: 1,
          height: 26,
          borderRadius: 999,
          border: "1px solid rgba(61,57,82,0.7)",
          background: activeTab === value ? "rgba(124,106,247,0.12)" : "transparent",
          color: activeTab === value ? "var(--text)" : "var(--text3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          fontSize: 10,
          cursor: "pointer",
          fontFamily: "'Geist Mono', monospace",
        }}
      >
        {icon}
        {label}
      </button>
    );

    return (
      <>
        <div style={{ display: "flex", gap: 6 }}>
          {tabButton("cpu", <Cpu size={12} />, "CPU")}
          {tabButton("ram", <MemoryStick size={12} />, "RAM")}
          {tabButton("disk", <HardDrive size={12} />, "Disco")}
        </div>

        <div
          style={{
            background: "rgba(36,33,51,0.6)",
            borderRadius: 10,
            padding: 12,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {activeTab === "cpu" && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
                <span style={sectionLabelStyle}>CPU</span>
                <span style={{ fontSize: 24, color: "#7c6af5", fontWeight: 600, lineHeight: 1 }}>
                  {Math.round(stats.cpu_usage_total)}%
                </span>
              </div>
              <MetricBar label="Total" value={`${Math.round(stats.cpu_usage_total)}%`} pct={stats.cpu_usage_total} />
              <span style={{ fontSize: 11, color: "var(--text3)", lineHeight: 1.4 }}>{stats.cpu_brand || "Procesador"}</span>
            </>
          )}

          {activeTab === "ram" && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
                <span style={sectionLabelStyle}>Memoria</span>
                <span style={{ fontSize: 24, color: "#7c6af5", fontWeight: 600, lineHeight: 1 }}>
                  {ramPct}%
                </span>
              </div>
              <MetricBar label="RAM" value={formatBytes(stats.ram_used)} pct={ramPct} />
              <MetricBar label="Swap" value={formatBytes(stats.swap_used)} pct={swapPct} color={swapPct > 50 ? "#EF9F27" : "#7c6af5"} />
            </>
          )}

          {activeTab === "disk" && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
                <span style={sectionLabelStyle}>Disco</span>
                <span style={{ fontSize: 24, color: "#7c6af5", fontWeight: 600, lineHeight: 1 }}>
                  {diskPct}%
                </span>
              </div>
              {stats.disks.slice(0, 2).map((disk) => (
                <MetricBar
                  key={`${disk.name}-${disk.mount}`}
                  label={disk.mount || disk.name}
                  value={formatBytes(disk.used)}
                  pct={pct(disk.used, disk.total)}
                />
              ))}
            </>
          )}
        </div>
      </>
    );
  })();

  return (
    <div style={shellStyle}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 12, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: "rgba(124,106,247,0.14)",
              color: "#7c6af5",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Activity size={15} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>Monitor de sistema</div>
            {tier !== "micro" && (
              <div style={{ fontSize: 10, color: "var(--text3)", fontFamily: "'Geist Mono', monospace" }}>
                {stats?.os_name || "Sistema"}
              </div>
            )}
          </div>
        </div>
        <div
          style={{
            height: 20,
            padding: "0 7px",
            borderRadius: 4,
            background: "rgba(74,222,128,0.1)",
            color: "var(--green)",
            display: "flex",
            alignItems: "center",
            gap: 5,
            fontSize: 10,
            fontFamily: "'Geist Mono', monospace",
            flexShrink: 0,
          }}
        >
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor" }} />
          Live
        </div>
      </div>

      <div style={{ flex: 1, minHeight: contentMinHeight ? 0 : undefined, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
        {tier === "micro" ? (
          microContent
        ) : stats ? (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
              <StatCell label="Uptime" value={formatUptime(stats.uptime_secs)} />
              <StatCell
                label="Temp."
                value={primaryTemp == null ? "Sin sensor" : `${Math.round(primaryTemp)}°C`}
                tone={primaryTemp == null ? undefined : temperatureTone(primaryTemp)}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <span style={sectionLabelStyle}>CPU</span>
                <span style={{ fontSize: 11, color: "var(--text3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {stats.cpu_brand || "Procesador"}
                </span>
              </div>
              <MetricBar label="Total" value={`${Math.round(stats.cpu_usage_total)}%`} pct={stats.cpu_usage_total} />
              {tier === "full" && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
                  {visibleCores.map((core) => (
                    <MetricBar
                      key={core.index}
                      label={`Core ${core.index + 1}`}
                      value={`${Math.round(core.usage)}%`}
                      pct={core.usage}
                      compact
                      color="rgba(124,106,247,0.75)"
                    />
                  ))}
                </div>
              )}
            </div>

            <Divider />

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={sectionLabelStyle}>Memoria</span>
              <MetricBar label="RAM" value={`${formatBytes(stats.ram_used)} / ${formatBytes(stats.ram_total)}`} pct={ramPct} />
              <MetricBar
                label="Swap"
                value={`${formatBytes(stats.swap_used)} / ${formatBytes(stats.swap_total)}`}
                pct={swapPct}
                color={swapPct > 50 ? "#EF9F27" : "#7c6af5"}
              />
            </div>

            <Divider />

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={sectionLabelStyle}>Discos</span>
              {stats.disks.map((disk) => (
                <MetricBar
                  key={`${disk.name}-${disk.mount}`}
                  label={disk.mount || disk.name}
                  value={`${formatBytes(disk.used)} / ${formatBytes(disk.total)}`}
                  pct={pct(disk.used, disk.total)}
                />
              ))}
            </div>

            {tier === "full" && (
              <>
                <Divider />
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <span style={sectionLabelStyle}>Sensores</span>
                  {stats.temperatures.length > 0 ? (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {visibleTemps.map((temp) => (
                        <div
                          key={temp.label}
                          style={{
                            padding: "6px 8px",
                            borderRadius: 999,
                            background: "rgba(36,33,51,0.72)",
                            fontSize: 11,
                            color: temperatureTone(temp.temp_celsius),
                            fontFamily: "'Geist Mono', monospace",
                          }}
                        >
                          {temp.label}: {Math.round(temp.temp_celsius)}°C
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div
                      style={{
                        padding: "8px 10px",
                        borderRadius: 8,
                        background: "rgba(36,33,51,0.5)",
                        color: "var(--text3)",
                        fontSize: 11,
                        fontFamily: "'Geist Mono', monospace",
                      }}
                    >
                      Sensores térmicos no disponibles en este equipo.
                    </div>
                  )}
                </div>
              </>
            )}

            <Divider />
            {processRows}
          </>
        ) : (
          <span style={{ fontSize: 12, color: "var(--text3)" }}>Cargando métricas…</span>
        )}
      </div>
    </div>
  );
}
