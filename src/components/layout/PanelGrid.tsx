import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { PanelSlot } from "./PanelSlot";
import { PanelResizer, RESIZER_W } from "@/components/PanelResizer";
import { SIDEBAR_WIDTH, HEADER_HEIGHT } from "@/hooks/useWebviews";
import type { LayoutType, Panel, PanelLayoutInfo } from "@/types";

const MIN_COL_FRAC = 0.12;

interface Props {
  panels: Panel[];
  layout: LayoutType;
}

export function PanelGrid({ panels, layout }: Props) {
  const sorted = useMemo(
    () => [...panels].sort((a, b) => a.position - b.position),
    [panels]
  );

  const colCount = layout === "2x2" ? 2 : sorted.length;

  const [widthFractions, setWidthFractions] = useState<number[]>(() =>
    Array.from({ length: colCount }, () => 1 / colCount)
  );

  useEffect(() => {
    setWidthFractions(Array.from({ length: colCount }, () => 1 / colCount));
  }, [colCount, layout]);

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

          await invoke("resize_panel_webviews", {
            panels: panelInfos,
            layout,
            sidebarWidth: SIDEBAR_WIDTH,
            headerHeight: HEADER_HEIGHT,
          }).catch(console.error);
        }
      };

      document.addEventListener("mousemove", handleMove);
      document.addEventListener("mouseup", handleUp);
    },
    [sorted, layout]
  );

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
