import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Plus, RadioTower, X } from "lucide-react";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { SparkBar } from "@/components/widgets/shared/SparkBar";
import { formatMs, statusColor } from "@/components/widgets/utils/formatters";
import type { CheckResult, HostStatus, UptimeHistory, UptimeHost } from "@/types";

interface UptimeMonitorWidgetProps {
  width: number;
  height: number;
}

type Tier = "micro" | "compact" | "full";

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

function SummaryCell({ label, value, tone }: { label: string; value: string; tone?: string }) {
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
      <span style={{ fontSize: 14, fontWeight: 500, color: tone ?? "var(--text)" }}>{value}</span>
    </div>
  );
}

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return "<1m";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining > 0 ? `${hours}h ${remaining}m` : `${hours}h`;
}

function uptimePercentage(history: CheckResult[]): string {
  if (history.length === 0) return "—";
  const healthy = history.filter((item) => item.status !== "down").length;
  return `${Math.round((healthy / history.length) * 100)}%`;
}

function statusDuration(history: CheckResult[]): string {
  const last = history[history.length - 1];
  if (!last) return "Sin datos";

  let earliest = last.checked_at;
  for (let index = history.length - 2; index >= 0; index -= 1) {
    if (history[index].status !== last.status) break;
    earliest = history[index].checked_at;
  }

  const elapsed = Date.now() - earliest;
  const label =
    last.status === "up" ? "en línea" : last.status === "down" ? "sin respuesta" : "degradado";

  return `${formatDuration(elapsed)} ${label}`;
}

