import { useCallback, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { getDb } from "@/lib/db";
import type { Panel, PanelLayoutInfo } from "@/types";

const delay = (ms: number) => new Promise<void>((res) => setTimeout(res, ms));

/**
 * Calcula custom_x_frac / custom_width_frac para cada panel a partir de
 * sus width_frac guardados en DB. Devuelve un mapa panelId → {x, w}.
 * Si ningún panel tiene width_frac, devuelve mapa vacío (se usará el layout por defecto).
 */
function buildFracMap(
  webPanels: Panel[],
  layout: string
): Record<string, { x_frac: number; w_frac: number }> {
  if (layout === "2x2" || !webPanels.some((p) => p.width_frac != null)) return {};
  const fracs = webPanels.map((p) => p.width_frac ?? 1 / webPanels.length);
  const total = fracs.reduce((s, f) => s + f, 0);
  const norm = fracs.map((f) => f / total);
  const map: Record<string, { x_frac: number; w_frac: number }> = {};
  let cumX = 0;
  webPanels.forEach((p, i) => {
    map[p.id] = { x_frac: cumX, w_frac: norm[i] };
    cumX += norm[i];
  });
  return map;
}

export const SIDEBAR_WIDTH = 52;
export const TITLEBAR_HEIGHT = 30;
export const PANEL_BAR_HEIGHT = 32;
export const HEADER_HEIGHT = TITLEBAR_HEIGHT + PANEL_BAR_HEIGHT; // 62

export function useWebviews(
  panels: Panel[],
  layout: string,
  activeWorkspaceId: string | null
) {
  const { webviewMap, webviewUrlMap, registerWebview, setWebviewUrl } = useWorkspaceStore();
  // Referencia para detectar cambio de workspace
  const prevWorkspaceRef = useRef<string | null>(null);

  useEffect(() => {
    if (!activeWorkspaceId) return;

    const activate = async () => {
      // Ocultar todos los webviews del workspace anterior
      await invoke("hide_all_panel_webviews");

      const webPanels = panels.filter((p) => p.type === "WEB" && p.url);

      // Separar paneles existentes (ya tienen webview) de nuevos (hay que crear)
      const existingPanels = webPanels.filter((p) => webviewMap[p.id]);
      const newPanels = webPanels.filter((p) => !webviewMap[p.id]);

      // Navegar los existentes si la URL cambió
      for (const panel of existingPanels) {
        if (webviewUrlMap[panel.id] !== panel.url) {
          await invoke("navigate_panel_webview", { panelId: panel.id, url: panel.url! }).catch(console.error);
          setWebviewUrl(panel.id, panel.url!);
        }
      }

      // Crear los nuevos (ya quedan posicionados correctamente desde create_panel_webview).
      // Delay de 150ms entre creaciones para mitigar pantalla blanca en Tauri 2 multiwebview.
      for (let i = 0; i < newPanels.length; i++) {
        const panel = newPanels[i];
        const label = await invoke<string>("create_panel_webview", {
          panelId: panel.id,
          url: panel.url!,
          layout,
          position: panel.position,
          sidebarWidth: SIDEBAR_WIDTH,
          headerHeight: HEADER_HEIGHT,
          overlayPosition: panel.overlay_position ?? null,
          overlayHeightPct: panel.overlay_height_pct ?? null,
        });
        registerWebview(panel.id, label);
        setWebviewUrl(panel.id, panel.url!);
        if (i < newPanels.length - 1) {
          await delay(150);
        }
      }

      // Reubicar TODOS los webviews (nuevos y existentes) a sus bounds correctos.
      // Los nuevos se crean con el layout por defecto; si tienen width_frac guardada
      // en DB necesitan un resize explícito para tomar el tamaño correcto desde el inicio.
      const fracMap = buildFracMap(webPanels, layout);
      const toResize: PanelLayoutInfo[] = webPanels.map((p) => ({
        panel_id: p.id,
        position: p.position,
        overlay_position: p.overlay_position ?? null,
        overlay_height_pct: p.overlay_height_pct ?? null,
        custom_x_frac: fracMap[p.id]?.x_frac ?? null,
        custom_width_frac: fracMap[p.id]?.w_frac ?? null,
      }));

      if (toResize.length > 0) {
        await invoke("resize_panel_webviews", {
          panels: toResize,
          layout,
          sidebarWidth: SIDEBAR_WIDTH,
          headerHeight: HEADER_HEIGHT,
        });
      }

      // Mostrar los webviews existentes ya en la posición correcta
      if (existingPanels.length > 0) {
        await invoke("show_panel_webviews", {
          panelIds: existingPanels.map((p) => p.id),
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
        const fracMap = buildFracMap(webPanels, layout);
        const toResize: PanelLayoutInfo[] = webPanels.map((p) => ({
          panel_id: p.id,
          position: p.position,
          overlay_position: p.overlay_position ?? null,
          overlay_height_pct: p.overlay_height_pct ?? null,
          custom_x_frac: fracMap[p.id]?.x_frac ?? null,
          custom_width_frac: fracMap[p.id]?.w_frac ?? null,
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

  // FIX 6: Persistir URL cuando el usuario navega dentro de un panel WEB
  useEffect(() => {
    let unlisten: (() => void) | null = null;
    listen<{ panel_id: string; url: string }>("panel-navigated", async (event) => {
      const { panel_id, url } = event.payload;
      setWebviewUrl(panel_id, url);
      try {
        const db = await getDb();
        await db.execute("UPDATE panels SET url = $1 WHERE id = $2", [url, panel_id]);
      } catch (err) {
        console.error("Failed to persist panel URL:", err);
      }
    }).then((fn) => { unlisten = fn; });
    return () => { unlisten?.(); };
  }, []); // Sin dependencias: listener global para toda la sesión

  const destroyAll = useCallback(async () => {
    const { webviewMap: map, unregisterWebview } = useWorkspaceStore.getState();
    for (const panelId of Object.keys(map)) {
      await invoke("destroy_panel_webview", { panelId });
      unregisterWebview(panelId);
    }
  }, []);

  return { destroyAll };
}
