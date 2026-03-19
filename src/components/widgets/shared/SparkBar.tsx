import { statusColor } from "@/components/widgets/utils/formatters";
import type { CheckResult } from "@/types";

interface SparkBarProps {
  history: CheckResult[];
  height?: number;
}

export function SparkBar({ history, height = 20 }: SparkBarProps) {
  const padded: Array<CheckResult | null> = [
    ...Array.from({ length: Math.max(0, 20 - history.length) }, () => null),
    ...history.slice(-20),
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(20, 1fr)",
        gap: 2,
        alignItems: "end",
        height,
      }}
    >
      {padded.map((item, index) => (
        <div
          key={`${item?.checked_at ?? "empty"}-${index}`}
          style={{
            height: item ? "100%" : `${Math.round(height * 0.3)}px`,
            borderRadius: 2,
            background: item ? statusColor(item.status) : "rgba(61,57,82,0.75)",
            opacity: item ? 1 : 0.7,
          }}
        />
      ))}
    </div>
  );
}
