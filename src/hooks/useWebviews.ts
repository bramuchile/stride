import { useCallback, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { getDb } from "@/lib/db";
import { COL_RESIZER_W } from "@/hooks/useDynamicLayout";
import type { Panel, PanelLayoutInfo, DynamicLayout } from "@/types";

const delay = (ms: number) => new Promise<void>((res) => setTimeout(res, ms));

/**
 * Obtiene las dimensiones lógicas del contenedor de paneles usando la API de Tauri.
 * containerH = windowH - HEADER_HEIGHT: espacio que Rust usa como total_avail_y.
 * cssContainerH = windowH - TITLEBAR_HEIGHT: altura real del contenedor CSS de paneles.
 * Los RowResizers usan márgenes negativos con contribución neta 0 al flex layout,
 * por lo que los slots comparten el 100% de cssContainerH sin restar resizers.
 */
async function getContainerDimensions(): Promise<{ containerW: number; containerH: number; cssContainerH: number }> {
  const win = getCurrentWindow();
  const size = await win.innerSize();
  const scale = await win.scaleFactor();
  const logicalW = size.width / scale;
  const logicalH = size.height / scale;
  return {
    containerW: logicalW - SIDEBAR_WIDTH,
    containerH: logicalH - HEADER_HEIGHT,     // Rust: total_avail_y
    cssContainerH: logicalH - TITLEBAR_HEIGHT, // CSS: altura real del panel grid
  };
}

/**
 * Para layout dinámico: calcula fracciones absolutas x/y/w/h para cada panel.
 *
 * Rust aplica: pos.y = headerHeight + y_frac * containerH
 * Queremos:    pos.y = headerHeight + cssSlotY
 * Por tanto:   y_frac = cssSlotY / containerH  (sin sumar PANEL_BAR_HEIGHT)
 *
 * Los slots comparten cssContainerH (= windowH - TITLEBAR_HEIGHT) en proporciones
 * height_frac sin restar resizers, porque los RowResizers tienen marginTop/Bottom
 * negativos con contribución neta 0 al flex layout.
 *
 * panelBarHeight: altura de la barra de panel (0 en Modo Presentación, PANEL_BAR_HEIGHT normalmente).
 * containerHeight debe ser cssContainerH - panelBarHeight.
 */
function buildDynamicFracMap(
  webPanels: Panel[],
  dynamicLayout: DynamicLayout,
  containerWidth: number,
  containerHeight: number,
  cssContainerHeight: number,
  panelBarHeight: number = PANEL_BAR_HEIGHT,
): Record<string, { x_frac: number; w_frac: number; y_frac: number; h_frac: number }> {
  const map: Record<string, { x_frac: number; w_frac: number; y_frac: number; h_frac: number }> = {};
  const panelSet = new Set(webPanels.map((p) => p.id));

  const colCount = dynamicLayout.columns.length;
  const colResizersFrac = colCount > 1 ? ((colCount - 1) * COL_RESIZER_W) / containerWidth : 0;
  const colContentFrac = 1 - colResizersFrac;

  let cumColFrac = 0;
  dynamicLayout.columns.forEach((col, colIdx) => {
    const x_frac = cumColFrac * colContentFrac + colIdx * (COL_RESIZER_W / containerWidth);
    const w_frac = col.width_frac * colContentFrac;
    cumColFrac += col.width_frac;

    let cumRowFrac = 0;
    col.panels.forEach((dynPanel) => {
      if (!panelSet.has(dynPanel.panel_id)) return;

      // Posición CSS del slot relativa al área de contenido (windowH - TITLEBAR_HEIGHT)
      const cssSlotY = cumRowFrac * cssContainerHeight;
      const cssSlotH = dynPanel.height_frac * cssContainerHeight;
      cumRowFrac += dynPanel.height_frac;

      // y_frac: cssSlotY / containerH sitúa el WebView justo después del PanelHeader.
      // Rust: pos.y = HEADER_HEIGHT + y_frac * containerH = HEADER_HEIGHT + cssSlotY
      //             = TITLEBAR_HEIGHT + cssSlotY + PANEL_BAR_HEIGHT ✓
      const y_frac = cssSlotY / containerHeight;
      const h_frac = Math.max((cssSlotH - panelBarHeight) / containerHeight, 0);

      map[dynPanel.panel_id] = { x_frac, w_frac, y_frac, h_frac };
    });
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
  activeWorkspaceId: string | null,
  dynamicLayout?: DynamicLayout | null
) {
  const { webviewMap, webviewUrlMap, registerWebview, setWebviewUrl, presentationMode } = useWorkspaceStore();
  // Ref para que los handlers siempre lean el valor más reciente sin re-suscribir efectos
  const presentationModeRef = useRef(presentationMode);
  presentationModeRef.current = presentationMode;
  // Referencia para detectar cambio de workspace
  const prevWorkspaceRef = useRef<string | null>(null);
  // Ref para que el onResized handler siempre lea el dynamicLayout más reciente
  const dynamicLayoutRef = useRef(dynamicLayout);
  dynamicLayoutRef.current = dynamicLayout;

  // FIX 1: Estabilizar la dependencia del dynamicLayout para evitar re-renders espurios.
  // JSON.stringify detecta cambios de contenido, no de referencia de objeto.
  const dynamicLayoutKey = dynamicLayout ? JSON.stringify(dynamicLayout) : null;

  useEffect(() => {
    if (!activeWorkspaceId) return;

    const activate = async () => {
      // Ocultar todos los webviews del workspace anterior
      await invoke("hide_all_panel_webviews");

      const isPresentation = presentationModeRef.current;
      const panelBarH = isPresentation ? 0 : PANEL_BAR_HEIGHT;
      const headerH = isPresentation ? TITLEBAR_HEIGHT : HEADER_HEIGHT;

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
          headerHeight: headerH,
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
      let toResize: PanelLayoutInfo[];
      if (dynamicLayoutRef.current) {
        const { containerW, cssContainerH } = await getContainerDimensions();
        const containerH = cssContainerH - panelBarH;
        const dynMap = buildDynamicFracMap(webPanels, dynamicLayoutRef.current, containerW, containerH, cssContainerH, panelBarH);
        toResize = webPanels.map((p) => ({
          panel_id: p.id,
          position: p.position,
          overlay_position: p.overlay_position ?? null,
          overlay_height_pct: p.overlay_height_pct ?? null,
          custom_x_frac: dynMap[p.id]?.x_frac ?? null,
          custom_width_frac: dynMap[p.id]?.w_frac ?? null,
          custom_y_frac: dynMap[p.id]?.y_frac ?? null,
          custom_height_frac: dynMap[p.id]?.h_frac ?? null,
        }));
      } else {
        // dynamicLayout aún no cargado — no reposicionar, se reposicionará cuando cargue
        toResize = [];
      }

      if (toResize.length > 0) {
        await invoke("resize_panel_webviews", {
          panels: toResize,
          layout,
          sidebarWidth: SIDEBAR_WIDTH,
          headerHeight: headerH,
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
  }, [activeWorkspaceId, panels, layout]); // dynamicLayoutKey excluido: los cambios de layout solo reposicionan, no navegan

  // Reposicionar WebViews cuando cambia el layout dinámico (carga inicial + arrastre de resizers).
  // No hace hide/show/navigate — solo ajusta bounds.
  useEffect(() => {
    if (!dynamicLayout) return;
    const webPanels = panels.filter((p) => p.type === "WEB" && webviewMap[p.id]);
    if (webPanels.length === 0) return;

    const isPresentation = presentationModeRef.current;
    const panelBarH = isPresentation ? 0 : PANEL_BAR_HEIGHT;
    const headerH = isPresentation ? TITLEBAR_HEIGHT : HEADER_HEIGHT;

    const doResize = async () => {
      const { containerW, cssContainerH } = await getContainerDimensions();
      const containerH = cssContainerH - panelBarH;
      const dynMap = buildDynamicFracMap(webPanels, dynamicLayout, containerW, containerH, cssContainerH, panelBarH);
      const toResize: PanelLayoutInfo[] = webPanels.map((p) => ({
        panel_id: p.id,
        position: p.position,
        overlay_position: p.overlay_position ?? null,
        overlay_height_pct: p.overlay_height_pct ?? null,
        custom_x_frac: dynMap[p.id]?.x_frac ?? null,
        custom_width_frac: dynMap[p.id]?.w_frac ?? null,
        custom_y_frac: dynMap[p.id]?.y_frac ?? null,
        custom_height_frac: dynMap[p.id]?.h_frac ?? null,
      }));
      await invoke("resize_panel_webviews", {
        panels: toResize,
        layout,
        sidebarWidth: SIDEBAR_WIDTH,
        headerHeight: headerH,
      });
    };

    doResize().catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dynamicLayoutKey]); // Solo responde a cambios de layout — nunca navega

  // Reposicionar webviews al redimensionar la ventana
  useEffect(() => {
    const win = getCurrentWindow();
    let unlisten: (() => void) | null = null;

    win
      .onResized(async () => {
        const webPanels = panels.filter((p) => p.type === "WEB" && webviewMap[p.id]);
        let toResize: PanelLayoutInfo[];

        const isPresentation = presentationModeRef.current;
        const panelBarH = isPresentation ? 0 : PANEL_BAR_HEIGHT;
        const headerH = isPresentation ? TITLEBAR_HEIGHT : HEADER_HEIGHT;

        if (dynamicLayoutRef.current) {
          const { containerW, cssContainerH } = await getContainerDimensions();
          const containerH = cssContainerH - panelBarH;
          const dynMap = buildDynamicFracMap(webPanels, dynamicLayoutRef.current, containerW, containerH, cssContainerH, panelBarH);
          toResize = webPanels.map((p) => ({
            panel_id: p.id,
            position: p.position,
            overlay_position: p.overlay_position ?? null,
            overlay_height_pct: p.overlay_height_pct ?? null,
            custom_x_frac: dynMap[p.id]?.x_frac ?? null,
            custom_width_frac: dynMap[p.id]?.w_frac ?? null,
            custom_y_frac: dynMap[p.id]?.y_frac ?? null,
            custom_height_frac: dynMap[p.id]?.h_frac ?? null,
          }));
        } else {
          toResize = [];
        }

        if (toResize.length > 0) {
          invoke("resize_panel_webviews", {
            panels: toResize,
            layout,
            sidebarWidth: SIDEBAR_WIDTH,
            headerHeight: headerH,
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

  // Reposicionar WebViews al activar/desactivar Modo Presentación
  useEffect(() => {
    if (!dynamicLayoutRef.current) return;
    const webPanels = panels.filter((p) => p.type === "WEB" && webviewMap[p.id]);
    if (webPanels.length === 0) return;

    const panelBarH = presentationMode ? 0 : PANEL_BAR_HEIGHT;
    const headerH = presentationMode ? TITLEBAR_HEIGHT : HEADER_HEIGHT;

    const doResize = async () => {
      const { containerW, cssContainerH } = await getContainerDimensions();
      const containerH = cssContainerH - panelBarH;
      const dynMap = buildDynamicFracMap(webPanels, dynamicLayoutRef.current!, containerW, containerH, cssContainerH, panelBarH);
      const toResize: PanelLayoutInfo[] = webPanels.map((p) => ({
        panel_id: p.id,
        position: p.position,
        overlay_position: p.overlay_position ?? null,
        overlay_height_pct: p.overlay_height_pct ?? null,
        custom_x_frac: dynMap[p.id]?.x_frac ?? null,
        custom_width_frac: dynMap[p.id]?.w_frac ?? null,
        custom_y_frac: dynMap[p.id]?.y_frac ?? null,
        custom_height_frac: dynMap[p.id]?.h_frac ?? null,
      }));
      await invoke("resize_panel_webviews", {
        panels: toResize,
        layout,
        sidebarWidth: SIDEBAR_WIDTH,
        headerHeight: headerH,
      });
    };

    doResize().catch(console.error);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presentationMode]);

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
