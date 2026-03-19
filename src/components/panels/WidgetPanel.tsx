import { NotesWidget } from "@/components/widgets/NotesWidget";
import { WeatherWidget } from "@/components/widgets/weather/WeatherWidget";
import type { Panel } from "@/types";

interface Props {
  panel: Panel;
  onRemovePanel?: () => void;
  canRemove?: boolean;
}

// Despachador: mapea widget_id al componente correspondiente
export function WidgetPanel({ panel, onRemovePanel, canRemove }: Props) {
  switch (panel.widget_id) {
    case "notes":
      return (
        <NotesWidget
          workspaceId={panel.workspace_id}
          onRemovePanel={onRemovePanel}
          canRemove={canRemove}
        />
      );
    case "weather":
      return <WeatherWidget />;
    default:
      return (
        <div className="flex h-full items-center justify-center text-muted-foreground">
          Widget desconocido: {panel.widget_id}
        </div>
      );
  }
}
