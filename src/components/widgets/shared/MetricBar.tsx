interface MetricBarProps {
  label: string;
  value: string;
  pct: number;
  color?: string;
  compact?: boolean;
}

export function MetricBar({
  label,
  value,
  pct,
  color = "#7c6af5",
  compact = false,
}: MetricBarProps) {
  const height = compact ? 3 : 4;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(36px, auto) 1fr auto",
        gap: 8,
        alignItems: "center",
      }}
    >
      <span
        style={{
          fontSize: 11,
          color: "var(--text2)",
          fontFamily: "'Geist Mono', monospace",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
      <div
        style={{
          height,
          background: "var(--border)",
          borderRadius: 999,
          overflow: "hidden",
          minWidth: 0,
        }}
      >
        <div
          style={{
            width: `${Math.max(0, Math.min(100, pct))}%`,
            height: "100%",
            borderRadius: 999,
            background: color,
          }}
        />
      </div>
      <span
        style={{
          fontSize: 11,
          color: "var(--text)",
          fontFamily: "'Geist Mono', monospace",
          fontVariantNumeric: "tabular-nums",
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </span>
    </div>
  );
}
