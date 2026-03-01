import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { invoke } from "@tauri-apps/api/core";
import { PanelSlot } from "./PanelSlot";
import { LongPressRing } from "@/components/ui/LongPressRing";
import { SIDEBAR_WIDTH, HEADER_HEIGHT } from "@/hooks/useWebviews";
import type { LayoutType, Panel, PanelLayoutInfo } from "@/types";

interface Props {
  panels: Panel[];
  layout: LayoutType;
  onDividerLongPress: () => void;
}

const LONG_PRESS_MS = 2000;
const DRAG_THRESHOLD_PX = 5;
const MIN_COL_FRAC = 0.12; // ancho mínimo por columna (12 % del área disponible)

export function PanelGrid({ panels, layout, onDividerLongPress }: Props) {
  const sorted = useMemo(
    () => [...panels].sort((a, b) => a.position - b.position),
    [panels]
  );

  // Número de columnas según layout
  const colCount = layout === "2x2" ? 2 : sorted.length;

  // Fracciones de ancho por columna (suma = 1). Solo se usa en 2col/3col.
  const [widthFractions, setWidthFractions] = useState<number[]>(() =>
    Array.from({ length: colCount }, () => 1 / colCount)
  );

  // Reiniciar fracciones si cambia el layout o el número de columnas
  useEffect(() => {
    setWidthFractions(Array.from({ length: colCount }, () => 1 / colCount));
  }, [colCount, layout]);

  // Ref para leer las fracciones actuales en closures sin recrear callbacks
  const widthFractionsRef = useRef(widthFractions);
  widthFractionsRef.current = widthFractions;

  // Referencia estable al callback externo para evitar closures stale
  const onDividerLongPressRef = useRef(onDividerLongPress);
  useEffect(() => { onDividerLongPressRef.current = onDividerLongPress; }, [onDividerLongPress]);

  // Referencia al contenedor para calcular el ancho disponible
  const containerRef = useRef<HTMLDivElement>(null);

  // Estado del long-press (animación del anillo)
  const lpRafRef = useRef<number | null>(null);
  const [lpProgress, setLpProgress] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Fracciones finales del drag en curso (para el handler mouseup)
  const currentFractionsRef = useRef<number[]>([]);

  const cancelLongPress = useCallback(() => {
    if (lpRafRef.current !== null) {
      cancelAnimationFrame(lpRafRef.current);
      lpRafRef.current = null;
    }
    setLpProgress(0);
  }, []);

  const handleDividerMouseDown = useCallback(
    (divIdx: number, e: React.MouseEvent) => {
      e.preventDefault();

      const startX = e.clientX;
      const startFractions = [...widthFractionsRef.current];
      currentFractionsRef.current = startFractions;
      let moved = false;

      // Actualizar posición inicial del cursor para el anillo
      setMousePos({ x: e.clientX, y: e.clientY });

      // Iniciar animación RAF del long-press
      const t0 = performance.now();
      const tick = (now: number) => {
        const pct = Math.min(((now - t0) / LONG_PRESS_MS) * 100, 100);
        setLpProgress(pct);
        if (pct < 100) {
          lpRafRef.current = requestAnimationFrame(tick);
        } else {
          lpRafRef.current = null;
          setLpProgress(0);
          onDividerLongPressRef.current();
        }
      };
      lpRafRef.current = requestAnimationFrame(tick);

      const handleMove = (e: MouseEvent) => {
        // El anillo sigue el cursor durante el long-press
        setMousePos({ x: e.clientX, y: e.clientY });

        const delta = e.clientX - startX;

        // Superar el umbral → es un drag de resize, cancelar long-press
        if (Math.abs(delta) > DRAG_THRESHOLD_PX && !moved) {
          moved = true;
          cancelLongPress();
        }

        // Solo redimensionar en layouts de una sola fila (2col / 3col)
        if (moved && layout !== "2x2" && containerRef.current) {
          const containerWidth = containerRef.current.getBoundingClientRect().width;
          const deltaFrac = delta / containerWidth;

          const newFractions = [...startFractions];
          newFractions[divIdx] = Math.max(
            MIN_COL_FRAC,
            startFractions[divIdx] + deltaFrac
          );
          newFractions[divIdx + 1] = Math.max(
            MIN_COL_FRAC,
            startFractions[divIdx + 1] - deltaFrac
          );

          // Normalizar para que la suma siempre sea exactamente 1
          const total = newFractions.reduce((s, f) => s + f, 0);
          const normalized = newFractions.map((f) => f / total);
          currentFractionsRef.current = normalized;
          setWidthFractions(normalized);
        }
      };

      const handleUp = async () => {
        document.removeEventListener("mousemove", handleMove);
        document.removeEventListener("mouseup", handleUp);

        if (moved && layout !== "2x2") {
          // Calcular posiciones acumuladas y actualizar WebViews en Rust
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

        cancelLongPress();
      };

      document.addEventListener("mousemove", handleMove);
      document.addEventListener("mouseup", handleUp);
    },
    [sorted, layout, cancelLongPress]
  );

  // Grid template columns: fracciones dinámicas en 2col/3col, fijo en 2x2
  const gridTemplateColumns =
    layout === "2x2"
      ? "repeat(2, 1fr)"
      : widthFractions.map((f) => `${f}fr`).join(" ");

  const gridClass =
    layout === "2x2" ? "grid h-full w-full grid-rows-2" : "grid h-full w-full";

  return (
    <>
      <div
        ref={containerRef}
        className={gridClass}
        style={{ gridTemplateColumns, gap: "1px", background: "var(--border)" }}
      >
        {sorted.map((panel, i) => (
          <PanelSlot
            key={panel.id}
            panel={panel}
            layout={layout}
            isLast={i === sorted.length - 1}
            onDividerMouseDown={(e) => handleDividerMouseDown(i, e)}
          />
        ))}
      </div>

      {/* Anillo de progreso — sigue el cursor durante el long-press */}
      {lpProgress > 0 &&
        createPortal(
          <div
            style={{
              position: "fixed",
              left: mousePos.x - 22,
              top: mousePos.y - 22,
              width: 44,
              height: 44,
              pointerEvents: "none",
              zIndex: 9999,
            }}
          >
            <LongPressRing progress={lpProgress} size={44} />
          </div>,
          document.body
        )}
    </>
  );
}
