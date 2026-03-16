import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { PanelSlot } from "./PanelSlot";
import { PanelResizer, RESIZER_W } from "@/components/PanelResizer";
import { DynamicPanelGrid } from "./DynamicPanelGrid";
import { SIDEBAR_WIDTH, HEADER_HEIGHT } from "@/hooks/useWebviews";
import { useUpdatePanelWidthFracs } from "@/hooks/usePanels";
import type { LayoutType, Panel, PanelLayoutInfo, DynamicLayout, PanelType, WidgetId } from "@/types";

const MIN_COL_FRAC = 0.12;

/** Inicializa fracciones desde los datos del panel (DB) si están disponibles. */
function initFractions(panels: Panel[], colCount: number): number[] {
  if (panels.length > 0 && panels.some((p) => p.width_frac != null)) {
    const fracs = panels.map((p) => p.width_frac ?? 1 / colCount);
    const total = fracs.reduce((s, f) => s + f, 0);
    return fracs.map((f) => f / total);
  }
  return Array.from({ length: colCount }, () => 1 / colCount);
}

interface Props {
  panels: Panel[];
  layout: LayoutType;
  // Solo para layout dinámico
  dynamicLayout?: DynamicLayout | null;
  onDynamicLayoutChange?: (layout: DynamicLayout) => void;
  onAddPanelToColumn?: (colIdx: number, type: PanelType, widgetId?: WidgetId) => Promise<void>;
  onAddColumn?: () => void;
  onRemovePanel?: (panelId: string) => Promise<void>;
}

export function PanelGrid({
  panels,
  layout,
  dynamicLayout,
  onDynamicLayoutChange,
  onAddPanelToColumn,
  onAddColumn,
  onRemovePanel,
}: Props) {
  const sorted = useMemo(
    () => [...panels].sort((a, b) => a.position - b.position),
    [panels]
  );

  const colCount = layout === "2x2" ? 2 : sorted.length;

  // Clave que cambia cuando el workspace cambia (distintos panelIds) o los fracs se actualizan
  const panelFracsKey = useMemo(
    () => sorted.map((p) => `${p.id}:${p.width_frac ?? ""}`).join(","),
    [sorted]
  );

  const [widthFractions, setWidthFractions] = useState<number[]>(() =>
    initFractions(sorted, colCount)
  );

  // Reinicializar fracciones cuando cambia el workspace, el layout o los datos de DB
  useEffect(() => {
    setWidthFractions(initFractions(sorted, colCount));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelFracsKey, colCount, layout]);

  const updatePanelWidthFracs = useUpdatePanelWidthFracs();

  const widthFractionsRef = useRef(widthFractions);
  widthFractionsRef.current = widthFractions;

  const containerRef = useRef<HTMLDivElement>(null);
  const currentFractionsRef = useRef<number[]>([]);

  const handleResizerMouseDown = useCallback(
    (divIdx: number, e: React.MouseEvent) => {
      e.preventDefault();

      const startX = e.clientX;
      const startFractions = [...widthFractionsRef.current];
      currentFractionsRef.current = startFractions;
      let hasDragged = false;

      const handleMove = (e: MouseEvent) => {
        if (layout === "2x2" || !containerRef.current) return;

        const delta = e.clientX - startX;
        if (Math.abs(delta) > 1) hasDragged = true;

        const containerWidth = containerRef.current.getBoundingClientRect().width;
        // Descontar el ancho de los separadores para calcular el espacio disponible de paneles
        const availableWidth = containerWidth - (sorted.length - 1) * RESIZER_W;
        const deltaFrac = delta / availableWidth;

        const newFractions = [...startFractions];
        newFractions[divIdx] = Math.max(
          MIN_COL_FRAC,
          startFractions[divIdx] + deltaFrac
        );
        newFractions[divIdx + 1] = Math.max(
          MIN_COL_FRAC,
          startFractions[divIdx + 1] - deltaFrac
        );

        const total = newFractions.reduce((s, f) => s + f, 0);
        const normalized = newFractions.map((f) => f / total);
        currentFractionsRef.current = normalized;
        setWidthFractions(normalized);
      };

      const handleUp = async () => {
        document.removeEventListener("mousemove", handleMove);
        document.removeEventListener("mouseup", handleUp);

        if (hasDragged && layout !== "2x2") {
          const finalFractions = currentFractionsRef.current;
          let cumX = 0;
          const panelInfos: PanelLayoutInfo[] = sorted.map((panel, i) => {
            const frac = finalFractions[i] ?? 1 / sorted.length;
            const x_frac = cumX;
            cumX += frac;
            return {
              panel_id: panel.id,
              position: panel.position,
              overlay_position: panel.overlay_position ?? null,
              overlay_height_pct: panel.overlay_height_pct ?? null,
              custom_x_frac: x_frac,
              custom_width_frac: frac,
            };
          });

          // Reposicionar WebViews nativos con los nuevos anchos
          await invoke("resize_panel_webviews", {
            panels: panelInfos,
            layout,
            sidebarWidth: SIDEBAR_WIDTH,
            headerHeight: HEADER_HEIGHT,
          }).catch(console.error);

          // Persistir fracciones en SQLite para restaurarlas al volver al workspace
          updatePanelWidthFracs(
            sorted.map((p, i) => ({
              id: p.id,
              workspace_id: p.workspace_id,
              width_frac: finalFractions[i] ?? 1 / sorted.length,
            }))
          ).catch(console.error);
        }
      };

      document.addEventListener("mousemove", handleMove);
      document.addEventListener("mouseup", handleUp);
    },
    [sorted, layout, updatePanelWidthFracs]
  );

  // Layout dinámico: delegar a DynamicPanelGrid
  if (layout === "dynamic") {
    if (!dynamicLayout || !onDynamicLayoutChange || !onAddPanelToColumn || !onAddColumn) {
      return (
        <div style={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center", color: "var(--text3)", fontSize: 12 }}>
          Cargando layout…
        </div>
      );
    }
    return (
      <DynamicPanelGrid
        panels={panels}
        dynamicLayout={dynamicLayout}
        onLayoutChange={onDynamicLayoutChange}
        onAddPanel={onAddPanelToColumn}
        onAddColumn={onAddColumn}
        onRemovePanel={onRemovePanel ?? (() => Promise.resolve())}
      />
    );
  }

  // 2x2: grid fijo sin separadores arrastrables
  if (layout === "2x2") {
    return (
      <div
        ref={containerRef}
        className="grid h-full w-full grid-rows-2"
        style={{
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "1px",
          background: "var(--border)",
        }}
      >
        {sorted.map((panel) => (
          <PanelSlot key={panel.id} panel={panel} layout={layout} />
        ))}
      </div>
    );
  }

  // 2col / 3col: flex con PanelResizer entre paneles
  return (
    <div ref={containerRef} className="flex h-full w-full">
      {sorted.map((panel, i) => (
        <React.Fragment key={panel.id}>
          <div style={{ flex: widthFractions[i], minWidth: 0, height: "100%" }}>
            <PanelSlot panel={panel} layout={layout} />
          </div>
          {i < sorted.length - 1 && (
            <PanelResizer panelIndex={i} onMouseDown={handleResizerMouseDown} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
