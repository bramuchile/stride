import { Pencil } from "lucide-react";

interface Props {
  progress: number; // 0–100
  size?: number;    // diameter in px (default 44)
}

/**
 * Círculo de progreso con icono de edición.
 * Se renderiza con position: absolute — el padre debe tener position: relative.
 * Centrado con inset-0 + margin auto.
 */
export function LongPressRing({ progress, size = 44 }: Props) {
  const center = size / 2;
  const r = center - 4; // radio dejando margen para el stroke
  const circumference = 2 * Math.PI * r;
  const strokeDashoffset = circumference - (progress / 100) * circumference;
  const iconSize = Math.round(size * 0.27); // ~12px at 44px

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        margin: "auto",
        width: size,
        height: size,
        pointerEvents: "none",
        zIndex: 50,
      }}
    >
      <svg
        width={size}
        height={size}
        style={{ display: "block" }}
      >
        {/* Track */}
        <circle
          cx={center}
          cy={center}
          r={r}
          fill="rgba(11,13,16,0.88)"
          stroke="#2a2d31"
          strokeWidth={2}
        />
        {/* Progress arc */}
        <circle
          cx={center}
          cy={center}
          r={r}
          fill="none"
          stroke="#5b7cf6"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          transform={`rotate(-90 ${center} ${center})`}
          style={{ transition: "stroke-dashoffset 0.016s linear" }}
        />
      </svg>
      {/* Pencil icon centrado sobre el SVG */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#5b7cf6",
        }}
      >
        <Pencil size={iconSize} strokeWidth={2} />
      </div>
    </div>
  );
}
