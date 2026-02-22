import { cn } from "@/lib/utils";
import { WebPanel } from "@/components/panels/WebPanel";
import { WidgetPanel } from "@/components/panels/WidgetPanel";
import { PanelHeader } from "@/components/panels/PanelHeader";
import type { Panel } from "@/types";

interface Props {
  panel: Panel;
}

export function PanelSlot({ panel }: Props) {
  return (
    <div
      className={cn(
        "flex flex-col h-full w-full overflow-hidden",
        "border-r border-border last:border-r-0"
      )}
    >
      {panel.type === "WEB" ? (
        <>
          <PanelHeader panel={panel} />
          <WebPanel panel={panel} />
        </>
      ) : (
        <WidgetPanel panel={panel} />
      )}
    </div>
  );
}
