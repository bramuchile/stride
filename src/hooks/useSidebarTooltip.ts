import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type React from "react";

const SIDEBAR_WIDTH_PX = 52;
const TOOLTIP_OFFSET_PX = 8;
const TOOLTIP_HEIGHT_PX = 30;

/**
 * Hook para mostrar el tooltip nativo del sidebar.
 *
 * Los tooltips de Radix UI quedan tapados por los paneles WebView2 (ventanas Win32 hijas)
 * ya que éstas siempre se pintan sobre el contenido web del padre, sin importar el z-index.
 * Este hook usa una WebviewWindow dedicada con always_on_top para aparecer sobre ellas.
 */
export function useSidebarTooltip(label: string, hint?: string) {
  const showTooltip = async (e: React.MouseEvent<HTMLElement>) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const win = getCurrentWindow();
    const [outerPos, scaleFactor] = await Promise.all([
      win.outerPosition(),
      win.scaleFactor(),
    ]);

    const x = outerPos.x + Math.round((SIDEBAR_WIDTH_PX + TOOLTIP_OFFSET_PX) * scaleFactor);
    const y = outerPos.y + Math.round((rect.top + rect.height / 2 - TOOLTIP_HEIGHT_PX / 2) * scaleFactor);

    await invoke("show_tooltip", { label, hint: hint ?? null, x, y });
  };

  const hideTooltip = async () => {
    await invoke("hide_tooltip");
  };

  return { showTooltip, hideTooltip };
}
