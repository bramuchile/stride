import { useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { cn } from "@/lib/utils";
import { WebPanel } from "@/components/panels/WebPanel";
import { WidgetPanel } from "@/components/panels/WidgetPanel";
import { PanelHeader } from "@/components/panels/PanelHeader";
import { PanelOverlay, PanelOverlayCollapsedBar } from "@/components/panels/PanelOverlay";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { SIDEBAR_WIDTH, HEADER_HEIGHT } from "@/hooks/useWebviews";
import type { Panel } from "@/types";

interface Props {
  panel: Panel;
  layout: string;
  isLast: boolean;
  /** Manejado por PanelGrid — combina long-press (3 s → editar) y drag (resize) */
  onDividerMouseDown: (e: React.MouseEvent) => void;
}

export function PanelSlot({ panel, layout, isLast, onDividerMouseDown }: Props) {
  const [overlayCollapsed, setOverlayCollapsed] = useState(false);
  const { webviewMap } = useWorkspaceStore();

  const hasOverlay =
    panel.type === "WEB" &&
    panel.overlay_widget_id &&
    panel.overlay_position &&
    panel.overlay_height_pct;

  // Al colapsar/expandir un overlay, reposicionar el WebView2 para que ocupe el espacio correcto
  const handleCollapse = useCallback(async () => {
    setOverlayCollapsed(true);
    const existingLabel = webviewMap[panel.id];
    if (existingLabel) {
      await invoke("resize_panel_webviews", {
        panels: [{
          panel_id: panel.id,
          position: panel.position,
          overlay_position: null,
          overlay_height_pct: null,
        }],
        layout,
        sidebarWidth: SIDEBAR_WIDTH,
        headerHeight: HEADER_HEIGHT,
      }).catch(console.error);
    }
  }, [panel, layout, webviewMap]);

  const handleExpand = useCallback(async () => {
    setOverlayCollapsed(false);
    const existingLabel = webviewMap[panel.id];
    if (existingLabel) {
      await invoke("resize_panel_webviews", {
        panels: [{
          panel_id: panel.id,
          position: panel.position,
          overlay_position: panel.overlay_position ?? null,
          overlay_height_pct: panel.overlay_height_pct ?? null,
        }],
        layout,
        sidebarWidth: SIDEBAR_WIDTH,
        headerHeight: HEADER_HEIGHT,
      }).catch(console.error);
    }
  }, [panel, layout, webviewMap]);

  return (
    <div
      className={cn(
        "flex flex-col h-full w-full overflow-hidden",
        "border-r border-border last:border-r-0"
      )}
      style={{ position: "relative" }}
    >
      {panel.type === "WEB" ? (
        <>
          <PanelHeader panel={panel} />

          {/* Overlay top */}
          {hasOverlay && panel.overlay_position === "top" && (
            overlayCollapsed ? (
              <PanelOverlayCollapsedBar
                widgetId={panel.overlay_widget_id!}
                position="top"
                onExpand={handleExpand}
              />
            ) : (
              <div style={{ height: `${panel.overlay_height_pct}%`, flexShrink: 0 }}>
                <PanelOverlay
                  widgetId={panel.overlay_widget_id!}
                  position="top"
                  onCollapse={handleCollapse}
                />
              </div>
            )
          )}

          {/* WebView2 spacer — el webview nativo se renderiza aquí vía Rust */}
          <WebPanel panel={panel} />

          {/* Overlay bottom */}
          {hasOverlay && panel.overlay_position === "bottom" && (
            overlayCollapsed ? (
              <PanelOverlayCollapsedBar
                widgetId={panel.overlay_widget_id!}
                position="bottom"
                onExpand={handleExpand}
              />
            ) : (
              <div style={{ height: `${panel.overlay_height_pct}%`, flexShrink: 0 }}>
                <PanelOverlay
                  widgetId={panel.overlay_widget_id!}
                  position="bottom"
                  onCollapse={handleCollapse}
                />
              </div>
            )
          )}
        </>
      ) : (
        <WidgetPanel panel={panel} />
      )}

      {/* Franja de arrastre/long-press — lógica manejada por PanelGrid.
          right: 0 asegura que quede completamente dentro del panel (overflow:hidden no lo recorta).
          El anillo de progreso y la lógica se renderizan en PanelGrid vía portal. */}
      {!isLast && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            bottom: 0,
            width: 6,
            zIndex: 20,
            cursor: "col-resize",
          }}
          onMouseDown={onDividerMouseDown}
        />
      )}
    </div>
  );
}
