import { useState, useCallback } from "react";

export const RESIZER_W = 5;

interface Props {
  panelIndex: number;
  onMouseDown: (panelIndex: number, e: React.MouseEvent) => void;
}

export function PanelResizer({ panelIndex, onMouseDown }: Props) {
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const active = isHovered || isDragging;

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      const handleMouseUp = () => {
        setIsDragging(false);
        setIsHovered(false);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        document.removeEventListener("mouseup", handleMouseUp);
      };
      document.addEventListener("mouseup", handleMouseUp);

      onMouseDown(panelIndex, e);
    },
    [panelIndex, onMouseDown]
  );

  return (
    <div
      style={{
        position: "relative",
        width: RESIZER_W,
        flexShrink: 0,
        cursor: "col-resize",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 20,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { if (!isDragging) setIsHovered(false); }}
      onMouseDown={handleMouseDown}
    >
      {/* Línea visual central */}
      <div
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: active ? 2 : 1,
          background: active ? "var(--accent)" : "var(--border)",
          boxShadow: active
            ? "0 0 8px var(--accent), 0 0 20px rgba(124,106,247,0.3)"
            : "none",
          transition: "all 0.2s ease",
          pointerEvents: "none",
        }}
      />

      {/* Handle con grip de 3 puntos */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          opacity: active ? 1 : 0,
          transition: "opacity 0.2s ease",
          background: isDragging ? "var(--accent-dim)" : "var(--elevated)",
          border: `1px solid ${isDragging ? "rgba(124,106,247,0.35)" : "var(--border2)"}`,
          boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
          borderRadius: 6,
          padding: "6px 3px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 3,
          pointerEvents: "none",
        }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: 3,
              height: 3,
              borderRadius: "50%",
              background: isDragging ? "var(--accent)" : "var(--text3)",
              boxShadow: isDragging ? "0 0 4px var(--accent)" : "none",
              transition: "all 0.2s ease",
            }}
          />
        ))}
      </div>
    </div>
  );
}
