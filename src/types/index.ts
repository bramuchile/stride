export type LayoutType = "2col" | "3col" | "2x2";
export type PanelType = "WEB" | "WIDGET";
export type WidgetId = "scratchpad" | "news";

export interface Workspace {
  id: string;
  name: string;
  layout: LayoutType;
  position: number;
}

export interface Panel {
  id: string;
  workspace_id: string;
  type: PanelType;
  url?: string;
  widget_id?: WidgetId;
  position: number;
}

export interface PanelLayoutInfo {
  panel_id: string;
  position: number;
}

export interface AppError {
  message: string;
  stack?: string;
  context?: string;
  timestamp: string;
  version: string;
}
