import { ScratchpadWidget } from "@/components/widgets/scratchpad/ScratchpadWidget";
import { NotesWidget } from "@/components/widgets/notes/NotesWidget";
import type { Panel } from "@/types";

interface Props {
  panel: Panel;
}

// Despachador: mapea widget_id al componente correspondiente
export function WidgetPanel({ panel }: Props) {
  switch (panel.widget_id) {
    case "scratchpad":
      return <ScratchpadWidget />;
    case "notes":
      return <NotesWidget panelId={panel.id} panelUrl={panel.url} />;
    default:
      return (
        <div className="flex h-full items-center justify-center text-muted-foreground">
          Widget desconocido: {panel.widget_id}
        </div>
      );
  }
}
