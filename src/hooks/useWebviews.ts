import { useCallback, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import type { Panel, PanelLayoutInfo } from "@/types";

const SIDEBAR_WIDTH = 52;
const HEADER_HEIGHT = 36;

export function useWebviews(
  panels: Panel[],
  layout: string,
  activeWorkspaceId: string | null
) {
  const { webviewMap, registerWebview } = useWorkspaceStore();
  // Referencia para detectar cambio de workspace
  const prevWorkspaceRef = useRef<string | null>(null);

  useEffect(() => {
    if (!activeWorkspaceId) return;

    const activate = async () => {
      // Ocultar todos los webviews del workspace anterior
      await invoke("hide_all_panel_webviews");

      const webPanels = panels.filter((p) => p.type === "WEB" && p.url);

      for (const panel of webPanels) {
        const existingLabel = webviewMap[panel.id];

        if (existingLabel) {
          // Webview ya existe: solo mostrar (carga diferida activa)
          await invoke("show_panel_webviews", { panelIds: [panel.id] });
        } else {
          // Primer acceso a este panel: crear webview nuevo
          const label = await invoke<string>("create_panel_webview", {
            panelId: panel.id,
            url: panel.url!,
            layout,
            position: panel.position,
            sidebarWidth: SIDEBAR_WIDTH,
            headerHeight: HEADER_HEIGHT,
          });
          registerWebview(panel.id, label);
        }
      }

      // Reposicionar los webviews existentes del workspace activo
      const toResize: PanelLayoutInfo[] = webPanels
        .filter((p) => webviewMap[p.id])
        .map((p) => ({ panel_id: p.id, position: p.position }));

      if (toResize.length > 0) {
        await invoke("resize_panel_webviews", {
          panels: toResize,
          layout,
          sidebarWidth: SIDEBAR_WIDTH,
          headerHeight: HEADER_HEIGHT,
        });
      }

      prevWorkspaceRef.current = activeWorkspaceId;
    };

    activate().catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkspaceId, panels, layout]);

  // Reposicionar webviews al redimensionar la ventana
  useEffect(() => {
    const win = getCurrentWindow();
    let unlisten: (() => void) | null = null;

    win
      .onResized(() => {
        const webPanels = panels.filter((p) => p.type === "WEB" && webviewMap[p.id]);
        const toResize: PanelLayoutInfo[] = webPanels.map((p) => ({
          panel_id: p.id,
          position: p.position,
        }));

        if (toResize.length > 0) {
          invoke("resize_panel_webviews", {
            panels: toResize,
            layout,
            sidebarWidth: SIDEBAR_WIDTH,
            headerHeight: HEADER_HEIGHT,
          }).catch(console.error);
        }
      })
      .then((fn) => {
        unlisten = fn;
      });

    return () => {
      unlisten?.();
    };
  }, [panels, layout, webviewMap]);

  const destroyAll = useCallback(async () => {
    const { webviewMap: map, unregisterWebview } = useWorkspaceStore.getState();
    for (const panelId of Object.keys(map)) {
      await invoke("destroy_panel_webview", { panelId });
      unregisterWebview(panelId);
    }
  }, []);

  return { destroyAll };
}