export function UptimeMonitorWidget({ width, height }: UptimeMonitorWidgetProps) {
  const [hosts, setHosts] = useState<UptimeHost[]>([]);
  const [history, setHistory] = useState<UptimeHistory>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newInterval, setNewInterval] = useState(60);

  const tier: Tier = width < 240 ? "micro" : width < 360 ? "compact" : "full";

  useEffect(() => {
    invoke<UptimeHost[]>("get_uptime_hosts").then(setHosts).catch(console.error);
    invoke<UptimeHistory>("get_uptime_history").then(setHistory).catch(console.error);
  }, []);

  useEffect(() => {
    const unlisten = listen<CheckResult>("uptime_check_result", (event) => {
      setHistory((prev) => {
        const hostHistory = [...(prev[event.payload.host_id] ?? []), event.payload].slice(-20);
        return { ...prev, [event.payload.host_id]: hostHistory };
      });
    });

    return () => {
      void unlisten.then((fn) => fn());
    };
  }, []);

  const handleAddHost = async () => {
    if (!newName.trim() || !newUrl.trim()) return;

    const host: UptimeHost = {
      id: crypto.randomUUID(),
      name: newName.trim(),
      url: newUrl.trim(),
      interval_secs: newInterval,
    };

    await invoke("add_uptime_host", { host });
    setHosts((prev) => [...prev, host]);
    setShowAddForm(false);
    setNewName("");
    setNewUrl("");
    setNewInterval(60);
  };

  const handleRemoveHost = async (id: string) => {
    await invoke("remove_uptime_host", { hostId: id });
    setHosts((prev) => prev.filter((host) => host.id !== id));
    setHistory((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const currentStatus = (id: string): HostStatus => {
    const hostHistory = history[id];
    if (!hostHistory || hostHistory.length === 0) return "pending";
    return hostHistory[hostHistory.length - 1].status;
  };

  const latestLatencyValues = useMemo(
    () =>
      hosts
        .map((host) => history[host.id]?.[history[host.id].length - 1]?.latency_ms ?? null)
        .filter((value): value is number => value != null),
    [history, hosts]
  );

  const avgLatency =
    latestLatencyValues.length === 0
      ? null
      : Math.round(latestLatencyValues.reduce((sum, value) => sum + value, 0) / latestLatencyValues.length);

  const upCount = hosts.filter((host) => currentStatus(host.id) === "up").length;
  const downCount = hosts.filter((host) => currentStatus(host.id) === "down").length;
  const listMaxHeight = Math.max(height - (tier === "full" ? 182 : 146), 84);

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
            <RadioTower size={15} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>Uptime monitor</div>
            <div style={{ fontSize: 10, color: "var(--text3)", fontFamily: "'Geist Mono', monospace" }}>
              cada 60s
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${tier === "micro" ? 2 : 3}, minmax(0, 1fr))`,
          gap: 8,
          marginBottom: 12,
          flexShrink: 0,
        }}
      >
        <SummaryCell label="Online" value={`${upCount}`} tone="#639922" />
        <SummaryCell label="Offline" value={`${downCount}`} tone={downCount > 0 ? "#E24B4A" : "var(--text)"} />
        {tier !== "micro" && <SummaryCell label="Latencia" value={formatMs(avgLatency)} />}
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, maxHeight: listMaxHeight }}>
        {hosts.length === 0 ? (
          <div
            style={{
              borderRadius: 10,
              border: "0.5px dashed rgba(61,57,82,0.8)",
              padding: "16px 12px",
              color: "var(--text3)",
              textAlign: "center",
              fontSize: 12,
            }}
          >
            No hay hosts monitorizados.
          </div>
        ) : (
          hosts.map((host) => {
            const hostHistory = history[host.id] ?? [];
            const status = currentStatus(host.id);
            const latest = hostHistory[hostHistory.length - 1] ?? null;

            if (tier === "micro") {
              return (
                <div
                  key={host.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    borderRadius: 8,
                    border: "0.5px solid rgba(61,57,82,0.7)",
                    background: "rgba(36,33,51,0.35)",
                    padding: "8px 10px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        background: statusColor(status),
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        fontSize: 12,
                        color: "var(--text2)",
                        minWidth: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {host.name}
                    </span>
                  </div>
                  <button
                    onClick={() => void handleRemoveHost(host.id)}
                    style={{
                      width: 18,
                      height: 18,
                      border: "none",
                      background: "transparent",
                      color: "var(--text4)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                    title="Eliminar host"
                  >
                    <X size={12} />
                  </button>
                </div>
              );
            }

            return (
              <div
                key={host.id}
                style={{
                  position: "relative",
                  borderRadius: 8,
                  border: `0.5px solid ${status === "down" ? "rgba(248,113,113,0.45)" : "rgba(61,57,82,0.7)"}`,
                  background: "rgba(36,33,51,0.38)",
                  padding: "10px 11px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <button
                  onClick={() => void handleRemoveHost(host.id)}
                  style={{
                    position: "absolute",
                    top: 7,
                    right: 7,
                    width: 18,
                    height: 18,
                    border: "none",
                    background: "transparent",
                    color: "var(--text4)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: 0.7,
                  }}
                  title="Eliminar host"
                >
                  <X size={12} />
                </button>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, paddingRight: 18 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <span
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: "50%",
                          background: statusColor(status),
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: "var(--text)",
                          minWidth: 0,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {host.name}
                      </span>
                    </div>
                    <div
                      style={{
                        marginTop: 4,
                        fontSize: 10,
                        color: "var(--text3)",
                        fontFamily: "'Geist Mono', monospace",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {host.url}
                    </div>
                  </div>
                  {tier === "full" && (
                    <span
                      style={{
                        fontSize: 10,
                        color: statusColor(status),
                        fontFamily: "'Geist Mono', monospace",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {status}
                    </span>
                  )}
                </div>

                {tier === "full" && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
                    <SummaryCell label="Latency" value={formatMs(latest?.latency_ms ?? null)} tone={statusColor(status)} />
                    <SummaryCell label="Uptime" value={uptimePercentage(hostHistory)} />
                    <SummaryCell label="Estado" value={hostHistory.length > 0 ? statusDuration(hostHistory) : "Pendiente"} />
                  </div>
                )}

                <SparkBar history={hostHistory} />
              </div>
            );
          })
        )}
      </div>

      <div style={{ marginTop: 12, flexShrink: 0 }}>
        {showAddForm ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              borderRadius: 10,
              border: "0.5px solid rgba(61,57,82,0.8)",
              background: "rgba(36,33,51,0.35)",
              padding: 10,
            }}
          >
            <input
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="Nombre"
              style={{
                height: 30,
                borderRadius: 8,
                border: "1px solid var(--border2)",
                background: "var(--base-deep)",
                color: "var(--text)",
                padding: "0 10px",
                fontSize: 12,
                outline: "none",
              }}
            />
            <input
              value={newUrl}
              onChange={(event) => setNewUrl(event.target.value)}
              placeholder="https://..."
              style={{
                height: 30,
                borderRadius: 8,
                border: "1px solid var(--border2)",
                background: "var(--base-deep)",
                color: "var(--text)",
                padding: "0 10px",
                fontSize: 12,
                outline: "none",
              }}
            />
            <select
              value={newInterval}
              onChange={(event) => setNewInterval(Number(event.target.value))}
              style={{
                height: 30,
                borderRadius: 8,
                border: "1px solid var(--border2)",
                background: "var(--base-deep)",
                color: "var(--text)",
                padding: "0 10px",
                fontSize: 12,
                outline: "none",
              }}
            >
              <option value={30}>30s</option>
              <option value={60}>1min</option>
              <option value={300}>5min</option>
            </select>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => void handleAddHost()}
                style={{
                  flex: 1,
                  height: 30,
                  borderRadius: 8,
                  border: "none",
                  background: "#7c6af5",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Confirmar
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                style={{
                  flex: 1,
                  height: 30,
                  borderRadius: 8,
                  border: "1px solid var(--border2)",
                  background: "transparent",
                  color: "var(--text3)",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAddForm(true)}
            style={{
              width: "100%",
              height: 34,
              borderRadius: 10,
              border: "0.5px dashed rgba(61,57,82,0.9)",
              background: "transparent",
              color: "var(--text3)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 7,
              fontSize: 12,
            }}
          >
            <Plus size={14} />
            Agregar host
          </button>
        )}
      </div>
    </div>
  );
}
