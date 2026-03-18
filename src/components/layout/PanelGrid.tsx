import { DynamicPanelGrid } from "./DynamicPanelGrid";
import type { Panel, DynamicLayout, PanelType, WidgetId } from "@/types";

interface Props {
  panels: Panel[];
  dynamicLayout?: DynamicLayout | null;
  onDynamicLayoutChange?: (layout: DynamicLayout) => void;
  onAddPanelToColumn?: (colIdx: number, type: PanelType, widgetId?: WidgetId) => Promise<void>;
  onAddColumn?: () => void;
  onRemovePanel?: (panelId: string) => Promise<void>;
}

export function PanelGrid({
  panels,
  dynamicLayout,
  onDynamicLayoutChange,
  onAddPanelToColumn,
  onAddColumn,
  onRemovePanel,
}: Props) {
  if (!dynamicLayout || !onDynamicLayoutChange || !onAddPanelToColumn || !onAddColumn) {
    return (
      <div style={{
        display: "flex", height: "100%",
        alignItems: "center", justifyContent: "center",
        color: "var(--text3)", fontSize: 12,
      }}>
        Cargando layout…
      </div>
    );
  }

  return (
    <DynamicPanelGrid
      panels={panels}
      dynamicLayout={dynamicLayout}
      onLayoutChange={onDynamicLayoutChange}
      onAddPanel={onAddPanelToColumn}
      onAddColumn={onAddColumn}
      onRemovePanel={onRemovePanel ?? (() => Promise.resolve())}
    />
  );
}
