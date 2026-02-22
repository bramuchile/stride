import { PanelSlot } from "./PanelSlot";
import type { LayoutType, Panel } from "@/types";

interface Props {
  panels: Panel[];
  layout: LayoutType;
}

const GRID_CLASSES: Record<LayoutType, string> = {
  "2col": "grid-cols-2",
  "3col": "grid-cols-3",
  "2x2": "grid-cols-2 grid-rows-2",
};

export function PanelGrid({ panels, layout }: Props) {
  const sorted = [...panels].sort((a, b) => a.position - b.position);

  return (
    <div className={`grid h-full w-full ${GRID_CLASSES[layout]}`}>
      {sorted.map((panel) => (
        <PanelSlot key={panel.id} panel={panel} />
      ))}
    </div>
  );
}
