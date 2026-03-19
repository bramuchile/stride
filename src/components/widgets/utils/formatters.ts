export const formatBytes = (bytes: number, decimals = 1): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
};

export const formatUptime = (secs: number): string => {
  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

export const formatMs = (ms: number | null): string => (ms == null ? "—" : `${ms}ms`);

export const pct = (used: number, total: number): number =>
  total === 0 ? 0 : Math.round((used / total) * 100);

export const statusColor = (status: string): string =>
  (
    {
      up: "#639922",
      down: "#E24B4A",
      degraded: "#EF9F27",
      pending: "var(--text3)",
    } as Record<string, string>
  )[status] ?? "var(--text3)";
