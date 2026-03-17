import { useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { cn } from "@/lib/utils";
import { WebPanel } from "@/components/panels/WebPanel";
import { WidgetPanel } from "@/components/panels/WidgetPanel";
import { PanelHeader } from "@/components/panels/PanelHeader";
import { PanelOverlay, PanelOverlayCollapsedBar } from "@/components/panels/PanelOverlay";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { useUpdatePanel } from "@/hooks/usePanels";
import { SIDEBAR_WIDTH, HEADER_HEIGHT } from "@/hooks/useWebviews";
import type { Panel, PanelType, WidgetId } from "@/types";

interface Props {
  panel: Panel;
  layout: string;
  // Props para layout dinámico — pasadas desde DynamicPanelGrid → PanelHeader
  dynamicMode?: boolean;
  onAddPanelBelow?: (type: PanelType, widgetId?: WidgetId) => void;
  onAddColumn?: () => void;
  isLastColumn?: boolean;
}

export function PanelSlot({ panel, layout, dynamicMode, onAddPanelBelow, onAddColumn, isLastColumn }: Props) {
  const [overlayCollapsed, setOverlayCollapsed] = useState(false);
  const { webviewMap, setWebviewUrl } = useWorkspaceStore();
  const updatePanel = useUpdatePanel();

  // Navegación desde el new tab page (panel sin URL)
  const handleWebPanelNavigate = useCallback(async (url: string) => {
    await invoke("navigate_panel_webview", { panelId: panel.id, url }).catch(console.error);
    updatePanel.mutate({ ...panel, url });
    setWebviewUrl(panel.id, url);
  }, [panel, updatePanel, setWebviewUrl]);

  const hasOverlay =
    panel.type === "WEB" &&
    panel.overlay_widget_id &&
    panel.overlay_position &&
    panel.overlay_height_pct;

  // Altura fija de la barra colapsada en px — debe coincidir con el height del PanelOverlayCollapsedBar
  const COLLAPSED_BAR_PX = 28;

  // Al colapsar/expandir un overlay, reposicionar el WebView2 para que ocupe el espacio correcto.
  // Al colapsar: mantener overlay_position pero usar overlay_height_px=28 para que el WebView2
  // deje exactamente 28 px libres donde React renderiza la barra "expandir".
  const handleCollapse = useCallback(async () => {
    setOverlayCollapsed(true);
    if (webviewMap[panel.id]) {
      await invoke("resize_panel_webviews", {
        panels: [{
          panel_id: panel.id,
          position: panel.position,
          overlay_position: panel.overlay_position ?? null,
          overlay_height_pct: null,
          overlay_height_px: COLLAPSED_BAR_PX,
        }],
        layout,
        sidebarWidth: SIDEBAR_WIDTH,
        headerHeight: HEADER_HEIGHT,
      }).catch(console.error);
    }
  }, [panel, layout, webviewMap]);

  const handleExpand = useCallback(async () => {
    setOverlayCollapsed(false);
    if (webviewMap[panel.id]) {
      await invoke("resize_panel_webviews", {
        panels: [{
          panel_id: panel.id,
          position: panel.position,
          overlay_position: panel.overlay_position ?? null,
          overlay_height_pct: panel.overlay_height_pct ?? null,
          overlay_height_px: null,
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
        "flex flex-col h-full w-full overflow-hidden"
      )}
      style={{ position: "relative", background: "var(--base)" }}
    >
      {panel.type === "WEB" ? (
        <>
          <PanelHeader
            panel={panel}
            dynamicMode={dynamicMode}
            onAddPanelBelow={onAddPanelBelow}
            onAddColumn={onAddColumn}
            isLastColumn={isLastColumn}
          />

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
                  panel={panel}
                  widgetId={panel.overlay_widget_id!}
                  position="top"
                  onCollapse={handleCollapse}
                />
              </div>
            )
          )}

          {/* WebView2 spacer — el webview nativo se renderiza aquí vía Rust */}
          <WebPanel panel={panel} onNavigate={handleWebPanelNavigate} />

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
                  panel={panel}
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

    </div>
  );
}
