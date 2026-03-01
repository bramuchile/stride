import { ScratchpadWidget } from "@/components/widgets/scratchpad/ScratchpadWidget";
import { NextMeetingWidget } from "@/components/widgets/next-meeting/NextMeetingWidget";
import type { WidgetId } from "@/types";

interface Props {
  widgetId: WidgetId;
  position: "top" | "bottom";
  onCollapse: () => void;
}

const WIDGET_META: Record<WidgetId, { label: string; color: string }> = {
  "next-meeting": { label: "próxima reunión", color: "#5b7cf6" },
  "scratchpad":   { label: "notas rápidas",   color: "#f6a35b" },
};

export function PanelOverlay({ widgetId, position, onCollapse }: Props) {
  const meta = WIDGET_META[widgetId] ?? { label: widgetId, color: "#6b7280" };
  const collapseIcon = position === "top" ? "▲" : "▼";

  return (
    <div
      className="flex flex-col overflow-hidden"
      style={{
        height: "100%",
        background: "rgba(11,13,16,0.82)",
        backdropFilter: "blur(12px)",
        borderTop: position === "bottom" ? "1px solid #2a2d31" : undefined,
        borderBottom: position === "top" ? "1px solid #2a2d31" : undefined,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 pt-[7px] pb-0 flex-shrink-0">
        <div className="flex items-center gap-[6px]">
          <div
            className="w-[6px] h-[6px] rounded-full flex-shrink-0"
            style={{ background: meta.color }}
          />
          <span
            className="text-[9px] font-semibold uppercase tracking-[0.1em]"
            style={{ color: "#6b7280" }}
          >
            {meta.label}
          </span>
        </div>
        <button
          onClick={onCollapse}
          className="text-[10px] px-1 py-0.5 rounded"
          style={{ color: "#6b7280", background: "transparent", border: "none", cursor: "pointer" }}
          onMouseEnter={(e) => { (e.target as HTMLElement).style.background = "#2a2d31"; }}
          onMouseLeave={(e) => { (e.target as HTMLElement).style.background = "transparent"; }}
        >
          {collapseIcon}
        </button>
      </div>

      {/* Widget content */}
      <div className="flex-1 overflow-hidden">
        {widgetId === "next-meeting" && <NextMeetingWidget />}
        {widgetId === "scratchpad" && <ScratchpadWidget compact />}
      </div>
    </div>
  );
}

interface CollapsedBarProps {
  widgetId: WidgetId;
  position: "top" | "bottom";
  onExpand: () => void;
}

export function PanelOverlayCollapsedBar({ widgetId, position, onExpand }: CollapsedBarProps) {
  const meta = WIDGET_META[widgetId] ?? { label: widgetId, color: "#6b7280" };
  const expandIcon = position === "top" ? "▼" : "▲";

  return (
    <div
      className="flex items-center justify-between px-3 flex-shrink-0"
      style={{
        height: "28px",
        background: "rgba(11,13,16,0.82)",
        backdropFilter: "blur(12px)",
        borderTop: position === "bottom" ? "1px solid #2a2d31" : undefined,
        borderBottom: position === "top" ? "1px solid #2a2d31" : undefined,
        cursor: "pointer",
      }}
      onClick={onExpand}
    >
      <div className="flex items-center gap-[6px]">
        <div
          className="w-[6px] h-[6px] rounded-full flex-shrink-0"
          style={{ background: meta.color }}
        />
        <span
          className="text-[9px] font-semibold uppercase tracking-[0.1em]"
          style={{ color: "#6b7280" }}
        >
          {meta.label}
        </span>
      </div>
      <span className="text-[10px]" style={{ color: "#6b7280" }}>{expandIcon}</span>
    </div>
  );
}
