export type LayoutType = "2col" | "3col" | "2x2";
export type PanelType = "WEB" | "WIDGET";
export type WidgetId = "scratchpad" | "next-meeting" | "notes" | "weather";

export interface Workspace {
  id: string;
  name: string;
  layout: LayoutType;
  position: number;
  icon?: string;
}

export interface Panel {
  id: string;
  workspace_id: string;
  type: PanelType;
  url?: string;
  widget_id?: WidgetId;
  position: number;
  overlay_widget_id?: WidgetId;
  overlay_position?: "top" | "bottom";
  overlay_height_pct?: number;
}

export interface PanelLayoutInfo {
  panel_id: string;
  position: number;
  overlay_position?: string | null;
  overlay_height_pct?: number | null;
  // Altura fija en píxeles para el overlay (tiene prioridad sobre overlay_height_pct)
  // Usada para la barra colapsada (28 px fijos) sin depender del tamaño de ventana
  overlay_height_px?: number | null;
  // Fracciones personalizadas de ancho (0.0–1.0) para paneles redimensionados manualmente
  custom_x_frac?: number | null;
  custom_width_frac?: number | null;
}

export interface AppError {
  message: string;
  stack?: string;
  context?: string;
  timestamp: string;
  version: string;
}
