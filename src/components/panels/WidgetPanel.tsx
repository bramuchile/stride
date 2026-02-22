import { ScratchpadWidget } from "@/components/widgets/scratchpad/ScratchpadWidget";
import type { Panel } from "@/types";

interface Props {
  panel: Panel;
}

// Despachador: mapea widget_id al componente correspondiente
export function WidgetPanel({ panel }: Props) {
  switch (panel.widget_id) {
    case "scratchpad":
      return <ScratchpadWidget />;
    default:
      return (
        <div className="flex h-full items-center justify-center text-muted-foreground">
          Widget desconocido: {panel.widget_id}
        </div>
      );
  }
}
