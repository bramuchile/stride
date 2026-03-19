import { NotesWidget } from "@/components/widgets/notes/NotesWidget";
import { SystemMonitorWidget } from "@/components/widgets/system-monitor/SystemMonitorWidget";
import { UptimeMonitorWidget } from "@/components/widgets/uptime-monitor/UptimeMonitorWidget";
import { WeatherWidget } from "@/components/widgets/weather/WeatherWidget";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Panel, PanelType, WidgetId } from "@/types";

interface Props {
  panel: Panel;
  dynamicMode?: boolean;
  onAddPanelBelow?: (type: PanelType, widgetId?: WidgetId) => void;
  onAddColumn?: () => void;
  isLastColumn?: boolean;
  onRemovePanel?: () => void;
  canRemove?: boolean;
}

// Despachador: mapea widget_id al componente correspondiente
export function WidgetPanel({
  panel,
  dynamicMode,
  onAddPanelBelow,
  onAddColumn,
  isLastColumn,
  onRemovePanel,
  canRemove,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const update = (width: number, height: number) => {
      setDimensions({ width: Math.round(width), height: Math.round(height) });
    };

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) update(entry.contentRect.width, entry.contentRect.height);
    });

    observer.observe(node);
    const rect = node.getBoundingClientRect();
    update(rect.width, rect.height);

    return () => observer.disconnect();
  }, []);

  let content: ReactNode;
  switch (panel.widget_id) {
    case "notes":
      content = (
        <NotesWidget
          workspaceId={panel.workspace_id}
          dynamicMode={dynamicMode}
          onAddPanelBelow={onAddPanelBelow}
          onAddColumn={onAddColumn}
          isLastColumn={isLastColumn}
          onRemovePanel={onRemovePanel}
          canRemove={canRemove}
        />
      );
      break;
    case "system-monitor":
      content = <SystemMonitorWidget width={dimensions.width} height={dimensions.height} />;
      break;
    case "uptime-monitor":
      content = <UptimeMonitorWidget width={dimensions.width} height={dimensions.height} />;
      break;
    case "weather":
      content = <WeatherWidget />;
      break;
    default:
      content = (
        <div className="flex h-full items-center justify-center text-muted-foreground">
          Widget desconocido: {panel.widget_id}
        </div>
      );
  }

  return (
    <div ref={containerRef} style={{ flex: 1, minHeight: 0, minWidth: 0, overflow: "hidden" }}>
      {content}
    </div>
  );
}
