import React, { useState, useRef, useCallback, useEffect } from "react";
import { PanelSlot } from "./PanelSlot";
import { COL_RESIZER_W, ROW_RESIZER_H } from "@/hooks/useDynamicLayout";
import type { DynamicLayout, Panel, PanelType, WidgetId } from "@/types";

const MIN_COL_FRAC = 0.1;
const MIN_ROW_FRAC = 0.08;

// Mapa de etiquetas para widgets
const WIDGET_LABELS: Record<string, string> = {
  notes: "Notas",
  "next-meeting": "Próxima reunión",
  weather: "Clima",
};

// ---  AddPanelPopover --- (usado solo para columnas vacías)

interface AddPanelPopoverProps {
  onSelect: (type: PanelType, widgetId?: WidgetId) => void;
  onClose: () => void;
}

function AddPanelPopover({ onSelect, onClose }: AddPanelPopoverProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("keydown", handleKey);
    document.addEventListener("mousedown", handleClick);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [onClose]);

  const itemStyle = (highlight = false): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 10px",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 12,
    color: highlight ? "var(--accent)" : "var(--text2)",
    background: "transparent",
    border: "none",
    width: "100%",
    textAlign: "left",
    transition: "background 0.1s",
  });

  const widgets: { id: WidgetId; label: string }[] = [
    { id: "notes", label: "Notas" },
    { id: "next-meeting", label: "Próxima reunión" },
    { id: "weather", label: "Clima" },
  ];

  return (
    <div
      ref={ref}
      style={{
        position: "absolute",
        bottom: "calc(100% + 4px)",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 100,
        minWidth: 160,
        background: "var(--elevated2)",
        border: "1px solid var(--border2)",
        borderRadius: 10,
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        padding: "6px 4px",
      }}
    >
      <button
        style={itemStyle(true)}
        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(124,106,247,0.08)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        onClick={() => { onSelect("WEB"); onClose(); }}
      >
        <span style={{ fontSize: 14 }}>🌐</span>
        Navegador web
      </button>
      <div style={{ height: 1, background: "var(--border)", margin: "4px 6px" }} />
      {widgets.map((w) => (
        <button
          key={w.id}
          style={itemStyle()}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--elevated)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          onClick={() => { onSelect("WIDGET", w.id); onClose(); }}
        >
          <span style={{ fontSize: 14 }}>
            {w.id === "notes" ? "📝" : w.id === "next-meeting" ? "📅" : "🌤️"}
          </span>
          {w.label}
        </button>
      ))}
    </div>
  );
}

// --- ColumnResizer ---

function ColumnResizer({
  colIdx,
  onMouseDown,
}: {
  colIdx: number;
  onMouseDown: (colIdx: number, e: React.MouseEvent) => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      style={{
        width: COL_RESIZER_W,
        flexShrink: 0,
        cursor: "col-resize",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        zIndex: 10,
        background: hovered ? "rgba(124,106,247,0.06)" : "transparent",
        transition: "background 0.15s",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseDown={(e) => { onMouseDown(colIdx, e); setHovered(true); }}
    >
      {/* Línea base */}
      <div
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: hovered ? 2 : 1,
          background: hovered ? "var(--accent)" : "var(--border2)",
          boxShadow: hovered ? "0 0 8px var(--accent)" : "none",
          transition: "all 0.15s",
          pointerEvents: "none",
        }}
      />
      {/* Handle con 3 puntos verticales — visible solo al hover */}
      {hovered && (
        <div style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          gap: 3,
          padding: "6px 4px",
          background: "var(--elevated)",
          borderRadius: 4,
          border: "1px solid var(--border2)",
        }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: 3, height: 3,
              borderRadius: "50%",
              background: "var(--accent)",
            }} />
          ))}
        </div>
      )}
    </div>
  );
}

// --- RowResizer ---

