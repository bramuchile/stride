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
  onRemovePanel?: () => void;
  canRemove?: boolean;
}

const WIDGET_LABELS: Record<string, { icon: string; label: string }> = {
  notes:        { icon: "📝", label: "Notas" },
  "next-meeting": { icon: "📅", label: "Próxima reunión" },
  "system-monitor": { icon: "🖥️", label: "Monitor de sistema" },
  "uptime-monitor": { icon: "📡", label: "Uptime monitor" },
  weather:      { icon: "🌤", label: "Clima" },
};

function WidgetHeader({
  panel,
  dynamicMode,
  onAddPanelBelow,
  onAddColumn,
  isLastColumn,
  onRemovePanel,
  canRemove,
}: {
  panel: Panel;
  dynamicMode?: boolean;
  onAddPanelBelow?: (type: PanelType, widgetId?: WidgetId) => void;
  onAddColumn?: () => void;
  isLastColumn?: boolean;
  onRemovePanel?: () => void;
  canRemove?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const [showSplitPopover, setShowSplitPopover] = useState(false);
  const meta = WIDGET_LABELS[panel.widget_id ?? ""] ?? { icon: "🧩", label: panel.widget_id ?? "Widget" };

  return (
    <div
      className="flex flex-shrink-0 items-center gap-2 px-[10px]"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        height: "32px",
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <span style={{ fontSize: 13, lineHeight: 1, flexShrink: 0 }}>{meta.icon}</span>
      <span
        className="flex-1 truncate min-w-0"
        style={{ fontSize: 11, color: "var(--text2)", fontWeight: 500 }}
      >
        {meta.label}
      </span>
      {dynamicMode && (
        <>
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setShowSplitPopover((value) => !value)}
              title="Dividir panel"
              style={{
                width: 22, height: 22,
                background: showSplitPopover ? "var(--elevated)" : "transparent",
                border: "none",
                color: showSplitPopover ? "var(--accent)" : "var(--text3)",
                cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                borderRadius: 4, flexShrink: 0, transition: "all 0.15s",
              }}
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <rect x="1" y="1" width="11" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
                <rect x="1" y="7" width="11" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
              </svg>
            </button>
            {showSplitPopover && onAddPanelBelow && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 4px)",
                  right: 0,
                  zIndex: 200,
                  minWidth: 160,
                  background: "var(--elevated2)",
                  border: "1px solid var(--border2)",
                  borderRadius: 10,
                  boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                  padding: "6px 4px",
                }}
              >
                {([
                  { type: "WEB" as const, icon: "🌐", label: "Navegador web", highlight: true },
                  { type: "WIDGET" as const, widgetId: "notes" as WidgetId, icon: "📝", label: "Notas" },
                  { type: "WIDGET" as const, widgetId: "next-meeting" as WidgetId, icon: "📅", label: "Próxima reunión" },
                  { type: "WIDGET" as const, widgetId: "system-monitor" as WidgetId, icon: "🖥️", label: "Monitor de sistema" },
                  { type: "WIDGET" as const, widgetId: "uptime-monitor" as WidgetId, icon: "📡", label: "Uptime monitor" },
                  { type: "WIDGET" as const, widgetId: "weather" as WidgetId, icon: "🌤️", label: "Clima" },
                ]).map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      onAddPanelBelow(opt.type, "widgetId" in opt ? opt.widgetId : undefined);
                      setShowSplitPopover(false);
                    }}
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "6px 10px", borderRadius: 6,
                      cursor: "pointer", fontSize: 12,
                      color: opt.highlight ? "var(--accent)" : "var(--text2)",
                      background: "transparent", border: "none",
                      width: "100%", textAlign: "left",
                    }}
                  >
                    <span style={{ fontSize: 14 }}>{opt.icon}</span>
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          {isLastColumn && onAddColumn && (
            <button
              onClick={onAddColumn}
              title="Añadir columna"
              style={{
                width: 22, height: 22,
                background: "transparent", border: "none",
                color: "var(--text3)", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                borderRadius: 4, flexShrink: 0, transition: "all 0.15s",
              }}
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <rect x="1" y="1" width="6" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
                <rect x="9" y="4" width="3" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2 1" />
                <line x1="10.5" y1="5.5" x2="10.5" y2="7.5" stroke="currentColor" strokeWidth="1.2" />
                <line x1="9.5" y1="6.5" x2="11.5" y2="6.5" stroke="currentColor" strokeWidth="1.2" />
              </svg>
            </button>
          )}
        </>
      )}
      {dynamicMode && canRemove && onRemovePanel && (
        <button
          onClick={onRemovePanel}
          title="Cerrar panel"
          style={{
            width: 22, height: 22,
            background: "transparent", border: "none",
            color: "var(--text3)", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            borderRadius: 4, flexShrink: 0, transition: "all 0.15s",
            opacity: hovered ? 1 : 0,
            pointerEvents: hovered ? "auto" : "none",
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLElement;
            el.style.background = "rgba(239,68,68,0.12)";
            el.style.color = "var(--red)";
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLElement;
            el.style.background = "transparent";
            el.style.color = "var(--text3)";
          }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <line x1="1" y1="1" x2="9" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="9" y1="1" x2="1" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      )}
    </div>
  );
}

export function PanelSlot({ panel, layout, dynamicMode, onAddPanelBelow, onAddColumn, isLastColumn, onRemovePanel, canRemove }: Props) {
  const [overlayCollapsed, setOverlayCollapsed] = useState(false);
  const { webviewMap, setWebviewUrl, presentationMode } = useWorkspaceStore();
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
          <div style={{
            overflow: presentationMode ? "hidden" : "visible",
            height: presentationMode ? 0 : 32,
            flexShrink: 0,
            transition: "height 0.2s ease",
          }}>
            <PanelHeader
              panel={panel}
              dynamicMode={dynamicMode}
              onAddPanelBelow={onAddPanelBelow}
              onAddColumn={onAddColumn}
              isLastColumn={isLastColumn}
              onRemovePanel={onRemovePanel}
              canRemove={canRemove}
            />
          </div>

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
        <>
          {panel.widget_id !== "notes" && (
            <div style={{
              overflow: "visible",
              height: presentationMode ? 0 : 32,
              flexShrink: 0,
              transition: "height 0.2s ease",
            }}>
              <WidgetHeader
                panel={panel}
                dynamicMode={dynamicMode}
                onAddPanelBelow={onAddPanelBelow}
                onAddColumn={onAddColumn}
                isLastColumn={isLastColumn}
                onRemovePanel={onRemovePanel}
                canRemove={canRemove}
              />
            </div>
          )}
          <WidgetPanel
            panel={panel}
            dynamicMode={dynamicMode}
            onAddPanelBelow={onAddPanelBelow}
            onAddColumn={onAddColumn}
            isLastColumn={isLastColumn}
            onRemovePanel={onRemovePanel}
            canRemove={canRemove}
          />
        </>
      )}

    </div>
  );
}