function RowResizer({
  colIdx,
  rowIdx,
  onMouseDown,
}: {
  colIdx: number;
  rowIdx: number;
  onMouseDown: (colIdx: number, rowIdx: number, e: React.MouseEvent) => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      style={{
        height: ROW_RESIZER_H,
        marginTop: -(ROW_RESIZER_H / 2),
        marginBottom: -(ROW_RESIZER_H / 2),
        flexShrink: 0,
        cursor: "row-resize",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        zIndex: 10,
        background: hovered ? "rgba(124,106,247,0.06)" : "transparent",
        transition: "background 0.15s",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseDown={(e) => { onMouseDown(colIdx, rowIdx, e); setHovered(true); }}
    >
      {/* Línea base */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: "50%",
          transform: "translateY(-50%)",
          height: hovered ? 2 : 1,
          background: hovered ? "var(--accent)" : "var(--border2)",
          boxShadow: hovered ? "0 0 8px var(--accent)" : "none",
          transition: "all 0.15s",
          pointerEvents: "none",
        }}
      />
      {/* Handle con 3 puntos horizontales — visible solo al hover */}
      {hovered && (
        <div style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "row",
          gap: 3,
          padding: "4px 6px",
          background: "var(--elevated)",
          borderRadius: 4,
          border: "1px solid var(--border2)",
        }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: 3, height: 3,
              borderRadius: "50%",
              background: "var(--accent)",
            }} />
          ))}
        </div>
      )}
    </div>
  );
}

// --- DynamicPanelGrid ---

interface Props {
  panels: Panel[];
  dynamicLayout: DynamicLayout;
  onLayoutChange: (layout: DynamicLayout) => void;
  onAddPanel: (colIdx: number, type: PanelType, widgetId?: WidgetId) => Promise<void>;
  onAddColumn: () => void;
  onRemovePanel: (panelId: string) => Promise<void>;
}

export function DynamicPanelGrid({
  panels,
  dynamicLayout,
  onLayoutChange,
  onAddPanel,
  onAddColumn,
  onRemovePanel,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const layoutRef = useRef(dynamicLayout);
  layoutRef.current = dynamicLayout;

  // Para columnas vacías: qué columna tiene el popover abierto
  const [emptyColPopover, setEmptyColPopover] = useState<number | null>(null);

  const panelMap = Object.fromEntries(panels.map((p) => [p.id, p]));

  const totalPanels = dynamicLayout.columns.reduce((sum, col) => sum + col.panels.length, 0);
  const canRemove = totalPanels > 1;

  // --- Column resize ---
  const handleColResizerMouseDown = useCallback(
    (colIdx: number, e: React.MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startFracs = layoutRef.current.columns.map((c) => c.width_frac);
      let hasDragged = false;

      const handleMove = (ev: MouseEvent) => {
        if (!containerRef.current) return;
        const delta = ev.clientX - startX;
        if (Math.abs(delta) > 1) hasDragged = true;

        const containerW = containerRef.current.getBoundingClientRect().width;
        const resizerTotal = (layoutRef.current.columns.length - 1) * COL_RESIZER_W;
        const availableW = containerW - resizerTotal;
        const deltaFrac = delta / availableW;

        const newFracs = [...startFracs];
        newFracs[colIdx] = Math.max(MIN_COL_FRAC, startFracs[colIdx] + deltaFrac);
        newFracs[colIdx + 1] = Math.max(MIN_COL_FRAC, startFracs[colIdx + 1] - deltaFrac);
        const total = newFracs.reduce((s, f) => s + f, 0);
        const norm = newFracs.map((f) => f / total);

        const newCols = layoutRef.current.columns.map((col, i) => ({ ...col, width_frac: norm[i] }));
        onLayoutChange({ columns: newCols });
      };

      const handleUp = () => {
        document.removeEventListener("mousemove", handleMove);
        document.removeEventListener("mouseup", handleUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        if (hasDragged) {
          onLayoutChange(layoutRef.current);
        }
      };

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", handleMove);
      document.addEventListener("mouseup", handleUp);
    },
    [onLayoutChange]
  );

  // --- Row resize ---
  const handleRowResizerMouseDown = useCallback(
    (colIdx: number, rowIdx: number, e: React.MouseEvent) => {
      e.preventDefault();
      const startY = e.clientY;
      const col = layoutRef.current.columns[colIdx];
      const startFracs = col.panels.map((p) => p.height_frac);
      let hasDragged = false;

      const handleMove = (ev: MouseEvent) => {
        if (!containerRef.current) return;
        const delta = ev.clientY - startY;
        if (Math.abs(delta) > 1) hasDragged = true;

        const containerH = containerRef.current.getBoundingClientRect().height;
        const resizerTotal = (col.panels.length - 1) * ROW_RESIZER_H;
        const availableH = containerH - resizerTotal;
        const deltaFrac = delta / availableH;

        const newFracs = [...startFracs];
        newFracs[rowIdx] = Math.max(MIN_ROW_FRAC, startFracs[rowIdx] + deltaFrac);
        newFracs[rowIdx + 1] = Math.max(MIN_ROW_FRAC, startFracs[rowIdx + 1] - deltaFrac);
        const total = newFracs.reduce((s, f) => s + f, 0);
        const norm = newFracs.map((f) => f / total);

        const newCols = layoutRef.current.columns.map((c, i) => {
          if (i !== colIdx) return c;
          return { ...c, panels: c.panels.map((p, j) => ({ ...p, height_frac: norm[j] })) };
        });
        onLayoutChange({ columns: newCols });
      };

      const handleUp = () => {
        document.removeEventListener("mousemove", handleMove);
        document.removeEventListener("mouseup", handleUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        if (hasDragged) onLayoutChange(layoutRef.current);
      };

      document.body.style.cursor = "row-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", handleMove);
      document.addEventListener("mouseup", handleUp);
    },
    [onLayoutChange]
  );

  // Empty state: no columns yet
  if (dynamicLayout.columns.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          height: "100%",
          width: "100%",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <button
          onClick={onAddColumn}
          style={{
            padding: "10px 20px",
            borderRadius: 8,
            background: "var(--elevated)",
            border: "1px solid var(--border2)",
            color: "var(--text2)",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          + Añadir columna
        </button>
      </div>
    );
  }

  const lastColIdx = dynamicLayout.columns.length - 1;

  return (
    <div
      ref={containerRef}
      style={{ display: "flex", height: "100%", width: "100%", overflow: "hidden" }}
    >
      {dynamicLayout.columns.map((col, colIdx) => (
        <React.Fragment key={colIdx}>
          {/* Columna */}
          <div
            style={{
              flex: col.width_frac,
              minWidth: 0,
              height: "100%",
              display: "flex",
              flexDirection: "column",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Paneles en la columna */}
            {col.panels.length === 0 ? (
              // Columna vacía — placeholder con botón para añadir primer panel
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--text4)",
                  fontSize: 12,
                  background: "var(--base)",
                  position: "relative",
                  gap: 8,
                }}
              >
                <span>Columna vacía</span>
                <div style={{ position: "relative" }}>
                  <button
                    onClick={() => setEmptyColPopover(colIdx)}
                    style={{
                      padding: "4px 14px",
                      borderRadius: 6,
                      background: "var(--elevated2)",
                      border: "1px solid var(--border2)",
                      color: "var(--text2)",
                      fontSize: 11,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <span>+</span> Añadir panel
                  </button>
                  {emptyColPopover === colIdx && (
                    <AddPanelPopover
                      onSelect={(type, widgetId) => {
                        onAddPanel(colIdx, type, widgetId).catch(console.error);
                        setEmptyColPopover(null);
                      }}
                      onClose={() => setEmptyColPopover(null)}
                    />
                  )}
                </div>
              </div>
            ) : (
              col.panels.map((dynPanel, rowIdx) => {
                const panel = panelMap[dynPanel.panel_id];
                if (!panel) return null;
                return (
                  <React.Fragment key={dynPanel.panel_id}>
                    <div
                      style={{ flex: dynPanel.height_frac, minHeight: 0, overflow: "hidden" }}
                    >
                      <PanelSlot
                        panel={panel}
                        layout="dynamic"
                        dynamicMode={true}
                        onAddPanelBelow={(type, widgetId) => {
                          onAddPanel(colIdx, type, widgetId).catch(console.error);
                        }}
                        onAddColumn={colIdx === lastColIdx ? onAddColumn : undefined}
                        isLastColumn={colIdx === lastColIdx}
                        onRemovePanel={() => onRemovePanel(dynPanel.panel_id).catch(console.error)}
                        canRemove={canRemove}
                      />
                    </div>
                    {rowIdx < col.panels.length - 1 && (
                      <RowResizer
                        colIdx={colIdx}
                        rowIdx={rowIdx}
                        onMouseDown={handleRowResizerMouseDown}
                      />
                    )}
                  </React.Fragment>
                );
              })
            )}
          </div>

          {/* Resizer de columna */}
          {colIdx < dynamicLayout.columns.length - 1 && (
            <ColumnResizer colIdx={colIdx} onMouseDown={handleColResizerMouseDown} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// Re-export so useWebviews can import layout constants without circular dep
export { COL_RESIZER_W as DYNAMIC_COL_RESIZER_W, ROW_RESIZER_H as DYNAMIC_ROW_RESIZER_H };
export { WIDGET_LABELS };
